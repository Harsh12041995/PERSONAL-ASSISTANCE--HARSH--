const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user (for seeding/testing)
// @route   POST /api/v1/auth/sign-up
exports.register = async (req, res) => {
    try {
        const { first_name, last_name, email, password } = req.body;
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        user = await User.create({
            first_name,
            last_name,
            email,
            password, // Plain text for local simplicity as requested
            role: {
                name: 'Asset Engineer',
                permissions: [] // Add default permissions if needed
            }
        });

        res.status(201).json({
            success: true,
            data: {
                _id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                token: generateToken(user.id)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Login user
// @route   POST /api/v1/auth/sign-in
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check password (plain text comaprison for local dev)
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.json({
            success: true,
            data: {
                user: {
                    _id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role
                },
                token: generateToken(user._id),
                company: user.company,
                role: user.role,
                groups: user.groups
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};
