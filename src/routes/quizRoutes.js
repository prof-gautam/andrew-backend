const express = require("express")
const router = express.Router()
const quizController = require("../controllers/quizController")
const authMiddleware = require("../middlewares/authMiddleware")

//  Get quizzes
router.get("/module/:moduleId", authMiddleware, quizController.getQuizByModule)
router.get("/:quizId", authMiddleware, quizController.getQuizById)

// Generate quizzes
router.post(
  "/module/:moduleId/generate",
  authMiddleware,
  quizController.generateQuiz
)
router.post(
  "/module/:moduleId/adaptive/:aiId/generate",
  authMiddleware,
  quizController.generateAdaptiveQuizForTopic
)

/**  Submit, Update, Report **/
router.patch("/:quizId/update", authMiddleware, quizController.updateQuiz)
router.post("/:quizId/submit", authMiddleware, quizController.submitQuiz)
router.get("/:quizId/report", authMiddleware, quizController.getQuizReport)
router.get('/', authMiddleware, quizController.getAllUserQuizzes);
router.get('/course/:courseId', authMiddleware, quizController.getAllQuizzesByCourse);



module.exports = router
