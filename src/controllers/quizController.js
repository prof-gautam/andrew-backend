const Quiz = require("../models/quizModel")
const Module = require("../models/moduleModel")
const Course = require("../models/courseModel")
const { successResponse, errorResponse } = require("../utils/responseHelper")
const { httpStatusCodes } = require("../utils/httpStatusCodes")
const OpenAI = require("openai")
const config = require("../config/appConfig") // ✅ Uses appConfig
const {
  evaluateMCQorTrueFalse,
  evaluateOpenEnded,
  evaluateCoding,
} = require("../utils/quizEvaluator")

// ✅ Initialize DeepSeek API
const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: config.deepseekApi, // ✅ Using configured API key from appConfig
})

/**
 * @route GET /api/v1/quizzes/:moduleId
 * @desc Get existing quiz for a module
 */
exports.getQuizByModule = async (req, res) => {
  try {
    const { moduleId } = req.params

    const quizzes = await Quiz.find({ moduleId }).sort({ createdAt: -1 });
    if (!quizzes || quizzes.length === 0) {
      return errorResponse(
        res,
        "No quizzes found for this module.",
        httpStatusCodes.NOT_FOUND
      );
    }
    
    return successResponse(res, "Quizzes retrieved successfully.", quizzes);
    
  } catch (error) {
    console.error("❌ Error fetching quiz:", error)
    return errorResponse(
      res,
      "Internal server error.",
      httpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * @route GET /api/v1/quizzes/quiz/:quizId
 * @desc Get quiz by ID
 */
exports.getQuizById = async (req, res) => {
  try {
    const { quizId } = req.params

    // ✅ Validate Quiz ID
    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return errorResponse(res, "Quiz not found.", httpStatusCodes.NOT_FOUND)
    }

    return successResponse(res, "Quiz retrieved successfully.", quiz)
  } catch (error) {
    console.error("❌ Error fetching quiz by ID:", error)
    return errorResponse(
      res,
      "Internal server error.",
      httpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * @route POST /api/v1/quizzes/:moduleId/generate
 * @desc Generate a new quiz using AI
 */
exports.generateQuiz = async (req, res) => {
  try {
    const { moduleId } = req.params;

    // ✅ Validate Module
    const module = await Module.findById(moduleId).populate("courseId");
    if (!module) {
      return errorResponse(res, "Module not found.", httpStatusCodes.NOT_FOUND);
    }

    const course = await Course.findById(module.courseId);
    if (!course) {
      return errorResponse(res, "Course not found.", httpStatusCodes.NOT_FOUND);
    }

    // ✅ Limit number of quizzes (e.g., max 5 per module)
    if (module.quizzes && module.quizzes.length >= 5) {
      return errorResponse(res, "Maximum number of quizzes reached for this module (5).", httpStatusCodes.BAD_REQUEST);
    }

    const { quizConfig } = course;
    if (!quizConfig) {
      return errorResponse(res, "Quiz configuration missing in course.", httpStatusCodes.BAD_REQUEST);
    }

    // ✅ Prepare AI prompt
    const prompt = `
You are an expert quiz creator for e-learning platforms.

Create a quiz based ONLY on the following module content. DO NOT include external information. Ensure accuracy and relevance to the content below.

MODULE:
Title: ${module.title}
Description: ${module.description}
Key Points:
${module.keyPoints?.map((point, i) => `${i + 1}. ${point}`).join("\n")}

Quiz Requirements:
- Total questions: ${quizConfig.numberOfQuestions}
- Allowed types: ${quizConfig.quizTypes.join(", ")}
- Difficulty: ${quizConfig.difficultyLevel}
- Return a valid JSON with the following structure:

{
  "title": "Quiz Title",
  "description": "Short description of this quiz",
  "questions": [
    {
      "questionText": "What is ...?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "questionType": "MCQ"
    }
  ]
}

ONLY return JSON. Do NOT include explanations, markdown, or comments.
`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    });

    let rawResponse = response.choices[0].message.content.trim();
    console.log("🔍 Raw AI Response:", rawResponse);

    rawResponse = rawResponse.replace(/```json|```/g, "").trim();

    let generatedQuiz;
    try {
      generatedQuiz = JSON.parse(rawResponse);
    } catch (error) {
      return errorResponse(res, "Invalid AI-generated quiz format.", httpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    // ✅ Save and attach quiz
    const newQuiz = await Quiz.create({
      moduleId,
      title: generatedQuiz.title,
      description: generatedQuiz.description,
      questions: generatedQuiz.questions,
      totalQuestions: generatedQuiz.questions.length,
      maxScore: generatedQuiz.questions.length,
      timeLimit: quizConfig.isTimed ? quizConfig.timeDuration : null,
    });

    await Module.findByIdAndUpdate(moduleId, {
      $push: { quizzes: newQuiz._id },
    });

    return successResponse(res, "Quiz generated successfully.", newQuiz);
  } catch (error) {
    console.error("❌ Error generating quiz:", error);
    return errorResponse(res, "Internal server error.", httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};


/**
 * @route PATCH /api/v1/quizzes/:quizId/update
 * @desc Update quiz marks, completion status, attempts
 */
exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params
    const { obtainedMarks, isCompleted, attempts } = req.body

    // ✅ Validate Quiz
    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return errorResponse(res, "Quiz not found.", httpStatusCodes.NOT_FOUND)
    }

    // ✅ Update fields if provided
    if (obtainedMarks !== undefined) quiz.obtainedMarks = obtainedMarks
    if (isCompleted !== undefined) quiz.isCompleted = isCompleted
    if (attempts !== undefined) quiz.attempts = attempts

    await quiz.save()
    return successResponse(res, "Quiz updated successfully.", quiz)
  } catch (error) {
    console.error("❌ Error updating quiz:", error)
    return errorResponse(
      res,
      "Internal server error.",
      httpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }
}

/**
 * @route POST /api/v1/quizzes/:quizId/submit
 * @desc Submit a quiz and record a new attempt
 */
exports.submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params
    const { userAnswers } = req.body

    const quiz = await Quiz.findById(quizId)
    if (!quiz) {
      return errorResponse(res, "Quiz not found.", httpStatusCodes.NOT_FOUND)
    }

    // Auto-grading for MCQ and True/False only
    let obtainedMarks = 0
    let evaluatedAnswers = []

    quiz.questions.forEach((question) => {
      const userAnswer = userAnswers.find(
        (ans) => ans.questionId.toString() === question._id.toString()
      )

      if (userAnswer) {
        const isCorrect =
          ["MCQ", "True/False"].includes(question.questionType) &&
          userAnswer.answer === question.correctAnswer

        if (isCorrect) obtainedMarks++

        evaluatedAnswers.push({
          questionId: question._id,
          answer: userAnswer.answer,
          isCorrect: isCorrect || false,
        })
      }
    })

    const percentage =
      ((obtainedMarks / quiz.totalQuestions) * 100).toFixed(2) + "%"

    // Determine next attempt number
    const attemptNumber = quiz.attempts.length + 1

    quiz.attempts.push({
      attemptNumber,
      obtainedMarks,
      percentage,
      isCompleted: true,
      answers: evaluatedAnswers,
    })

    await quiz.save()

    return successResponse(res, "Quiz submitted successfully.", {
      attemptNumber,
      obtainedMarks,
      totalQuestions: quiz.totalQuestions,
      percentage,
    })
  } catch (error) {
    console.error("❌ Error submitting quiz:", error)
    return errorResponse(
      res,
      "Internal server error.",
      httpStatusCodes.INTERNAL_SERVER_ERROR
    )
  }
}
