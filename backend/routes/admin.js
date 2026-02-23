const express = require('express');
const { getUsers, updateUserStatus, deleteUser } = require('../controllers/admin');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// All admin routes are protected and require 'owner' role
router.use(protect);
router.use(authorize('owner'));

router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
