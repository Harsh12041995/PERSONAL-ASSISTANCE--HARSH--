const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ── Token helper ───────────────────────────────────────────────────────────────
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── Register ─────────────────────────────────────────────────────────────────
// POST /api/v1/auth/sign-up
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (await User.findOne({ email })) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const user = await User.create({ name, email, password, role: 'owner' });

        res.status(201).json({
            success: true,
            data: {
                user: { _id: user._id, name: user.name, email: user.email, role: user.role },
                token: generateToken(user._id),
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── Login ─────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/sign-in
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.json({
            success: true,
            data: {
                user: { _id: user._id, name: user.name, email: user.email, role: user.role },
                token: generateToken(user._id),
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ── Me (get current user) ─────────────────────────────────────────────────────
// GET /api/v1/auth/me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ success: true, data: { _id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
