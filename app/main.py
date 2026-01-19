# FastAPI entry point
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.apis.routes import router as document_intake_router
from app.apis.form_upload import router as form_router
from app.apis.document_upload import router as document_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)


@app.on_event("startup")
async def startup_event():
    """
    Preload OCR models in background to avoid blocking first request
    """
    try:
        from app.services.ocr_service import preload_ocr
        print("🚀 Preloading OCR models in background...")
        preload_ocr()
        print("  ✓ OCR preload initiated (models will be ready shortly)")
    except Exception as e:
        print(f"  ⚠️ OCR preload failed: {e}")
        # Continue anyway - OCR will load on first use

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# Form routes - for uploading and processing form templates
app.include_router(form_router)

# Document routes - for uploading and processing documents (ID cards, certificates)
app.include_router(document_router)

# Legacy document intake route
app.include_router(document_intake_router)


@app.get("/")
def root():
    return {
        "status": "AI system running",
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "endpoints": {
            "forms": "/form - Upload and process form templates",
            "documents": "/document - Upload and process documents (ID cards, etc.)",
            "docs": "/docs - API documentation"
        }
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "llm": "configured" if settings.OPENROUTER_API_KEY else "not configured"
        }
    }
