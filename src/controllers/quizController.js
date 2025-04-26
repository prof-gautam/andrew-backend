const Quiz = require("../models/quizModel")
const Module = require("../models/moduleModel")
const Course = require("../models/courseModel")
const QuizReport = require("../models/quizReportModel");
const { successResponse, errorResponse } = require("../utils/responseHelper")
const { httpStatusCodes } = require("../utils/httpStatusCodes")
const OpenAI = require("openai")
const config = require("../config/appConfig") // ✅ Uses appConfig
const {
  evaluateMCQorTrueFalse,
  evaluateOpenEnded,
  evaluateCoding,
} = require("../utils/quizEvaluator")

const {generateQuizReport} = require("../utils/generateQuizReport")
const { recalculateModuleGrade } = require("../utils/recalculateHelper");
const { recalculateCourseGrade } = require("../utils/recalculateCourseGrade");
const {paginateQuery} = require('../utils/paginationHelper')


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
    - Generate a relevant and catchy quiz title based on the module content.
    - Write a short description (1-2 lines) for the quiz.
    - Return a valid JSON with the following structure:
    
    {
      "title": "Meaningful and Relevant Quiz Title",
      "description": "Short description related to the quiz content",
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
    const shuffleOptionsAndUpdateAnswer = (question) => {
      const originalOptions = [...question.options];
      const correctAnswer = question.correctAnswer;
    
      const shuffledOptions = originalOptions.sort(() => Math.random() - 0.5);
    
      return {
        ...question,
        options: shuffledOptions,
        correctAnswer, // shorthand property
      };
    };
    const randomizedQuestions = generatedQuiz.questions.map((question) => {
      if (question.options && question.options.length > 0) {
        return shuffleOptionsAndUpdateAnswer(question);
      }
      return question;
    });
    
    

    // ✅ Save and attach quiz
    const newQuiz = await Quiz.create({
      moduleId,
      title: generatedQuiz.title,
      description: generatedQuiz.description,
      questions: randomizedQuestions,
      totalQuestions: generatedQuiz.questions.length,
      maxScore: generatedQuiz.questions.length,
      timeLimit: quizConfig.isTimed ? quizConfig.timeDuration : null,
      quizConfig: {
        quizTypes: quizConfig.quizTypes,
        numberOfQuestions: quizConfig.numberOfQuestions,
        difficultyLevel: quizConfig.difficultyLevel,
        isTimed: quizConfig.isTimed,
        timeDuration: quizConfig.timeDuration
      }
    });

    await Module.findByIdAndUpdate(moduleId, {
      $push: { quizzes: newQuiz._id },
      moduleStatus: 'on-track'
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
    const { quizId } = req.params;
    const { userAnswers, timeTaken } = req.body; // ⏱️ timeTaken from frontend in seconds
    const userId = req.user.userId;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return errorResponse(res, "Quiz not found.", httpStatusCodes.NOT_FOUND);
    }

    // Auto-grading for MCQ and True/False only
    let obtainedMarks = 0;
    let evaluatedAnswers = [];

    quiz.questions.forEach((question) => {
      const userAnswer = userAnswers.find(
        (ans) => ans.questionId.toString() === question._id.toString()
      );

      if (userAnswer) {
        const isCorrect =
          ["MCQ", "True/False"].includes(question.questionType) &&
          userAnswer.answer === question.correctAnswer;

        if (isCorrect) obtainedMarks++;

        evaluatedAnswers.push({
          questionId: question._id,
          answer: userAnswer.answer,
          isCorrect: isCorrect || false,
        });
      }
    });

    const percentage = ((obtainedMarks / quiz.totalQuestions) * 100).toFixed(2) + "%";
    const attemptNumber = quiz.attempts.length + 1;

    quiz.attempts.push({
      attemptNumber,
      obtainedMarks,
      percentage,
      isCompleted: true,
      timeTaken: timeTaken || 0, // ⏱️ default to 0 if not passed
      answers: evaluatedAnswers,
    });

    await quiz.save();

    // sBackground AI Report Generation
    generateQuizReport(userId, quiz._id, attemptNumber);
    await recalculateModuleGrade(quiz.moduleId);
    
    const module = await Module.findById(quiz.moduleId); // ✅ Get Module
    if (module) {
      await recalculateCourseGrade(module.courseId);
    }

    return successResponse(res, "Quiz submitted successfully.", {
      attemptNumber,
      obtainedMarks,
      totalQuestions: quiz.totalQuestions,
      percentage,
      timeTaken: timeTaken || 0,
    });
  } catch (error) {
    console.error("❌ Error submitting quiz:", error);
    return errorResponse(
      res,
      "Internal server error.",
      httpStatusCodes.INTERNAL_SERVER_ERROR
    );
  }
};


