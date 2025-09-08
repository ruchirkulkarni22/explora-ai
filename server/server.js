// server/server.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');

// --- Import routes ---
const apiRoutes = require('./routes/apiRoutes');

// --- Helper: Get local LAN IP ---
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const details of iface) {
            if (details.family === 'IPv4' && !details.internal) return details.address;
        }
    }
    return '127.0.0.1'; // Fallback to loopback
}

const app = express();
const port = process.env.PORT ?? 3001;

// --- CORS Configuration ---
app.use(cors());

// --- Parse JSON bodies ---
app.use(express.json());


// --- Body Parser Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting removed

// --- Routes ---
// Metrics endpoint removed

// Only use apiRoutes which contains generator functionality without auth
app.use('/api', apiRoutes);

// --- 404 & Global Error Handlers ---
app.use((req, res, next) => {
    res.status(404).json({ error: `Not Found - ${req.originalUrl}` });
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        error: 'An unexpected error occurred.',
        ...(process.env.NODE_ENV === 'development' && { message: err.message })
    });
});

// --- Server Start ---
const server = app.listen(port, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`✅ Explora server running on port ${port}:`);
    console.log(`   Local:   http://localhost:${port}`);
    console.log(`   Network: http://${ip}:${port}`);
});
