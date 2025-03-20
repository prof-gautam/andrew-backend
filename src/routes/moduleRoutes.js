const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const authMiddleware = require('../middlewares/authMiddleware');

// ✅ Generate Modules from Unprocessed Materials
router.post('/generate/:courseId', authMiddleware, moduleController.generateModules);

// ✅ Update Modules when new materials are added
router.post('/update/:courseId', authMiddleware, moduleController.updateModules);

// ✅ Get a Single Module by ID
router.get('/:moduleId', authMiddleware, moduleController.getModuleById);

// ✅ Get All Modules for a Specific Course
router.get('/course/:courseId', authMiddleware, moduleController.getAllModulesByCourse);

module.exports = router;
