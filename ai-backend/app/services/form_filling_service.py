import asyncio
import json
from typing import Dict, List, Any, Optional
from app.utils.llm import get_llm, generate_response


# Field types that are rendered as checked/unchecked (checkmark drawn when true)
BOOLEAN_FIELD_TYPES = ("checkbox", "radio")

# Radio-style fields: LLM must return the selected option string (e.g. "Female", "Single")
# so the overlay can draw the checkmark in the correct circle.
RADIO_FIELD_OPTIONS = {
    "gender": ("Male", "Female"),
    "status": ("Single", "Married"),
}


def _normalize_boolean_value(value: Any) -> bool:
    """Normalize various truthy representations to bool for checkbox/radio overlay."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    return s in ("true", "yes", "1", "checked", "x", "✓", "✔", "on")


def _is_radio_option_value(field_key: str, value: Any) -> bool:
    """True if value is a valid option string for a radio-style field (e.g. Female, Single)."""
    if value is None or field_key not in RADIO_FIELD_OPTIONS:
        return False
    s = str(value).strip()
    return any(s.lower() == opt.lower() for opt in RADIO_FIELD_OPTIONS[field_key])


class FormFillingService:
    """
    Service to map extracted document data onto form fields.
    Uses LLM to perform intelligent semantic matching with proper handling for
    addresses (present vs permanent), checkboxes, radio buttons, and dates.
    """
    
    def __init__(self):
        self.llm = get_llm()

    async def map_document_to_form(
        self, 
        docling_json: Dict, 
        form_schema: List[Dict]
    ) -> List[Dict]:
        """
        Maps document text blocks to form fields with coordinate tracking.
        
        Args:
            docling_json: The full JSON output from Docling or OCR boxes
            form_schema: List of fields from the form
            
        Returns:
            List of mappings: [{'field': 'full_name', 'value': 'John Doe', 'source_boxes': [...]}]
        """
        # 1. Flatten into snippets with IDs
        snippets = self._extract_snippets(docling_json)
        if not snippets:
            return []

        # 2. Build prompt
        prompt = self._build_enhanced_mapping_prompt(snippets, form_schema)
        
        try:
            # 3. Call LLM
            messages = [
                {"role": "system", "content": "You are a coordinate-aware semantic data mapping agent."},
                {"role": "user", "content": prompt}
            ]
            content = await asyncio.to_thread(generate_response, self.llm, messages)
            content = self._clean_json_response(content)
            raw_mappings = json.loads(content)
            
            # 4. Enrich with boxes
            return self._enrich_mappings(raw_mappings, snippets, form_schema)
        except Exception as e:
            print(f"  ❌ Enhanced Mapping failed: {e}")
            return []

    def _extract_snippets(self, doc_json: Dict) -> List[Dict]:
        """Extract text items with boxes from Docling or PaddleOCR JSON"""
        snippets = []

        # 1. Combined format: top-level "all_texts" (from form_processing-style combine)
        if doc_json.get("all_texts"):
            for item_id, text_item in enumerate(doc_json["all_texts"]):
                if not isinstance(text_item, dict):
                    continue
                content = (text_item.get("text") or text_item.get("content") or "").strip()
                if not content or len(content) < 2:
                    continue
                prov = text_item.get("prov", [])
                box = text_item.get("box")
                if not box and prov and isinstance(prov[0], dict):
                    box = prov[0].get("bbox")
                page_no = text_item.get("_page", text_item.get("page_number", 1))
                snippets.append({"id": item_id, "text": content, "box": box, "page": page_no})
            return snippets

        pages = doc_json.get("pages", [])
        if not pages and doc_json.get("texts"):
            pages = [{"texts": doc_json["texts"]}]
        elif not pages and doc_json.get("boxes"):
            # Fallback for PaddleOCR-style boxes
            for i, box in enumerate(doc_json.get("boxes", [])):
                if isinstance(box, dict):
                    snippets.append({
                        "id": i,
                        "text": box.get("text", ""),
                        "box": box.get("box"),
                        "page": box.get("page", 1)
                    })
                elif isinstance(box, (list, tuple)) and len(box) >= 4:
                    snippets.append({
                        "id": i,
                        "text": f"Text Block {i}",
                        "box": box[:4],
                        "page": 1
                    })
            return snippets

        item_id = 0
        for page_idx, page in enumerate(pages):
            if not isinstance(page, dict):
                continue
            # Support both {"texts": [...]} and {"data": {"texts": [...]}} (combined format)
            texts = page.get("texts") or (page.get("data") or {}).get("texts", [])
            for text_item in texts:
                if not isinstance(text_item, dict):
                    continue
                content = (text_item.get("text") or text_item.get("content") or "").strip()
                if not content or len(content) < 2:
                    continue
                box = text_item.get("box") or text_item.get("prov", [{}])[0].get("bbox")
                snippets.append({
                    "id": item_id,
                    "text": content,
                    "box": box,
                    "page": page_idx + 1
                })
                item_id += 1
        return snippets

    def _build_enhanced_mapping_prompt(self, snippets: List[Dict], form_schema: List[Dict]) -> str:
        snippets_str = "\n".join([f"[{s['id']}] {s['text']}" for s in snippets])
        target_schema = [
            {
                "key": f.get("field_key") or f.get("name"), 
                "label": f.get("field_name") or f.get("label"), 
                "type": (f.get("field_type") or "text_input").strip().lower(),
            } 
            for f in form_schema
        ]
        
        return f"""You are an expert form-filling assistant. Your task is to map extracted document snippets to form fields.

