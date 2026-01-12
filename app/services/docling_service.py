import os
import json
from pathlib import Path
from typing import Dict
from huggingface_hub import snapshot_download

from docling.datamodel.pipeline_options import (
    VlmPipelineOptions,
    PdfPipelineOptions,
    RapidOcrOptions
)
from docling.document_converter import (
    DocumentConverter,
    InputFormat,
    ImageFormatOption,
    PdfFormatOption
)


class DoclingService:
    """
    Service to process documents with Docling
    Handles both images and PDFs
    """
    
    def __init__(self, output_dir: str = "uploads/output"):
        """
        Initialize the service
        
        Args:
            output_dir: Where to save markdown and JSON outputs
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)
        self._ocr_models_path = None  # Downloaded once and cached
    
    async def process_document(self, file_path: str) -> Dict:
        """
        Main method: Process a document file
        
        Args:
            file_path: Path to image or PDF file
            
        Returns:
            Dict with:
                - markdown: Markdown text content
                - json: Full JSON with bounding boxes
                - page_count: Number of pages
                - paths: Dictionary of saved file paths
        """
        file_path = Path(file_path)
        
        # Validate file exists
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        print(f"📄 Processing: {file_path.name}")
        
        # Get the right converter for this file type
        file_extension = file_path.suffix.lower()
        converter = self._get_converter(file_extension)
        
        # Convert the document
        print(f"  Converting with Docling...")
        result = converter.convert(str(file_path))
        doc = result.document
        
        print(f"✓ Converted {len(doc.pages)} pages")
        
        # Save outputs to files
        outputs = self._save_outputs(doc, file_path.stem)
        
        return outputs
    
    def _get_converter(self, file_extension: str) -> DocumentConverter:
        """
        Get the appropriate converter based on file type
        
        Args:
            file_extension: .png, .jpg, .jpeg, or .pdf
            
        Returns:
            Configured DocumentConverter
        """
        if file_extension in ['.png', '.jpg', '.jpeg']:
            print(f"  Using IMAGE converter (VLM pipeline)")
            return self._create_image_converter()
        
        elif file_extension == '.pdf':
            print(f"  Using PDF converter (RapidOCR pipeline)")
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
        """
        vlm_options = VlmPipelineOptions(
            do_table_structure=True,      # Detect tables
            generate_page_images=True,    # Keep page images
        )
        
        return DocumentConverter(
            format_options={
                InputFormat.IMAGE: ImageFormatOption(
                    pipeline_options=vlm_options,
                ),
            }
        )
    
    def _create_pdf_converter(self) -> DocumentConverter:
        """
        Create converter for PDFs using OCR
        Good for: Scanned PDFs, PDFs with text
        """
        # Download OCR models if not already downloaded
        if not self._ocr_models_path:
            print("    Downloading RapidOCR models (one-time)...")
            self._ocr_models_path = snapshot_download(repo_id="SWHL/RapidOCR")
            print("    ✓ Models ready")
        
        # Configure OCR with downloaded models
        ocr_options = RapidOcrOptions(
            det_model_path=os.path.join(
                self._ocr_models_path, 
                "PP-OCRv4", 
                "ch_PP-OCRv4_det_server_infer.onnx"
            ),
            rec_model_path=os.path.join(
                self._ocr_models_path, 
                "PP-OCRv4", 
                "ch_PP-OCRv4_rec_server_infer.onnx"
            ),
            cls_model_path=os.path.join(
                self._ocr_models_path, 
                "PP-OCRv3", 
                "ch_ppocr_mobile_v2.0_cls_train.onnx"
            ),
        )
        
        # Create pipeline with OCR
        pipeline_options = PdfPipelineOptions(
            ocr_options=ocr_options,
            do_ocr=True,                  # Enable OCR
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
    
    def _save_outputs(self, doc, base_name: str) -> Dict:
        """
        Save markdown and JSON to files
        
        Args:
            doc: Docling document object
            base_name: Base filename (without extension)
            
        Returns:
            Dict with markdown, json, page_count, and file paths
        """
        # Export markdown
        markdown_path = self.output_dir / f"{base_name}.md"
        markdown_content = doc.export_to_markdown()
        markdown_path.write_text(markdown_content, encoding='utf-8')
        print(f"✓ Saved: {markdown_path.name}")
        
        # Export JSON (includes bounding boxes)
        json_path = self.output_dir / f"{base_name}.json"
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
