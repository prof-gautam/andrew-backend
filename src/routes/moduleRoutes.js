const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/moduleController');
const authMiddleware = require('../middlewares/authMiddleware');
router.post('/generate/:courseId', authMiddleware, moduleController.generateModules);
router.post('/update/:courseId', authMiddleware, moduleController.updateModules);
router.get('/course/:courseId', authMiddleware, moduleController.getAllModulesByCourse);
router.get('/', authMiddleware, moduleController.getAllModules); // gives all courses
router.get('/:moduleId', authMiddleware, moduleController.getModuleById);

module.exports = router;
