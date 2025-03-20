const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController'); // Ensure this path is correct!
const authMiddleware = require('../middlewares/authMiddleware');

// ✅ Get an existing quiz for a module
router.get('/module/:moduleId', authMiddleware, quizController.getQuizByModule);

// ✅ Get a quiz by its ID
router.get('/:quizId', authMiddleware, quizController.getQuizById);

// ✅ Generate a new quiz for a module
router.post('/module/:moduleId/generate', authMiddleware, quizController.generateQuiz);

// ✅ Update an existing quiz (marks, completion status, answers)
router.patch('/:quizId/update', authMiddleware, quizController.updateQuiz);

// ✅ Submit a quiz & calculate score
router.post('/:quizId/submit', authMiddleware, quizController.submitQuiz);

module.exports = router;
