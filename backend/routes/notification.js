const express = require('express');
const { getNotifications, markAsRead, deleteNotification } = require('../controllers/notification');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
