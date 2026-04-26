import json
import os
from pathlib import Path
from typing import Dict, Optional, Any
import traceback

# Optional: PyMuPDF as fallback
try:
    import fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

# Docling imports with safety
try:
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import (
        DocumentConverter,
        InputFormat,
        ImageFormatOption,
        PdfFormatOption
    )
    DOCLING_AVAILABLE = True
except (ImportError, Exception) as e:
    print(f"⚠️ Docling unavailable or blocked by policy: {e}")
    DOCLING_AVAILABLE = False


class DoclingService:
    """
    Service to process documents with Docling
    Handles both images and PDFs with built-in OCR
    """
    
    def __init__(self, output_dir: str = "uploads/output"):
        """
        Initialize the service
        
        Args:
            output_dir: Default directory for markdown and JSON outputs
        """
        self.default_output_dir = Path(output_dir)
        self.default_output_dir.mkdir(exist_ok=True, parents=True)
        
        # Cache converters for performance
        self._image_converter = None
        self._pdf_converter = None
        
        if not DOCLING_AVAILABLE:
            print("🛑 Docling is NOT available. Falling back to PyMuPDF (fitz) mode.")
            if not PYMUPDF_AVAILABLE:
                print("❌ WARNING: PyMuPDF is also not available! Document processing WILL fail.")
    
    async def process_document(
        self, 
        file_path: str, 
        output_dir: Optional[str] = None,
        save_outputs: bool = True
    ) -> Dict:
        """
        Main method: Process a document file
        
        Args:
            file_path: Path to image or PDF file
            output_dir: Optional directory to save outputs (uses default if None)
            save_outputs: Whether to save markdown/JSON files to disk
            
        Returns:
            Dict with:
                - markdown: Markdown text content
                - json: Full JSON with bounding boxes
                - page_count: Number of pages
                - paths: Dictionary of saved file paths (if save_outputs=True)
        """
        file_path = Path(file_path)
        
        # Validate file exists
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        print(f"📄 Processing: {file_path.name}")
        
        # Get the right converter for this file type
        file_extension = file_path.suffix.lower()
        
        # Check if we can use Docling
        if DOCLING_AVAILABLE:
            try:
                converter = self._get_converter(file_extension)
                print("  Converting document with Docling...")
                result = converter.convert(str(file_path))
                doc = result.document
                print(f"✓ Converted {len(doc.pages)} pages")
                
                # Get content based on Docling format
                markdown_content = doc.export_to_markdown()
                json_content = doc.export_to_dict()
                page_count = len(doc.pages)
            except Exception as e:
                print(f"  ⚠️ Docling conversion failed: {e}. Trying fallback...")
                markdown_content, json_content, page_count = self._fallback_convert(file_path)
        else:
            # Automatic fallback if Docling was never loaded
            markdown_content, json_content, page_count = self._fallback_convert(file_path)
        
        # Get output directory
        out_dir = Path(output_dir) if output_dir else self.default_output_dir
        out_dir.mkdir(exist_ok=True, parents=True)
        
        # Save outputs to files if requested
        if save_outputs:
            # Create a mock doc-like object if we used fallback
            outputs = self._save_outputs_manual(markdown_content, json_content, page_count, file_path.stem, out_dir)
        else:
            # Return just the content without saving
            outputs = {
                "markdown": markdown_content,
                "json": json_content,
                "page_count": page_count,
                "paths": {}
            }
        
        return outputs

    def _fallback_convert(self, file_path: Path) -> tuple[str, dict[str, Any], int]:
        """Fallback processing using PyMuPDF"""
        if not PYMUPDF_AVAILABLE:
            raise RuntimeError("No document processing libraries available (Docling blocked, PyMuPDF missing)")
        
        print(f"  ⚡ Using PyMuPDF fallback for: {file_path.name}")
        
        file_extension = file_path.suffix.lower()
        if file_extension == '.pdf':
            doc = fitz.open(str(file_path))
            page_count = len(doc)
            
            markdown_parts = []
            all_texts = []
            
            for i in range(page_count):
                page = doc[i]
                text = page.get_text("text")
                markdown_parts.append(f"## Page {i+1}\n\n{text}")
                
                # Extract blocks for JSON structure (similar to Docling's texts)
                blocks = page.get_text("blocks")
                for b in blocks:
                    # b: (x0, y0, x1, y1, "text", block_no, block_type)
                    all_texts.append({
                        "text": b[4],
                        "bbox": [b[0], b[1], b[2], b[3]],
                        "page": i + 1
                    })
            
            doc.close()
            
            markdown_content = "\n\n---\n\n".join(markdown_parts)
            json_content = {
                "texts": all_texts,
                "metadata": {"source": str(file_path), "method": "PyMuPDF fallback"}
            }
            
            return markdown_content, json_content, page_count
        else:
            # For images, if Docling is blocked, we have a problem
            # But maybe OCR service can handle it if we refactor further.
            # For now, just return empty/warning
            return f"# Warning: Image processing requires Docling (Blocked on this machine)", {"texts": []}, 1

    def _save_outputs_manual(self, markdown: str, json_data: dict, page_count: int, base_name: str, output_dir: Path) -> dict:
        """Manually save outputs when not using Docling objects"""
        markdown_path = output_dir / f"{base_name}.md"
        markdown_path.write_text(markdown, encoding='utf-8')
        
        json_path = output_dir / f"{base_name}.json"
        json_path.write_text(
            json.dumps(json_data, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )
        
        return {
            "markdown": markdown,
            "json": json_data,
            "page_count": page_count,
            "paths": {
                "markdown": str(markdown_path),
                "json": str(json_path)
            }
        }
    
    def _get_converter(self, file_extension: str) -> DocumentConverter:
        """
        Get the appropriate converter based on file type
        
        Args:
            file_extension: .png, .jpg, .jpeg, or .pdf
            
        Returns:
            Configured DocumentConverter
        """
        if file_extension in ['.png', '.jpg', '.jpeg']:
            print("  Using Image converter (Vision Language Model)")
            return self._create_image_converter()
        
        elif file_extension == '.pdf':
            print("  Using PDF converter (Built-in OCR)")
            return self._create_pdf_converter()
        
        else:
            raise ValueError(
                f"Unsupported file type: {file_extension}. "
                f"Supported: .png, .jpg, .jpeg, .pdf"
            )
    
    def _create_image_converter(self) -> DocumentConverter:
        """
        Create converter for images using Vision Language Model
        Good for: PNG, JPG, JPEG
        
        Note: For images, we use PdfPipelineOptions with OCR enabled
        since ImageFormatOption uses StandardPdfPipeline by default.
        VlmPipelineOptions is for VlmPipeline which requires different setup.
        """
        # Use PdfPipelineOptions for images since ImageFormatOption uses StandardPdfPipeline
        pipeline_options = PdfPipelineOptions(
            do_ocr=True,                  # Use Docling's built-in OCR for images
            do_table_structure=True,      # Detect tables
            generate_page_images=True,    # Keep page images
        )
        
        return DocumentConverter(
            format_options={
                InputFormat.IMAGE: ImageFormatOption(
                    pipeline_options=pipeline_options,
                ),
            }
        )
    
    def _create_pdf_converter(self) -> DocumentConverter:
        """
        Create converter for PDFs with built-in OCR
        Docling automatically handles text extraction and OCR
        """
        pipeline_options = PdfPipelineOptions(
            do_ocr=True,                  # Use Docling's built-in OCR
            do_table_structure=True,      # Detect tables
            generate_page_images=True,    # Keep page images
        )
        
        return DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options,
                ),
            }
        )
    
    def _save_outputs(self, doc, base_name: str, output_dir: Path) -> Dict:
        """
        Save markdown and JSON to files
        
        Args:
            doc: Docling document object
            base_name: Base filename (without extension)
            output_dir: Directory to save files
            
        Returns:
            Dict with markdown, json, page_count, and file paths
        """
        # Export markdown
        markdown_path = output_dir / f"{base_name}.md"
        markdown_content = doc.export_to_markdown()
        markdown_path.write_text(markdown_content, encoding='utf-8')
        print(f"✓ Saved: {markdown_path.name}")
        
        # Export JSON (includes bounding boxes)
        json_path = output_dir / f"{base_name}.json"
        docling_json = doc.export_to_dict()
        json_path.write_text(
            json.dumps(docling_json, indent=2, ensure_ascii=False),
            encoding='utf-8'
        )
        print(f"✓ Saved: {json_path.name}")
        
        return {
            "markdown": markdown_content,
            "json": docling_json,
            "page_count": len(doc.pages),
            "paths": {
                "markdown": str(markdown_path),
                "json": str(json_path)
            }
        }