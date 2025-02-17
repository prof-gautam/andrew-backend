const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

// 🔑 Public Routes
router.post('/request-email-verification', authController.requestEmailVerification);
router.post('/verify-email', authController.verifyEmail);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.get('/check-email-verification', authController.checkEmailVerification);
router.post('/forgot-password', authController.forgotPassword);
// router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

// 🔐 Protected Routes
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
