const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const roleMiddleware = require('../middlewares/roleMiddleware');

const router = express.Router();
const upload = multer(); // Memory storage

// User Routes
router.put('/profile', authMiddleware, upload.single('profileImage'), userController.updateUserProfile);
router.get('/me', authMiddleware, userController.getUserDetails);
router.delete('/:id', authMiddleware, userController.deleteUser);

// Admin Routes
router.get('/', authMiddleware, roleMiddleware('admin'), userController.getAllUsers);

module.exports = router;
