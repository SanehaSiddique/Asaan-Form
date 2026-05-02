const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    documentType: {
        type: String, // e.g., "ID Card", "CV", "Certificate"
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileName: String,
    contentType: String,
    aiFilename: {
        type: String, // AI backend saved filename (e.g. id_card_2026...pdf)
        default: ""
    },
    extractedData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    boundingBoxes: {
        type: Array,
        default: []
    },
    urduExtractedData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Form"
    },
    semanticMapping: {
        type: Array, // Array of { field, value, source_boxes: [{page, box, text}] }
        default: []
    },
    isExcluded: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Document = mongoose.model("Document", documentSchema);
module.exports = Document;
