import asyncio
import json
from pathlib import Path
from app.schemas.state import AgentState
from app.services.form_filling_service import form_filling_service
from fastapi import HTTPException
from app.config import settings

def _load_form_schema(user_id: str, form_id: str) -> list:
    form_fields_path = settings.get_user_forms_dir(user_id) / form_id / "output" / "form_fields.json"
    if not form_fields_path.exists():
        form_fields_path = settings.get_user_forms_dir(user_id) / form_id / "form_fields.json"
        if not form_fields_path.exists():
            raise FileNotFoundError(f"Form schema {form_id} not found")
            
    with open(form_fields_path, 'r', encoding='utf-8') as f:
        form_data = json.load(f)
        if "form_fields" in form_data:
            return form_data["form_fields"]
        elif isinstance(form_data, list):
            return form_data
        else:
            return []

async def mapping_agent(state: AgentState) -> AgentState:
    """
    AI Agent that maps document data to form fields.
    Takes document_data and form_id from state.
    """
    user_id = state.get("user_id")
    form_id = state.get("form_id")
    document_data = state.get("document_data", {})
    
    # If the validator loops back with feedback, we could use it to adjust prompt 
    # (But for now we just rerun or we could inject validation_feedback into the service)
    validation_feedback = state.get("validation_feedback")
    
    if not form_id or not user_id:
        return {"error": "Missing form_id or user_id for mapping"}
        
    print(f"  🧠 Mapping agent working on form {form_id}...")
    
    try:
        try:
            form_schema = _load_form_schema(user_id, form_id)
        except FileNotFoundError as fnf:
            print(f"  ❌ Mapping failed: {fnf}")
            return {"error": f"Form schema not found for ID: {form_id}. Ensure the form template was correctly processed."}
            
        document_ocr_text = state.get("document_ocr_text", "")
        
        # Await form mapping
        mapping = await form_filling_service.fill_form(
            form_fields=form_schema,
            document_data=document_data,
            document_ocr_text=document_ocr_text,
            validation_feedback=validation_feedback
        )
        
        return {
            "form_result": {"mapping": mapping, "schema": form_schema},
            "validation_feedback": None, # Reset feedback
            "error": None # Clear previous errors
        }
    except Exception as e:
        print(f"  ❌ Mapping failed: {e}")
        return {"error": f"Mapping process failed: {str(e)}"}
