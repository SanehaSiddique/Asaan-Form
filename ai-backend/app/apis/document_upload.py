"""
Document Upload API Routes
Handles document (ID cards, certificates, etc.) upload and processing.

Documents provide DATA to fill forms.
This is SEPARATE from form processing.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from typing import List, Optional
from pathlib import Path
import json
import os

from app.config import settings
from app.services.document_processing_service import document_processing_service
from app.utils.llm import get_llm

router = APIRouter(prefix="/document", tags=["Documents"])


# ============================================================================
# DOCUMENT UPLOAD AND PROCESSING
# ============================================================================

@router.post("/upload/{user_id}")
async def upload_document(
    user_id: str, 
    file: UploadFile = File(...),
    document_type: Optional[str] = Query(
        None, 
        description="Type of document: id_card, certificate, passport, etc."
    ),
    process: bool = Query(
        True, 
        description="Whether to process the document immediately"
    ),
    languages: str = Query(
        "english,urdu",
        description="Comma-separated languages for OCR: english, urdu"
    )
):
    """
    Upload and process a document (ID card, certificate, etc.)
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    file_ext = Path(file.filename).suffix.lower()
    allowed = [".png", ".jpg", ".jpeg", ".pdf"]
    if file_ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{file_ext}'. Allowed: {allowed}"
        )
    
    lang_list = [l.strip().lower() for l in languages.split(",")]
    
    try:
        if process:
            result = await document_processing_service.process_document(
                user_id, file, document_type, lang_list
            )
            return JSONResponse(content=result)
        else:
            file_path, metadata = await document_processing_service.save_document(
                user_id, file, document_type
            )
            return JSONResponse(content={
                "message": "Document saved successfully",
                "user_id": user_id,
                "processed": False,
                "data": metadata
            })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/upload/{user_id}/batch")
async def upload_multiple_documents(
    user_id: str, 
    files: List[UploadFile] = File(...),
    document_type: Optional[str] = Query(None),
    process: bool = Query(True),
    languages: str = Query("english,urdu")
):
    """
    Upload and process multiple documents at once
    """
    if not process:
        results = []
        for file in files:
            try:
                file_path, metadata = await document_processing_service.save_document(
                    user_id, file, document_type
                )
                results.append({"success": True, "filename": file.filename, "data": metadata})
            except Exception as e:
                results.append({"success": False, "filename": file.filename, "error": str(e)})
        
        return JSONResponse(content={
            "user_id": user_id,
            "total": len(files),
            "processed": False,
            "results": results
        })
    
    result = await document_processing_service.process_multiple_documents(
        user_id, files, document_type
    )
    return JSONResponse(content=result)


# ============================================================================
# DOCUMENT RETRIEVAL
# ============================================================================

@router.get("/list/{user_id}")
async def list_user_documents(user_id: str):
    """
    List all documents for a user
    """
    docs_dir = settings.get_user_documents_dir(user_id)
    documents = []
    for doc_file in docs_dir.iterdir():
        if doc_file.is_file() and not doc_file.name.endswith('_extracted.json'):
            extraction_path = doc_file.parent / f"{doc_file.stem}_extracted.json"
            has_extraction = extraction_path.exists()
            doc_type = None
            name_parts = doc_file.stem.split('_')
            if name_parts[0] in ['id_card', 'certificate', 'passport', 'doc']:
                doc_type = name_parts[0]
            
            documents.append({
                "filename": doc_file.name,
                "document_type": doc_type,
                "path": str(doc_file),
                "size": doc_file.stat().st_size,
                "processed": has_extraction,
                "created_at": doc_file.stat().st_ctime
            })
    
    documents.sort(key=lambda x: x["created_at"], reverse=True)
    return JSONResponse(content={"user_id": user_id, "total_documents": len(documents), "documents": documents})


