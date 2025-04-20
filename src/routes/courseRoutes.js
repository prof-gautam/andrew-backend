const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middlewares/authMiddleware');
const upload = require('../middlewares/multerConfig'); // ✅ Import Multer

// ✅ Create a new course with materials (Supports file uploads)
router.post('/', authMiddleware, upload.array('materials', 10), courseController.createCourse);

// ✅ Get all courses (Supports pagination & search)
router.get('/', authMiddleware, courseController.getAllCourses);

// ✅ Get a specific course by ID (Includes materials)
router.get('/:courseId', authMiddleware, courseController.getCourseById);

// ✅ Update a course (Restricted if materials are marked complete)
router.put('/:courseId',upload.none(), authMiddleware, courseController.updateCourse);

// ✅ Delete a course (Deletes associated materials)
router.delete('/:courseId', authMiddleware, courseController.deleteCourse);
router.put('/:courseId/mark-completed', courseController.markCourseAsCompleted);


module.exports = router;
