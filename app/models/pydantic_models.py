"""
Re-export all pydantic models
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Re-export form models
from app.models.pydantic_models.form_models import (
    ProcessingStage,
    FieldType,
    FieldCoordinates,
    FieldSpan,
    FormField,
    SpecialArea,
    FormExtractionResult,
    FormAgentState,
    FormUploadRequest,
    FormUploadResponse,
    FormFieldsResponse,
    FormListItem,
    FormListResponse,
)

# Re-export document models
from app.models.pydantic_models.document_models import (
    DocumentType,
    ProcessingStatus,
    OCRResult,
    PersonalInfo,
    IdentificationInfo,
    AddressInfo,
    ContactInfo,
    DocumentMetadata,
    ExtractedDocumentData,
    DocumentAgentState,
    DocumentUploadRequest,
    DocumentUploadResponse,
    DocumentDataResponse,
    DocumentListItem,
    DocumentListResponse,
    MergedDocumentData,
)


# Legacy models (keep for backward compatibility)
class ChatRequest(BaseModel):
    user_id: str
    message: str
    files: List[str] = []  # paths to uploaded files


class ChatResponse(BaseModel):
    response: str
    extracted_data: Optional[Dict[str, Any]] = None
    intent: str