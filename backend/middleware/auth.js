const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'No user found with this id' });
        }

        if (req.user?.accountConfig?.loginAccess === false || req.user?.status === 'blocked') {
            return res.status(403).json({ success: false, message: 'User account access is disabled' });
        }

        next();
    } catch (_err) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};

exports.authorize = (...roles) => {
    return (req, res, next) => {
        let userRole = '';
        if (typeof req.user?.role === 'string') {
            userRole = req.user.role.toLowerCase();
        } else if (req.user?.role?.name) {
            userRole = req.user.role.name.toLowerCase();
        }

        const allowedRoles = roles.map((r) => r.toLowerCase());

        if (!userRole || !allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `User role ${userRole || 'unknown'} is not authorized to access this route`
            });
        }
        next();
    };
};

exports.hasPermission = (permission) => {
    return async (req, res, next) => {
        const roleName = req.user?.role?.name?.toLowerCase();
        if (roleName === 'owner') return next();

        try {
            const mode = req.user?.permissionMode || 'role';
            if (mode === 'custom') {
                if (req.user?.permissions?.includes(permission)) return next();
            } else {
                const role = await Role.findOne({ name: req.user?.role?.name });
                if (role?.permissions?.includes(permission)) return next();
            }
        } catch (err) {
            console.error('[AuthMiddleware] Error checking permissions:', err);
        }

        return res.status(403).json({
            success: false,
            message: `User does not have permission to access ${permission}`
        });
    };
};