@router.get("/data/{user_id}/{filename}")
async def get_document_data(user_id: str, filename: str):
    """
    Get the extracted data for a specific document
    """
    docs_dir = settings.get_user_documents_dir(user_id)
    doc_path = docs_dir / filename
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    extraction_path = docs_dir / f"{doc_path.stem}_extracted.json"
    if not extraction_path.exists():
        raise HTTPException(status_code=404, detail="Document has not been processed")
    
    with open(extraction_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return JSONResponse(content={"user_id": user_id, "filename": filename, "data": data})


@router.post("/process/{user_id}/{filename}")
async def process_existing_document(
    user_id: str, 
    filename: str,
    document_type: Optional[str] = Query(None),
    languages: str = Query("english,urdu")
):
    """
    Process an already uploaded document
    """
    docs_dir = settings.get_user_documents_dir(user_id)
    doc_path = docs_dir / filename
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    lang_list = [l.strip().lower() for l in languages.split(",")]
    
    try:
        ocr_result = await document_processing_service.extract_text(doc_path, lang_list)
        extracted = await document_processing_service.extract_structured_data(ocr_result, document_type)
        output_path = docs_dir / f"{doc_path.stem}_extracted.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump({
                "ocr": ocr_result,
                "extracted": extracted,
                "metadata": {"filename": filename, "document_type": document_type}
            }, f, indent=2, ensure_ascii=False)
        
        return JSONResponse(content={
            "success": True,
            "user_id": user_id,
            "filename": filename,
            "data": {"extracted": extracted, "output_path": str(output_path)}
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/map/{user_id}/{filename}/{form_id}")
async def map_document_to_form(user_id: str, filename: str, form_id: str):
    """
    Map an already processed document to a specific form schema.
    """
    try:
        result = await document_processing_service.map_to_form(user_id, filename, form_id)
        return JSONResponse(content=result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Mapping failed: {str(e)}")


@router.post("/upload-and-map/{user_id}/{form_id}")
async def upload_and_map_document(
    user_id: str,
    form_id: str,
    file: UploadFile = File(...),
    document_type: Optional[str] = Query(None),
    languages: str = Query("english,urdu")
):
    """
    Upload, process OCR, and then semantically map to a form.
    """
    try:
        lang_list = [l.strip().lower() for l in languages.split(",")]
        proc_result = await document_processing_service.process_document(user_id, file, document_type, lang_list)
        if not proc_result.get("success"):
            return JSONResponse(content=proc_result, status_code=500)
            
        filename = proc_result["data"]["file_info"]["saved_filename"]
        map_result = await document_processing_service.map_to_form(user_id, filename, form_id)
        
        return JSONResponse(content={
            "success": True,
            "processing": proc_result,
            "mapping": map_result
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload and map failed: {str(e)}")


# ============================================================================
# USER DATA MANAGEMENT
# ============================================================================

@router.get("/user/{user_id}/all-data")
async def get_all_user_document_data(user_id: str):
    """
    Get all extracted data from all user's documents (merged)
    """
    docs_dir = settings.get_user_documents_dir(user_id)
    all_data = {}
    sources = []
    
    for extraction_file in docs_dir.glob("*_extracted.json"):
        try:
            with open(extraction_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            extracted = data.get("extracted", {})
            for key, value in extracted.items():
                if value is not None and key != "error":
                    all_data[key] = value
            sources.append(extraction_file.stem.replace("_extracted", ""))
        except Exception as e:
            print(f"Error reading {extraction_file}: {e}")
            continue
    
    return JSONResponse(content={
        "user_id": user_id,
        "sources": sources,
        "total_fields": len(all_data),
        "merged_data": all_data
    })


@router.delete("/delete/{user_id}/{filename}")
async def delete_document(user_id: str, filename: str):
    """
    Delete a document and its extraction data
    """
    docs_dir = settings.get_user_documents_dir(user_id)
    doc_path = docs_dir / filename
    if not doc_path.exists():
        raise HTTPException(status_code=404, detail="Document not found")
    
    try:
        doc_path.unlink()
        extraction_path = docs_dir / f"{doc_path.stem}_extracted.json"
        if extraction_path.exists():
            extraction_path.unlink()
        
        return JSONResponse(content={"success": True, "message": f"Document '{filename}' deleted"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


# ============================================================================
# IDENTITY VALIDATION & CLASH DETECTION
# ============================================================================

@router.post("/validate-identities")
async def validate_identities(
    request: Request
):
    """
    Validates that all provided documents belong to the same person.
    """
    try:
        body = await request.json()
        docs = body.get("documents", [])
        
        if len(docs) < 2:
            return JSONResponse(content={"clash": False, "message": "Not enough documents to compare"})

        # Prepare identity comparison prompt
        identities_summary = []
        for i, doc in enumerate(docs):
            data = doc.get("extracted_data", {})
            name = data.get("full_name") or data.get("name") or "Unknown"
            doc_type = data.get("document_type") or doc.get("filename", f"Doc {i+1}")
            identities_summary.append({
                "index": i,
                "filename": doc.get("filename"),
                "detected_name": name,
                "document_type": doc_type,
                "all_data": data
            })

        llm = get_llm()
        prompt = f"""
        You are an identity verification agent. 
        Analyze the following data extracted from multiple documents uploaded by a single user.
        
        GOAL: Determine if these documents belong to the SAME PERSON or if there is a CLASH (different people).
        
        Documents Data:
        {json.dumps(identities_summary, indent=2)}
        
        Rules:
        1. Small variations in names (e.g. "Saneha Siddique" vs "Saneha") are fine.
        2. Different names (e.g. "Saneha" vs "Saman") are a CLASH.
        3. If there is a clash, group the documents by the identity they belong to.
        
        RESPONSE FORMAT (JSON ONLY):
        {{
          "clash": true,
          "reason": "Brief explanation",
          "identities": [
            {{
              "name": "Identity Name",
              "documents": [ {{ "filename": "...", "document_type": "..." }} ]
            }}
          ]
        }}
        
        Return ONLY valid JSON.
        """
        
        resp_obj = await llm.ainvoke(prompt)
        content = resp_obj.content.strip()
        
        # Clean JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            parts = content.split("```")
            for part in parts:
                if part.strip().startswith("{"):
                    content = part.strip()
                    break
        
        clash_report = json.loads(content)
        return JSONResponse(content=clash_report)

    except Exception as e:
        print(f"❌ Identity validation error: {e}")
        return JSONResponse(status_code=500, content={"clash": False, "error": str(e)})