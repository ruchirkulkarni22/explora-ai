// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token (and attach to request object)
            // We don't want to send the password back, even the hashed one
            req.user = await User.findById(decoded.user.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Not authorized as an admin' });
    }
};

const logApiCall = async (req, res, next) => {
    const logId = uuidv4().slice(0, 8);
    req.logId = logId; // Attach logId to the request for consistent logging

    const log = new Log({
        user: req.user.id,
        apiEndpoint: req.originalUrl,
        fileName: req.files ? req.files.map(f => f.originalname).join(', ') : (req.file ? req.file.originalname : 'N/A'),
        status: 'initiated', // We'll update this later
    });

    await log.save();

    // Monkey-patch the res.json and res.status functions to capture the response
    const originalJson = res.json;
    const originalStatus = res.status;
    let responseStatus = 200; // Default success status

    res.status = (code) => {
        responseStatus = code;
        return originalStatus.call(res, code);
    };

    res.json = async (body) => {
        if (responseStatus >= 400) {
            log.status = 'failure';
            log.errorMessage = body.error || 'An error occurred';
        } else {
            log.status = 'success';
        }
        await log.save();
        return originalJson.call(res, body);
    };

    next();
};


module.exports = { protect, admin, logApiCall };
