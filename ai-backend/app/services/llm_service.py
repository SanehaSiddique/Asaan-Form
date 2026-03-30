import json
import asyncio
from typing import Dict, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from app.utils.llm import get_llm

# Default options for known checkbox field keys when LLM cannot infer from context
KNOWN_CHECKBOX_OPTIONS = {
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


class FormExtractionService:
    """
    Service to extract form fields using LLM.
    Handles:
      - text/date/textarea fields: flat [l,t,r,b] coordinates
      - checkbox/radio fields: array-of-arrays coordinates, one bbox per option
    """

    def __init__(self):
        self.llm = get_llm()
        print(f"✓ LLM initialized: {self.llm.model_name}")

    async def extract_fields(self, docling_json: Dict) -> Dict:
        print("🤖 Starting field extraction (JSON only)")
        filtered_json = self._filter_useful_json(docling_json)
        print("✓ Filtered JSON: extracted only texts and tables with coordinates")
        chunks = self._chunk_json(filtered_json)
        print(f"✓ Split into {len(chunks)} chunks")

        all_extractions = []
        for i, chunk in enumerate(chunks, 1):
            print(f"  Processing chunk {i}/{len(chunks)}...")
            extraction = await self._extract_from_chunk(chunk, i, len(chunks))
            if extraction:
                field_count = len(extraction.get('form_fields', []))
                print(f"    ✓ Found {field_count} fields")
                all_extractions.append(extraction)
            else:
                print(f"    ⚠️  Chunk {i} failed")
            if i < len(chunks):
                await asyncio.sleep(2)

        merged = self._merge_extractions(all_extractions)
        # Inject default options for any checkbox fields still missing them
        merged = self._inject_known_options(merged)

        total_fields = len(merged.get('form_fields', []))
        total_instructions = len(merged.get('instructions', []))
        print(f"✓ Total extracted: {total_fields} fields, {total_instructions} instructions")
        return merged

    # ------------------------------------------------------------------ #
    # POST-PROCESS: inject known options for checkbox fields without them #
    # ------------------------------------------------------------------ #
    def _inject_known_options(self, merged: Dict) -> Dict:
        for field in merged.get("form_fields", []):
            if field.get("field_type") != "checkbox":
                continue
            key = (field.get("field_key") or "").lower()
            if field.get("options"):
                continue  # already has options, skip
            if key in KNOWN_CHECKBOX_OPTIONS:
                field["options"] = KNOWN_CHECKBOX_OPTIONS[key]
                print(f"  ✓ Injected options for '{key}': {field['options']}")
            else:
                # Infer from bbox count
                coords = field.get("coordinates", [])
                if isinstance(coords, list) and coords and isinstance(coords[0], list):
                    count = len(coords)
                    if count == 2:
                        field["options"] = ["Yes", "No"]
                    else:
                        field["options"] = [f"Option{i+1}" for i in range(count)]
        return merged

    # ------------------------------------------------------------------ #
    # FILTER (unchanged from original)                                    #
    # ------------------------------------------------------------------ #
    def _filter_useful_json(self, json_data: Dict) -> Dict:
        filtered = {
            "texts": [],
            "tables": [],
            "metadata": {
                "total_pages": (
                    json_data.get("metadata", {}).get("total_pages", 0)
                    if isinstance(json_data.get("metadata"), dict) else 0
                )
            }
        }

        if "all_texts" in json_data:
            texts = json_data["all_texts"]
        elif "texts" in json_data:
            texts = json_data["texts"]
        elif "main-text" in json_data:
            texts = json_data["main-text"]
        elif "pages" in json_data:
            texts = []
            for page in json_data["pages"]:
                if isinstance(page, dict):
                    texts.extend(page.get("texts", page.get("main-text", [])))
        else:
            texts = []

        for text_item in texts:
            if not isinstance(text_item, dict):
                continue
            filtered_text = {}
            text_content = (
                text_item.get("text") or text_item.get("content")
                or text_item.get("value") or text_item.get("text_content")
            )
            if not text_content or not str(text_content).strip():
                continue
            filtered_text["text"] = str(text_content).strip()

            prov = text_item.get("prov", [])
            if prov and isinstance(prov, list):
                prov_item = prov[0] if isinstance(prov[0], dict) else {}
                bbox = prov_item.get("bbox", {})
                if bbox and isinstance(bbox, dict):
                    filtered_text["bbox"] = {k: bbox.get(k) for k in ("l", "t", "r", "b")}
                elif bbox and isinstance(bbox, list) and len(bbox) >= 4:
                    filtered_text["bbox"] = {"l": bbox[0], "t": bbox[1], "r": bbox[2], "b": bbox[3]}
                page_no = prov_item.get("page_no") or prov_item.get("page")
                if page_no is not None:
                    filtered_text["page_number"] = int(page_no)

            if "_page" in text_item:
                filtered_text["page_number"] = int(text_item["_page"])
            for label_key in ("label", "name"):
                if label_key in text_item:
                    filtered_text["label"] = text_item[label_key]
                    break
            for span_key in ("charspan", "span"):
                if span_key in text_item:
                    filtered_text["charspan"] = text_item[span_key]
                    break

            if filtered_text.get("text") and filtered_text.get("bbox"):
                filtered["texts"].append(filtered_text)

        for table_item in json_data.get("tables", []):
            if not isinstance(table_item, dict):
                continue
            filtered_table = {}
            table_content = (
                table_item.get("table") or table_item.get("content") or table_item.get("data")
            )
            if not table_content and "cells" in table_item:
                table_content = {"cells": table_item["cells"]}
            if table_content:
                filtered_table["table"] = table_content
            prov = table_item.get("prov", [])
            if prov and isinstance(prov, list):
                prov_item = prov[0] if isinstance(prov[0], dict) else {}
                bbox = prov_item.get("bbox", {})
                if bbox and isinstance(bbox, dict):
                    filtered_table["bbox"] = {k: bbox.get(k) for k in ("l", "t", "r", "b")}
                elif bbox and isinstance(bbox, list) and len(bbox) >= 4:
                    filtered_table["bbox"] = {"l": bbox[0], "t": bbox[1], "r": bbox[2], "b": bbox[3]}
                page_no = prov_item.get("page_no") or prov_item.get("page")
                if page_no is not None:
                    filtered_table["page_number"] = int(page_no)
            if "label" in table_item:
                filtered_table["label"] = table_item["label"]
            if filtered_table.get("table") and filtered_table.get("bbox"):
                filtered["tables"].append(filtered_table)

        return filtered

    # ------------------------------------------------------------------ #
    # CHUNK (unchanged from original)                                     #
    # ------------------------------------------------------------------ #
    def _chunk_json(self, json_data: Dict, max_size: int = 20000) -> List[str]:
        json_str = json.dumps(json_data, indent=2, ensure_ascii=False)
        if len(json_str) <= max_size:
            return [json_str]
        chunks = []
        if "all_texts" in json_data:
            texts = json_data["all_texts"]
            metadata = json_data.get("metadata", {})
            num_chunks = max(1, (len(json_str) // max_size) + 1)
            items_per_chunk = max(5, len(texts) // num_chunks)
            for i in range(0, len(texts), items_per_chunk):
                chunks.append(json.dumps({
                    "texts": texts[i:i + items_per_chunk],
                    "metadata": metadata,
                    "chunk_info": f"items {i} to {min(i+items_per_chunk, len(texts))} of {len(texts)}"
                }, indent=2, ensure_ascii=False))
        elif "texts" in json_data:
            texts = json_data["texts"]
            metadata = {k: v for k, v in json_data.items() if k != "texts"}
            num_chunks = max(1, (len(json_str) // max_size) + 1)
            items_per_chunk = max(5, len(texts) // num_chunks)
            for i in range(0, len(texts), items_per_chunk):
                chunks.append(json.dumps({
                    "texts": texts[i:i + items_per_chunk],
                    "metadata": metadata.get("origin", {}),
                    "chunk_info": f"items {i} to {min(i+items_per_chunk, len(texts))}"
                }, indent=2, ensure_ascii=False))
        elif "pages" in json_data:
            for page in json_data["pages"]:
                page_str = json.dumps(page, indent=2, ensure_ascii=False)
                if len(page_str) <= max_size:
                    chunks.append(page_str)
                else:
                    for i in range(0, len(page_str), max_size):
                        chunks.append(page_str[i:i + max_size])
        else:
            for i in range(0, len(json_str), max_size):
                chunks.append(json_str[i:i + max_size])
        return chunks if chunks else [json_str]

    # ------------------------------------------------------------------ #
    # EXTRACT FROM CHUNK                                                  #
    # ------------------------------------------------------------------ #
    async def _extract_from_chunk(
        self, json_chunk: str, chunk_num: int, total_chunks: int
    ) -> Optional[Dict]:
        prompt = self._build_prompt(json_chunk, chunk_num, total_chunks)
        try:
            messages = [
                SystemMessage(content=(
                    "You are a form extraction expert. Extract form fields with precise "
                    "coordinates and metadata. Always respond with valid JSON."
                )),
                HumanMessage(content=prompt)
            ]
            response = await self.llm.ainvoke(messages)
            content = response.content
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                parts = content.split("```")
                if len(parts) >= 2:
                    content = parts[1].strip()
                    if content.startswith(("json", "JSON")):
                        content = content[4:].strip()
            result = json.loads(content)
            if not all(k in result for k in ["form_fields", "instructions", "special_areas"]):
                print(f"      ⚠️  Invalid structure in chunk {chunk_num}")
                return None
            return result
        except json.JSONDecodeError as e:
            print(f"      ❌ JSON parse error: {str(e)[:50]}")
            return None
        except Exception as e:
            print(f"      ❌ Error: {str(e)[:80]}")
            return None

    # ------------------------------------------------------------------ #
    # BUILD PROMPT — multi-bbox coords + options for checkboxes           #
    # ------------------------------------------------------------------ #
    def _build_prompt(self, json_chunk: str, chunk_num: int, total_chunks: int) -> str:
        return f"""You are analyzing a form document to extract all fillable fields.

CHUNK {chunk_num} OF {total_chunks}

JSON DATA:
{json_chunk}

YOUR TASK: Extract every fillable field. For each field follow these rules exactly.

━━━ FIELD TYPES ━━━
• text_input   — single-line text box
• textarea     — multi-line text box
• date         — date field (DD/MM/YYYY etc.)
• checkbox     — ANY field where user picks from options: Gender (Male/Female),
                 Marital Status, Residence Status, Payment Method, Yes/No,
                 Blood Group, Employment Status, etc.
                 When you see multiple boxes/circles in a row = always checkbox.
• signature    — signature area
• dropdown     — select/combo box
• image_upload — photo/passport image area

━━━ COORDINATES — THIS IS THE MOST IMPORTANT RULE ━━━

TEXT fields (text_input, textarea, date, signature, dropdown, image_upload):
  coordinates = flat array of 4 numbers [left, top, right, bottom]
  ✓ CORRECT: [59.74, 952.25, 124.59, 938.32]
  ✗ WRONG:   [[59.74, 952.25, 124.59, 938.32]]

CHECKBOX fields:
  coordinates = array of arrays — one [l, t, r, b] per option, left-to-right
  ✓ CORRECT 2 options: [[127.11, 481.67, 162.88, 472.94], [246.58, 481.67, 292.42, 472.24]]
  ✓ CORRECT 3 options: [[142.39, 404.83, 166.70, 395.05], [265.68, 404.48, 295.20, 396.09], [383.76, 404.48, 435.86, 396.09]]
  ✗ WRONG: [127.11, 481.67, 162.88, 472.94]  (flat = only first option)

━━━ OPTIONS ARRAY FOR CHECKBOXES ━━━
Read the text labels next to each box/circle on the form.
"options" must be in the SAME ORDER as the coordinate arrays (left to right).
Defaults if you cannot read labels:
  gender / sex            → ["Male", "Female"]
  marital_status          → ["Single", "Married", "Divorced"]
  residence_status        → ["Resident", "Non-Resident"]
  payment_method          → ["Cash", "Cheque", "Online"]
  2-option unknown        → ["Yes", "No"]
  3-option unknown        → ["Option1", "Option2", "Option3"]

Non-checkbox fields must have "options": []

━━━ OTHER RULES ━━━
• field_key: snake_case version of field_name, unique across all fields
• span: extract from charspan if present, else {{"offset": 0, "length": 0}}
• page_number: from prov[0].page_no
• required: true for most form fields
• validation: "numeric" for IDs/amounts, "email" for email, "date" for dates, else null

━━━ OUTPUT FORMAT (respond ONLY with this JSON, no explanation) ━━━
{{
  "form_fields": [
    {{
      "field_name": "Student's Name",
      "field_key": "student_name",
      "field_type": "text_input",
      "required": true,
      "validation": null,
      "coordinates": [59.74, 952.25, 124.59, 938.32],
      "options": [],
      "span": {{"offset": 0, "length": 11}},
      "page_number": 1
    }},
    {{
      "field_name": "Gender",
      "field_key": "gender",
      "field_type": "checkbox",
      "required": true,
      "validation": null,
      "coordinates": [
        [127.11, 481.67, 162.88, 472.94],
        [246.58, 481.67, 292.42, 472.24]
      ],
      "options": ["Male", "Female"],
      "span": {{"offset": 0, "length": 0}},
      "page_number": 1
    }},
    {{
      "field_name": "Marital Status",
      "field_key": "marital_status",
      "field_type": "checkbox",
      "required": true,
      "validation": null,
      "coordinates": [
        [142.39, 404.83, 166.70, 395.05],
        [265.68, 404.48, 295.20, 396.09],
        [383.76, 404.48, 435.86, 396.09]
      ],
      "options": ["Single", "Married", "Divorced"],
      "span": {{"offset": 0, "length": 0}},
      "page_number": 1
    }}
  ],
  "instructions": ["Fill all required fields"],
  "special_areas": [
    {{
      "type": "signature",
      "label": "Signature of Applicant",
      "requirements": null,
      "coordinates": [100, 200, 150, 250]
    }}
  ]
}}

Extract ALL fields found in this chunk.
"""

    # ------------------------------------------------------------------ #
    # MERGE — checkbox deduplication prefers more option bboxes           #
    # ------------------------------------------------------------------ #
    def _merge_extractions(self, extractions: List[Dict]) -> Dict:
        merged = {"form_fields": [], "instructions": [], "special_areas": []}
        seen_fields: Dict[str, int] = {}  # field_key -> index in merged list
        seen_instructions: set = set()
        seen_areas: set = set()

        for extraction in extractions:
            for field in extraction.get("form_fields", []):
                field_key = field.get("field_key", "")
                if not field_key:
                    continue

                if field_key not in seen_fields:
                    seen_fields[field_key] = len(merged["form_fields"])
                    merged["form_fields"].append(field)
                else:
                    # For checkbox fields, keep the one with more option bboxes
                    existing_idx = seen_fields[field_key]
                    existing = merged["form_fields"][existing_idx]
                    new_coords = field.get("coordinates", [])
                    existing_coords = existing.get("coordinates", [])
                    is_new_multi = (
                        isinstance(new_coords, list) and new_coords
                        and isinstance(new_coords[0], list)
                    )
                    is_existing_multi = (
                        isinstance(existing_coords, list) and existing_coords
                        and isinstance(existing_coords[0], list)
                    )
                    # Replace if new has multi-bbox and existing doesn't, or new has more options
                    if is_new_multi and (
                        not is_existing_multi
                        or len(new_coords) > len(existing_coords)
                    ):
                        merged["form_fields"][existing_idx] = field

            for instruction in extraction.get("instructions", []):
                if instruction and instruction not in seen_instructions:
                    seen_instructions.add(instruction)
                    merged["instructions"].append(instruction)

            for area in extraction.get("special_areas", []):
                area_label = area.get("label", "")
                if area_label and area_label not in seen_areas:
                    seen_areas.add(area_label)
                    merged["special_areas"].append(area)

        return merged