DOCUMENT SNIPPETS (with unique IDs):
{snippets_str}

TARGET FORM FIELDS:
{json.dumps(target_schema, indent=2, ensure_ascii=False)}

RULES:
1. EXTRACT and TRANSLATE: Extract the correct value for each form field from the snippets. If the snippet text is in Urdu/Arabic, translate the value to English.
2. COORDINATE TRACKING: For each field, you MUST provide the list of "snippet_ids" used to extract that value.
3. SEMANTIC MATCHING: Match by meaning (e.g., "Full Name" maps to the student's name snippet).
4. ADDRESS RULES: 
   - "Present Address": Current residence snippets.
   - "Permanent Address": ID card/Domicile address snippets.
5. CHECKBOX/RADIO:
   - For Gender: return "Male" or "Female" (string).
   - For Marital Status: return "Single" or "Married" (string).
   - For others: return bool (true/false) based on whether it appears checked or mentioned.
6. DATA INTEGRITY:
   - "Father's Name" should only contain the father's name, never their occupation or phone.
   - "CNIC" should only contain the 15-digit ID number.
   - Use null if no relevant snippet is found.

OUTPUT FORMAT (Return ONLY a JSON array):
[
  {{
    "field": "field_key",
    "value": "extracted value",
    "snippet_ids": [id1, id2]
  }}
]
"""

    def _normalize_coords(self, coords: Any) -> Optional[List[float]]:
        """Return [left, top, right, bottom] or None."""
        if coords is None:
            return None
        if isinstance(coords, (list, tuple)) and len(coords) >= 4:
            return [float(coords[0]), float(coords[1]), float(coords[2]), float(coords[3])]
        if isinstance(coords, dict):
            l, t = coords.get("l"), coords.get("t")
            r, b = coords.get("r"), coords.get("b")
            if l is not None and t is not None and r is not None and b is not None:
                return [float(l), float(t), float(r), float(b)]
        return None

    def _enrich_mappings(self, raw_mappings: List[Dict], snippets: List[Dict], form_schema: List[Dict]) -> List[Dict]:
        s_map = {s["id"]: s for s in snippets}
        # Create a mapping of field keys to their schema info (including bboxes)
        f_map = { (f.get("field_key") or f.get("name")): f for f in form_schema }
        
        enriched = []
        for m in raw_mappings:
            field_key = m.get("field")
            ids = m.get("snippet_ids", [])
            boxes = []
            for sid in ids:
                if sid in s_map and s_map[sid]["box"]:
                    boxes.append({
                        "page": s_map[sid]["page"],
                        "box": s_map[sid]["box"],
                        "text": s_map[sid]["text"]
                    })
            
            # Find target metadata
            target_meta = f_map.get(field_key, {})
            raw_box = target_meta.get("coordinates") or target_meta.get("bbox") or target_meta.get("box")
            coordinates = self._normalize_coords(raw_box)
            target_box = coordinates  # same as coordinates for frontend

            enriched.append({
                "field": field_key,
                "field_key": field_key,
                "field_name": target_meta.get("field_name") or target_meta.get("label") or field_key,
                "value": m.get("value"),
                "source_boxes": boxes,
                "target_box": target_box,
                "coordinates": coordinates,
                "page_number": target_meta.get("page_number", 1),
                "field_type": target_meta.get("field_type") or "text_input"
            })
        return enriched

    async def fill_form(
        self, 
        form_fields: List[Dict[str, Any]], 
        document_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Map document data to form fields using AI for intelligent mapping.
        
        Args:
            form_fields: List of field dicts (from FormProcessingService)
            document_data: Merged data from documents (from DocumentProcessingService)
            
        Returns:
            Updated form_fields with a new 'value' key for each field
        """
        print("\n🤖 Mapping document data to form fields (AI)...")
        
        # 1. Prepare target schema with full context for the LLM (key, label, type)
        target_schema = [
            {
                "key": f.get("field_key"), 
                "label": f.get("field_name"), 
                "type": (f.get("field_type") or "text_input").strip().lower(),
            } 
            for f in form_fields
        ]

        # 2. Build the detailed prompt
        prompt = self._build_mapping_prompt(document_data, target_schema)
        system_prompt = self._get_system_prompt()
        
        try:
            # 3. Call LLM (sync in thread to not block event loop)
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ]
            content = await asyncio.to_thread(generate_response, self.llm, messages)
            content = self._clean_json_response(content)
            mapped_values = json.loads(content)
            
            if not isinstance(mapped_values, dict):
                mapped_values = {}
            print(f"  ✓ Mapped {len(mapped_values)} fields")

            # 4. Merge values back and normalize checkbox/radio to boolean
            filled_fields = []
            for field in form_fields:
                key = field.get("field_key")
                field_type = (field.get("field_type") or "text_input").strip().lower()
                new_field = field.copy()
                
                if key in mapped_values:
                    raw = mapped_values[key]
                    # Radio-style (Gender, Status): keep option string "Female"/"Single" etc. for correct circle
                    if field_type in BOOLEAN_FIELD_TYPES and _is_radio_option_value(key, raw):
                        new_field["value"] = raw if isinstance(raw, str) else str(raw).strip()
                    elif field_type in BOOLEAN_FIELD_TYPES:
                        new_field["value"] = _normalize_boolean_value(raw)
                    else:
                        new_field["value"] = raw if raw is not None else None
                else:
                    new_field["value"] = None
                
                filled_fields.append(new_field)
                
            return filled_fields

        except Exception as e:
            print(f"  ❌ Mapping failed: {e}")
            return [dict(f, value=None) for f in form_fields]

    def _get_system_prompt(self) -> str:
        return """You are an expert form-filling assistant. You map data extracted from user documents (ID cards, CVs, certificates, domicile, etc.) onto form fields.

Your job is to:
1. Match source data to form fields by meaning (semantic match), not just key names.
2. Follow field-type rules below exactly.
3. Never invent data. Use only what appears in the SOURCE DATA. If nothing matches, use null.

FIELD-TYPE RULES:

— ADDRESSES (critical distinction):
• "Present Address" / "address" (in present section): Current residence, where the person lives NOW. Use: contact_info.address, current address from CV, or any "current/present" address in source. If only one address exists and it's clearly permanent (e.g. from ID/domicile), you may use it but prefer labeling as present when form asks for "Present".
• "Permanent Address" / "permanent_address" / "address_permanent": Permanent/native address, usually on ID or domicile. Use: applicant.address_in_pakistan (format as full address string), place_of_domicile, or any "permanent" address. For nested address_in_pakistan use: street, mohallah, city, tehsil, district, province to build one string.
• "Address" alone: Infer from context. If the form groups it with "Permanent" or "Division" (permanent), use permanent address. If with "Present", use present address.
• Division fields (division, division_permanent): Use district/division from the corresponding address (e.g. Lahore, PUNJAB).

— CHECKBOX and RADIO (critical for correct overlay):
• For "Gender" field: return the selected option as string: "Male" or "Female" (from source gender, applicant data, or infer from name/context). Use "Female" if source says female or suggests it; "Male" otherwise. Never return true/false for Gender.
• For "Status" field (Single/Married): return "Single" or "Married" from marital_status or equivalent in source. Never return true/false for Status.
• For other checkbox fields (e.g. Employed/Student): return boolean true or false.
• Do not return null for Gender/Status when source has the info; use "Female"/"Male" and "Single"/"Married" so the correct radio circle is filled.

— TEXT / TEXTAREA / DATE (strict mapping — wrong field = wrong box on form):
• "Student's Name" / "Candidate Name" → ONLY name, full_name, applicant.full_name. Never occupation, CNIC, or phone.
• "Father's Name" → ONLY father_name. Never occupation (e.g. JOBLESS), never CNIC.
• "Mother's Name" → ONLY mother_name. Never CNIC, never NID, never phone.
• "Birth Date" / "Date of Birth" → ONLY date_of_birth. Never phone number, never CNIC. Format YYYY-MM-DD.
• "Phone Number" / "Phone" → ONLY phone_number, contact_info.phone_number. Never date, never email.
• "Email Address" → ONLY email, contact_info.email. Never put email next to Gender or other wrong label.
• "Occupation" → ONLY designation, trade_or_occupation, job title. Never father's name or person name.
• "Course Name" → ONLY course name, degree name, or education program. Never student name.
• "Religion" → ONLY religion from source. Never address or nationality.
• "Nationality" → ONLY nationality. Never address or religion.
• "NID Number" / "CNIC" → ONLY nid/cnic from source. Never phone or date.
• Dates: normalize to YYYY-MM-DD when possible. Phone/CNIC: use format from source.

— DROPDOWN:
• Return the exact option text that matches the source (e.g. source "PUNJAB" → return "Punjab" or the form's option text).

OUTPUT: Return a single JSON object. Keys = TARGET field "key", values = mapped value (string, number, boolean, or null). Include every target key; use null when no source data fits."""

    def _build_mapping_prompt(self, source_data: Dict, target_schema: List[Dict]) -> str:
        return f"""SOURCE DATA (extracted from user documents):
{json.dumps(source_data, indent=2, ensure_ascii=False)}

TARGET FORM FIELDS (key = use this as key in your JSON output; label = human label on form; type = how to fill):
{json.dumps(target_schema, indent=2, ensure_ascii=False)}

TASK: For each TARGET field "key", set the value from SOURCE DATA using the rules you were given. Pay special attention to:
- present_address vs permanent_address (present = current residence; permanent = ID/domicile address).
- Gender: return "Male" or "Female" (string). Status: return "Single" or "Married" (string). Other checkboxes: true/false.
- Match each label to the correct source key: Student's Name→name, Father's Name→father_name, Mother's Name→mother_name, Birth Date→date_of_birth, Phone Number→phone_number, Email→email, Occupation→designation/trade, Course Name→course/degree. Do not mix (e.g. never put occupation in Father's Name or CNIC in Mother's Name).
- Dates as YYYY-MM-DD when possible.

Return ONLY a single JSON object: keys = target "key", values = filled value (string, number, boolean, or null). No explanation, no markdown code fence."""

    def _clean_json_response(self, content: str) -> str:
        content = content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        return content

# Create singleton
form_filling_service = FormFillingService()