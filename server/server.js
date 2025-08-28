// server/server.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const os = require('os');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');

// --- Import routes and middleware ---
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const metricRoutes = require('./routes/metricRoutes');
const { protect, admin } = require('./middleware/authMiddleware');
const Log = require('./models/Log');

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

// --- Startup Validation ---
if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
    console.error('FATAL ERROR: MONGO_URI and JWT_SECRET must be defined in .env file.');
    process.exit(1);
}

const app = express();
const port = process.env.PORT ?? 3001;

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected successfully.'))
  .catch(err => {
      console.error('MongoDB Connection Error:', err)
      process.exit(1);
  });

// --- Security Middleware ---
app.use(helmet());

// --- CORS Configuration (THE FIX IS HERE) ---
const allowedOrigins = [
    'http://localhost:5173',    // Vite's default
    'http://127.0.0.1:5173',   // Alternative for localhost
    `http://${getLocalIP()}:5173` // Your local network IP
];

const corsOptions = {
    origin: function (origin, callback) {
        // --- DEBUGGING LOG ---
        // This will show the exact origin the browser is sending
        console.log(`CORS CHECK: Request origin is -> ${origin}`);

        // Allow requests with no origin (like Postman) or from our allowed list
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // This is required for cookies to be sent
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));


// --- Body Parser & Cookie Parser Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// --- Rate Limiting ---
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', apiLimiter);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/metrics', metricRoutes);

app.get('/api/logs', protect, admin, async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    try {
        const logs = await Log.find({}).populate('user', 'name email').sort({ timestamp: -1 }).skip(skip).limit(limit);
        const totalLogs = await Log.countDocuments();
        const totalPages = Math.ceil(totalLogs / limit);
        res.json({ logs, currentPage: page, totalPages, totalLogs });
    } catch (error) {
        res.status(500).json({ error: 'Server error while fetching logs.' });
    }
});

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
