from typing import TypedDict, Optional, List, Dict, Annotated

# This function tells LangGraph: "If you get a new value, just overwrite the old one."
def overwrite(old, new):
    return new

class AgentState(TypedDict, total=False):
    # Use Annotated with the overwrite function
    user_input: Annotated[Optional[str], overwrite]
    user_id: Annotated[Optional[str], overwrite]
    files: Annotated[Optional[List[str]], overwrite]

    # intent
    intent: Annotated[Optional[str], overwrite]

    # document processing
    english_text: Annotated[Optional[str], overwrite]
    urdu_text: Annotated[Optional[str], overwrite]
    document_ocr_boxes: Annotated[Optional[List[List[int]]], overwrite]
    merged_json: Annotated[Optional[Dict], overwrite]
    
    # form processing
    form_result: Annotated[Optional[Dict], overwrite]

    # form filling & validation
    form_id: Annotated[Optional[str], overwrite]
    document_id: Annotated[Optional[str], overwrite]
    document_data: Annotated[Optional[Dict], overwrite]
    document_ocr_text: Annotated[Optional[str], overwrite]
    validation_feedback: Annotated[Optional[str], overwrite]
    missing_keys: Annotated[Optional[List[str]], overwrite]

    # chatbot & interact
    history: Annotated[Optional[List[Dict]], overwrite]
    document_context: Annotated[Optional[Dict], overwrite]
    
    # general properties
    results: Annotated[Optional[Dict], overwrite]
    error: Annotated[Optional[str], overwrite]
    retry_count: Annotated[int, overwrite]