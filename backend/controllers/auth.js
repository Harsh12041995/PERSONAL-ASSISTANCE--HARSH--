const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');

// Generate Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

/**
 * POST /auth/change-password (protected) — set a new password and clear the
 * admin-forced `mustChangePassword` flag. NOTE: passwords are stored plaintext
 * to match the existing login comparison (see security follow-up in task.md);
 * this endpoint intentionally follows that same scheme rather than diverging.
 */
exports.changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || String(newPassword).length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
        }
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.password = newPassword;
        user.accountConfig = { ...(user.accountConfig || {}), mustChangePassword: false };
        await user.save();
        res.json({ success: true, data: { mustChangePassword: false } });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
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

        // Check if user is approved
        if (user.status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: user.status === 'pending'
                    ? 'Your account is pending approval by an admin.'
                    : 'Your account has been blocked. Please contact support.'
            });
        }

        if (user.accountConfig?.loginAccess === false) {
            return res.status(403).json({
                success: false,
                message: 'Account access disabled by admin.'
            });
        }

        const roleDoc = await Role.findOne({ name: user?.role?.name });
        const rolePermissions = Array.isArray(roleDoc?.permissions) ? roleDoc.permissions : [];
        const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
        const permissionMode = user.permissionMode || 'role';
        const effectivePermissions = permissionMode === 'custom' ? userPermissions : rolePermissions;

        res.json({
            success: true,
            data: {
                user: {
                    _id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    permissionMode,
                    permissions: effectivePermissions,
                    accountConfig: user.accountConfig || {}
                },
                token: generateToken(user._id),
                company: user.company,
                role: {
                    name: user?.role?.name || 'User',
                    permissions: effectivePermissions
                },
                groups: user.groups
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
};
