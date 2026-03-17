const express = require('express');
const {
    getUsers,
    updateUserStatus,
    deleteUser,
    updateUserRole,
    updateUserPermissions,
    updateUserAccountConfig,
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    getUserManagementAnalytics,
    getAdminActivityLogs,
    getPermissionCatalog
} = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('owner', 'admin'));

router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/permissions', updateUserPermissions);
router.patch('/users/:id/account-config', updateUserAccountConfig);
router.delete('/users/:id', deleteUser);

router.get('/roles', getRoles);
router.post('/roles', createRole);
router.put('/roles/:id', updateRole);
router.delete('/roles/:id', deleteRole);

router.get('/permissions/catalog', getPermissionCatalog);
router.get('/analytics', getUserManagementAnalytics);
router.get('/activities', getAdminActivityLogs);

module.exports = router;
