import asyncio
import json
from pathlib import Path
from app.schemas.state import AgentState
from app.services.document_processing_service import document_processing_service

async def document_extraction_agent(state: AgentState) -> AgentState:
    """
    FAN-IN Node: Takes english_text and urdu_text from parallel OCR nodes,
    combines them, and runs structured data extraction via LLM.
    """
    english_text = state.get("english_text", "")
    urdu_text = state.get("urdu_text", "")
    document_ocr_boxes = state.get("document_ocr_boxes", [])
    
    # We may not know the document_type at this point, but we can pass None
    document_type = state.get("document_type") 
    
    ocr_result = {
        "english_text": english_text,
        "urdu_text": urdu_text,
        "boxes": document_ocr_boxes
    }
    
    print(f"  🤖 Running structured data extraction on merged OCR results...")
    
    try:
        # Extract structured data
        # Await the async method
        extracted_data = await document_processing_service.extract_structured_data(
            ocr_result, document_type
        )
        
        # Save extraction result to disk for persistence (legacy support)
        user_id = state.get("user_id", "default")
        original_files = state.get("files", [])
        if original_files:
            file_path = Path(original_files[0])
            docs_dir = file_path.parent
            base_stem = file_path.stem
            if "_page_" in base_stem:
                base_stem = base_stem.split("_page_")[0]
            
            output_path = docs_dir / f"{base_stem}_extracted.json"
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump({
                    "ocr": ocr_result,
                    "extracted": extracted_data,
                    "metadata": {
                        "filename": file_path.name,
                        "document_type": document_type
                    }
                }, f, indent=2, ensure_ascii=False)
            print(f"  ✓ Persisted extraction to {output_path.name}")

        # Merge JSON into the state
        return {
            "merged_json": extracted_data,
            "results": {
                "document_extraction": {
                    "success": True, 
                    "extracted": extracted_data,
                    "ocr": ocr_result
                }
            },
            "error": None
        }
    except Exception as e:
        print(f"  ❌ Document extraction/persistence failed: {e}")
        import traceback
        traceback.print_exc()
        return {
            "merged_json": {"error": str(e)},
            "error": f"Extraction error: {str(e)}"
        }
