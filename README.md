# Asaan-Form: Your AI Form Assistant

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
- Build FAQs-based intelligent chatbot using **RAG**

---

## 👥 Team Members & Responsibilities

| Name            | Role                   | Roll No    | Key Responsibilities                                            |
| --------------- | ---------------------- | ---------- | --------------------------------------------------------------- |
| Saneha Siddique | Group Leader / Backend | BCSF22M009 | Intent Detection Agent, LangGraph pipeline, document processing |
| Zainab Khalid   | OCR / Layout Research  | BCSF22M013 | OCR research, form processing agent, key-value extraction       |
| Faiqa Mustafa   | Frontend Developer     | BCSF22M019 | Preprocessing experiments, React + TailwindCSS                  |
| Aqsa Hussain    | ERD / Chatbot LLM      | BCSF22M027 | Requirement analysis, ERD, documentation, RAG-based chatbot     |

All team members are collaborators on this GitHub repository.  
Individual contributions are traceable via commit history, feature branches, and pull requests.

---

## 🌿 Git Branching & Collaboration Strategy

- `main` → stable integration branch
- Feature branches → individual development (`feature/agent-intent`, `feature/frontend-v1`, etc.)
- All features merged via **Pull Requests** after peer review

### Notable Pull Requests (Phase-I)

| PR # | Title                       | Source Branch             | Author |
| ---- | --------------------------- | ------------------------- | ------ |
| #1   | Main Orchestrator Structure | BCSF22M009                | Saneha |
| #2   | Document Processing Agent   | ai-backend/document_agent | Zainab |
| #3   | Frontend                    | frontend                  | Faiqa  |

---

## 🧠 Core Components Implemented (Phase-I)

- Intent Detection Agent
- Document Processing Agent
- OCR Pipeline (**PaddleOCR**)
- Form Layout Detection + Bounding Boxes
- Agent State Management
- **LangGraph**-based multi-agent orchestration
- **FastAPI** Backend APIs
- FAQs-based Chatbot with **RAG**
- Responsive Frontend v1.0

---

## 🛠️ Technology Stack

| Layer               | Technologies                             |
| ------------------- | ---------------------------------------- |
| **Frontend**        | React.js • Tailwind CSS                  |
| **Backend**         | FastAPI • LangGraph                      |
| **AI & NLP**        | PaddleOCR • OpenRouter (LLM) • RAG       |
| **Layout Analysis** | Docling                                  |
| **Database**        | MongoDB (planned for Phase-II)           |
| **Tools**           | Git/GitHub • JIRA (requirements & tasks) |

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js ≥ v18
- Python ≥ v3.10
- Git

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## ▶️ How to Run

1. Start backend server (`uvicorn`)
2. Launch frontend (`npm run dev`)
3. Open browser → upload any form/document
4. Watch the system extract fields via OCR + agents
5. Interact with the AI chatbot for assistance

---

## 📋 Requirement & Quality Management

- Functional + non-functional requirements fully documented
- Tracked & managed using **JIRA**
- Requirement changes → documented + reflected in commits
- Clean code • modular design • no hard-coded secrets
- `.gitignore` properly configured
- Meaningful commit messages & conventional PR titles

---

## 📌 Phase-I Status – Completed ✓

- Requirement Analysis
- OCR Research & Selection
- Agent Architecture Design
- End-to-End Initial Pipeline
- API Testing & Validation
- Form Layout Detection
- RAG-based FAQs Chatbot
- Responsive Frontend v1.0

---

## 📄 License

This project is licensed under the **MIT License**.  
All third-party libraries follow their respective licenses.

---

## 📬 Contact & Notes for Evaluators

- All contributions traceable via GitHub commits, branches & PRs
- Project adheres to departmental FYP GitHub & code quality guidelines
- Code is structured, commented, and tested before commits

For any questions regarding Phase-I deliverables, feel free to contact any team member listed above.

✨ **Asaan-Form** — Simplifying forms with the power of AI.

```

```
