import json
from typing import Dict, List, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from app.utils.llm import get_llm


class FormExtractionService:
    """
    Service to extract form fields using LLM
    Takes markdown + JSON and identifies form fields with coordinates
    """
    
    def __init__(self):
        """Initialize the LLM service with your existing LangChain setup"""
        self.llm = get_llm()
        print(f"✓ LLM initialized: {self.llm.model_name}")
    
    async def extract_fields(
        self, 
        markdown: str, 
        docling_json: Dict
    ) -> Dict:
        """
        Main method: Extract form fields from markdown and JSON
        
        Args:
            markdown: Markdown content from Docling
            docling_json: JSON with bounding boxes from Docling
            
        Returns:
            Dict with:
                - form_fields: List of extracted fields
                - instructions: List of form instructions
                - special_areas: List of special areas (signature, photo, etc.)
        """
        print(f"🤖 Starting field extraction")
        
        # Split JSON into chunks (LLM has token limits)
        chunks = self._chunk_json(docling_json)
        print(f"✓ Split into {len(chunks)} chunks")
        
        # Process each chunk
        all_extractions = []
        for i, chunk in enumerate(chunks, 1):
            print(f"  Processing chunk {i}/{len(chunks)}...")
            
            extraction = await self._extract_from_chunk(
                markdown, 
                chunk, 
                i, 
                len(chunks)
            )
            
            if extraction:
                field_count = len(extraction.get('form_fields', []))
                print(f"    ✓ Found {field_count} fields")
                all_extractions.append(extraction)
            else:
                print(f"    ⚠️  Chunk {i} failed")
        
        # Merge all extractions
        merged = self._merge_extractions(all_extractions)
        
        total_fields = len(merged.get('form_fields', []))
        total_instructions = len(merged.get('instructions', []))
        print(f"✓ Total extracted: {total_fields} fields, {total_instructions} instructions")
        
        return merged
    
    def _chunk_json(self, json_data: Dict, max_size: int = 8000) -> List[str]:
        """
        Split large JSON into smaller chunks
        
        Args:
            json_data: The docling JSON
            max_size: Maximum characters per chunk
            
        Returns:
            List of JSON string chunks
        """
        json_str = json.dumps(json_data, indent=2, ensure_ascii=False)
        
        # If small enough, return as single chunk
        if len(json_str) <= max_size:
            return [json_str]
        
        chunks = []
        
        # Try to chunk intelligently by 'texts' array
        if isinstance(json_data, dict) and 'texts' in json_data:
            texts = json_data['texts']
            metadata = {k: v for k, v in json_data.items() if k != 'texts'}
            
            # Calculate how many items per chunk
            num_chunks = (len(json_str) // max_size) + 1
            items_per_chunk = max(5, len(texts) // num_chunks)
            
            # Create chunks
            for i in range(0, len(texts), items_per_chunk):
                chunk_data = {
                    'texts': texts[i:i + items_per_chunk],
                    'metadata': metadata.get('origin', {}),
                    'chunk_info': f'items {i} to {i + items_per_chunk}'
                }
                chunks.append(json.dumps(chunk_data, indent=2, ensure_ascii=False))
        else:
            # Fallback: simple character split
            for i in range(0, len(json_str), max_size):
                chunks.append(json_str[i:i + max_size])
        
        return chunks
    
    async def _extract_from_chunk(
        self,
        markdown: str,
        json_chunk: str,
        chunk_num: int,
        total_chunks: int
    ) -> Optional[Dict]:
        """
        Extract fields from a single chunk using LLM
        
        Args:
            markdown: Full markdown for context
            json_chunk: This specific JSON chunk
            chunk_num: Current chunk number
            total_chunks: Total number of chunks
            
        Returns:
            Extracted data or None if failed
        """
        prompt = self._build_prompt(markdown, json_chunk, chunk_num, total_chunks)
        
        try:
            # Use LangChain's ChatOpenAI
            messages = [
                SystemMessage(
                    content="You are a form extraction expert. Extract form fields with precise coordinates and metadata. Always respond with valid JSON."
                ),
                HumanMessage(content=prompt)
            ]
            
            # Invoke LLM
            response = await self.llm.ainvoke(messages)
            
            # Parse response
            content = response.content
            
            # Clean markdown code blocks if present
            if "```json" in content:
                content = content.split("```json").split("```").strip()[1]
            elif "```" in content:
                content = content.split("```")[8].split("```")[0].strip()
            
            # Parse JSON
            result = json.loads(content)
            
            # Validate structure
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
    
    def _build_prompt(
        self,
        markdown: str,
        json_chunk: str,
        chunk_num: int,
        total_chunks: int
    ) -> str:
        """Build the extraction prompt"""
        
        # Truncate markdown for context (to save tokens)
        markdown_preview = markdown[:2000] + "..." if len(markdown) > 2000 else markdown
        
        return f"""
You are analyzing a form to extract fillable fields.

**CHUNK {chunk_num} OF {total_chunks}**

**FORM MARKDOWN (for context):**
{markdown_preview}

**JSON METADATA CHUNK:**
{json_chunk}

**YOUR TASK:**
Extract all form fields from this chunk. For each field:

1. **Identify the field label** (e.g., "Name", "Date of Birth", "Address")
2. **Determine field type**: 
   - text_input (single line text)
   - textarea (multi-line text)
   - date (date fields)
   - checkbox (checkboxes)
   - signature (signature areas)
   - dropdown (select/dropdown)
   - image_upload (photo/image upload areas)

3. **Extract coordinates from bbox**: [left, top, right, bottom]
   Example: {{"l": 59.74, "t": 952.25, "r": 124.59, "b": 938.32}} → [59.74, 952.25, 124.59, 938.32]

4. **Extract span from charspan**: {{"offset": start, "length": end - start}}
   Example: "charspan": [0, 11] → {{"offset": 0, "length": 11}}

5. **Get page_number from prov array**

6. **Determine if required** (usually true for form fields)

7. **Add validation rules** if obvious (e.g., "numeric" for ID numbers)

**ALSO EXTRACT:**
- Form instructions (text that tells user how to fill the form)
- Special areas (signature boxes, photo areas, etc.)

**RESPOND ONLY WITH VALID JSON** in this exact format:
{{
  "form_fields": [
    {{
      "field_name": "Name of Candidate",
      "field_key": "candidate_name",
      "field_type": "text_input",
      "required": true,
      "validation": null,
      "coordinates": [59.74, 952.25, 124.59, 938.32],
      "span": {{"offset": 0, "length": 11}},
      "page_number": 1
    }}
  ],
  "instructions": ["Fill all required fields", "Attach documents"],
  "special_areas": [
    {{
      "type": "image_upload",
      "label": "Paste Photograph",
      "requirements": "passport size",
      "coordinates": [100, 200, 150, 250]
    }}
  ]
}}

Extract ALL fields found in this chunk with complete information.
"""
    
    def _merge_extractions(self, extractions: List[Dict]) -> Dict:
        """
        Merge multiple chunk extractions into one result
        Removes duplicates based on field_key
        """
        merged = {
            "form_fields": [],
            "instructions": [],
            "special_areas": []
        }
        
        # Track what we've seen to avoid duplicates
        seen_fields = set()
        seen_instructions = set()
        seen_areas = set()
        
        for extraction in extractions:
            # Merge fields
            for field in extraction.get('form_fields', []):
                field_key = field.get('field_key', '')
                if field_key and field_key not in seen_fields:
                    seen_fields.add(field_key)
                    merged['form_fields'].append(field)
            
            # Merge instructions
            for instruction in extraction.get('instructions', []):
                if instruction and instruction not in seen_instructions:
                    seen_instructions.add(instruction)
                    merged['instructions'].append(instruction)
            
            # Merge special areas
            for area in extraction.get('special_areas', []):
                area_label = area.get('label', '')
                if area_label and area_label not in seen_areas:
                    seen_areas.add(area_label)
                    merged['special_areas'].append(area)
        
        return merged
