"""
Pydantic models package
"""

# Re-export all models for easy importing
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

__all__ = [
    # Form models
    "ProcessingStage",
    "FieldType",
    "FieldCoordinates",
    "FieldSpan",
    "FormField",
    "SpecialArea",
    "FormExtractionResult",
    "FormAgentState",
    "FormUploadRequest",
    "FormUploadResponse",
    "FormFieldsResponse",
    "FormListItem",
    "FormListResponse",
    # Document models
    "DocumentType",
    "ProcessingStatus",
    "OCRResult",
    "PersonalInfo",
    "IdentificationInfo",
    "AddressInfo",
    "ContactInfo",
    "DocumentMetadata",
    "ExtractedDocumentData",
    "DocumentAgentState",
    "DocumentUploadRequest",
    "DocumentUploadResponse",
    "DocumentDataResponse",
    "DocumentListItem",
    "DocumentListResponse",
    "MergedDocumentData",
]
