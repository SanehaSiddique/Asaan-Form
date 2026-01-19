from typing import TypedDict, Optional, List, Dict, Any, Annotated

# This function tells LangGraph: "If you get a new value, just overwrite the old one."
def overwrite(old, new):
    return new

class AgentState(TypedDict, total=False):
    # Use Annotated with the overwrite function
    user_input: Annotated[Optional[str], overwrite]
    files: Annotated[Optional[List[str]], overwrite]

    # intent
    intent: Annotated[Optional[str], overwrite]

    # document processing
    english_text: Annotated[Optional[str], overwrite]
    urdu_text: Annotated[Optional[str], overwrite]
    merged_json: Annotated[Optional[Dict], overwrite]