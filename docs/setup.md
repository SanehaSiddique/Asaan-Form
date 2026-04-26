# 🔧 Setup & Installation Guide

This guide provides detailed instructions for setting up the Asaan-Form project environment.

---

## 📋 Prerequisites

- **Node.js**: v18.0.0 or higher
- **Python**: v3.10.x (Recommended)
- **MongoDB**: Local instance or MongoDB Atlas
- **Milvus/Zilliz**: Vector database for RAG features
- **Groq**: API key (Llama 3.3)

---

## 🛠️ Step-by-Step Setup

### 1. AI Backend (FastAPI)

The AI Backend handles OCR, Agentic workflows, and RAG.

```bash
cd ai-backend
# Create a virtual environment (named asaan-env-310 specifically for this project)
python -m venv asaan-env-310
# Activate the environment
# Windows:
asaan-env-310\Scripts\activate
# Linux/Mac:
source asaan-env-310/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### ⚠️ Known Dependency Conflict: PaddleX & LangChain
There is a known import conflict in the `paddlex` library when used alongside newer `langchain` versions. To resolve this, you must manually patch a file in your virtual environment:

**File Path**: `ai-backend/asaan-env-310/Lib/site-packages/paddlex/inference/pipelines/components/retriever/base.py`

**Change lines 25-26**:
From:
```python
from langchain.docstore.document import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
```
To:
```python
from langchain_core.documents import Document
from langchain_text_splitters.character import RecursiveCharacterTextSplitter
```

> [!IMPORTANT]
> This fix ensures that `paddlex` uses the modular `langchain-core` and `langchain-text-splitters` packages, preventing "module not found" or version mismatch errors.

### 2. Node Backend (Express)

Handles business logic and user data.

```bash
cd node-backend
npm install
node server.js
```

### 3. Frontend (React)

The user interface.

```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Environment Configuration

Create `.env` files in `ai-backend/` and `node-backend/` using the following templates:

### AI Backend (.env)
```env
GROQ_API_KEY=your_key
MILVUS_URI=your_zilliz_uri
MILVUS_PASSWORD=your_zilliz_password
```

### Node Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/asaan-form
AI_BACKEND_URL=http://localhost:8000
PORT=3000
```

---

## 🚀 Running the System
Once all sub-projects are configured, start them in the order:
1. **AI Backend**
2. **Node Backend**
3. **Frontend**

Access the application at the URL provided by the frontend (`http://localhost:8080/`).
