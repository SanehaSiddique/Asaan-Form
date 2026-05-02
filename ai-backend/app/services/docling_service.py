import json
from pathlib import Path
from typing import Dict, Optional, Any
import traceback

# Optional: PyMuPDF fallback
try:
    import fitz
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

# Docling imports (safe)
try:
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import (
        DocumentConverter,
        InputFormat,
        ImageFormatOption,
        PdfFormatOption
    )
    DOCLING_AVAILABLE = True
except Exception as e:
    print(f"⚠️ Docling unavailable or blocked by policy: {e}")
    DOCLING_AVAILABLE = False
    DocumentConverter = None  # ✅ prevent NameError


class DoclingService:
    def __init__(self, output_dir: str = "uploads/output"):
        self.default_output_dir = Path(output_dir)
        self.default_output_dir.mkdir(exist_ok=True, parents=True)

        if not DOCLING_AVAILABLE:
            print("🛑 Docling NOT available → using fallback mode")
            if not PYMUPDF_AVAILABLE:
                print("❌ No processing libraries available!")

    async def process_document(
        self,
        file_path: str,
        output_dir: Optional[str] = None,
        save_outputs: bool = True
    ) -> Dict:

        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        print(f"📄 Processing: {file_path.name}")
        file_extension = file_path.suffix.lower()

        # 👉 Decide path early (cleaner)
        if DOCLING_AVAILABLE:
            try:
                converter = self._get_converter(file_extension)
                result = converter.convert(str(file_path))
                doc = result.document

                markdown_content = doc.export_to_markdown()
                json_content = doc.export_to_dict()
                page_count = len(doc.pages)

            except Exception as e:
                print(f"⚠️ Docling failed → fallback: {e}")
                markdown_content, json_content, page_count = self._fallback_convert(file_path)
        else:
            markdown_content, json_content, page_count = self._fallback_convert(file_path)

        out_dir = Path(output_dir) if output_dir else self.default_output_dir
        out_dir.mkdir(exist_ok=True, parents=True)

        if save_outputs:
            return self._save_outputs_manual(
                markdown_content,
                json_content,
                page_count,
                file_path.stem,
                out_dir
            )

        return {
            "markdown": markdown_content,
            "json": json_content,
            "page_count": page_count,
            "paths": {}
        }

    def _fallback_convert(self, file_path: Path):
        if not PYMUPDF_AVAILABLE:
            raise RuntimeError("No document processing available")

        print(f"⚡ Using PyMuPDF fallback: {file_path.name}")

        if file_path.suffix.lower() == '.pdf':
            doc = fitz.open(str(file_path))
            page_count = len(doc)

            markdown_parts = []
            all_texts = []

            for i in range(page_count):
                page = doc[i]
                text = page.get_text("text")
                markdown_parts.append(f"## Page {i+1}\n\n{text}")

                blocks = page.get_text("blocks")
                for b in blocks:
                    all_texts.append({
                        "text": b[4],
                        "bbox": [b[0], b[1], b[2], b[3]],
                        "page": i + 1
                    })

            doc.close()

            return (
                "\n\n---\n\n".join(markdown_parts),
                {"texts": all_texts},
                page_count
            )

        return (
            "# Image processing requires Docling",
            {"texts": []},
            1
        )

    def _save_outputs_manual(self, markdown, json_data, page_count, base_name, output_dir):
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

    def _get_converter(self, file_extension: str):
        # ✅ No type hint → avoids NameError

        if not DOCLING_AVAILABLE or DocumentConverter is None:
            raise RuntimeError("Docling not available")

        if file_extension in ['.png', '.jpg', '.jpeg']:
            return self._create_image_converter()

        if file_extension == '.pdf':
            return self._create_pdf_converter()

        raise ValueError(f"Unsupported file type: {file_extension}")

    def _create_image_converter(self):
        pipeline_options = PdfPipelineOptions(
            do_ocr=True,
            do_table_structure=True,
            generate_page_images=True,
        )

        return DocumentConverter(
            format_options={
                InputFormat.IMAGE: ImageFormatOption(
                    pipeline_options=pipeline_options
                ),
            }
        )

    def _create_pdf_converter(self):
        pipeline_options = PdfPipelineOptions(
            do_ocr=True,
            do_table_structure=True,
            generate_page_images=True,
        )

        return DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pipeline_options
                ),
            }
        )