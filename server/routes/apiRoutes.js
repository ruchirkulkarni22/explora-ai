// server/routes/apiRoutes.js
// This file now contains all the generator logic, protected by authentication.

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, logApiCall } = require('../middleware/authMiddleware');

// Import your generator logic functions from the old server.js
// NOTE: You will need to refactor your server.js to export these functions.
// For this example, I'm assuming they are refactored into a controller file.
const {
    generateBrd,
    refineFlow,
    generateTestCases,
    generateTrainingDeck
} = require('../controllers/generatorController'); // We will create this file next

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }
});

// --- Protected API Routes ---
// The `protect` middleware runs first, ensuring the user is logged in.
// The `logApiCall` middleware runs next, logging the request.
// Then, the actual generator function runs.

router.post(
    '/generate-brd',
    protect,
    logApiCall,
    upload.array('files', 10),
    generateBrd
);

router.post(
    '/refine-flow',
    protect,
    logApiCall,
    refineFlow
);

router.post(
    '/generate-test-cases',
    protect,
    logApiCall,
    upload.array('files', 10),
    generateTestCases
);

router.post(
    '/generate-training-deck',
    protect,
    logApiCall,
    upload.single('file'),
    generateTrainingDeck
);

module.exports = router;
