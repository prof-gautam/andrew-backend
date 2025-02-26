
const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middlewares/authMiddleware');
const { preventUpdateIfComplete } = require('../middlewares/restrictMaterialModification');

// 📌 Routes
router.post('/', authMiddleware, courseController.createCourse);
router.get('/', authMiddleware, courseController.getAllCourses);
router.get('/search', authMiddleware, courseController.getCourseByName);
router.get('/:courseId', authMiddleware, courseController.getCourseById);
router.put('/:courseId', authMiddleware, preventUpdateIfComplete, courseController.updateCourse); // ✅ Now properly defined
router.delete('/:courseId', authMiddleware, courseController.deleteCourse);
router.patch('/:courseId/complete-upload', authMiddleware, courseController.completeCourseUpload);

module.exports = router;
