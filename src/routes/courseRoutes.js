const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middlewares/authMiddleware');
const { preventUpdateIfComplete } = require('../middlewares/restrictMaterialModification');
const upload = require('../middlewares/multerConfig'); // ✅ Import Multer

// ✅ Allow file uploads for course creation
router.post('/', authMiddleware, upload.array('materials', 10), courseController.createCourse);

// ✅ Other course routes
router.get('/', authMiddleware, courseController.getAllCourses);
router.get('/:courseId', authMiddleware, courseController.getCourseById);
router.put('/:courseId', authMiddleware, preventUpdateIfComplete, courseController.updateCourse);
router.delete('/:courseId', authMiddleware, courseController.deleteCourse);

module.exports = router;
