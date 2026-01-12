from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
from pathlib import Path
from pdf2image import convert_from_bytes
from PIL import Image
import uuid

app = FastAPI()

# Base directory for uploads


async def save_file(file: UploadFile, save_path: Path):
    """Save uploaded file to disk"""
    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

def pdf_to_images(pdf_path: Path, output_folder: Path):
    """Convert PDF to images and save them"""
    try:
        # Read PDF file
        with open(pdf_path, "rb") as pdf_file:
            pdf_bytes = pdf_file.read()
        
        # Convert PDF to images
        images = convert_from_bytes(pdf_bytes, dpi=300)
        
        # Save each page as image
        saved_images = []
        for i, image in enumerate(images):
            image_path = output_folder / f"page_{i+1}.png"
            image.save(image_path, "PNG")
            saved_images.append(str(image_path))
        
        # Remove original PDF after conversion
        pdf_path.unlink()
        
        return saved_images
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF conversion failed: {str(e)}")

# Route for form uploads
@app.post("/upload/form/{user_id}")
async def upload_form(user_id: str, file: UploadFile = File(...)):
    """
    Upload form - converts PDF to images if needed
    """
    try:
        # Create user-specific folder for forms
        user_folder = create_user_folder(user_id, "forms")
        
        # Get file extension
        file_extension = Path(file.filename).suffix.lower()
        
        # Save the uploaded file
        file_path = user_folder / file.filename
        await save_file(file, file_path)
        
        # Check if it's a PDF
        if file_extension == ".pdf":
            # Convert PDF to images
            images = pdf_to_images(file_path, user_folder)
            return JSONResponse(
                content={
                    "message": "PDF form uploaded and converted to images",
                    "user_id": user_id,
                    "original_filename": file.filename,
                    "converted_images": images,
                    "total_pages": len(images)
                }
            )
        else:
            # Image file - just save it
            return JSONResponse(
                content={
                    "message": "Form uploaded successfully",
                    "user_id": user_id,
                    "filename": file.filename,
                    "file_path": str(file_path),
                    "content_type": file.content_type
                }
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# # Route for document uploads  
# @app.post("/upload/document/{user_id}")
# async def upload_document(user_id: str, file: UploadFile = File(...)):
#     """
#     Upload document - saves as-is without conversion
#     """
#     try:
#         # Create user-specific folder for documents
#         user_folder = create_user_folder(user_id, "documents")
        
#         # Save the uploaded file
#         file_path = user_folder / file.filename
#         await save_file(file, file_path)
        
#         return JSONResponse(
#             content={
#                 "message": "Document uploaded successfully",
#                 "user_id": user_id,
#                 "filename": file.filename,
#                 "file_path": str(file_path),
#                 "content_type": file.content_type,
#                 "size": os.path.getsize(file_path)
#             }
#         )
            
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# Optional: Upload multiple forms at once
@app.post("/upload/forms/batch/{user_id}")
async def upload_multiple_forms(user_id: str, files: list[UploadFile] = File(...)):
    """
    Upload multiple forms at once
    """
    results = []
    
    for file in files:
        try:
            user_folder = create_user_folder(user_id, "forms")
            file_extension = Path(file.filename).suffix.lower()
            file_path = user_folder / file.filename
            
            await save_file(file, file_path)
            
            if file_extension == ".pdf":
                images = pdf_to_images(file_path, user_folder)
                results.append({
                    "filename": file.filename,
                    "status": "converted",
                    "images": images
                })
            else:
                results.append({
                    "filename": file.filename,
                    "status": "uploaded",
                    "path": str(file_path)
                })
                
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "failed",
                "error": str(e)
            })
    
    return JSONResponse(content={"user_id": user_id, "results": results})
