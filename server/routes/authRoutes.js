// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
});

const generateToken = (user) => {
    const payload = { user: { id: user.id, role: user.role, name: user.name, email: user.email } };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d', issuer: 'ExploraAPI', audience: 'ExploraClient' });
};

// --- Set Token Cookie Helper (THE FIX IS HERE) ---
const setTokenCookie = (res, user) => {
    const token = generateToken(user);
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        // --- CHANGE 'strict' TO 'lax' ---
        // 'Lax' allows the cookie to be sent on top-level navigation, which is needed
        // for the redirect from the frontend (port 5173) to the backend (port 3001).
        sameSite: 'lax', 
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'User with that email already exists.' });
        
        user = new User({ name, email, password });
        await user.save();

        setTokenCookie(res, user);
        res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
        res.status(500).send('Server error during registration.');
    }
});

router.post('/login', loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

        setTokenCookie(res, user);
        res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        res.status(500).send('Server error during login.');
    }
});

router.get('/me', protect, (req, res) => {
    res.json(req.user);
});

router.post('/logout', (req, res) => {
    res.cookie('token', '', { httpOnly: true, expires: new Date(0), sameSite: 'lax' });
    res.status(200).json({ message: 'Logged out successfully' });
});

// ... (rest of file remains the same)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');

        user.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

        await user.save();

        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
        console.log('--- PASSWORD RESET ---');
        console.log(`Reset URL: ${resetUrl}`);
        console.log('--------------------');

        res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).send('Server error.');
    }
});

router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }
        user.password = password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password has been reset successfully.' });
    } catch (error) {
        console.error('Reset password error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).send('Server error.');
    }
});


module.exports = router;
