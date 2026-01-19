from typing import TypedDict, Optional, List, Dict
from enum import Enum


class ProcessingStage(str, Enum):
    """
    Stages in our form processing workflow
    """
    DOCLING_CONVERT = "docling_convert"  # Converting PDF/image to markdown+json
    LLM_EXTRACT = "llm_extract"          # Extracting fields with LLM
    VALIDATE = "validate"                 # Validating extracted fields
    COMPLETE = "complete"                 # Successfully completed
    ERROR = "error"                       # Something went wrong


class FormAgentState(TypedDict):
    """
    The state that flows through our LangGraph agent.
    Each node reads from and writes to this state.
    """
    
    # INPUT - What we start with
    file_path: str                        # Path to the form image/PDF
    user_id: Optional[str]                # User who uploaded (optional)
    
    # TRACKING - Where are we in the process?
    current_stage: ProcessingStage        # Current processing stage
    errors: List[str]                     # List of errors encountered
    
    # DOCLING OUTPUTS - From node 1
    markdown_content: Optional[str]       # Markdown text from docling
    docling_json: Optional[Dict]          # JSON with bboxes from docling
    page_count: Optional[int]             # Number of pages processed
    
    # LLM OUTPUTS - From node 2
    extracted_fields: Optional[Dict]      # Extracted form fields
    field_count: Optional[int]            # Number of fields found
    
    # FINAL RESULTS
    success: bool                         # Did everything work?
    output_paths: Dict[str, str]          # Paths to all output files
