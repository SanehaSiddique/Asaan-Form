import asyncio
import json
from typing import Any, Dict, List, Optional

from app.utils.llm import get_llm, generate_response

# Field types drawn as checkmark (True/False)
BOOLEAN_FIELD_TYPES = ("checkbox", "radio")

# Fallback options for known radio/checkbox keys if field schema has none
KNOWN_CHECKBOX_OPTIONS: Dict[str, List[str]] = {
    "gender": ["Male", "Female"],
    "sex": ["Male", "Female"],
    "marital_status": ["Single", "Married", "Divorced"],
    "status": ["Single", "Married"],
    "residence_status": ["Resident", "Non-Resident"],
    "residential_status": ["Resident", "Non-Resident"],
    "payment_method": ["Cash", "Cheque", "Online"],
    "employment_status": ["Employed", "Unemployed", "Self-Employed"],
    "blood_group": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
}


# ──────────────────────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────────────────────

def _normalize_boolean_value(value: Any) -> bool:
    """Normalize various truthy strings/values to bool for single checkboxes."""
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    s = str(value).strip().lower()
    return s in ("true", "yes", "1", "checked", "x", "✓", "✔", "on")


def _is_multi_option_checkbox(field: Dict) -> bool:
    """True when the field has array-of-arrays coordinates (one bbox per option)."""
    coords = field.get("coordinates", [])
    return (
        isinstance(coords, list)
        and len(coords) > 0
        and isinstance(coords[0], (list, tuple))
        and len(coords[0]) >= 4
    )


def _get_field_options(field: Dict) -> List[str]:
    """
    Return the options list for a checkbox field.
    Falls back to KNOWN_CHECKBOX_OPTIONS by field_key if not stored.
    """
    options = field.get("options") or []
    if options:
        return options
    key = (field.get("field_key") or "").lower()
    if key in KNOWN_CHECKBOX_OPTIONS:
        return KNOWN_CHECKBOX_OPTIONS[key]
    # Last resort: infer count from bbox array
    coords = field.get("coordinates", [])
    if isinstance(coords, list) and coords and isinstance(coords[0], list):
        count = len(coords)
        if count == 2:
            return ["Yes", "No"]
        return [f"Option{i+1}" for i in range(count)]
    return []


def _normalize_checkbox_value(field: Dict, raw: Any) -> Any:
    """
    For multi-option checkboxes: return the matching option string.
    For single checkboxes: return bool.
    """
    if _is_multi_option_checkbox(field):
        options = _get_field_options(field)
        if not options:
            return raw  # can't normalize without options
        raw_str = str(raw).strip().lower() if raw is not None else ""

        # Exact match first
        for opt in options:
            if raw_str == opt.lower():
                return opt  # return canonical casing from options list

        # Partial match (e.g. LLM returned "male" for option "Male")
        for opt in options:
            if raw_str in opt.lower() or opt.lower() in raw_str:
                return opt

        # LLM returned bool for a multi-option field — pick by True=first, False=second
        if isinstance(raw, bool):
            return options[0] if raw else (options[1] if len(options) > 1 else options[0])

        # Return raw as-is; overlay will do a final fallback
        return raw
    else:
        # Single checkbox — normalize to bool
        return _normalize_boolean_value(raw)


# ──────────────────────────────────────────────────────────────────────────────
# SERVICE
# ──────────────────────────────────────────────────────────────────────────────

