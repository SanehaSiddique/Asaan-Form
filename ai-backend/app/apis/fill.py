import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.services.document_processing_service import document_processing_service
from app.services.form_filling_service import form_filling_service
from app.services.form_pdf_overlay_service import form_pdf_overlay_service
from app.services.form_processing_service import form_processing_service


router = APIRouter(prefix="/fill", tags=["Filling"])


@router.post("/map-existing-document")
async def map_existing_document_endpoint(
    user_id: Optional[str] = Form(None),
    form_id: Optional[str] = Form(None),
    document_filename: Optional[str] = Form(None),
    document_filenames: Optional[str] = Form(None)
):
    """
    Map an already uploaded document to an already uploaded form.
    Uses the enhanced semantic mapper with coordinate tracking.
    """
    log_path = Path.home() / "mapping_debug.log"
    with open(log_path, "a") as f:
        f.write(f"\n--- {datetime.now()} ---\n")
        f.write(f"user_id: {user_id}\n")
        f.write(f"form_id: {form_id}\n")
        f.write(f"document_filename: {document_filename}\n")
        f.write(f"document_filenames: {document_filenames}\n")

    print("\n📥 RECEIVED MAPPING REQUEST:")
    print(f"  user_id: {user_id}")
    print(f"  form_id: {form_id}")
    print(f"  document_filename (singular): {document_filename}")
    print(f"  document_filenames (plural): {document_filenames}")
    
    # Pool filenames from both potential keys
    combined_filenames = []
    if document_filename:
        combined_filenames.extend([x.strip() for x in document_filename.split(",") if x.strip()])
    if document_filenames:
        combined_filenames.extend([x.strip() for x in document_filenames.split(",") if x.strip()])
    
    # Remove duplicates
    combined_filenames = list(dict.fromkeys(combined_filenames))

    if not user_id or not form_id or not combined_filenames:
        raise HTTPException(
            status_code=422, 
            detail=f"Missing fields. user_id: {user_id}, form_id: {form_id}, filenames: {combined_filenames}"
        )

    try:
        result = await document_processing_service.map_to_form(
            user_id, combined_filenames, form_id
        )
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/fill-form")
async def fill_form_endpoint(
    user_id: str = Form(...),
    form_file: UploadFile = File(...),
    document_files: List[UploadFile] = File(...),
    return_pdf: bool = Form(True),
):
    """
    Upload a blank form AND supporting documents (ID, Degrees, etc.).
    Maps document data to form fields and overlays values on the original PDF:
    - Text/date/dropdown: value is drawn to the right of each field label bbox.
    - Checkbox: a checkmark is drawn in the field bbox when value is checked.
    Returns the filled PDF file by default, or JSON only if return_pdf=false.
    """
    try:
        # --- STEP 1: Process Supporting Documents ---
        print(f"Processing {len(document_files)} supporting documents...")
        doc_result = await document_processing_service.process_multiple_documents(
            user_id=user_id,
            files=document_files,
        )
        extracted_user_data = doc_result.get("merged_data", {})

        if not extracted_user_data:
            print("⚠️ Warning: No readable data found in documents.")

        # --- STEP 2: Process the Blank Form ---
        print(f"Processing form template: {form_file.filename}...")
        form_result = await form_processing_service.process_form(
            user_id=user_id,
            file=form_file,
            form_name="auto_process",
        )

        if not form_result["success"]:
            raise HTTPException(
                status_code=400,
                detail=f"Form processing failed: {form_result['errors']}",
            )

        empty_fields = form_result["data"]["form_fields"].get("form_fields", [])

        # --- STEP 3: Map Data to Form ---
        print("Mapping data to form fields...")
        filled_fields = await form_filling_service.fill_form(
            form_fields=empty_fields,
            document_data=extracted_user_data,
        )

        # --- STEP 4: Overlay filled values on the original PDF ---
        form_folder = Path(form_result["data"]["form_folder"])
        original_filename = form_result.get("original_filename") or form_file.filename or "form"
        suffix = Path(original_filename).suffix or ".pdf"
        original_path = form_folder / f"original{suffix}"

        if not original_path.exists():
            raise HTTPException(
                status_code=500,
                detail=f"Original form file not found: {original_path}",
            )

        output_dir = settings.get_user_output_dir(user_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        form_id = form_result["data"]["form_id"]
        filled_pdf_path = output_dir / f"filled_{form_id}.pdf"

        # --- Save field mapping JSON (which form field maps to which value) ---
        mapping = {
            "form_id": form_id,
            "source_data_used": extracted_user_data,
            "field_mapping": [
                {
                    "field_key": f.get("field_key"),
                    "field_name": f.get("field_name"),
                    "field_type": f.get("field_type"),
                    "value": f.get("value"),
                    "page_number": f.get("page_number"),
                }
                for f in filled_fields
            ],
        }
        mapping_path = output_dir / f"filled_{form_id}_mapping.json"
        mapping_path.write_text(json.dumps(mapping, indent=2, ensure_ascii=False), encoding="utf-8")

        page_image_paths = form_result["data"].get("images") or []
        # Docling runs on images rendered from PDF at PDF_DPI; coords are in image space. Scale to PDF points.
        render_dpi = settings.PDF_DPI if (Path(original_path).suffix or "").lower() == ".pdf" else None
        form_pdf_overlay_service.fill_pdf(
            original_path=original_path,
            filled_fields=filled_fields,
            page_image_paths=page_image_paths if page_image_paths else None,
            output_path=filled_pdf_path,
            render_dpi=render_dpi,
        )

        if return_pdf and filled_pdf_path.exists():
            return FileResponse(
                path=str(filled_pdf_path),
                media_type="application/pdf",
                filename=f"filled_{Path(original_filename).stem}.pdf",
            )

        return JSONResponse(
            content={
                "status": "success",
                "message": "Form processed and filled successfully",
                "data": {
                    "filled_fields": filled_fields,
                    "source_data_used": extracted_user_data,
                    "form_metadata": {
                        "pages": form_result["data"]["page_count"],
                        "form_id": form_result["data"]["form_id"],
                    },
                    "filled_pdf_path": str(filled_pdf_path),
                    "mapping_json_path": str(mapping_path),
                },
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def _load_merged_extracted_data(user_id: str, document_filenames: List[str]) -> dict:
    """
    Load already-extracted JSON for each document and merge the `extracted` dict.
    Later documents override earlier ones when keys overlap.
    """
    docs_dir = settings.get_user_documents_dir(user_id)
    merged: dict = {}
    sources: list = []
    for filename in document_filenames:
        doc_path = docs_dir / filename
        if not doc_path.exists():
            raise HTTPException(status_code=404, detail=f"Document not found: {filename}")
        extraction_path = docs_dir / f"{doc_path.stem}_extracted.json"
        if not extraction_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Document not processed yet: {filename}. Upload with process=true first.",
            )
        try:
            data = json.loads(extraction_path.read_text(encoding="utf-8"))
            extracted = data.get("extracted") or {}
            if isinstance(extracted, dict):
                for k, v in extracted.items():
                    if v is not None and k != "error":
                        merged[k] = v
            sources.append(filename)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed reading extraction for {filename}: {e}")
    return {"merged_data": merged, "sources": sources}


def _get_form_original_path(user_id: str, form_id: str) -> Path:
    form_folder = settings.get_user_forms_dir(user_id) / form_id
    if not form_folder.exists():
        raise HTTPException(status_code=404, detail="Form not found")
    # Prefer original.pdf if present, else any original.* created by upload
    for cand in [form_folder / "original.pdf", form_folder / "original.png", form_folder / "original.jpg", form_folder / "original.jpeg"]:
        if cand.exists():
            return cand
    originals = sorted(form_folder.glob("original.*"))
    if originals:
        return originals[0]
    raise HTTPException(status_code=404, detail=f"Original form file not found for form_id={form_id}")


@router.post("/fill-existing")
async def fill_existing_endpoint(
    user_id: Optional[str] = Form(None),
    form_id: Optional[str] = Form(None),
    document_filename: Optional[str] = Form(None),
    document_filenames: Optional[str] = Form(None),
    return_pdf: bool = Form(True),
):
    """
    Fill a previously-processed form using previously-processed document(s).

    This avoids re-running Docling/OCR/UTRNet on every fill request.

    Inputs:
    - user_id: user identifier
    - form_id: AI backend form folder name (from /form/upload response: data.form_id)
    - document_filenames: comma-separated AI backend saved document filenames (from /document/upload response)
    - return_pdf: when true, stream the filled PDF; when false, return JSON mapping
    """
    print("\n📥 RECEIVED FILL-EXISTING REQUEST:")
    print(f"  user_id: {user_id}")
    print(f"  form_id: {form_id}")
    print(f"  document_filename (singular): {document_filename}")
    print(f"  document_filenames (plural): {document_filenames}")

    # Pool filenames from both potential keys
    combined_filenames = []
    if document_filename:
        combined_filenames.extend([x.strip() for x in document_filename.split(",") if x.strip()])
    if document_filenames:
        combined_filenames.extend([x.strip() for x in document_filenames.split(",") if x.strip()])
    
    # Remove duplicates
    combined_filenames = list(dict.fromkeys(combined_filenames))

    if not user_id or not form_id or not combined_filenames:
        raise HTTPException(
            status_code=422, 
            detail=f"Missing fields. user_id: {user_id}, form_id: {form_id}, filenames: {combined_filenames}"
        )

    try:
        doc_names = combined_filenames

        # 1) Load extracted document data (no OCR/LLM extraction here)
        merged = _load_merged_extracted_data(user_id, doc_names)
        extracted_user_data = merged["merged_data"]

        # 2) Load already-extracted form fields (no Docling/LLM field extraction here)
        form_result = form_processing_service.get_form_result(user_id, form_id)
        empty_fields = form_result.get("form_fields", {}).get("form_fields", [])

        # 3) Map extracted data to form fields (one LLM call)
        filled_fields = await form_filling_service.fill_form(
            form_fields=empty_fields,
            document_data=extracted_user_data,
        )

        # 4) Overlay PDF using original file saved during form upload
        original_path = _get_form_original_path(user_id, form_id)
        output_dir = settings.get_user_output_dir(user_id)
        output_dir.mkdir(parents=True, exist_ok=True)
        filled_pdf_path = output_dir / f"filled_{form_id}.pdf"

        render_dpi = settings.PDF_DPI if original_path.suffix.lower() == ".pdf" else None
        form_pdf_overlay_service.fill_pdf(
            original_path=original_path,
            filled_fields=filled_fields,
            page_image_paths=None,
            output_path=filled_pdf_path,
            render_dpi=render_dpi,
        )

        if return_pdf and filled_pdf_path.exists():
            return FileResponse(
                path=str(filled_pdf_path),
                media_type="application/pdf",
                filename=f"filled_{Path(original_path).stem}.pdf",
            )

        return JSONResponse(
            content={
                "status": "success",
                "message": "Filled from existing processed assets",
                "data": {
                    "filled_fields": filled_fields,
                    "source_data_used": extracted_user_data,
                    "sources": merged["sources"],
                    "form_metadata": {
                        "form_id": form_id,
                    },
                    "filled_pdf_path": str(filled_pdf_path),
                },
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))