const express = require("express");
const router = express.Router();
const uploadController = require("../controller/uploadController");
const { upload } = require("../config/db.config");

// Form upload route
router.post("/form", upload.single("file"), uploadController.uploadForm);

// User document upload route
router.post("/document", upload.single("file"), uploadController.uploadDocument);

// Get file from GridFS
router.get("/file/:fileId", uploadController.getFile);
router.get("/form/:id", uploadController.getForm);

// Enhanced Mapping routes
router.get("/document/:id", uploadController.getDocument);
router.get("/form/:formId/document/:documentId/filled-pdf", uploadController.getFilledPdf);
router.get("/form/:formId/document/:documentId/fill-data", uploadController.getFillData);
router.post("/document/map", upload.single("file"), uploadController.uploadAndMapDocument);
router.put("/document/mapping/:id", uploadController.updateMapping);
router.put("/document/exclude/:id", uploadController.toggleDocumentExclusion);

// Dashboard lists
router.get("/forms/user/:userId", uploadController.listUserForms);
router.get("/documents/user/:userId", uploadController.listUserDocuments);
router.delete("/form/:id", uploadController.deleteForm);
router.delete("/document/:id", uploadController.deleteDocument);

module.exports = router;
