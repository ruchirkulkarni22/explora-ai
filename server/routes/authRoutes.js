// server/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');

// --- COMPLETE REGISTER LOGIC ---
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ error: 'User with that email already exists.' });
        }
        user = new User({ name, email, password });
        await user.save();
        const payload = {
            user: { id: user.id, role: user.role, name: user.name, email: user.email }
        };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.status(201).json({ token });
        });
    } catch (error) {
        console.error('Registration error:', error.message);
        res.status(500).send('Server error during registration.');
    }
});

// --- COMPLETE LOGIN LOGIC ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials.' });
        }
        const payload = {
            user: { id: user.id, role: user.role, name: user.name, email: user.email }
        };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).send('Server error during login.');
    }
});

// --- COMPLETE RESET PASSWORD LOGIC ---
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
        res.status(500).send('Server error.');
    }
});


// --- COMPLETE FORGOT PASSWORD LOGIC ---
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'No account with that email address exists.' });
        }

        const resetToken = crypto.randomBytes(20).toString('hex');

        user.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        res.status(200).json({
            message: 'Password reset token generated successfully.',
            resetToken: resetToken
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).send('Server error.');
    }
});

module.exports = router;
