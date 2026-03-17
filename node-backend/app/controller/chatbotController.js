const axios = require("axios");

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

/**
 * Proxy user question to AI backend /chatbot/ask (RAG over knowledge base).
 * Query params: question, collection_name (optional), k (optional).
 */
exports.askChatbot = async (req, res) => {
    try {
        const { question, collection_name, k } = req.query;
        if (!question || typeof question !== "string" || !question.trim()) {
            return res.status(400).json({ message: "question is required" });
        }

        const params = new URLSearchParams();
        params.set("question", question.trim());
        if (collection_name) params.set("collection_name", collection_name);
        if (k != null) params.set("k", String(k));

        const url = `${AI_BACKEND_URL}/chatbot/ask?${params.toString()}`;
        const aiResponse = await axios.post(url, null, {
            timeout: 60000,
            validateStatus: () => true,
        });

        if (aiResponse.status !== 200) {
            const detail = aiResponse.data?.detail || aiResponse.data?.message || aiResponse.statusText;
            return res.status(aiResponse.status).json({
                message: "Chatbot request failed",
                detail: typeof detail === "string" ? detail : JSON.stringify(detail),
            });
        }

        const { answer, sources, collection_name: col } = aiResponse.data;
        return res.json({
            answer: answer != null ? answer : "",
            sources: sources || [],
            collection_name: col,
        });
    } catch (error) {
        console.error("[chatbot] ask error:", error.message);
        const status = error.response?.status || 500;
        const detail = error.response?.data?.detail ?? error.response?.data?.message ?? error.message;
        return res.status(status).json({
            message: "Chatbot request failed",
            detail: typeof detail === "string" ? detail : String(detail),
        });
    }
};
