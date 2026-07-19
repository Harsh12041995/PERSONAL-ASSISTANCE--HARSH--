// backend/routes/staff.js
const express = require('express');
const router = express.Router();
const staff = require('../controllers/staff');

// All routes are mounted behind `protect` in server.js (req.user is guaranteed).
router.get('/queue', staff.listQueue);
router.post('/queue/:id/approve', staff.approveItem);
router.post('/queue/:id/reject', staff.rejectItem);
router.put('/queue/:id', staff.editItem);

router.get('/brief/today', staff.todayBrief);
router.get('/briefs', staff.listBriefs);
router.post('/brief/run', staff.runBrief);

router.post('/ghostwrite', staff.ghostwrite);
router.get('/posts', staff.listPosts);

router.post('/review/run', staff.runReview);

module.exports = router;
