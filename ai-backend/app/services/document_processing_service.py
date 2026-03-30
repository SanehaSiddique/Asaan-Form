"""
Document Processing Service
Handles document (ID cards, certificates, etc.) processing:
1. Save documents in user's documents folder
2. Run OCR (English + Urdu) on documents
3. Use LLM to extract structured data
4. Return JSON with extracted information

This is SEPARATE from Form Processing - documents provide DATA to fill forms.
"""

import json
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import uuid

from fastapi import UploadFile, HTTPException
from PIL import Image

from app.config import settings
from app.services.docling_service import DoclingService

# Try pdf2image first, fallback to PyMuPDF if needed
try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except (ImportError, Exception):
    PDF2IMAGE_AVAILABLE = False
    convert_from_path = None

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    fitz = None
import httpx
from app.utils.llm import get_llm
from app.services.form_filling_service import form_filling_service


class DocumentProcessingService:
    """
    Service for document upload and data extraction
    Documents are ID cards, certificates, etc. that contain DATA to fill forms
    """
    
    def __init__(self):
        self.llm = get_llm()
        self.docling_service = DoclingService()
        self.use_docling_for_pdfs = True  # Use Docling for PDFs (faster, more reliable)
    
    # ========================================================================
    # FILE UPLOAD METHODS
    # ========================================================================
    
    async def save_document(
        self, 
        user_id: str, 
        file: UploadFile,
        document_type: Optional[str] = None
    ) -> Tuple[Path, Dict]:
        """
        Save a document file for a user
        
        Args:
            user_id: User identifier
            file: Uploaded document file
            document_type: Optional type (id_card, certificate, etc.)
            
        Returns:
            Tuple of (file_path, metadata)
        """
        # Create documents directory
        docs_dir = settings.get_user_documents_dir(user_id)
        
        # Create unique filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_id = uuid.uuid4().hex[:8]
        file_ext = Path(file.filename).suffix.lower()
        
        # Include document type in filename if provided
        if document_type:
            filename = f"{document_type}_{timestamp}_{unique_id}{file_ext}"
        else:
            filename = f"doc_{timestamp}_{unique_id}{file_ext}"
        
        file_path = docs_dir / filename
        
        # Save the file
        content = await file.read()
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        metadata = {
            "original_filename": file.filename,
            "saved_filename": filename,
            "file_path": str(file_path),
            "document_type": document_type,
            "size": len(content),
            "uploaded_at": datetime.now().isoformat()
        }
        
        return file_path, metadata
    
    # ========================================================================
    # OCR METHODS
    # ========================================================================
    
    async def extract_text(
        self, 
        file_path: Path,
        languages: List[str] = ["english", "urdu"]
    ) -> Dict:
        """
        Extract text from document using OCR
        Handles both images and PDFs (converts PDF to images first)
        
        Args:
            file_path: Path to the document (image or PDF)
            languages: List of languages to extract ("english", "urdu", or both)
            
        Returns:
            Dict with extracted text for each language
        """
        result = {
            "english_text": None,
            "urdu_text": None,
            "combined_text": None,
            "boxes": [],
            "docling_json": None
        }
        
        file_path_str = str(file_path)
        file_ext = file_path.suffix.lower()
        
        # Handle PDF files - use Docling for faster processing
        if file_ext == ".pdf":
            print("  📄 PDF detected...")
            
            # Option 1: Use Docling directly (faster, built-in OCR)
            if self.use_docling_for_pdfs:
                try:
                    print("  Using Docling for PDF OCR (faster)...")
                    docling_result = await self.docling_service.process_document(
                        file_path_str,
                        save_outputs=False
                    )
                    
                    # Extract text from Docling markdown
                    markdown_text = docling_result.get("markdown", "")
                    
                    # For documents, we mainly need the text content
                    if "english" in languages:
                        result["english_text"] = markdown_text
                        print(f"  ✓ Docling OCR: {len(markdown_text)} characters")
                    
                    # Note: Docling doesn't support Urdu OCR, so we skip it for PDFs
                    if "urdu" in languages:
                        print("  ⚠️ Urdu OCR not available for PDFs via Docling")
                        result["urdu_text"] = ""
                    
                    result["combined_text"] = markdown_text
                    result["docling_json"] = docling_result.get("json")
                    return result
                    
                except Exception as docling_error:
                    print("  ⚠️ Docling failed ({str(docling_error)[:100]}), falling back to image-based OCR...")
                    # Fall through to image-based OCR
            
            # Option 2: Convert to images and use PaddleOCR (slower but supports Urdu)
            print("  Converting PDF to images for OCR...")
            try:
                # Try pdf2image first (requires poppler)
                if PDF2IMAGE_AVAILABLE:
                    try:
                        images = convert_from_path(
                            file_path_str,
                            dpi=settings.PDF_DPI,
                            fmt='png'
                        )
                        print(f"  ✓ Converted {len(images)} pages using pdf2image")
                    except Exception as pdf2img_error:
                        # Fallback to PyMuPDF if pdf2image fails
                        if PYMUPDF_AVAILABLE:
                            print(f"  ⚠️ pdf2image failed ({pdf2img_error}), trying PyMuPDF...")
                            images = self._convert_pdf_with_pymupdf(file_path, settings.PDF_DPI)
                            print(f"  ✓ Converted {len(images)} pages using PyMuPDF")
                        else:
                            raise HTTPException(
                                status_code=500,
                                detail=f"PDF conversion failed: {str(pdf2img_error)}. "
                                       f"Please install poppler-utils or ensure PyMuPDF is available."
                            )
                elif PYMUPDF_AVAILABLE:
                    # Use PyMuPDF directly
                    images = self._convert_pdf_with_pymupdf(file_path, settings.PDF_DPI)
                    print(f"  ✓ Converted {len(images)} pages using PyMuPDF")
                else:
                    raise HTTPException(
                        status_code=500,
                        detail="PDF conversion not available. Please install pdf2image (with poppler) or PyMuPDF."
                    )
                
                # Process each page and combine text
                all_english_text = []
                all_urdu_text = []
                
                for i, image in enumerate(images, 1):
                    print(f"  Processing page {i}/{len(images)}...")
                    
                    # Save temporary image for OCR
                    temp_image_path = file_path.parent / f"temp_page_{i}.png"
                    image.save(str(temp_image_path), "PNG")
                    
                    try:
                        # Extract English text with timeout protection
                        if "english" in languages:
                            try:
                                print(f"    Running English OCR on page {i}...")
                                import time
                                start = time.time()
                                
                                async with httpx.AsyncClient() as client:
                                    resp = await client.post(
                                        "http://localhost:8001/ocr/english",
                                        json={"file_path": str(temp_image_path)},
                                        timeout=120.0
                                    )
                                    if resp.status_code == 200:
                                        data = resp.json()
                                        page_english = data.get("text", "")
                                        flat_boxes = data.get("result", [])
                                        
                                        if page_english:
                                            elapsed = time.time() - start
                                            all_english_text.append(f"[Page {i}]\n{page_english}")
                                            
                                            words = page_english.split("\n")
                                            for w, b in zip(words, flat_boxes):
                                                result["boxes"].append({
                                                    "text": w,
                                                    "box": b,
                                                    "page": i
                                                })
                                            print(f"    ✓ Page {i} English OCR: {len(page_english)} chars in {elapsed:.1f}s")
                                        else:
                                            print(f"    ⚠️ Page {i} English OCR: No text found")
                                    else:
                                        print(f"    ❌ Page {i} English OCR failed: HTTP {resp.status_code}")
                            except KeyboardInterrupt:
                                raise
                            except Exception as ocr_error:
                                error_msg = str(ocr_error)[:100]
                                print(f"    ❌ Page {i} English OCR failed: {error_msg}")
                        
                        # Extract Urdu text with timeout protection
                        if "urdu" in languages:
                            try:
                                print(f"    Running Urdu OCR on page {i}...")
                                async with httpx.AsyncClient() as client:
                                    resp = await client.post(
                                        "http://localhost:8001/ocr/urdu",
                                        json={"file_path": str(temp_image_path)},
                                        timeout=120.0
                                    )
                                    if resp.status_code == 200:
                                        data = resp.json()
                                        page_urdu = data.get("text", "")
                                        if page_urdu:
                                            all_urdu_text.append(f"[Page {i}]\n{page_urdu}")
                                            print(f"    ✓ Page {i} Urdu OCR: {len(page_urdu)} chars")
                                        else:
                                            print(f"    ⚠️ Page {i} Urdu OCR: No text found")
                                    else:
                                        print(f"    ❌ Page {i} Urdu OCR failed: HTTP {resp.status_code}")
                            except Exception as ocr_error:
                                print(f"    ❌ Page {i} Urdu OCR failed: {str(ocr_error)[:100]}")
                                # Continue with other pages
                    finally:
                        # Clean up temporary image
                        if temp_image_path.exists():
                            temp_image_path.unlink()
                
                # Combine all pages
                if all_english_text:
                    result["english_text"] = "\n\n".join(all_english_text)
                    print(f"  ✓ English OCR: {len(result['english_text'])} characters from {len(images)} pages")
                
                if all_urdu_text:
                    result["urdu_text"] = "\n\n".join(all_urdu_text)
                    print(f"  ✓ Urdu OCR: {len(result['urdu_text'])} characters from {len(images)} pages")
                    
            except Exception as e:
                print(f"  ❌ PDF processing failed: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"PDF processing failed: {str(e)}"
                )
        else:
            # Handle image files directly
            # Extract English text
            if "english" in languages:
                try:
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(
                            "http://localhost:8001/ocr/english",
                            json={"file_path": file_path_str},
                            timeout=120.0
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            english_text = data.get("text", "")
                            flat_boxes = data.get("result", [])
                            result["english_text"] = english_text
                            
                            words = english_text.split("\n")
                            result["boxes"] = [{"text": w, "box": b, "page": 1} for w, b in zip(words, flat_boxes)]
                            print(f"  ✓ English OCR: {len(english_text)} characters")
                        else:
                            print(f"  ❌ English OCR failed: HTTP {resp.status_code}")
                            result["english_text"] = ""
                except Exception as e:
                    print(f"  ⚠️ English OCR failed: {e}")
                    result["english_text"] = ""
            
            # Extract Urdu text
            if "urdu" in languages:
                try:
                    async with httpx.AsyncClient() as client:
                        resp = await client.post(
                            "http://localhost:8001/ocr/urdu",
                            json={"file_path": file_path_str},
                            timeout=120.0
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            urdu_text = data.get("text", "")
                            result["urdu_text"] = urdu_text
                            print(f"  ✓ Urdu OCR: {len(urdu_text)} characters")
                        else:
                            print(f"  ❌ Urdu OCR failed: HTTP {resp.status_code}")
                            result["urdu_text"] = ""
                except Exception as e:
                    print(f"  ⚠️ Urdu OCR failed: {e}")
                    result["urdu_text"] = ""
        
        # Combine texts
        texts = []
        if result["english_text"]:
            texts.append(f"[English]\n{result['english_text']}")
        if result["urdu_text"]:
            texts.append(f"[Urdu]\n{result['urdu_text']}")
        
        result["combined_text"] = "\n\n".join(texts) if texts else ""
        
        return result
    
    def _convert_pdf_with_pymupdf(self, pdf_path: Path, dpi: int = 300) -> List[Image.Image]:
        """
        Convert PDF to images using PyMuPDF (fitz) as fallback
        
        Args:
            pdf_path: Path to PDF file
            dpi: DPI for conversion
            
        Returns:
            List of PIL Image objects
        """
        if not PYMUPDF_AVAILABLE:
            raise ImportError("PyMuPDF (fitz) is not installed")
        
        doc = fitz.open(str(pdf_path))
        images = []
        
        # Calculate zoom factor for desired DPI (default is 72 DPI)
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Render page to pixmap
            pix = page.get_pixmap(matrix=mat)
            # Convert to PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            images.append(img)
        
        doc.close()
        return images
    
    # ========================================================================
    # LLM EXTRACTION METHODS
    # ========================================================================
    
    async def extract_structured_data(
        self, 
        ocr_result: Dict,
        document_type: Optional[str] = None
    ) -> Dict:
        """
        Use LLM to extract structured data from OCR text
        
        Args:
            ocr_result: Dict with english_text and urdu_text
            document_type: Optional hint about document type
            
        Returns:
            Structured JSON with extracted data
        """
        english_text = ocr_result.get("english_text", "")
        urdu_text = ocr_result.get("urdu_text", "")
        
        # Build prompt based on whether we have both languages
        if english_text and urdu_text:
            prompt = self._build_bilingual_prompt(english_text, urdu_text, document_type)
        elif english_text:
            prompt = self._build_english_prompt(english_text, document_type)
        elif urdu_text:
            prompt = self._build_urdu_prompt(urdu_text, document_type)
        else:
            return {"error": "No text extracted from document"}
        
        try:
            response = await self.llm.ainvoke(prompt)
            content = response.content
            
            # Parse JSON from response
            content = self._clean_json_response(content)
            extracted_data = json.loads(content)
            
            return extracted_data
            
        except json.JSONDecodeError:
            return {
                "error": "Failed to parse LLM response as JSON",
                "raw_response": content[:500] if content else None
            }
        except Exception as e:
            return {"error": f"LLM extraction failed: {str(e)}"}
    
    def _build_bilingual_prompt(
        self, 
        english_text: str, 
        urdu_text: str,
        document_type: Optional[str]
    ) -> str:
        """Build prompt for bilingual document extraction"""
        type_hint = f"This is a {document_type}." if document_type else ""
        
        return f"""You are a bilingual document understanding agent.

You are given OCR outputs from the SAME document in both English and Urdu.
{type_hint}

Rules:
- Keys must be in English (snake_case)
- Merge information from BOTH OCRs
- Translate Urdu values to English
- Prefer clearer/more complete values when both exist
- Use null if a value is missing or unreadable
- Extract ALL relevant information (names, dates, IDs, addresses, etc.)

English OCR:
{english_text}

Urdu OCR:
{urdu_text}

Return ONLY valid JSON with the extracted data.
Example format:
{{
  "full_name": "John Doe",
  "father_name": "James Doe",
  "date_of_birth": "1990-01-15",
  "id_number": "12345-6789012-3",
  "address": "123 Main St, City",
  "document_type": "national_id"
}}
"""
    
    def _build_english_prompt(self, english_text: str, document_type: Optional[str]) -> str:
        """Build prompt for English-only document extraction"""
        type_hint = f"This is a {document_type}." if document_type else ""
        
        return f"""You are a document understanding agent.

Convert the following OCR text into clean, structured JSON.
{type_hint}

Rules:
- Use meaningful keys in snake_case
- If a value is missing or unreadable, use null
- Extract ALL relevant information (names, dates, IDs, addresses, etc.)

OCR Text:
{english_text}

Return ONLY valid JSON.
"""
    
    def _build_urdu_prompt(self, urdu_text: str, document_type: Optional[str]) -> str:
        """Build prompt for Urdu-only document extraction"""
        type_hint = f"This is a {document_type}." if document_type else ""
        
        return f"""You are a document understanding agent fluent in Urdu.

Convert the following Urdu OCR text into clean, structured JSON.
{type_hint}

Rules:
- Keys must be in English (snake_case)
- Translate Urdu values to English
- If a value is missing or unreadable, use null
- Extract ALL relevant information

Urdu OCR Text:
{urdu_text}

Return ONLY valid JSON with English keys and translated values.
"""
    
    def _clean_json_response(self, content: str) -> str:
        """Clean LLM response to extract JSON"""
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            parts = content.split("```")
            if len(parts) >= 2:
                content = parts[1].strip()
                if content.startswith(("json", "JSON")):
                    content = content[4:].strip()
        return content
    
    # ========================================================================
    # COMPLETE PROCESSING PIPELINE
    # ========================================================================
    
    async def process_document(
        self, 
        user_id: str, 
        file: UploadFile,
        document_type: Optional[str] = None,
        languages: List[str] = ["english", "urdu"]
    ) -> Dict:
        """
        Complete document processing pipeline:
        1. Save document
        2. Run OCR (English + Urdu)
        3. Extract structured data with LLM
        
        Args:
            user_id: User identifier
            file: Uploaded document file
            document_type: Optional type hint (id_card, certificate, etc.)
            languages: Languages to extract
            
        Returns:
            Complete processing result
        """
        print("\n" + "="*60)
        print("📄 DOCUMENT PROCESSING PIPELINE")
        print("="*60)
        print(f"📄 File: {file.filename}")
        print(f"👤 User: {user_id}")
        print(f"📋 Type: {document_type or 'auto-detect'}")
        print()
        
        result = {
            "user_id": user_id,
            "original_filename": file.filename,
            "document_type": document_type,
            "success": False,
            "errors": [],
            "data": {}
        }
        
        try:
            # Step 1: Save document
            print("📁 Step 1: Saving document...")
            file_path, metadata = await self.save_document(
                user_id, file, document_type
            )
            result["data"]["file_info"] = metadata
            print(f"  ✓ Saved to: {file_path}")
            
            # Step 2: Run OCR
            print("\n🔍 Step 2: Running OCR...")
            ocr_result = await self.extract_text(file_path, languages)
            result["data"]["ocr"] = {
                "english_length": len(ocr_result.get("english_text") or ""),
                "urdu_length": len(ocr_result.get("urdu_text") or ""),
                "boxes": ocr_result.get("boxes", [])
            }
            
            # Step 3: Extract structured data
            print("\n🤖 Step 3: Extracting structured data...")
            extracted_data = await self.extract_structured_data(
                ocr_result, document_type
            )
            
            if "error" in extracted_data:
                result["errors"].append(extracted_data["error"])
                print(f"  ⚠️ {extracted_data['error']}")
            else:
                result["data"]["extracted"] = extracted_data
                print(f"  ✓ Extracted {len(extracted_data)} fields")
            
            # Save extraction result
            output_path = file_path.parent / f"{file_path.stem}_extracted.json"
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "ocr": ocr_result,
                    "extracted": extracted_data,
                    "metadata": metadata
                }, f, indent=2, ensure_ascii=False)
            
            result["data"]["output_path"] = str(output_path)
            result["success"] = len(result["errors"]) == 0
            
            # Print summary
            self._print_summary(result)
            
        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e)
            result["errors"].append(error_msg)
            print(f"\n❌ Pipeline error: {error_msg}")
        
        return result

    async def map_to_form(
        self,
        user_id: str,
        document_filenames: List[str],
        form_id: str
    ) -> Dict:
        """
        Map one or more already processed documents to a specific form schema.
        
        Args:
            user_id: User identifier
            document_filenames: List of document filenames
            form_id: ID of the form to map against
            
        Returns:
            Mapping result
        """
        docs_dir = settings.get_user_documents_dir(user_id)
        
        # 1. Load document OCR/Extraction for ALL files
        combined_doc_json = {"pages": [], "boxes": [], "all_texts": []}
        all_doc_stems = []

        for document_filename in document_filenames:
            doc_path = docs_dir / document_filename
            if not doc_path.exists():
                print(f"  ⚠️ Document not found skipping: {document_filename}")
                continue
            
            all_doc_stems.append(doc_path.stem)
            extraction_path = docs_dir / f"{doc_path.stem}_extracted.json"
            if not extraction_path.exists():
                print(f"  ⚠️ Extraction not found for: {document_filename}")
                continue
                
            with open(extraction_path, 'r', encoding='utf-8') as f:
                doc_data = json.load(f)
                ocr_data = doc_data.get("ocr", {})
                
                # Merge into combined context
                # Support docling format
                docling_json = ocr_data.get("docling_json")
                if docling_json:
                    if "pages" in docling_json:
                        # Re-index page numbers to avoid collision if needed, 
                        # but snippets usually just care about absolute IDs
                        combined_doc_json["pages"].extend(docling_json["pages"])
                
                # Support boxes format
                if "boxes" in ocr_data:
                    combined_doc_json["boxes"].extend(ocr_data["boxes"])
                
                # Support form_processing combine format if present
                if "all_texts" in ocr_data:
                    combined_doc_json["all_texts"].extend(ocr_data["all_texts"])
        
        if not combined_doc_json["pages"] and not combined_doc_json["boxes"] and not combined_doc_json["all_texts"]:
             raise HTTPException(status_code=404, detail="No readable extraction data found for the provided documents")
            
        # 2. Load Form Schema
        form_fields_path = settings.get_user_forms_dir(user_id) / form_id / "output" / "form_fields.json"
        if not form_fields_path.exists():
            # Fallback to form_fields.json in the form root if output/ doesn't exist
            form_fields_path = settings.get_user_forms_dir(user_id) / form_id / "form_fields.json"
            if not form_fields_path.exists():
                raise HTTPException(status_code=404, detail=f"Form schema {form_id} not found")
            
        with open(form_fields_path, 'r', encoding='utf-8') as f:
            form_data = json.load(f)
            # form_fields.json structure might vary, but we expect list of fields
            if "form_fields" in form_data:
                form_schema = form_data["form_fields"]
            elif isinstance(form_data, list):
                form_schema = form_data
            else:
                form_schema = []

        # 3. Perform Semantic Mapping
        print(f"\n📂 Mapping document(s) {', '.join(document_filenames)} to form {form_id}...")
        
        mapping = await form_filling_service.map_document_to_form(
            combined_doc_json,
            form_schema
        )

        # Normalize each item for frontend: field_key, coordinates, target_box, value, page_number
        fields = []
        for m in mapping:
            coords = m.get("coordinates") or m.get("target_box")
            box = coords if isinstance(coords, (list, tuple)) and len(coords) >= 4 else None
            fields.append({
                "field_key": m.get("field_key") or m.get("field"),
                "field_name": m.get("field_name"),
                "field_type": m.get("field_type") or "text_input",
                "value": m.get("value"),
                "coordinates": box,
                "target_box": box,
                "page_number": m.get("page_number", 1),
                "source_boxes": m.get("source_boxes") or [],
            })

        final_json = {
            "form_id": form_id,
            "fields": fields,
        }
        
        # 4. Save the mapping using the first document's stem as reference or a combined name
        reference_stem = all_doc_stems[0] if all_doc_stems else "multi"
        mapping_path = docs_dir / f"{reference_stem}_mapped_{form_id}.json"
        with open(mapping_path, 'w', encoding='utf-8') as f:
            json.dump({
                "form_id": form_id,
                "sources": document_filenames,
                "mapping": mapping,
                "final_json": final_json,
                "mapped_at": datetime.now().isoformat()
            }, f, indent=2, ensure_ascii=False)
            
        return {
            "success": True,
            "form_id": form_id,
            "mapping": mapping,
            "final_json": final_json,
            "path": str(mapping_path)
        }
    
    def _print_summary(self, result: Dict):
        """Print processing summary"""
        print("\n" + "="*60)
        print("📊 DOCUMENT PROCESSING SUMMARY")
        print("="*60)
        
        if result["success"]:
            print("✅ Status: SUCCESS")
            data = result.get("data", {})
            extracted = data.get("extracted", {})
            print("\n📈 Results:")
            print(f"  • Fields extracted: {len(extracted)}")
            if extracted:
                print(f"  • Sample fields: {list(extracted.keys())[:5]}")
        else:
            print("❌ Status: FAILED")
            print("\n⚠️ Errors:")
            for error in result["errors"]:
                print(f"  • {error}")
        
        print("="*60 + "\n")
    
    # ========================================================================
    # BATCH PROCESSING
    # ========================================================================
    
    async def process_multiple_documents(
        self,
        user_id: str,
        files: List[UploadFile],
        document_type: Optional[str] = None
    ) -> Dict:
        """
        Process multiple documents and merge results
        
        Args:
            user_id: User identifier
            files: List of document files
            document_type: Optional type hint
            
        Returns:
            Combined results from all documents
        """
        results = []
        all_extracted = {}
        
        for i, file in enumerate(files, 1):
            print(f"\n--- Processing document {i}/{len(files)} ---")
            result = await self.process_document(
                user_id, file, document_type
            )
            results.append(result)
            
            # Merge extracted data
            if result["success"] and "extracted" in result.get("data", {}):
                extracted = result["data"]["extracted"]
                for key, value in extracted.items():
                    # Keep non-null values, prefer later documents
                    if value is not None:
                        all_extracted[key] = value
            
            # Artificial delay between documents if not the last one
            if i < len(files):
                print("  Waiting 2s before next document...")
                await asyncio.sleep(2)
        
        return {
            "user_id": user_id,
            "total_documents": len(files),
            "successful": sum(1 for r in results if r["success"]),
            "individual_results": results,
            "merged_data": all_extracted
        }


# Create singleton instance
document_processing_service = DocumentProcessingService()