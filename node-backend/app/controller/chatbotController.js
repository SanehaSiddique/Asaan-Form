const axios = require("axios");
const mongoose = require("mongoose");
const Document = require("../models/document.model");
const Form = require("../models/form.model");
const ChatMessage = require("../models/chatMessage.model");
const { notifyUser } = require('../websocket/wsServer');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

/**
 * Proxy user question to AI backend /chatbot/ask (RAG over knowledge base).
 * Query params: question, collection_name (optional), k (optional).
 */
exports.askChatbot = async (req, res) => {
    try {
        const question = req.body.question || req.query.question;
        const collection_name = req.body.collection_name || req.query.collection_name;
        const k = req.body.k || req.query.k || 3;
        const formId = req.body.formId || req.query.formId;
        const documentId = req.body.documentId || req.query.documentId;
        const userId = req.body.userId || req.query.userId || (req.user ? req.user._id : undefined);

        if (!question || typeof question !== "string" || !question.trim()) {
            return res.status(400).json({ message: "question is required" });
        }

        // Gather missing fields AND full document context to send to the AI
        let missingFields = [];
        let documentContext = null;

        // BUG 3 FIX: use documentId directly instead of querying by formId
        // This ensures we always operate on the exact document the user is viewing
        if (documentId) {
            let doc = null;
            try {
                doc = await Document.findById(documentId);
            } catch (e) {
                console.warn("[chatbot] Could not find document by documentId:", documentId, e.message);
            }

            if (doc) {
                if (doc.semanticMapping) {
                    // Strip coordinate metadata and source_boxes to save significant tokens
                    missingFields = doc.semanticMapping
                        .filter(m => m.value === null || m.value === "" || m.value === undefined)
                        .map(m => ({
                            field_name: m.field_name,
                            field_key: m.field_key,
                            field_type: m.field_type
                        }));
                }
                // Provide a high-level summary of already filled data as context
                documentContext = {
                    documentType: doc.documentType,
                    fileName: doc.fileName,
                    filled_fields: (doc.semanticMapping || [])
                        .filter(m => m.value != null && m.value !== "")
                        .map(m => ({ field: m.field_name, field_key: m.field_key, value: m.value }))
                };
            }
        } else if (formId) {
            // Fallback: if documentId not provided, try formId (less precise)
            const doc = await Document.findOne({ formId: formId });
            if (doc) {
                if (doc.semanticMapping) {
                    missingFields = doc.semanticMapping
                        .filter(m => m.value === null || m.value === "" || m.value === undefined)
                        .map(m => ({
                            field_name: m.field_name,
                            field_key: m.field_key,
                            field_type: m.field_type
                        }));
                }
                documentContext = {
                    documentType: doc.documentType,
                    fileName: doc.fileName,
                    filled_fields: (doc.semanticMapping || [])
                        .filter(m => m.value != null && m.value !== "")
                        .map(m => ({ field: m.field_name, field_key: m.field_key, value: m.value }))
                };
            }
        }

        // Fetch last 10 messages for character/history memory
        let history = [];
        if (userId) {
            const lastMsgs = await ChatMessage.find({ user: userId })
                .sort({ createdAt: -1 })
                .limit(10);

            // Re-sort to chronological for LLM
            history = lastMsgs.reverse().map(m => ({
                role: m.sender === "bot" ? "assistant" : "user",
                content: m.text
            }));
        }

        const payload = {
            question: question.trim(),
            collection_name,
            k: parseInt(k),
            formId,
            documentId,
            userId,
            missing_fields: missingFields,
            document_context: documentContext,
            history: history
        };

        console.log(`[chatbot] 📤 Sending to AI: "${payload.question.slice(0, 50)}..."`);
        const url = `${AI_BACKEND_URL}/chatbot/ask`;
        const aiResponse = await axios.post(url, payload, {
            timeout: 60000,
            validateStatus: () => true,
        });

        if (aiResponse.status !== 200) {
            console.error(`[chatbot] ❌ AI Error (${aiResponse.status}):`, aiResponse.data);
            const detail = aiResponse.data?.detail || aiResponse.data?.message || aiResponse.statusText;
            return res.status(aiResponse.status).json({
                message: "Chatbot request failed",
                detail: typeof detail === "string" ? detail : JSON.stringify(detail),
            });
        }

        const { answer, sources, collection_name: col, field_update } = aiResponse.data;
        const finalAnswer = answer != null ? answer : "";

        // Persist interaction to DB
        if (userId) {
            await ChatMessage.create([
                { user: userId, sender: "user", text: question.trim(), formId, documentId },
                { user: userId, sender: "bot", text: finalAnswer, formId, documentId, metadata: { sources, field_update } }
            ]);
        }

        // Extract all field updates — handle both single and array format
        // After Bug 1 fix, field_updates is now top-level in aiResponse.data
        const fieldUpdates = aiResponse.data?.field_updates || [];

        // Also handle legacy single field_update
        const singleUpdate = field_update || aiResponse.data?.results?.chatbot?.field_update;
        if (singleUpdate && !fieldUpdates.find(u => u.field_key === singleUpdate.field_key)) {
            fieldUpdates.push(singleUpdate);
        }

        console.log(`[chatbot] 📥 AI returned ${fieldUpdates.length} updates. Answer length: ${finalAnswer.length}`);

        if (fieldUpdates.length > 0 && userId && documentId) {
            // BUG 3 FIX: use documentId directly — no ObjectId conversion needed for findById
            let docObjectId;
            try {
                docObjectId = new mongoose.Types.ObjectId(documentId);
            } catch (e) {
                console.error('[chatbot] Invalid documentId:', documentId);
                docObjectId = null;
            }

            if (docObjectId) {
                // BUG 3 FIX: find the document by its own _id, not by formId
                const doc = await Document.findById(docObjectId);

                if (doc && doc.semanticMapping) {
                    const normalize = (s) => (s || "").toString().toLowerCase().replace(/[\s_\-]/g, "");

                    for (const fieldUpdate of fieldUpdates) {
                        if (!fieldUpdate.field_key || fieldUpdate.value === undefined) continue;

                        // Find canonical key with fuzzy match against this document's mapping
                        const normTarget = normalize(fieldUpdate.field_key);
                        const match = doc.semanticMapping.find(m =>
                            normalize(m.field_key) === normTarget ||
                            normalize(m.field_name) === normTarget
                        );

                        const targetKey = match ? match.field_key : fieldUpdate.field_key;
                        console.log(`[chatbot] 🔄 Canonical target: "${targetKey}" (AI Key: "${fieldUpdate.field_key}")`);

                        // BUG 3 FIX: query by _id (documentId) instead of formId + userId combo
                        const updateResult = await Document.findOneAndUpdate(
                            {
                                _id: docObjectId,
                                "semanticMapping.field_key": targetKey
                            },
                            {
                                $set: { "semanticMapping.$.value": fieldUpdate.value }
                            },
                            { new: true }
                        );

                        if (updateResult) {
                            console.log(`[chatbot] ✅ DB updated field "${targetKey}" to "${fieldUpdate.value}"`);
                        } else {
                            console.warn(`[chatbot] ⚠️ Failed for field "${targetKey}": No document matched.`);
                        }

                        // Notify React via WebSocket
                        notifyUser(String(userId), {
                            type: 'field_update',
                            field_key: targetKey,
                            value: fieldUpdate.value,
                            formId: formId,
                            documentId: documentId
                        });
                    }
                } else {
                    console.warn('[chatbot] Document not found for documentId:', documentId);
                }
            }
        }

        return res.json({
            answer: finalAnswer,
            sources: sources || [],
            collection_name: col,
            field_update: field_update || (fieldUpdates.length > 0 ? fieldUpdates[0] : null),
            field_updates: fieldUpdates
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

exports.getChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await ChatMessage.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(limit);

        return res.json({ messages: messages.reverse() });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.clearChatHistory = async (req, res) => {
    try {
        const { userId } = req.params;
        await ChatMessage.deleteMany({ user: userId });
        return res.json({ message: "Chat history cleared" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMissingFields = async (req, res) => {
    try {
        const { formId, documentId } = req.params;

        // BUG 3 FIX: prefer documentId for precise lookup
        let doc = null;
        if (documentId) {
            try {
                doc = await Document.findById(documentId);
            } catch (e) {
                console.warn("[chatbot] getMissingFields: invalid documentId", documentId);
            }
        }
        if (!doc && formId) {
            doc = await Document.findOne({ formId });
        }
        if (!doc) return res.json({ missingFields: [], missingCount: 0 });

        const missing = (doc.semanticMapping || []).filter(
            m => m.value === null || m.value === "" || m.value === undefined
        );
        return res.json({
            formName: doc.originalName || "form",
            missingFields: missing,
            missingCount: missing.length
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateField = async (req, res) => {
    res.status(501).json({ message: "Not Implemented" });
};

exports.ingestUserContext = async (req, res) => {
    res.status(501).json({ message: "Not Implemented" });
};