const mongoose = require("mongoose");

const formSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    formName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileName: String,
    contentType: String,
    formSchema: {
        type: Array, // Array of extracted keys/fields
        default: []
    },
    formIdAI: {
        type: String, // ID used by AI backend for folder names
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Form = mongoose.model("Form", formSchema);
module.exports = Form;
