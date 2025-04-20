const express = require('express');
const router = express.Router();

const activityController = require('../controllers/activityController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/recent', authMiddleware, activityController.getRecentActivities);
router.get("/recommendations", authMiddleware, activityController.getRecommendations);


module.exports = router;
