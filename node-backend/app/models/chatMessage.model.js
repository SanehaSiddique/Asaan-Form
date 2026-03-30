const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    sender: {
        type: String,
        enum: ["user", "bot"],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Optional: link to form/document context for missing-field flows
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Form",
        default: null
    },
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient per-user history queries
chatMessageSchema.index({ user: 1, createdAt: -1 });

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
module.exports = ChatMessage;
