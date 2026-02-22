const express = require('express');
const { register, login } = require('../controllers/auth');
const router = express.Router();

router.post('/sign-up', register);
router.post('/sign-in', login);

module.exports = router;
