# 📄 Asaan-Form: Your AI Form Assistant

[![FYP Phase I](https://img.shields.io/badge/FYP-Phase_I-blue.svg)](https://github.com/sanehasiddique/Asaan-Form)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stack: MERN + FastAPI + AI](https://img.shields.io/badge/Stack-MERN_%2B_FastAPI_%2B_AI-green.svg)](#-technology-stack)

**Asaan-Form** is an intelligent, multi-agent AI system designed to automate document understanding and form filling. By combining cutting-edge OCR, layout analysis, and agentic workflows, it transforms unstructured documents into structured data and guides users through an interactive AI chatbot experience.

---

## ✨ Key Features

- 🤖 **Multi-Agent Orchestration**: Powered by **LangGraph**, utilizing specialized agents for intent detection, form processing, and document analysis.
- 🌍 **Multilingual OCR**: High-accuracy text extraction for both **English and Urdu** using PaddleOCR, PaddleX, and UTRNet.
- 💬 **RAG Chatbot**: An intelligent FAQ assistant that uses Retrieval-Augmented Generation (RAG) with **Milvus/Zilliz Cloud** vector store.
- 📑 **Advanced Layout Analysis**: Deep document understanding using **Docling** to extract fields, coordinates, and structural elements.
- 🎨 **Modern Dashboard**: A responsive and intuitive user interface built with **React** and **Tailwind CSS**.

---

## 🏗️ System Architecture

Asaan-Form follows a robust 3-tier architecture:

1.  **Frontend (React + Redux)**: The user-facing dashboard for document uploads, real-time tracking, and chatbot interaction.
2.  **Node.js Backend**: Handles user authentication, session management, and persists application data in **MongoDB**.
3.  **AI Backend (FastAPI + LangGraph)**: The "brain" of the system, orchestrating AI agents and processing intensive OCR/RAG tasks.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React.js, Tailwind CSS, Redux Toolkit |
| **Backends** | Node.js (Express), FastAPI (Python) |
| **AI & NLP** | LangChain, LangGraph, PaddleOCR, PaddleX, Docling |
| **LLM** | Meta Llama 3.3 (via OpenRouter/ Groq) |
| **Databases** | MongoDB (User data), Milvus/Zilliz (Vector store) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ v18
- Python ≥ v3.10
- MongoDB & Milvus (Zilliz Cloud)

### Installation

1. **Clone the repo:**
   ```bash
   git clone https://github.com/sanehasiddique/Asaan-Form.git
   cd Asaan-Form
   ```

2. **Setup Services (Run in separate terminals):**

   **AI Backend:**
   ```bash
   cd ai-backend
   python -m venv venv && source venv/bin/activate  # venv\Scripts\activate on Windows
   pip install -r requirements.txt
   python main.py
   ```

   **Node Backend:**
   ```bash
   cd node-backend
   npm install
   npm run dev
   ```

   **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Configure Environment:**
   Ensure `.env` files are set up in `ai-backend/` and `node-backend/` as per the provided `.env.example` files (or see the [Setup Guide](docs/setup.md)).

---

## 📁 Project Structure

```text
asaan-form/
├── ai-backend/       # FastAPI, Agents, OCR, RAG logic
├── node-backend/     # Express API, Auth, MongoDB Models
├── frontend/         # React SPA, Redux Store
├── docs/             # Documentation & Requirements
└── requirements.md   # Detailed requirements
```

---

## 👥 Team Members

| Name | Role | Contribution |
| :--- | :--- | :--- |
| **Saneha Siddique** | Group Leader | Backend Orchestration, UrduOCR, Dynamic React Form Rendering |
| **Zainab Khalid** | OCR Specialist | OCR & Layout, Form Extraction, Semantic Mapping |
| **Faiqa Mustafa** | Frontend Dev | UI/UX Design, State Management, Integration |
| **Aqsa Hussain** | AI/RAG Dev | Requirement Analysis, RAG Implementation, Node Backend |

---

## 📄 License & Credits

Distributed under the MIT License. Developed for the Final Year Project, Department of Computer Science, **University of the Punjab**.

**Version**: 2.0.0 (Phase-II 80% Complete)

**Last Updated**: March 2026