class FormFillingService:
    """
    Maps extracted document data onto form fields using LLM semantic matching.
    Correctly handles text, date, textarea, AND multi-option checkbox/radio fields.
    """

    def __init__(self):
        self.llm = get_llm()

    async def fill_form(
        self,
        form_fields: List[Dict[str, Any]],
        document_data: Dict[str, Any],
        document_ocr_text: Optional[str] = None,
        validation_feedback: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Map document data to form fields using AI for intelligent mapping.
        Returns form_fields list with a 'value' key on each field.
        """
        print("\n🤖 Mapping document data to form fields (AI)...")

        # Token Optimization 1: Truncate document_ocr_text if it's too long (413 error fix)
        max_ocr_chars = 10000
        if document_ocr_text and len(document_ocr_text) > max_ocr_chars:
            print(f"  ⚠️ Truncating OCR text from {len(document_ocr_text)} to {max_ocr_chars} chars")
            document_ocr_text = document_ocr_text[:max_ocr_chars] + "... [TRUNCATED]"

        # Token Optimization 2: Prune target schema to essential fields only
        target_schema = []
        for f in form_fields:
            field_type = (f.get("field_type") or "text_input").strip().lower()
            entry: Dict[str, Any] = {
                "key": f.get("field_key"),
                "label": f.get("field_name"),
                "type": field_type,
            }
            if field_type in BOOLEAN_FIELD_TYPES:
                options = _get_field_options(f)
                if options:
                    entry["options"] = options
            target_schema.append(entry)

        prompt = self._build_mapping_prompt(document_data, target_schema, document_ocr_text, validation_feedback)
        system_prompt = self._get_system_prompt()

        try:
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

            # Merge values back with normalization
            filled_fields = []
            for field in form_fields:
                key = field.get("field_key")
                field_type = (field.get("field_type") or "text_input").strip().lower()
                new_field = field.copy()
                # Always preserve options array through the pipeline
                if "options" not in new_field:
                    new_field["options"] = _get_field_options(field)

                if key in mapped_values:
                    raw = mapped_values[key]
                    if field_type in BOOLEAN_FIELD_TYPES:
                        new_field["value"] = _normalize_checkbox_value(field, raw)
                    else:
                        new_field["value"] = raw if raw is not None else None
                else:
                    new_field["value"] = None

                filled_fields.append(new_field)

            return filled_fields

        except Exception as e:
            print(f"  ❌ Mapping failed: {e}")
            return [dict(f, value=None) for f in form_fields]

    # ------------------------------------------------------------------ #
    # SYSTEM PROMPT                                                        #
    # ------------------------------------------------------------------ #
    def _get_system_prompt(self) -> str:
        return """You are an expert form-filling assistant. You map data extracted from user documents (ID cards, CVs, certificates, domicile, etc.) onto form fields.

Your job is to:
1. Match source data to form fields by meaning (semantic match), not just key names.
2. Follow field-type rules below exactly.
3. Be flexible and use Common Sense: If info isn't explicitly in a JSON key, scan the RAW OCR TEXT for patterns.
4. Never invent data that isn't in the source, but DO infer logical certainties (e.g., if Name is "Ahmed" and OCR sees "Ahmd", use "Ahmed").

━━━ COMMON SENSE & INFERENCES ━━━
• NATIONALITY: If the source document is a Pakistani CNIC/NICOP/SNIC, assume Nationality is "Pakistani" unless stated otherwise.
• GENDER: If the source JSON has gender "M" or "Male" and the form has "Male", pick "Male".
• NAMES: OCR often garbles names (e.g., "VERMATONARIOTAL" instead of "VICTORIA"). Look for the most logical human name in the OCR text that matches the context. If a name looks like absolute gibberish, look for other candidates in the OCR.

━━━ FIELD-TYPE RULES ━━━

— ADDRESSES (critical distinction):
• "Present Address" / "Temporary Address": Current residence. Use contact_info.address or any current/present address.
• "Permanent Address": Permanent/native address from ID or domicile.
• "Address" alone: Infer from context.

— CHECKBOX WITH MULTIPLE OPTIONS (most critical rule):
Each checkbox field in the schema has an "options" array like ["Male", "Female"].
These are the exact strings printed on the form next to each circle/box.
You MUST return the selected option as EXACTLY one of those strings.

Rules:
• gender / sex → return "Male" or "Female" (NEVER true/false)
• marital_status → return "Single", "Married", or "Divorced" (NEVER true/false)
• For ANY multi-option checkbox: return the option string that matches source data
• NEVER return true/false when options are provided
• NEVER return an integer index

— TEXT / TEXTAREA / DATE (strict label-to-source mapping):
• "Full Name" → name, full_name only. Be a human and recognize real names!
• "Father's Name" → father_name only.
• "Date of Birth" → date_of_birth only. Format YYYY-MM-DD.
• "CNIC" / "NID" / "National ID" → nid or cnic only.
• "Religion" → religion only.
• "Nationality" → nationality only. (See inference rule above).

OUTPUT: Return a single JSON object. Keys = field "key" from schema.
Values = mapped value (string for most fields, bool only for single checkboxes with no options).
Include every key; use null when no source data fits."""

    # ------------------------------------------------------------------ #
    # USER PROMPT                                                          #
    # ------------------------------------------------------------------ #
    def _build_mapping_prompt(
        self,
        source_data: Dict,
        target_schema: List[Dict],
        ocr_text: Optional[str] = None,
        validation_feedback: Optional[str] = None,
    ) -> str:
        ocr_section = (
            f"\nRAW OCR TEXT (additional context):\n{ocr_text}\n" if ocr_text else ""
        )
        
        feedback_section = ""
        if validation_feedback:
            feedback_section = f"\n⚠️ NOTE ON PREVIOUS ATTEMPT FAILURE:\nThe last attempt was rejected by our validator for: \"{validation_feedback}\"\nPLEASE LEARN FROM THIS ERROR and provide a more accurate value this time.\n"

        return f"""SOURCE DATA (extracted from user documents):
{json.dumps(source_data, indent=2, ensure_ascii=False)}
{ocr_section}
{feedback_section}
TARGET FORM FIELDS:
(key = use as JSON key in output | label = human label | type = field type | options = for checkboxes, pick EXACTLY one of these strings)
{json.dumps(target_schema, indent=2, ensure_ascii=False)}

TASK:
For each field "key", pick the value from SOURCE DATA following the rules you were given.

CRITICAL FOR CHECKBOXES:
- If a field has "options": ["Male", "Female"] → you MUST return "Male" or "Female" (exact string)
- NEVER return true/false when options are provided
- Match the source data to the closest option string

Return ONLY a single JSON object: keys = field "key", values = filled value. No explanation, no markdown."""

    def _clean_json_response(self, content: str) -> str:
        content = content.strip()
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        return content


# Singleton
form_filling_service = FormFillingService()