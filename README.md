# Asaan Form - AI Backend

AI-powered form processing system with document extraction, multilingual OCR (English/Urdu), and RAG-based chatbot capabilities.

## 🚀 Features

- **Form Processing**: Upload and extract form fields with coordinates using Docling and LLM
- **Document Processing**: Extract structured data from ID cards, certificates, passports, etc.
- **Multilingual OCR**: English and Urdu text extraction using PaddleOCR and PaddleX
- **RAG Chatbot**: Upload FAQs/knowledge base files and ask questions using vector store (Milvus/Zilliz)
- **LangGraph Agents**: Multi-agent workflow for intelligent document processing
- **Vector Store**: Milvus (Zilliz Cloud) integration for semantic search

## 📋 Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Routes](#api-routes)
- [PaddleX Library](#paddlex-library)
- [Project Structure](#project-structure)
- [Usage Examples](#usage-examples)

## 🔧 Installation

### Prerequisites

- Python 3.8 or higher
- pip package manager
- Virtual environment (recommended)

### Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-backend
```

2. **Create and activate virtual environment**
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

**Note**: Installation may take several minutes due to ML libraries (PyTorch, PaddlePaddle, etc.)

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# API Settings
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# LLM Configuration (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=8000

# Milvus/Zilliz Cloud (for vector store)
MILVUS_URI=your_zilliz_cloud_uri
MILVUS_PASSWORD=your_zilliz_api_key
MILVUS_COLLECTION_NAME=rag_langchain
MILVUS_DIMENSION=384
MILVUS_METRIC_TYPE=COSINE
```

## 🏃 Running the Application

Simply run:
```bash
python main.py
```

The API will be available at:
- **Base URL**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 📡 API Routes

### Root & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root endpoint - system status |
| `GET` | `/health` | Health check endpoint |

### 🤖 Chatbot Routes (`/chatbot`)

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/chatbot/ingest` | Upload and ingest FAQ/knowledge base files into vector store | `files` (multipart), `collection_name` (query), `source` (query) |
| `POST` | `/chatbot/ask` | Ask questions using RAG over vector store | `question` (query), `collection_name` (query), `k` (query, 1-10) |

**Example - Ingest Files:**
```bash
curl -X POST "http://localhost:8000/chatbot/ingest?collection_name=rag_langchain&source=faqs" \
  -F "files=@faq1.pdf" \
  -F "files=@faq2.docx"
```

**Example - Ask Question:**
```bash
curl -X POST "http://localhost:8000/chatbot/ask?question=What%20is%20your%20return%20policy?&k=5"
```

### 📄 Form Routes (`/form`)

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/form/upload/{user_id}` | Upload and process a form template | `file` (multipart), `form_name` (query), `process` (query) |
| `POST` | `/form/upload/{user_id}/batch` | Upload multiple forms at once | `files` (multipart), `process` (query) |
| `GET` | `/form/list/{user_id}` | List all forms for a user | - |
| `GET` | `/form/fields/{user_id}/{form_id}` | Get extracted fields for a specific form | - |
| `POST` | `/form/process/{user_id}/{form_id}` | Process an existing form that wasn't processed initially | - |
| `GET` | `/form/field-types/{user_id}/{form_id}` | Get summary of field types in a form | - |
| `GET` | `/form/special-areas/{user_id}/{form_id}` | Get special areas (signature, photo, etc.) | - |
| `DELETE` | `/form/delete/{user_id}/{form_id}` | Delete a form and all its data | - |
| `GET` | `/form/images/{user_id}/{form_id}` | Get list of page images for a form | - |

**Example - Upload Form:**
```bash
curl -X POST "http://localhost:8000/form/upload/user123?form_name=Application%20Form&process=true" \
  -F "file=@form.pdf"
```

### 📑 Document Routes (`/document`)

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/document/upload/{user_id}` | Upload and process a document (ID card, certificate, etc.) | `file` (multipart), `document_type` (query), `process` (query), `languages` (query) |
| `POST` | `/document/upload/{user_id}/batch` | Upload multiple documents at once | `files` (multipart), `document_type` (query), `process` (query), `languages` (query) |
| `GET` | `/document/list/{user_id}` | List all documents for a user | - |
| `GET` | `/document/data/{user_id}/{filename}` | Get extracted data for a specific document | - |
| `POST` | `/document/process/{user_id}/{filename}` | Process an existing document | `document_type` (query), `languages` (query) |
| `GET` | `/document/user/{user_id}/all-data` | Get all merged data from all user's documents | - |
| `DELETE` | `/document/delete/{user_id}/{filename}` | Delete a document and its extraction data | - |

**Example - Upload Document:**
```bash
curl -X POST "http://localhost:8000/document/upload/user123?document_type=id_card&process=true&languages=english,urdu" \
  -F "file=@id_card.jpg"
```

### 🔄 Legacy Routes

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `POST` | `/document/intake` | Legacy document intake (uses main graph) | `user_input` (form), `file` (multipart) |

## 🔬 PaddleX Library

### Important Library Change

This project uses **PaddleX** (version 3.3.13+) for advanced OCR capabilities. PaddleX is a comprehensive toolkit built on top of PaddlePaddle that provides:

- **Enhanced OCR Models**: Pre-trained models optimized for Urdu and English text recognition
- **Document Analysis**: Advanced document structure understanding
- **Improved Accuracy**: Better performance for multilingual document processing
- **Model Management**: Simplified model loading and inference pipeline

### PaddleX vs PaddleOCR

While the project also includes `paddleocr` for basic OCR tasks, **PaddleX** is used for:
- More complex document analysis workflows
- Better integration with the inference pipeline
- Enhanced model management and deployment
- Advanced text recognition for Urdu documents

### Installation Notes

PaddleX is automatically installed via `requirements.txt`. If you encounter issues:

1. **Ensure Python 3.8+**: PaddleX requires Python 3.8 or higher
2. **PaddlePaddle Dependency**: PaddleX depends on PaddlePaddle, which is included in requirements
3. **Disk Space**: Ensure sufficient disk space for model downloads (models are downloaded on first use)
4. **GPU Support** (Optional): For faster inference, install CUDA-enabled PaddlePaddle:
   ```bash
   pip install paddlepaddle-gpu
   ```

### Troubleshooting

If you encounter `paddlex` import errors:
- Verify installation: `pip show paddlex`
- Reinstall if needed: `pip uninstall paddlex && pip install paddlex`
- Check PaddlePaddle: `python -c "import paddle; print(paddle.__version__)"`

## 📁 Project Structure

```
ai-backend/
├── app/
│   ├── agents/              # LangGraph agents for processing workflows
│   │   ├── bilingual_merge_agent.py
│   │   ├── document_agent.py
│   │   ├── english_ocr_agent.py
│   │   ├── form_agent.py
│   │   ├── greeting_agent.py
│   │   ├── intent_agent.py
│   │   └── urdu_ocr_agent.py
│   ├── apis/                # FastAPI route handlers
│   │   ├── chatbot.py       # Chatbot routes (ingest, ask)
│   │   ├── document_upload.py
│   │   ├── form_upload.py
│   │   └── routes.py        # Legacy routes
│   ├── chatbot/             # RAG chatbot implementation
│   │   ├── document_loader.py
│   │   ├── embeddings.py
│   │   ├── rag_chain.py
│   │   └── vectorstore.py
│   ├── graph/               # LangGraph workflow
│   │   └── main_graph.py
│   ├── models/              # ML models
│   │   ├── pydantic_models/ # Data models
│   │   └── utrnet/          # UTRNet model for Urdu OCR
│   ├── schemas/             # State schemas
│   ├── services/            # Business logic services
│   │   ├── docling_service.py
│   │   ├── document_processing_service.py
│   │   ├── form_processing_service.py
│   │   ├── llm_service.py
│   │   ├── ocr_service.py
│   │   └── urdu_ocr_service.py
│   ├── utils/               # Utility functions
│   ├── config.py            # Configuration settings
│   └── main.py              # FastAPI application
├── main.py                  # Application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 💡 Usage Examples

### 1. Upload and Process a Form

```python
import requests

url = "http://localhost:8000/form/upload/user123"
files = {"file": open("form.pdf", "rb")}
params = {"form_name": "Application Form", "process": True}

response = requests.post(url, files=files, params=params)
print(response.json())
```

### 2. Upload Document and Extract Data

```python
url = "http://localhost:8000/document/upload/user123"
files = {"file": open("id_card.jpg", "rb")}
params = {
    "document_type": "id_card",
    "process": True,
    "languages": "english,urdu"
}

response = requests.post(url, files=files, params=params)
print(response.json())
```

### 3. Ingest FAQ Files into Chatbot

```python
url = "http://localhost:8000/chatbot/ingest"
files = [
    ("files", open("faq1.pdf", "rb")),
    ("files", open("faq2.docx", "rb"))
]
params = {"collection_name": "rag_langchain", "source": "faqs"}

response = requests.post(url, files=files, params=params)
print(response.json())
```

### 4. Ask Chatbot a Question

```python
url = "http://localhost:8000/chatbot/ask"
params = {
    "question": "What is your return policy?",
    "collection_name": "rag_langchain",
    "k": 5
}

response = requests.post(url, params=params)
result = response.json()
print(f"Answer: {result['answer']}")
print(f"Sources: {result['sources']}")
```

## 🔑 Key Dependencies

- **FastAPI**: Modern web framework for building APIs
- **LangChain/LangGraph**: LLM orchestration and agent workflows
- **PaddleOCR/PaddleX**: OCR for English and Urdu text
- **PyTorch**: Deep learning framework for UTRNet models
- **Milvus**: Vector database for semantic search
- **Docling**: Document parsing and structure extraction
- **OpenRouter**: LLM API provider

## 📝 License

[Your License Here]

## 🤝 Contributing

[Contributing guidelines]

## 📧 Contact

[Contact information]

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-21
