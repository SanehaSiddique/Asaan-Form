# 📄 Asaan-Form: Your AI Form Assistant

[![FYP Phase II](https://img.shields.io/badge/FYP-Phase_II_95%25-blue.svg)](https://github.com/sanehasiddique/Asaan-Form)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack: MERN + FastAPI + AI](https://img.shields.io/badge/Stack-MERN_%2B_FastAPI_%2B_AI-green.svg)](#-technology-stack)

**Asaan-Form** is an intelligent, multi-agent AI system designed to automate document understanding and form filling. By combining cutting-edge OCR, layout analysis, and agentic workflows, it transforms unstructured documents into structured data and guides users through an interactive AI chatbot experience.

---

## ✨ Key Features (Phase II Updates)

- 🤖 **Multi-Agent Orchestration**: Powered by **LangGraph**, utilizing specialized agents for intent detection, form processing, and document analysis.
- 🌍 **Multilingual OCR Microservice**: High-accuracy text extraction for both **English and Urdu** using PaddleOCR and UTRNet, now decoupled for maximum stability.
- 💬 **Reliable Chatbot Pipeline**: A stabilized interaction loop that supports **multi-field updates** in a single go, ensured by strict `FIELD_UPDATE` marker protocols.
- 🔄 **Self-Healing Validation**: Includes an automatic **3-retry loop** for auto-mapping. If the AI detects a hallucination, it attempts to "fix itself" before handing off to the user.
- 🧠 **Flexible Semantic Mapping**: The AI now uses "common sense" reasoning (e.g., automatically inferring Nationality from a CNIC) and is resilient to OCR noise.
- 🛡️ **Payload Protection**: Automatic OCR truncation to prevent `413 Request Too Large` errors during heavy document processing.
- 📑 **Advanced Layout Analysis**: Deep document understanding using **Docling** to extract fields, coordinates, and structural elements.

---

## 🏗️ System Architecture

Asaan-Form follows a robust, decoupled architecture:

1.  **Frontend (React + Redux)**: Intuitive dashboard with real-time WebSocket sync for chatbot field updates.
2.  **Node.js Backend**: Handles user authentication, MongoDB persistence, and acts as the WebSocket gateway.
3.  **AI Backend (FastAPI + LangGraph)**: The "brain," orchestrating agents and processing RAG tasks (Port 8000).
4.  **OCR Microservice**: A dedicated worker for PaddleOCR and UTRNet to ensure memory efficiency and prevent event-loop blocking (Port 8001).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS, Redux Toolkit |
| **Backends** | Node.js (Express), FastAPI (Python) |
| **OCR Service** | PaddleOCR, UTRNet, YOLOv8 (Urdu Doc) |
| **AI & NLP** | LangChain, LangGraph, Docling |
| **LLM** | Meta Llama 3.3 (via OpenRouter/ Groq) |
| **Databases** | MongoDB (User data), Milvus (Vector store) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ v18
- Python ≥ v3.10
- MongoDB
- NVIDIA GPU (Optional, but recommended for OCR speed)

### Installation & Run

1. **Clone the repo:**
   ```bash
   git clone https://github.com/sanehasiddique/Asaan-Form.git
   cd Asaan-Form
   ```

2. **Setup Services (Run in separate terminals):**

   **AI Backend & OCR Service:**
   ```bash
   cd ai-backend
   # On Windows:
   ./start.bat
   # On Linux/Mac:
   chmod +x start.sh && ./start.sh
   ```
   *Note: This starts the main API on port 8000 and the OCR worker on port 8001.*

   **Node Backend:**
   ```bash
   cd node-backend
   npm install
   node server.js
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 👥 Team Members

| Name | Role | Contribution |
| :--- | :--- | :--- |
| **Saneha Siddique** | Group Leader | Backend Orchestration, UrduOCR, Dynamic React Mapping |
| **Zainab Khalid** | OCR Specialist | OCR & Layout, Form Extraction, Semantic Mapping |
| **Faiqa Mustafa** | Frontend Dev | UI/UX Design, State Management, Integration |
| **Aqsa Hussain** | AI/RAG Dev | Requirement Analysis, RAG Implementation, Node Backend |

---

## 📄 License & Credits

Distributed under the MIT License. Developed for the Final Year Project, Department of Computer Science, **University of the Punjab**.

**Version**: 2.1.0 (Phase-II 95% Complete)  
**Last Updated**: March 2026