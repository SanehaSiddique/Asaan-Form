const express = require("express");
const router = express.Router();
const chatbotController = require("../controller/chatbotController");

router.post("/ask", chatbotController.askChatbot);

module.exports = router;
