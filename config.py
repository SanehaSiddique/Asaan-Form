import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # API Settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "RAG Document Management API"
    
    # Milvus Settings
# Zilliz Cloud (Milvus) Settings
    # Zilliz Cloud (Milvus) Settings
    MILVUS_URI: str = ""  # Set in .env
    MILVUS_USER: str = ""  # Empty for API key auth
    MILVUS_PASSWORD: str = ""  # Your Zilliz API key
    MILVUS_COLLECTION_NAME: str = "rag_langchain"
    MILVUS_DIMENSION: int = 384
    MILVUS_METRIC_TYPE: str = "COSINE"


    MONGODB_URL: str = ""
    DATABASE_NAME: str = ""
    MONGODB_COLLECTION: str = ""
    
    GROQ_API_KEY: str = ""  # Set your free key here or in .env
    GROQ_BASE_URL: str = ""
    GROQ_MODEL: str = "" 

    # File Upload Settings
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: list = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".txt"]
    
    # Embedding Settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    EMBEDDING_DIMENSION: int = 384  # all-MiniLM-L6-v2 dimension
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Groq exports
GROQ_API_KEY = settings.GROQ_API_KEY
GROQ_BASE_URL = settings.GROQ_BASE_URL
GROQ_MODEL = settings.GROQ_MODEL
# Export for direct import
MILVUS_URI = settings.MILVUS_URI
MILVUS_USER = settings.MILVUS_USER
MILVUS_PASSWORD = settings.MILVUS_PASSWORD
MILVUS_COLLECTION_NAME = settings.MILVUS_COLLECTION_NAME
MILVUS_DIMENSION = settings.MILVUS_DIMENSION
MILVUS_METRIC_TYPE = settings.MILVUS_METRIC_TYPE