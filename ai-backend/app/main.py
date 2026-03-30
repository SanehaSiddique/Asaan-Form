# FastAPI entry point
# Allow running from this directory (ai-backend/app): add project root to path so "app" package resolves
import sys
from pathlib import Path
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.apis.form_upload import router as form_router
from app.apis.document_upload import router as document_router
from app.apis.chatbot import router as chatbot_router
from app.apis.fill import router as fills

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc"
)


@app.middleware("http")
async def log_request_metadata(request: Request, call_next):
    """
    SAFE logger: only logs headers and URL — never reads the body/form stream.
    Reading request.form() or request.body() in middleware consumes the stream
    and causes 422 errors in downstream endpoint handlers.
    """
    if request.url.path.startswith("/fill/"):
        print(f"\n🔍 Request to {request.url.path}")
        print(f"  Method: {request.method}")
        print(f"  Content-Type: {request.headers.get('content-type', 'N/A')}")
        print(f"  Content-Length: {request.headers.get('content-length', 'N/A')}")

    response = await call_next(request)
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Log and return 422 documentation for debugging
    """
    print(f"\n❌ Validation Error at {request.url.path}")
    print(f"  Details: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )


@app.on_event("startup")
async def startup_event():
    """
    Main app startup logic. OCR is now handled by the microservice on port 8001.
    """
    pass


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

# Chatbot routes - ingest KB + ask questions via RAG
app.include_router(chatbot_router)

# Form fill router
app.include_router(fills)


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
            "llm": "configured" if settings.GROQ_API_KEY else "not configured"
        }
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",        # must be a string when using reload=True
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_excludes=["asaan-env"],
        log_level="info",
        workers=4,
    )