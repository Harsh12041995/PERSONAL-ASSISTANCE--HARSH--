const User = require('../models/User');
const Role = require('../models/Role');
const AdminActivity = require('../models/AdminActivity');
const { PERMISSION_CATALOG, PERMISSION_IDS } = require('../config.permissions');

const buildActor = (req) => ({
    userId: req.user._id,
    name: `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Unknown Admin',
    email: req.user.email || 'unknown@local',
    role: req.user?.role?.name || 'unknown'
});

const logAdminActivity = async (req, action, target = {}, metadata = {}) => {
    try {
        await AdminActivity.create({
            actor: buildActor(req),
            action,
            target,
            metadata,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });
    } catch (error) {
        console.error('[AdminActivity] Failed to write activity log:', error.message);
    }
};

const normalizeRoleLookup = async (roleName) => {
    if (!roleName || typeof roleName !== 'string') return null;
    const byExactName = await Role.findOne({ name: roleName.trim() });
    if (byExactName) return byExactName;
    return Role.findOne({ name: { $regex: `^${roleName.trim()}$`, $options: 'i' } });
};

const validatePermissions = (permissions) => {
    if (!Array.isArray(permissions)) return 'Permissions must be an array';
    const invalid = permissions.filter((p) => !PERMISSION_IDS.includes(p));
    if (invalid.length) return `Invalid permissions: ${invalid.join(', ')}`;
    return null;
};

const enrichUsersWithRoleMapping = async (users) => {
    const roles = await Role.find({}).lean();
    const roleMap = new Map(roles.map((r) => [r.name.toLowerCase(), r]));

    return users.map((user) => {
        const assignedRoleName = user?.role?.name || 'User';
        const mappedRole = roleMap.get(assignedRoleName.toLowerCase());
        const rolePermissions = mappedRole?.permissions || [];
        const userPermissions = user.permissions || [];
        const permissionMode = user.permissionMode || 'role';
        const effectivePermissions = permissionMode === 'custom'
            ? Array.from(new Set(userPermissions))
            : Array.from(new Set(rolePermissions));

        return {
            ...user,
            roleMapping: {
                assignedRole: assignedRoleName,
                mappedRoleId: mappedRole?._id || null,
                roleExists: Boolean(mappedRole),
                permissionMode,
                rolePermissions,
                userOverrides: userPermissions,
                effectivePermissions
            }
        };
    });
};

exports.getUsers = async (_req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
        const enrichedUsers = await enrichUsersWithRoleMapping(users);
        res.status(200).json({ success: true, count: enrichedUsers.length, data: enrichedUsers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPermissionCatalog = async (_req, res) => {
    res.status(200).json({ success: true, data: PERMISSION_CATALOG });
};

exports.updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['pending', 'approved', 'blocked'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const previousStatus = user.status;
        user.status = status;
        await user.save();

        await logAdminActivity(req, 'USER_STATUS_UPDATED', { userId: user._id, email: user.email, role: user?.role?.name }, { previousStatus, newStatus: status });
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const roleDoc = await normalizeRoleLookup(role);
        if (!roleDoc) return res.status(400).json({ success: false, message: 'Role does not exist. Create role first.' });

        const previousRole = user?.role?.name || 'User';
        user.role = { name: roleDoc.name };
        user.permissionMode = 'role';
        user.permissions = Array.isArray(roleDoc.permissions) ? roleDoc.permissions : [];
        await user.save();

        await logAdminActivity(req, 'USER_ROLE_UPDATED', { userId: user._id, email: user.email, role: roleDoc.name }, { previousRole, newRole: roleDoc.name, permissionMode: user.permissionMode });
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateUserPermissions = async (req, res) => {
    try {
        const { permissions, mode } = req.body;
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const permissionError = validatePermissions(permissions || []);
        if (permissionError) return res.status(400).json({ success: false, message: permissionError });

        const permissionMode = mode === 'custom' ? 'custom' : 'role';
        const previousPermissions = user.permissions || [];
        const previousMode = user.permissionMode || 'role';

        user.permissionMode = permissionMode;
        if (permissionMode === 'custom') {
            user.permissions = permissions;
        } else {
            const roleDoc = await normalizeRoleLookup(user?.role?.name || 'User');
            user.permissions = Array.isArray(roleDoc?.permissions) ? roleDoc.permissions : [];
        }

        await user.save();
        await logAdminActivity(req, 'USER_PERMISSIONS_UPDATED', { userId: user._id, email: user.email, role: user?.role?.name }, { previousMode, newMode: user.permissionMode, previousPermissions, newPermissions: user.permissions });

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateUserAccountConfig = async (req, res) => {
    try {
        const { loginAccess, mustChangePassword, twoFactorRequired } = req.body;
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const previousConfig = user.accountConfig || {};
        user.accountConfig = {
            loginAccess: typeof loginAccess === 'boolean' ? loginAccess : Boolean(previousConfig.loginAccess),
            mustChangePassword: typeof mustChangePassword === 'boolean' ? mustChangePassword : Boolean(previousConfig.mustChangePassword),
            twoFactorRequired: typeof twoFactorRequired === 'boolean' ? twoFactorRequired : Boolean(previousConfig.twoFactorRequired)
        };

        if (user.accountConfig.loginAccess === false) {
            user.status = 'blocked';
        }

        await user.save();
        await logAdminActivity(req, 'USER_ACCOUNT_CONFIG_UPDATED', { userId: user._id, email: user.email, role: user?.role?.name }, { previousConfig, newConfig: user.accountConfig });

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        await logAdminActivity(req, 'USER_DELETED', { userId: user._id, email: user.email, role: user?.role?.name }, { deletedAt: new Date().toISOString() });
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getRoles = async (_req, res) => {
    try {
        const roles = await Role.find({}).sort({ name: 1 });
        res.status(200).json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.createRole = async (req, res) => {
    try {
        const permissionError = validatePermissions(req.body.permissions || []);
        if (permissionError) return res.status(400).json({ success: false, message: permissionError });

        const role = await Role.create(req.body);
        res.status(201).json({ success: true, data: role });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateRole = async (req, res) => {
    try {
        if (req.body.permissions) {
            const permissionError = validatePermissions(req.body.permissions);
            if (permissionError) return res.status(400).json({ success: false, message: permissionError });
        }

        const existingRole = await Role.findById(req.params.id);
        if (!existingRole) return res.status(404).json({ success: false, message: 'Role not found' });

        const oldName = existingRole.name;
        const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        const roleNameMatcher = { $in: [oldName, role.name] };
        const users = await User.find({ 'role.name': roleNameMatcher });
        await Promise.all(users.map(async (user) => {
            user.role = { name: role.name };
            if ((user.permissionMode || 'role') === 'role') {
                user.permissions = role.permissions || [];
            }
            await user.save();
        }));

        res.status(200).json({ success: true, data: role });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        const role = await Role.findByIdAndDelete(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: 'Role not found' });
        res.status(200).json({ success: true, message: 'Role deleted' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getUserManagementAnalytics = async (_req, res) => {
    try {
        const [totalUsers, totalRoles, statusCounts, roleDistribution, activitiesLast7Days, customPermissionsUsers] = await Promise.all([
            User.countDocuments({}),
            Role.countDocuments({}),
            User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
            User.aggregate([{ $group: { _id: '$role.name', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            AdminActivity.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
            User.countDocuments({ permissionMode: 'custom' })
        ]);

        const usersCreatedLast30Days = await User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
        const statusMap = statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        res.status(200).json({
            success: true,
            data: {
                totals: { totalUsers, totalRoles, usersCreatedLast30Days, activitiesLast7Days, customPermissionsUsers },
                statusBreakdown: {
                    approved: statusMap.approved || 0,
                    pending: statusMap.pending || 0,
                    blocked: statusMap.blocked || 0
                },
                roleDistribution: roleDistribution.map((item) => ({ role: item._id || 'Unassigned', count: item.count }))
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAdminActivityLogs = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
        const activities = await AdminActivity.find({}).sort({ createdAt: -1 }).limit(limit).lean();
        res.status(200).json({ success: true, count: activities.length, data: activities });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
