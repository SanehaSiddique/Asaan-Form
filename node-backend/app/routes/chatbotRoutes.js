const express = require("express");
const router = express.Router();
const chatbotController = require("../controller/chatbotController");

// Ask the chatbot (with conversation history + missing field support)
router.post("/ask", chatbotController.askChatbot);

// Chat history
router.get("/history/:userId", chatbotController.getChatHistory);
router.delete("/history/:userId", chatbotController.clearChatHistory);

// Missing fields detection
router.get("/missing-fields/:formId/:documentId", chatbotController.getMissingFields);

// Update a single field value
router.put("/update-field/:documentId", chatbotController.updateField);

// Ingest user documents/forms into chatbot context
router.post("/ingest-context", chatbotController.ingestUserContext);

module.exports = router;
