// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Log = require('../models/Log');
const { v4: uuidv4 } = require('uuid');

const ROLES = {
    ADMIN: 'admin',
    USER: 'user',
};

const protect = async (req, res, next) => {
    let token;

    // --- FIX: Read the token from the httpOnly cookie ---
    if (req.cookies && req.cookies.token) {
        try {
            token = req.cookies.token;
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.user.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ error: 'Not authorized, user not found' });
            }
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    // MODIFIED LINE: Use the ROLES.ADMIN constant
    if (req.user && req.user.role === ROLES.ADMIN) {
        next();
    } else {
        res.status(403).json({ error: 'Not authorized as an admin' });
    }
};

const logApiCall = async (req, res, next) => {
    const logId = uuidv4().slice(0, 8);
    req.logId = logId;
    
    const userId = req.user ? req.user.id : null;
    if (!userId) return next();

    const log = new Log({
        user: userId,
        apiEndpoint: req.originalUrl,
        fileName: req.files ? req.files.map(f => f.originalname).join(', ') : (req.file ? req.file.originalname : 'N/A'),
        status: 'initiated',
        requestId: logId,
    });
    await log.save();

    const start = Date.now();
    res.on('finish', async () => {
        const duration = Date.now() - start;
        log.latency = duration;
        log.status = res.statusCode >= 400 ? 'failure' : 'success';
        if (res.statusCode >= 400) {
            log.errorMessage = `Request failed with status code ${res.statusCode}`;
        }
        await log.save();
    });

    next();
};

module.exports = { protect, admin, logApiCall };
