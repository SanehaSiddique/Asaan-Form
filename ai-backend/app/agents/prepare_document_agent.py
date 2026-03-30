import asyncio
from app.schemas.state import AgentState
from pathlib import Path

# Since DocumentProcessingService has good PDF conversion fallbacks
from app.services.document_processing_service import PDF2IMAGE_AVAILABLE, PYMUPDF_AVAILABLE
import fitz
from PIL import Image


def _convert_pdf_with_pymupdf(pdf_path: Path, dpi: int = 300) -> list:
    if not PYMUPDF_AVAILABLE:
        raise ImportError("PyMuPDF (fitz) is not installed")
    doc = fitz.open(str(pdf_path))
    images = []
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(matrix=mat)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        images.append(img)
    doc.close()
    return images


def _prepare_sync(file_path: Path):
    """Sync helper for PDF conversion — intended to run in a thread."""
    file_ext = file_path.suffix.lower()

    if file_ext == ".pdf":
        print(f"  📄 Preparing PDF for OCR: {file_path.name}")
        images = []
        if PDF2IMAGE_AVAILABLE:
            from pdf2image import convert_from_path
            try:
                images = convert_from_path(str(file_path), dpi=300, fmt='png')
            except Exception as e:
                print(f"Fallback to PyMuPDF due to pdf2image error: {e}")
                if PYMUPDF_AVAILABLE:
                    images = _convert_pdf_with_pymupdf(file_path)
                else:
                    return {"error": "PDF conversion failed (pdf2image and PyMuPDF unavailable)"}
        elif PYMUPDF_AVAILABLE:
            images = _convert_pdf_with_pymupdf(file_path)
        else:
            return {"error": "PDF conversion failed. Install poppler or PyMuPDF."}

        # Save images to temp paths
        image_paths = []
        for i, img in enumerate(images):
            temp_path = file_path.parent / f"{file_path.stem}_page_{i}.png"
            img.save(str(temp_path), "PNG")
            image_paths.append(str(temp_path))

        return {"files": image_paths}

    # If already an image, just return the path
    return {"files": [str(file_path)]}


async def prepare_document_agent(state: AgentState) -> AgentState:
    """Converts a single uploaded document/PDF into a list of image paths for OCR."""
    files = state.get("files", [])
    if not files:
        return {"error": "No files provided for document preparation"}

    try:
        file_path = Path(files[0])
        # Reverted asyncio.to_thread to prevent deadlocks
        result = _prepare_sync(file_path)
        if "error" in result:
             return result
        return {**result, "error": None}
    except Exception as e:
        print(f"  ❌ Document preparation failed: {e}")
        return {"error": f"Preparation error: {str(e)}"}
