// server/server.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const os = require('os');

// --- Import routes and middleware ---
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const metricRoutes = require('./routes/metricRoutes'); 
const { protect, admin } = require('./middleware/authMiddleware');
const Log = require('./models/Log');

const app = express();
const port = 3001;

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully.'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/api/metrics', metricRoutes); // Handles all requests to /api/metrics

// --- Admin Route for Logs ---
app.get('/api/logs', protect, admin, async (req, res) => {
    try {
        const logs = await Log.find({}).populate('user', 'name email').sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Server error while fetching logs.' });
    }
});

// --- Helper: Get local LAN IP ---
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
        for (const details of iface) {
            if (details.family === 'IPv4' && !details.internal) {
                return details.address;
            }
        }
    }
    return 'localhost';
}

// --- Server Start ---
app.listen(port, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`✅ Explora server running:`);
    console.log(`   Local:   http://localhost:${port}`);
    console.log(`   Network: http://${ip}:${port}  <-- share this with coworkers`);
});