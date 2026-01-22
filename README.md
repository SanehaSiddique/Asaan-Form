# Asaan-Form: Your AI Form Assistant

[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1e1e8275e5ba4017ac10fd372a1beb8a)](https://app.codacy.com/gh/SanehaSiddique/Asaan-Form?utm_source=github.com&utm_medium=referral&utm_content=SanehaSiddique/Asaan-Form&utm_campaign=Badge_Grade)

**Final Year Project (FYP) – Phase I**  
**Department of Computer Science**  
**University of the Punjab**

Asaan-Form is an intelligent, **multi-agent AI system** that automates document understanding and form filling. It combines **OCR**, layout analysis, agent orchestration, and large language models (LLMs) to extract structured data from uploaded forms and guide users through an interactive AI chatbot.

---

## 🎯 Project Objectives (Phase-I)

- Analyze functional & non-functional requirements
- Research and select optimal OCR + layout analysis approach
- Design modular, agent-based system architecture
- Implement initial end-to-end processing pipeline
- Develop responsive frontend
- Build FAQs-based intelligent chatbot using **RAG** (Retrieval-Augmented Generation)
- Support multilingual OCR (English & Urdu)

---

## 👥 Team Members & Responsibilities

| Name            | Role                   | Roll No    | Key Responsibilities                                                               |
| --------------- | ---------------------- | ---------- | ---------------------------------------------------------------------------------- |
| Saneha Siddique | Group Leader / Backend | BCSF22M009 | Intent Detection Agent, LangGraph pipeline, document processing, Urdu OCR research |
| Zainab Khalid   | OCR / Layout Research  | BCSF22M013 | OCR research, form processing agent, key-value extraction                          |
| Faiqa Mustafa   | Frontend Developer     | BCSF22M019 | Preprocessing experiments, React + TailwindCSS + Redux Toolkit                     |
| Aqsa Hussain    | ERD / Chatbot LLM      | BCSF22M027 | Requirement analysis, ERD, documentation, RAG-based chatbot                        |

All team members are collaborators on this GitHub repository. Individual contributions are traceable via commit history, feature branches, and pull requests.

---

## 🌿 Git Branching & Collaboration Strategy

We follow a structured branching model for clean collaboration:

- **`main`** → stable integration branch
- **Feature branches** → individual development (`feature/agent-intent`, `feature/frontend-v1`, etc.)
- All features merged via **Pull Requests** after peer review

### Pull Requests (Phase-I)

| PR # | Description                                                         | Source Branch             | Status |
| ---- | ------------------------------------------------------------------- | ------------------------- | ------ |
| #6   | Integrated the Urdu OCR in document ingestion agentic workflow      | urdu-ocr-integration      | Merged |
| #5   | Updated the OCR script for better results and fixed previous errors | fix/ocr-script            | Merged |
| #4   | Frontend/version 1.0                                                | frontend/version-1.0      | Merged |
| #3   | Frontend Version 1.0 is completed using Reactjs                     | frontend-react            | Merged |
| #2   | AI backend/document agent                                           | ai-backend/document_agent | Merged |
| #1   | Main Orchestrator Structure                                         | orchestrator-core         | Merged |

---

## 🚀 Features Implemented (Phase-I)

### Core AI Capabilities

- **Multi-Agent System**: LangGraph-based orchestration with specialized agents
- **Form Processing**: Extract form fields with coordinates using Docling and LLM
- **Document Processing**: Extract structured data from ID cards, certificates, passports, etc.
- **Multilingual OCR**: English and Urdu text extraction using PaddleOCR and PaddleX
- **RAG Chatbot**: Upload FAQs/knowledge base files and ask questions using vector store (Milvus/Zilliz)
- **Layout Analysis**: Advanced document structure understanding with bounding boxes
- **Intent Detection**: Intelligent routing of user requests to appropriate agents

### Agent Architecture

1. **Intent Detection Agent** - Routes requests to appropriate processing agents
2. **Form Processing Agent** - Extracts and analyzes form fields
3. **Document Processing Agent** - Handles ID cards, certificates, and documents
4. **English OCR Agent** - PaddleOCR-based English text extraction
5. **Urdu OCR Agent** - UTRNet + PaddleX for Urdu text recognition
6. **Bilingual Merge Agent** - Combines multilingual extraction results
7. **Greeting Agent** - Handles conversational interactions

### Frontend Features

- Responsive React.js interface with Tailwind CSS
- Redux Toolkit for state management
- File upload and processing interface
- Real-time processing status
- Interactive chatbot interface

---

## 🛠️ Technology Stack

| Layer                  | Technologies                                                |
| ---------------------- | ----------------------------------------------------------- |
| **Frontend**           | React.js • Tailwind CSS • Redux Toolkit                    |
| **Backend (Node.js)**  | Node.js • Express.js                                        |
| **AI Backend**         | FastAPI • LangGraph • LangChain                             |
| **AI & NLP**           | PaddleOCR • PaddleX • UTRNet (Urdu OCR) • OpenRouter (LLM)  |
| **RAG System**         | Milvus/Zilliz Cloud • Sentence Transformers                 |
| **Layout Analysis**    | Docling                                                     |
| **Database**           | MongoDB                                                     |
| **Vector Store**       | Milvus (Zilliz Cloud) for semantic search                  |
| **Version Control**    | Git/GitHub                                                  |
| **Project Management** | JIRA (requirements & tasks)                                 |

---

## 📁 Project Structure

```
asaan-form/
├── frontend/                 # React.js frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Application pages
│   │   ├── redux/           # Redux store and slices
│   │   └── App.jsx
│   ├── package.json
│   └── README.md
│
├── nodejs-backend/          # Node.js API server
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── server.js
│   └── package.json
│
├── ai-backend/              # FastAPI AI processing backend
│   ├── app/
│   │   ├── agents/          # LangGraph agents
│   │   │   ├── bilingual_merge_agent.py
│   │   │   ├── document_agent.py
│   │   │   ├── english_ocr_agent.py
│   │   │   ├── form_agent.py
│   │   │   ├── greeting_agent.py
│   │   │   ├── intent_agent.py
│   │   │   └── urdu_ocr_agent.py
│   │   ├── apis/            # FastAPI route handlers
│   │   │   ├── chatbot.py   # Chatbot routes (ingest, ask)
│   │   │   ├── document_upload.py
│   │   │   ├── form_upload.py
│   │   │   └── routes.py
│   │   ├── chatbot/         # RAG chatbot implementation
│   │   │   ├── document_loader.py
│   │   │   ├── embeddings.py
│   │   │   ├── rag_chain.py
│   │   │   └── vectorstore.py
│   │   ├── graph/           # LangGraph workflow
│   │   │   └── main_graph.py
│   │   ├── models/          # ML models
│   │   │   ├── pydantic_models/
│   │   │   └── utrnet/      # UTRNet model for Urdu OCR
│   │   ├── schemas/         # State schemas
│   │   ├── services/        # Business logic services
│   │   │   ├── docling_service.py
│   │   │   ├── document_processing_service.py
│   │   │   ├── form_processing_service.py
│   │   │   ├── llm_service.py
│   │   │   ├── ocr_service.py
│   │   │   └── urdu_ocr_service.py
│   │   ├── utils/           # Utility functions
│   │   ├── config.py        # Configuration settings
│   │   └── main.py          # FastAPI application
│   ├── main.py              # Application entry point
│   ├── requirements.txt
│   └── README.md
│
├── docs/                    # Documentation
│   ├── requirements/        # Functional & non-functional requirements
│   ├── architecture/        # System design documents
│   └── api-docs/            # API documentation
│
├── .gitignore
├── LICENSE
└── README.md                # This file
```

---

## ⚙️ Installation & Setup

### Prerequisites

- **Node.js** ≥ v18
- **Python** ≥ v3.10
- **Git**
- **MongoDB** (local or cloud)
- **Milvus/Zilliz Cloud** account (for vector store)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd asaan-form
```

### 2. Frontend Setup (React)

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Node.js Backend Setup

```bash
cd nodejs-backend
npm install
node server.js
```

The Node.js backend will be available at `http://localhost:3000`

### 4. AI Backend Setup (FastAPI + LangGraph)

```bash
cd ai-backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python main.py
```

The AI backend will be available at:
- **Base URL**: `http://localhost:8000`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### 5. Environment Configuration

Create `.env` files in respective directories:

**ai-backend/.env:**
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
MILVUS_USER=
MILVUS_COLLECTION_NAME=rag_langchain
MILVUS_DIMENSION=384
MILVUS_METRIC_TYPE=COSINE
```

**nodejs-backend/.env:**
```env
MONGODB_URI=your_mongodb_connection_string
AI_BACKEND_URL=http://localhost:8000
PORT=3000
```

---

## ▶️ How to Run the Complete System

1. **Start MongoDB** (if running locally)
2. **Start the AI Backend** (FastAPI):
   ```bash
   cd ai-backend
   python main.py
   ```
3. **Start the Node.js Backend**:
   ```bash
   cd nodejs-backend
   node server.js
   ```
4. **Launch the Frontend** (React):
   ```bash
   cd frontend
   npm run dev
   ```
5. **Open browser** → Navigate to `http://localhost:5173`
6. **Upload any form/document** and watch the system extract fields via OCR + agents
7. **Interact with the AI chatbot** for assistance

---

## 📡 API Documentation

### Root & Health Endpoints

| Method | Endpoint  | Description            |
| ------ | --------- | ---------------------- |
| `GET`  | `/`       | Root endpoint - status |
| `GET`  | `/health` | Health check endpoint  |

### 🤖 Chatbot Routes (`/chatbot`)

| Method | Endpoint          | Description                                              | Parameters                                              |
| ------ | ----------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `POST` | `/chatbot/ingest` | Upload and ingest FAQ/knowledge base files               | `files` (multipart), `collection_name`, `source`        |
| `POST` | `/chatbot/ask`    | Ask questions using RAG over vector store                | `question`, `collection_name`, `k` (1-10)               |

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

| Method   | Endpoint                               | Description                           | Parameters                                 |
| -------- | -------------------------------------- | ------------------------------------- | ------------------------------------------ |
| `POST`   | `/form/upload/{user_id}`               | Upload and process a form template    | `file`, `form_name`, `process`             |
| `POST`   | `/form/upload/{user_id}/batch`         | Upload multiple forms at once         | `files`, `process`                         |
| `GET`    | `/form/list/{user_id}`                 | List all forms for a user             | -                                          |
| `GET`    | `/form/fields/{user_id}/{form_id}`     | Get extracted fields for a form       | -                                          |
| `POST`   | `/form/process/{user_id}/{form_id}`    | Process an existing form              | -                                          |
| `GET`    | `/form/field-types/{user_id}/{form_id}`| Get summary of field types            | -                                          |
| `GET`    | `/form/special-areas/{user_id}/{form_id}`| Get special areas (signature, photo) | -                                          |
| `DELETE` | `/form/delete/{user_id}/{form_id}`     | Delete a form and all its data        | -                                          |
| `GET`    | `/form/images/{user_id}/{form_id}`     | Get list of page images               | -                                          |

### 📑 Document Routes (`/document`)

| Method   | Endpoint                             | Description                              | Parameters                                        |
| -------- | ------------------------------------ | ---------------------------------------- | ------------------------------------------------- |
| `POST`   | `/document/upload/{user_id}`         | Upload and process a document            | `file`, `document_type`, `process`, `languages`   |
| `POST`   | `/document/upload/{user_id}/batch`   | Upload multiple documents at once        | `files`, `document_type`, `process`, `languages`  |
| `GET`    | `/document/list/{user_id}`           | List all documents for a user            | -                                                 |
| `GET`    | `/document/data/{user_id}/{filename}`| Get extracted data for a document        | -                                                 |
| `POST`   | `/document/process/{user_id}/{filename}`| Process an existing document          | `document_type`, `languages`                      |
| `GET`    | `/document/user/{user_id}/all-data`  | Get all merged data from user's documents| -                                                 |
| `DELETE` | `/document/delete/{user_id}/{filename}`| Delete a document and its data         | -                                                 |

---

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

### 2. Upload Document with Multilingual OCR

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

---

## 🔬 Technical Deep Dive

### PaddleX Library Integration

This project uses **PaddleX** (version 3.3.13+) for advanced OCR capabilities. PaddleX provides:

- **Enhanced OCR Models**: Pre-trained models optimized for Urdu and English text recognition
- **Document Analysis**: Advanced document structure understanding
- **Improved Accuracy**: Better performance for multilingual document processing
- **Model Management**: Simplified model loading and inference pipeline

**Installation Notes:**
- PaddleX is automatically installed via `requirements.txt`
- Requires Python 3.8 or higher
- Models are downloaded on first use (ensure sufficient disk space)
- For GPU acceleration: `pip install paddlepaddle-gpu`

### Multi-Agent Architecture

The system uses **LangGraph** to orchestrate multiple specialized agents:

```
User Request → Intent Detection Agent → Route to:
  ├── Form Processing Agent (for form templates)
  ├── Document Processing Agent → English/Urdu OCR → Bilingual Merge
  └── Greeting Agent (for conversational queries)
```

### RAG Chatbot Architecture

```
User Question → Embedding → Vector Search (Milvus) → Context Retrieval → LLM → Answer
```

The RAG system uses:
- **Milvus/Zilliz Cloud** for vector storage
- **Sentence Transformers** for embeddings (384 dimensions)
- **OpenRouter API** for LLM inference
- **LangChain** for orchestration

---

## 📋 Phase-I Deliverables – Completed ✓

- ✅ OCR research & selection (PaddleOCR, PaddleX, UTRNet for Urdu)
- ✅ Multi-agent architecture design with LangGraph
- ✅ End-to-end form processing pipeline
- ✅ Document extraction system (ID cards, certificates, etc.)
- ✅ Multilingual OCR support (English & Urdu)
- ✅ RAG-based FAQ chatbot with vector store
- ✅ Responsive frontend with React.js
- ✅ FastAPI backend with comprehensive API documentation
- ✅ Version control with meaningful commits
- ✅ Project documentation

---

## 📊 Project Management & Quality Assurance

### Requirement Management

- All requirements tracked and managed using **JIRA**
- Functional and non-functional requirements fully documented
- Requirement changes documented and reflected in commits
- Traceability maintained between requirements and implementation

### Code Quality Standards

- ✅ Clean code principles followed
- ✅ Modular design with separation of concerns
- ✅ No hard-coded secrets (environment variables used)
- ✅ Proper `.gitignore` configuration
- ✅ Meaningful commit messages
- ✅ Conventional PR titles and descriptions
- ✅ Code reviews via pull requests
- ✅ Comprehensive inline documentation

### Testing & Validation

- API endpoints tested via Swagger UI
- Integration testing across frontend-backend-AI backend
- OCR accuracy validation on sample documents
- RAG chatbot response quality evaluation
- Error handling and edge case coverage

---

## 🔑 Key Dependencies

### Frontend
- React.js - UI framework
- Tailwind CSS - Styling
- Redux Toolkit - State management
- Axios - HTTP client

### Node.js Backend
- Express.js - Web framework
- MongoDB - Database
- Mongoose - ODM

### AI Backend
- **FastAPI** - Modern web framework for building APIs
- **LangChain/LangGraph** - LLM orchestration and agent workflows
- **PaddleOCR/PaddleX** - OCR for English and Urdu text
- **PyTorch** - Deep learning framework for UTRNet models
- **Milvus** - Vector database for semantic search
- **Docling** - Document parsing and structure extraction
- **OpenRouter** - LLM API provider
- **Sentence Transformers** - Embedding models

---

## 🚧 Known Limitations & Future Work

### Current Limitations
- Urdu OCR accuracy varies with font styles and image quality
- Processing time depends on document complexity
- Large batch uploads may require optimization
- Limited to PDF, DOCX, and common image formats

---

## 🔒 Security & Privacy

- API key authentication for LLM services
- Secure token-based authentication for Milvus/Zilliz
- Environment variables for sensitive configuration
- Input validation and sanitization
- File type and size restrictions
- Secure file upload handling
- HTTPS recommended for production deployment

---

## 📄 License

This project is licensed under the **MIT License**. All third-party libraries follow their respective licenses.

---

## 📬 Contact & Notes for Evaluators

### Team Contacts

- **Saneha Siddique** (Group Leader) - BCSF22M009
- **Zainab Khalid** - BCSF22M013
- **Faiqa Mustafa** - BCSF22M019
- **Aqsa Hussain** - BCSF22M027

### For Evaluators

- All contributions are traceable via GitHub commits, branches, and pull requests
- Project adheres to departmental FYP GitHub and code quality guidelines
- Code is structured, commented, and tested before commits
- Complete API documentation available at `/docs` endpoint
- Individual contribution metrics available in GitHub Insights

For any questions regarding Phase-I deliverables or technical implementation details, please contact any team member listed above.

---

## 📚 Additional Resources

- [PaddleOCR Documentation](https://github.com/PaddlePaddle/PaddleOCR)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Milvus Documentation](https://milvus.io/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://react.dev/)

---

✨ **Asaan-Form** — Simplifying forms with the power of AI.

**Version**: 1.0.0  
**Phase**: I (Completed)  
**Last Updated**: January 22, 2026