# Requirement Analysis: ASAAN FORM (Phase-1)

The ASAAN FORM system is an AI-driven web solution designed to automate digital form completion through Optical Character Recognition (OCR) and Agentic AI. This document outlines the filtered requirements fulfilled during Phase-1 of development.

---

## 1. Project Overview
The system extracts information from unstructured documents (e.g., CNICs, transcripts) and maps them into digital fields. Phase-1 focuses on establishing a robust bilingual extraction engine, a secure user interface, and a hybrid data storage architecture.

## 2. User Classes and Characteristics (Phase-1)
Understanding user diversity was crucial for designing a system that meets both frontend and backend needs.

| User Class | Key Interactions | Critical Needs Met |
| :--- | :--- | :--- |
| **General Users** | Uploads source documents and interacts with auto-fill forms. | Ease of Use, Accuracy, and Real-Time Chatbot Support. |
| **Developers** | Maintains system code and manages API/Database integrations. | Detailed System Logs and Module Documentation. |

---

## 3. Functional Requirements (Implemented)
These represent the mandatory actions the system currently performs as part of the Phase-1 rollout.

### **FR-0: User Authentication & Session Management**
* **Requirement**: Supports secure account creation, distinctive credential sign-in, and secure logout.
* **Implementation**: Node.js backend managing **OTP-based authentication** and persistent sessions.
* **Rationale**: To manage system access and maintain accountability for secure file management.

### **FR-1: Document Ingest and Text Extraction**
* **Requirement**: Enables users to input target form images and supporting documents (CNICs, academic transcripts).
* **Bilingual OCR**: Utilizes **PaddleOCR** (English) and **UtrNet** (Urdu) to translate unstructured image data into machine-readable text.
* **Pre-processing**: Includes image quality enhancement steps prior to OCR extraction.

### **FR-3: Interactive Guidance & RAG Support (Partial)**
* **Requirement**: A bilingual (English/Urdu) chatbot provides real-time guidance to users.
* **Intelligence Layer**: Uses a **Vector Database** to store document embeddings, allowing the chatbot to perform Retrieval-Augmented Generation (RAG) for accurate data resolution.
* **Rationale**: To ensure correctness and resolve ambiguities before final data submission.

---

## 4. Non-Functional Requirements (Achieved)
These standards define the quality and performance metrics of the current Phase-1 build.

* **Bilingual Support**: Specialized processing for English and Urdu scripts to maximize accessibility.
* **Usability (UI/UX)**: Clean, professional "Blue & White" dashboard built with **React** and **Tailwind CSS**.
* **Local Processing**: System supports local OCR and AI inference on multi-core CPUs (16 GB RAM) to ensure data privacy.
* **State Management**: Implemented **Redux Toolkit** for secure session handling and real-time status updates.

---

## 5. System Architecture & Data Management
The system utilizes a hybrid architecture to balance performance and intelligence.

* **Application Layer (MongoDB)**: Used for managing user profiles, session states, and the structured schema of target forms.
* **Intelligence Layer (Vector DB)**: Stores document field embeddings to facilitate semantic search and intelligent chatbot responses.
* **Communication**: The React UI interacts with the Node.js backend via RESTful APIs for real-time processing feedback.



---

## 6. Phase-2 Roadmap (Future Work)
The following requirements from the original analysis are scheduled for the next development phase:

1.  **FR-2: Smart Semantic Mapping**: AI-based contextual detection to relate extracted labels (e.g., "Resident of") to specific form fields (e.g., "Permanent Address").
2.  **Advanced Auto-Validation**: Enhancing the Validator Agent to detect data omissions or mismatches automatically using cross-document verification.
3.  **FR-4: File Management & Compression**: Automatic compression of PDFs/images to meet specific institutional upload size limits.
4.  **FR-5: Secure Output Generation**: Exporting finalized, validated forms as standardized, encrypted PDF files.
5.  **Enhanced Security**: Implementing full **AES-256 backend encryption** for all user-uploaded documents prior to storage.