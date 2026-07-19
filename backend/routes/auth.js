const express = require('express');
const { register, login, changePassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/sign-up', register);
router.post('/sign-in', login);
router.post('/change-password', protect, changePassword);

module.exports = router;
