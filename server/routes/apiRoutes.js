// server/routes/apiRoutes.js
// This file now contains all the generator logic without authentication.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- NEW: Define allowed file types ---
const allowedFileTypes = {
    documents: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'],
    excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

// --- NEW: File filter function ---
const fileFilter = (allowedTypes) => (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error(`Invalid file type. Only ${allowedTypes.join(', ')} are allowed.`);
        error.status = 400;
        cb(error, false);
    }
};

// Import your generator logic functions from the old server.js
// NOTE: You will need to refactor your server.js to export these functions.
// For this example, I'm assuming they are refactored into a controller file.
const {
    generateBrd,
    refineFlow,
    generateTestCases,
    generateTrainingDeck
} = require('../controllers/generatorController'); // We will create this file next

// --- MODIFIED: Use diskStorage instead of memoryStorage ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Store temporary files in an 'uploads' directory
        const uploadPath = path.join(__dirname, '..', 'uploads');
        // Ensure the directory exists
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create a unique filename to prevent conflicts
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// --- MODIFIED: Update multer instances with new storage and filters ---
const uploadDocs = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter(allowedFileTypes.documents)
});


const uploadExcel = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter(allowedFileTypes.excel)
});

// --- API Routes (no authentication required) ---
// All routes are directly accessible without authentication middleware

router.post(
    '/generate-brd',
    uploadDocs.array('files', 10), // Use uploadDocs
    generateBrd
);

router.post(
    '/refine-flow',
    refineFlow
);

router.post(
    '/generate-test-cases',
    uploadDocs.array('files', 10), // Use uploadDocs
    generateTestCases
);

router.post(
    '/generate-training-deck',
    uploadExcel.single('file'), // Use uploadExcel
    generateTrainingDeck
);

module.exports = router;