exports.getQuizReport = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.userId;

    // Get the latest report for the user and quiz
    const report = await QuizReport.findOne({ quizId, userId })
      .sort({ generatedAt: -1 })
      .lean();

    if (!report) {
      return errorResponse(res, "No quiz attempt or report found.", httpStatusCodes.NOT_FOUND);
    }

    // Handle report status
    switch (report.reportStatus) {
      case "pending":
        return res.status(202).json({
          status: "processing",
          message: "Report is still being generated. Please check back soon.",
        });

      case "failed":
        return res.status(500).json({
          status: "failed",
          message: "Quiz report generation failed. Please try again later.",
        });

      case "completed":
        return successResponse(res, "Quiz report retrieved successfully.", report);

      default:
        return errorResponse(res, "Unexpected report status.", httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  } catch (err) {
    console.error("❌ Fetching report failed:", err);
    return errorResponse(res, "Internal server error", httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};


/**
 * @route POST /api/v1/quizzes/module/:moduleId/adaptive/:aiId
 * @desc Generate a new adaptive quiz based on weak areas
 */

exports.generateAdaptiveQuizForTopic = async (req, res) => {
  try {
    const { moduleId, aiId } = req.params;
    const userId = req.user.userId;

    // Validate module and course
    const module = await Module.findById(moduleId).populate("courseId");
    if (!module) {
      return errorResponse(res, "Module not found.", httpStatusCodes.NOT_FOUND);
    }

    const course = module.courseId;
    if (!course || !course.quizConfig) {
      return errorResponse(res, "Course or quiz config not found.", httpStatusCodes.BAD_REQUEST);
    }

    // Find the report where this aiId exists
    const report = await QuizReport.findOne({
      moduleId,
      userId,
      "aiRecommendations.topics._id": aiId
    });

    if (!report) {
      return errorResponse(res, "Topic not found in any past reports.", httpStatusCodes.NOT_FOUND);
    }

    // Find that specific topic
    const topic = report.aiRecommendations.topics.find(t => t._id.toString() === aiId);
    if (!topic) {
      return errorResponse(res, "AI recommendation topic not found.", httpStatusCodes.NOT_FOUND);
    }

    if (topic.isQuizGenerated === true || topic.quizId) {
      return errorResponse(
        res,
        "Quiz has already been generated for this topic.",
        httpStatusCodes.BAD_REQUEST
      );
    }
    

    // ✅ Build AI prompt
    const prompt = `
You are an expert AI-based quiz generator.

Create a quiz ONLY about the topic: "${topic.title}"

Module Title: ${module.title}

Quiz Requirements:
- Total questions: ${course.quizConfig.numberOfQuestions}
- Allowed types: ${course.quizConfig.quizTypes.join(", ")}
- Difficulty: ${course.quizConfig.difficultyLevel}

Return valid JSON:
{
  "title": "Quiz Title",
  "description": "Short description",
  "questions": [
    {
      "questionText": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "questionType": "MCQ"
    }
  ]
}
Do NOT return markdown or explanation.
`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return errorResponse(res, "AI did not return valid JSON.", httpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    const aiText = raw.substring(jsonStart, jsonEnd + 1);
    const quizData = JSON.parse(aiText);

    const shuffleOptionsAndUpdateAnswer = (question) => {
      const originalOptions = [...question.options];
      const correctAnswer = question.correctAnswer;
    
      const shuffledOptions = originalOptions.sort(() => Math.random() - 0.5);
    
      return {
        ...question,
        options: shuffledOptions,
        correctAnswer, // shorthand property
      };
    };
    const randomizedQuestions = generatedQuiz.questions.map((question) => {
      if (question.options && question.options.length > 0) {
        return shuffleOptionsAndUpdateAnswer(question);
      }
      return question;
    });
    
const newQuiz = await Quiz.create({
  moduleId,
  title: quizData.title,
  description: quizData.description,
  questions: randomizedQuestions,
  totalQuestions: quizData.questions.length,
  maxScore: quizData.questions.length,
  timeLimit: course.quizConfig.isTimed ? course.quizConfig.timeDuration : null,
  quizConfig: {
    quizTypes: course.quizConfig.quizTypes,
    numberOfQuestions: course.quizConfig.numberOfQuestions,
    difficultyLevel: course.quizConfig.difficultyLevel,
    isTimed: course.quizConfig.isTimed,
    timeDuration: course.quizConfig.timeDuration
  }
});

    // ✅ Update the topic in aiRecommendations with quizId and isQuizGenerated
    const topicToUpdate = report.aiRecommendations.topics.find(t => t._id.toString() === aiId);
    if (topicToUpdate) {
      topicToUpdate.quizId = newQuiz._id;
      topicToUpdate.isQuizGenerated = true;
    }

    await report.save();
    await Module.findByIdAndUpdate(moduleId, {
      $push: { quizzes: newQuiz._id },
      moduleStatus: 'on-track'
    });

    return successResponse(res, "Adaptive quiz generated for topic.", {
      quizId: newQuiz._id,
      quiz: newQuiz,
    });

  } catch (error) {
    console.error("❌ Error generating adaptive quiz for topic:", error);
    return errorResponse(res, "Internal server error.", httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};


/**
 * @route GET /api/v1/quizzes/user
 * @desc Get all quizzes created under courses of the logged-in user
 * @query page, limit
 */
exports.getAllUserQuizzes = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const userCourses = await Course.find({ userId }).select('_id');
    const courseIds = userCourses.map(c => c._id);

    const modules = await Module.find({ courseId: { $in: courseIds } }).select('_id');
    const moduleIds = modules.map(m => m._id);

    const queryFilter = { moduleId: { $in: moduleIds } };

    const result = await paginateQuery(Quiz, queryFilter, page, limit, [
      {
        path: 'moduleId',
        select: 'title courseId',
        populate: {
          path: 'courseId',
          select: 'title'
        }
      }
    ]);

    return successResponse(res, "User's quizzes fetched successfully.", result);
  } catch (error) {
    console.error("❌ Error fetching user's quizzes:", error);
    return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * @route GET /api/v1/quizzes/course/:courseId
 * @desc Get all quizzes under a specific course (via its modules)
 * @query page, limit
 */
exports.getAllQuizzesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const modules = await Module.find({ courseId }).select('_id');
    const moduleIds = modules.map(m => m._id);

    const queryFilter = { moduleId: { $in: moduleIds } };

    const result = await paginateQuery(Quiz, queryFilter, page, limit, [
      {
        path: 'moduleId',
        select: 'title courseId',
        populate: {
          path: 'courseId',
          select: 'title'
        }
      }
    ]);

    return successResponse(res, "Course quizzes fetched successfully.", result);
  } catch (error) {
    console.error("❌ Error fetching course quizzes:", error);
    return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};