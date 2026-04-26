# 📄 Asaan-Form: AI-Driven Form Automation

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Stack: MERN + FastAPI + AI](https://img.shields.io/badge/Stack-MERN_%2B_FastAPI_%2B_AI-green.svg)](#)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-yellow.svg)](#)
[![Node: 18+](https://img.shields.io/badge/Node-18%2B-yellow.svg)](#)

**Asaan-Form** is an end-to-end intelligent document ecosystem designed to simplify complex administrative tasks. It leverages **Agentic AI Orchestration** to transform unstructured documents (CNICs, transcripts, applications) into structured data, guiding users through it with a sympathetic multilingual chatbot.

---

## 🌟 Core System Features

### 🤖 Intelligent Agent Orchestration
Powered by **LangGraph**, the system employs specialized AI agents that collaborate to ensure accuracy:
- **Intent Agent**: Detects user needs and handles document routing.
- **Mapping Agent**: Performs semantic mapping of extracted text to form fields.
- **Validator Agent**: Detects hallucinations or data mismatches, triggering a self-healing retry loop.
- **Chatbot Agent**: A friendly RAG-enabled assistant that resolves missing information through interactive dialogue.

### 🌍 Multilingual Vision Engine
A dedicated OCR microservice decoupled for high performance:
- **Bilingual Support**: Specialized extraction for **English** (PaddleOCR) and **Urdu** (UTRNet/YOLOv8).
- **Layout Awareness**: Utilizes **Docling** to understand document hierarchy, table structures, and field coordinates.
- **Pre-processing**: Automatic image enhancement and noise reduction for low-quality uploads.

### 🔄 Interactive Form Workspace
- **Real-time Sync**: Watch form fields update live as you chat with the AI.
- **Self-Healing Loop**: The system automatically attempts to verify data 3 times before asking for user intervention.
- **One-Click Export**: Generate finalized, high-fidelity PDFs once the data is validated.

---

## 🏗️ Technical Architecture

| Component | Responsibility | Stack |
| :--- | :--- | :--- |
| **Frontend** | User Dashboard & Form Viewer | React.js, Redux Toolkit, Tailwind CSS |
| **Node API** | User Auth, Persistence, WebSocket Proxy | Node.js (Express), MongoDB |
| **AI Core** | Multi-Agent Orchestration (Brain) | FastAPI, LangChain, LangGraph |
| **OCR Service** | Vision Processing worker | PaddleOCR, UTRNet, YOLOv8, Docling |
| **LLM Engine** | Inference Infrastructure | Groq (Llama 3.3) |

---

## 🚀 Installation & Setup

### 📋 System Prerequisites
- **Python 3.10+** (Virtual environment recommended)
- **Node.js 18+**
- **MongoDB** (Local or Atlas)
- **Redis** (Optional, for caching)

### 1. Repository Setup
```bash
git clone https://github.com/sanehasiddique/Asaan-Form.git
cd Asaan-Form
```

### 2. AI Backend & OCR Strategy
Detailed setup for the "Brain" of the system:
```bash
cd ai-backend

# Windows
python -m venv asaan-env-310
asaan-env-310\Scripts\activate
pip install -r requirements.txt
./start.bat

# Linux / MacOS
python3 -m venv asaan-env-310
source asaan-env-310/bin/activate
pip install -r requirements.txt
chmod +x start.sh && ./start.sh
```

### 3. Node.js Middleware
```bash
cd node-backend
npm install

# Configuration: Create .env based on .env.example
# Run Service
npm run dev
```

### 4. Interactive Frontend
```bash
cd frontend
npm install

# Launch Development Server
npm run dev
```

---

## 🔑 Environment Configuration

| Variable | Description | Value |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | LLM Access Key (Llama 3.3) | `your_key_here` |
| `MONGODB_URI` | Mongo Connection String | `mongodb://...` |
| `MILVUS_URI` | Vector Database Endpoint | `zilliz_cloud_url` |
| `AI_BACKEND_URL` | Cross-service communication | `http://localhost:8000` |

---

## 🛠️ Performance & Troubleshooting

- **Memory Management**: The OCR service runs on port `8001` to isolate CPU-heavy vision tasks from the main API.
- **Port Conflicts**: Ensure `8000` (AI API), `8001` (OCR), `3000` (Node), and `5173` (Frontend) are available.
- **Dependency Issues**: If `paddlex` fails on Windows, refer to the [Setup Guide Patch](docs/setup.md).

---

## 📚 Documentation
- [**Detailed Setup Guide**](docs/setup.md): Comprehensive installation steps, environment patching, and OS-specific instructions.
- [**Requirement Analysis**](docs/requirements.md): Overview of project scope and functional requirements.

---

## 📄 License & Team

Developed with ❤️ for the Final Year Project at **University of the Punjab**.  
Distributed under the **MIT License**.

- **Saneha Siddique**: Backend Lead & Urdu Engine
- **Zainab Khalid**: OCR & Semantic Mapping
- **Faiqa Mustafa**: UX/UI & State Management
- **Aqsa Hussain**: RAG & Knowledge Base

---
© 2026 Asaan-Form Project Team.