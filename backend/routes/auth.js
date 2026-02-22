const express = require('express');
const { register, login, getMe } = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.post('/sign-up', register);
router.post('/sign-in', login);
router.get('/me', protect, getMe);

module.exports = router;
