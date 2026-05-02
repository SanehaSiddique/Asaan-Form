# 📄 ASAAN FORM: Your Intelligent AI-Powered Form Ecosystem

[![Product Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)](#)
[![Stack: MERN + Agentic AI](https://img.shields.io/badge/Stack-MERN_%2B_Agentic_AI-green.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)

**ASAAN FORM** is a next-generation document automation platform that transforms tedious paperwork into a seamless, conversational experience. By combining **Agentic AI Orchestration** with a state-of-the-art **Immersive UI**, Asaan Form automates data extraction, mapping, and validation, allowing users to complete complex applications in minutes.

---

## 🚀 The Product Experience

Asaan Form isn't just a tool; it's a complete document ecosystem designed to handle the friction of administrative tasks.

### 🤖 Intelligent Auto-Fill & Semantic Mapping
*   **Zero Manual Entry**: Upload your source documents (CNICs, transcripts, certificates) and watch the system automatically extract and map data to any form template.
*   **Cross-Document Intelligence**: The AI correlates information across multiple files to ensure consistency (e.g., verifying names across a CNIC and a degree).
*   **Self-Healing Validation**: A multi-agent loop automatically detects and corrects extraction errors before they reach the final document.

### 💬 AI Chatbot Assistant (Sympathetic RAG)
*   **Contextual Guidance**: Stuck on a field? Chat with our RAG-enabled bot that understands the specific requirements of the form you're filling.
*   **Missing Data Resolution**: If a document is missing info (like a specific grade), the bot proactively asks you in natural language and updates the form in real-time.
*   **Multilingual Support**: Intelligent processing for both English and Urdu documents.

### 📊 Dynamic Management Hub (Dashboard)
*   **Document Vault**: Manage all your uploaded source documents in one place with a clean, deduplicated interface.
*   **Filled Forms Tracking**: Re-open, update, download, or delete your mapped sessions at any time.
*   **In-Page Previews**: High-fidelity modal previews for both images and PDFs without ever leaving the dashboard.

### 🎨 Immersive 3D Interface
*   **Interactive 3D Robot**: A state-of-the-art Spline 3D assistant greets you on the home page, creating an engaging, modern experience.
*   **Glassmorphism Design**: A premium, responsive UI featuring smooth animations (Framer Motion) and a curated color palette (Asaan Royal & Sky Blue).

---

## 🛠️ The Tech Ecosystem

| Service | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React, Redux Toolkit, Framer Motion, Spline 3D | Interactive User Interface & Experience |
| **Node API** | Node.js, Express, MongoDB (Mongoose) | User Auth, Document CRUD, Persistence |
| **AI Backend** | Python (FastAPI), LangGraph, LangChain | Multi-Agent Orchestration & Intelligence |
| **Vision Engine** | PaddleOCR, UTRNet, Docling | Multi-lingual OCR & Layout Analysis |
| **Vector DB** | Milvus / Zilliz | Contextual Knowledge Base for RAG |

---

## 🚦 Getting Started (Production Setup)

Follow these steps to launch the entire Asaan Form ecosystem on your local machine.

### 1. Launch the AI Core (The Brain)
The AI backend handles agent orchestration and OCR tasks.
```bash
cd ai-backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
./start.bat  # Launches AI API (8000) and OCR (8001)
```

### 2. Launch the Node API (The Middleware)
Handles user accounts, file storage, and mapping persistence.
```bash
cd node-backend
npm install
# Ensure your .env has MONGODB_URI and JWT_SECRET
npm run dev  # Launches on Port 3000
```

### 3. Launch the Frontend (The Experience)
The interactive dashboard and 3D home page.
```bash
cd frontend
npm install
npm run dev  # Launches on Port 8080 (or 5173)
```

---

## 🔄 The Product Workflow

1.  **Onboarding**: Create an account to access your personal document vault.
2.  **Upload Template**: Upload the form you need to fill (PDF or Image).
3.  **Provide Context**: Upload your source documents (CNIC, Transcripts, etc.).
4.  **AI Mapping**: Watch the AI agents extract data and highlight mapped fields in the Workspace.
5.  **Interactive Refinement**: Chat with the AI assistant to resolve missing fields or edge cases.
6.  **Export**: Download a high-fidelity, perfectly formatted PDF of your completed form.

---

## 📄 License & Product Team

Developed with ❤️ at the **University of the Punjab**.  
Distributed under the **MIT License**.

**The Visionaries:**
- **Saneha Siddique**: Backend Lead & AI Integration
- **Zainab Khalid**: Vision Systems & Semantic Mapping
- **Faiqa Mustafa**: UX Architect & UI Design
- **Aqsa Hussain**: Knowledge Engineering & RAG

---
© 2026 Asaan Form. Making complexity simple.