const Form = require("../models/form.model");
const Document = require("../models/document.model");
const axios = require("axios");
const mongoose = require("mongoose");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";

// Upload a form template
exports.uploadForm = async (req, res) => {
    try {
        console.log("[uploadForm] POST /api/upload/form received", req.file ? "file present" : "NO FILE");
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { userID, formName } = req.body;
        if (!userID) {
            return res.status(400).json({ message: "userID is required" });
        }

        // 1. Create form record in MongoDB
        const newForm = new Form({
            user: userID,
            formName: formName || req.file.originalname,
            filePath: req.file.path,
            fileName: req.file.filename,
            contentType: req.file.mimetype
        });

        await newForm.save();

        // 2. Forward to AI Backend for extraction
        try {
            const formData = new FormData();
            const fileStream = fs.createReadStream(req.file.path);

            formData.append("file", fileStream, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            console.log(`Forwarding form to AI backend: ${AI_BACKEND_URL}/form/upload/${userID}`);
            const aiResponse = await axios.post(`${AI_BACKEND_URL}/form/upload/${userID}`, formData, {
                headers: formData.getHeaders(),
                timeout: 300000
            });

            // Update form with extracted schema and the AI backend's internal ID (data may be in .data or root)
            const aiData = aiResponse.data.data || aiResponse.data;
            newForm.formIdAI = aiData?.form_id || aiResponse.data?.form_id;
            newForm.formSchema = aiData?.form_fields?.form_fields || aiResponse.data?.form_fields?.form_fields || [];
            await newForm.save();

            res.status(201).json({
                message: "Form uploaded and processed successfully",
                form: newForm,
                aiResult: aiResponse.data
            });
        } catch (aiError) {
            console.error("AI Backend Error:", aiError.message);
            res.status(201).json({
                message: "Form uploaded locally, but AI processing failed",
                form: newForm,
                error: aiError.message
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload a user document for OCR
exports.uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { userID, documentType } = req.body;
        if (!userID || !documentType) {
            return res.status(400).json({ message: "userID and documentType are required" });
        }

        const newDoc = new Document({
            user: userID,
            documentType,
            filePath: req.file.path,
            fileName: req.file.filename,
            contentType: req.file.mimetype
        });

        await newDoc.save();

        // 3. Forward to AI Backend for OCR
        try {
            const formData = new FormData();
            const fileStream = fs.createReadStream(req.file.path);

            formData.append("file", fileStream, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            console.log(`Forwarding document to AI backend: ${AI_BACKEND_URL}/document/upload/${userID}`);
            const aiResponse = await axios.post(`${AI_BACKEND_URL}/document/upload/${userID}?document_type=${documentType}`, formData, {
                headers: formData.getHeaders(),
                timeout: 300000
            });

            // AI backend returns { data: { extracted, file_info, ocr } }
            const aiData = aiResponse.data.data || aiResponse.data;
            const aiFilename = aiData?.file_info?.saved_filename || aiResponse.data?.data?.file_info?.saved_filename || "";
            newDoc.extractedData = aiData.extracted || aiResponse.data.extracted || {};
            newDoc.boundingBoxes = aiData.ocr?.boxes || aiResponse.data.ocr?.boxes || [];
            newDoc.aiFilename = aiFilename;
            await newDoc.save();

            res.status(201).json({
                message: "Document uploaded and OCR processed successfully",
                document: newDoc,
                aiResult: aiResponse.data
            });
        } catch (aiError) {
            console.error("AI Backend Error:", aiError.message);
            res.status(201).json({
                message: "Document uploaded locally, but OCR failed",
                document: newDoc,
                error: aiError.message
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// List forms for a specific user (for dashboard/profile)
exports.listUserForms = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Valid userId is required" });
        }

        const forms = await Form.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        res.status(200).json({ forms });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// List documents for a specific user (for dashboard/profile)
exports.listUserDocuments = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: "Valid userId is required" });
        }

        const documents = await Document.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        res.status(200).json({ documents });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Serving local file
exports.getFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        let filePath = "";

        // Try to find by form ID first
        const form = await Form.findById(fileId);
        if (form) {
            filePath = form.filePath;
        } else {
            const doc = await Document.findById(fileId);
            if (doc) {
                filePath = doc.filePath;
            } else {
                filePath = path.join('uploads', fileId);
            }
        }

        const resolvedPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
        if (fs.existsSync(resolvedPath)) {
            res.sendFile(path.resolve(resolvedPath));
        } else {
            res.status(404).json({ message: "File not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get form details by ID
exports.getForm = async (req, res) => {
    try {
        const { id } = req.params;
        const form = await Form.findById(id);
        if (!form) {
            return res.status(404).json({ message: "Form not found" });
        }
        res.status(200).json({ form });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get document details
exports.getDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const document = await Document.findById(id).populate("formId");

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.status(200).json({ document });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Generate filled PDF (form + document) via AI backend and stream to client
exports.getFilledPdf = async (req, res) => {
    try {
        const { formId, documentId } = req.params;
        const form = await Form.findById(formId);
        const document = await Document.findById(documentId);

        if (!form) return res.status(404).json({ message: "Form not found" });
        if (!document) return res.status(404).json({ message: "Document not found" });

        const userID = document.user.toString();
        const aiFormId = form.formIdAI || formId;
        
        // Use all user documents for context
        const allUserDocs = await Document.find({ user: userID }).sort({ createdAt: 1 });
        const docFilenames = allUserDocs
            .map(d => d.aiFilename)
            .filter(fn => fn && fn.trim().length > 0);

        if (docFilenames.length === 0) {
            return res.status(400).json({
                message: "No documents processed yet. Re-upload a document to process it first."
            });
        }

        const formData = new FormData();
        formData.append("user_id", userID);
        formData.append("form_id", aiFormId);
        formData.append("document_filenames", docFilenames.join(","));
        formData.append("return_pdf", "true");

        const aiResponse = await axios.post(`${AI_BACKEND_URL}/fill/fill-existing`, formData, {
            headers: formData.getHeaders(),
            timeout: 300000,
            responseType: "arraybuffer",
        });

        const pdfBuffer = Buffer.from(aiResponse.data);
        const safeName = (form.formName || "form").replace(/[^\w\-_. ]/g, "_").replace(/\s+/g, "_").slice(0, 100) || "form";
        const filename = `filled_${safeName}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Cache-Control", "no-store");
        res.send(pdfBuffer);
    } catch (error) {
        console.error("getFilledPdf error:", error.message);
        if (error.response?.status) {
            let detail = error.message;
            try {
                const d = error.response.data;
                if (d && typeof d === "object" && d.detail) detail = d.detail;
                else if (Buffer.isBuffer(d)) detail = d.toString("utf8").slice(0, 200);
            } catch (_) { }
            res.status(error.response.status).json({ message: detail });
        } else {
            res.status(500).json({ message: error.message });
        }
    }
};

// Get filled field data (same as overlay fill) to populate React form and overlays
exports.getFillData = async (req, res) => {
    try {
        const { formId, documentId } = req.params;
        const form = await Form.findById(formId);
        const document = await Document.findById(documentId);

        if (!form) return res.status(404).json({ message: "Form not found" });
        if (!document) return res.status(404).json({ message: "Document not found" });

        const userID = document.user.toString();
        const aiFormId = form.formIdAI || formId;
        
        // Use all user documents for context
        const allUserDocs = await Document.find({ user: userID }).sort({ createdAt: 1 });
        const docFilenames = allUserDocs
            .map(d => d.aiFilename)
            .filter(fn => fn && fn.trim().length > 0);

        if (docFilenames.length === 0) {
            return res.status(400).json({
                message: "No documents processed yet. Re-upload a document to process it first."
            });
        }

        const formData = new FormData();
        formData.append("user_id", userID);
        formData.append("form_id", aiFormId);
        formData.append("document_filenames", docFilenames.join(","));
        formData.append("return_pdf", "false");

        const aiResponse = await axios.post(`${AI_BACKEND_URL}/fill/fill-existing`, formData, {
            headers: formData.getHeaders(),
            timeout: 300000
        });

        const data = aiResponse.data?.data || aiResponse.data;
        const filledFields = data?.filled_fields || [];
        const formIdAI = data?.form_metadata?.form_id;

        const fields = filledFields.map((f) => ({
            field_key: f.field_key,
            field_name: f.field_name,
            field_type: f.field_type || "text_input",
            value: f.value,
            coordinates: f.coordinates || null,
            target_box: f.coordinates || null,
            page_number: f.page_number ?? 1,
            source_boxes: []
        }));

        const finalJson = { form_id: formIdAI || formId, fields };

        document.semanticMapping = fields;
        await document.save();

        res.status(200).json({ final_json: finalJson, fields });
    } catch (error) {
        console.error("getFillData error:", error.message);
        if (error.response?.status) {
            let detail = error.message;
            try {
                const d = error.response.data;
                if (d && typeof d === "object" && d.detail) detail = d.detail;
                else if (typeof d === "string") detail = d.slice(0, 300);
            } catch (_) { }
            return res.status(error.response.status).json({ message: detail });
        }
        return res.status(500).json({ message: error.message });
    }
};

// Update refined mapping from Frontend
exports.updateMapping = async (req, res) => {
    try {
        const { id } = req.params;
        const { mapping } = req.body;

        const updatedDoc = await Document.findByIdAndUpdate(
            id,
            { semanticMapping: mapping },
            { new: true }
        );

        if (!updatedDoc) {
            return res.status(404).json({ message: "Document not found" });
        }

        res.status(200).json({
            message: "Mapping updated successfully",
            document: updatedDoc
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Upload document and automatically map it to a form
exports.uploadAndMapDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { userID, documentType, formID } = req.body;
        if (!userID || !documentType || !formID) {
            return res.status(400).json({ message: "userID, documentType, and formID are required" });
        }

        const form = await Form.findById(formID);
        if (!form) {
            return res.status(404).json({ message: "Form not found" });
        }

        const newDoc = new Document({
            user: userID,
            documentType,
            formId: formID,
            filePath: req.file.path,
            fileName: req.file.filename,
            contentType: req.file.mimetype
        });

        await newDoc.save();

        // Use the AI Backend's internal form ID if available, otherwise fallback to index naming
        const aiFormId = form.formIdAI || formID;

        // Forward to AI Backend for upload-and-process, then map using the /fill API
        try {
            const formData = new FormData();
            const fileStream = fs.createReadStream(req.file.path);

            formData.append("file", fileStream, {
                filename: req.file.originalname,
                contentType: req.file.mimetype
            });

            // 1. Process document OCR first
            console.log(`Forwarding to AI for OCR: ${AI_BACKEND_URL}/document/upload/${userID}`);
            const procResponse = await axios.post(`${AI_BACKEND_URL}/document/upload/${userID}?document_type=${documentType}`, formData, {
                headers: formData.getHeaders(),
                timeout: 300000
            });

            const procData = procResponse.data.data || procResponse.data;
            const savedFilename = procData?.file_info?.saved_filename || procData?.saved_filename;
            
            console.log(`[uploadAndMapDocument] AI Upload Response:`, JSON.stringify(procData).slice(0, 200));
            console.log(`[uploadAndMapDocument] Extracted savedFilename: "${savedFilename}"`);

            if (!savedFilename) {
                console.error("[uploadAndMapDocument] savedFilename is missing in AI response!");
                throw new Error("Failed to get saved filename from AI backend");
            }

            // 2. Perform Semantic Mapping using the FILL API as requested
            // We now gather ALL user documents to provide full context (multi-document mapping)
            const allUserDocs = await Document.find({ user: userID }).sort({ createdAt: 1 });
            const docFilenames = allUserDocs
                .map(d => d.aiFilename)
                .filter(fn => fn && fn.trim().length > 0);
            
            // Ensure the current document's saved filename is included (it should be since it was just saved)
            if (savedFilename && !docFilenames.includes(savedFilename)) {
                docFilenames.push(savedFilename);
            }

            const commaSeparatedFilenames = docFilenames.join(",");
            console.log(`[uploadAndMapDocument] Comma-separated filenames: "${commaSeparatedFilenames}"`);
            console.log(`[uploadAndMapDocument] Sending to AI: user_id=${userID}, form_id=${aiFormId}`);

            const mapParams = new URLSearchParams();
            mapParams.append("user_id", userID);
            mapParams.append("form_id", aiFormId);
            mapParams.append("document_filenames", commaSeparatedFilenames);

            console.log(`Forwarding to FILL API for semantic mapping with ${docFilenames.length} documents: ${AI_BACKEND_URL}/fill/map-existing-document`);
            const mapResponse = await axios.post(`${AI_BACKEND_URL}/fill/map-existing-document`, mapParams, {
                timeout: 300000
            });

            const resData = mapResponse.data;
            // Prefer final_json.fields (form fields with coordinates + values) for frontend display
            const fields = resData.final_json?.fields || resData.mapping || [];
            newDoc.semanticMapping = fields;
            newDoc.extractedData = procData.extracted || procResponse.data.extracted || {};
            newDoc.boundingBoxes = procData.ocr?.boxes || procResponse.data.ocr?.boxes || [];
            newDoc.aiFilename = savedFilename;

            await newDoc.save();

            res.status(201).json({
                message: "Document uploaded and semantically mapped via FILL API",
                document: newDoc,
                final_json: resData.final_json || { form_id: resData.form_id, fields },
                aiResult: resData
            });
        } catch (aiError) {
            console.error("AI Semantic Mapping Error:", aiError.message);
            if (aiError.response?.data) {
                console.error("AI Error Detail:", JSON.stringify(aiError.response.data, null, 2));
            }
            res.status(201).json({
                message: "Document uploaded locally, but semantic mapping failed",
                document: newDoc,
                error: aiError.message
            });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
