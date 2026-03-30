"""
Form Agent for LangGraph
Processes forms to extract fields with coordinates and types.
"""

from pathlib import Path
from typing import Dict
from fastapi import UploadFile
from app.schemas.state import AgentState
from app.services.form_processing_service import FormProcessingService

# Initialize service
_form_service = FormProcessingService()


async def form_agent(state: AgentState) -> AgentState:
    """
    Process a form file to extract fields with coordinates and types.
    
    Uses the form processing service to:
    1. Convert PDF to 300 DPI images (if needed)
    2. Process with Docling to get structure
    3. Extract form fields with LLM
    """
    files = state.get("files", [])
    user_id = state.get("user_id", "default")
    
    if not files:
        return {
            **state,
            "form_result": {
                "success": False,
                "error": "No file provided"
            }
        }
    
    file_path = Path(files[0])
    
    if not file_path.exists():
        return {
            **state,
            "form_result": {
                "success": False,
                "error": f"File not found: {file_path}"
            }
        }
    
    try:
        # Process the form using the service on the EXISTING folder
        result = await _form_service.process_form(
            user_id=user_id,
            file=None,
            form_name=None,
            form_folder=file_path.parent
        )
        
        return {
            "form_result": result,
            "error": None if result.get("success") else result.get("errors", ["Form processing failed"])[0]
        }
        
    except Exception as e:
        print(f"  ❌ Form processing node error: {e}")
        return {
            "form_result": {
                "success": False,
                "error": str(e),
                "errors": [str(e)]
            },
            "error": f"Form error: {str(e)}"
        }