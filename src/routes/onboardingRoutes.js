// 📂 src/routes/onboardingRoutes.js
const express = require('express');
const onboardingController = require('../controllers/onboardingController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// 🚀 Onboarding Routes
router.post('/me/onboarding', authMiddleware, onboardingController.submitOnboarding);
router.get('/me/onboarding', authMiddleware, onboardingController.getOnboarding);
router.put('/me/onboarding', authMiddleware, onboardingController.updateOnboarding);

module.exports = router;
