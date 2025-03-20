const Quiz = require('../models/quizModel');
const Module = require('../models/moduleModel');
const Course = require('../models/courseModel');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const OpenAI = require('openai');
const config = require('../config/appConfig'); // ✅ Uses appConfig

// ✅ Initialize DeepSeek API
const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: config.deepseekApi, // ✅ Using configured API key from appConfig
});

/**
 * @route GET /api/v1/quizzes/:moduleId
 * @desc Get existing quiz for a module
 */
exports.getQuizByModule = async (req, res) => {
    try {
        const { moduleId } = req.params;

        // ✅ Validate Module
        const quiz = await Quiz.findOne({ moduleId });
        if (!quiz) {
            return errorResponse(res, 'Quiz not found for this module.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'Quiz retrieved successfully.', quiz);
    } catch (error) {
        console.error('❌ Error fetching quiz:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route GET /api/v1/quizzes/quiz/:quizId
 * @desc Get quiz by ID
 */
exports.getQuizById = async (req, res) => {
    try {
        const { quizId } = req.params;

        // ✅ Validate Quiz ID
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return errorResponse(res, 'Quiz not found.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'Quiz retrieved successfully.', quiz);
    } catch (error) {
        console.error('❌ Error fetching quiz by ID:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route POST /api/v1/quizzes/:moduleId/generate
 * @desc Generate a new quiz using AI
 */
exports.generateQuiz = async (req, res) => {
    try {
        const { moduleId } = req.params;

        // ✅ Validate Module
        const module = await Module.findById(moduleId).populate('courseId');
        if (!module) {
            return errorResponse(res, 'Module not found.', httpStatusCodes.NOT_FOUND);
        }

        const course = await Course.findById(module.courseId);
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Check for quiz config
        const { quizConfig } = course;
        if (!quizConfig) {
            return errorResponse(res, 'Quiz configuration missing in course.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Prepare prompt for AI quiz generation
        const prompt = `
        Generate a quiz based on the module content.
        The quiz should have:
        - ${quizConfig.numberOfQuestions} questions
        - Question types: ${quizConfig.quizTypes.join(', ')}
        - Difficulty: ${quizConfig.difficultyLevel}

        Provide JSON format:
        {
            "title": "Quiz Title",
            "description": "Brief description",
            "questions": [
                {
                    "questionText": "What is AI?",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correctAnswer": "Option A",
                    "questionType": "MCQ"
                }
            ]
        }
        `;

        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
        });

        let rawResponse = response.choices[0].message.content.trim();
        rawResponse = rawResponse.replace(/```json|```/g, "").trim();

        let generatedQuiz;
        try {
            generatedQuiz = JSON.parse(rawResponse);
        } catch (error) {
            return errorResponse(res, 'Invalid AI-generated quiz format.', httpStatusCodes.INTERNAL_SERVER_ERROR);
        }

        // ✅ Save Quiz to DB
        const newQuiz = await Quiz.create({
            moduleId,
            title: generatedQuiz.title,
            description: generatedQuiz.description,
            questions: generatedQuiz.questions,
            totalQuestions: generatedQuiz.questions.length,
            maxScore: generatedQuiz.questions.length, // Each question = 1 mark
            timeLimit: quizConfig.isTimed ? quizConfig.timeDuration : null,
        });

        return successResponse(res, 'Quiz generated successfully.', newQuiz);
    } catch (error) {
        console.error('❌ Error generating quiz:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route PATCH /api/v1/quizzes/:quizId/update
 * @desc Update quiz marks, completion status, attempts
 */
exports.updateQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { obtainedMarks, isCompleted, attempts } = req.body;

        // ✅ Validate Quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return errorResponse(res, 'Quiz not found.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Update fields if provided
        if (obtainedMarks !== undefined) quiz.obtainedMarks = obtainedMarks;
        if (isCompleted !== undefined) quiz.isCompleted = isCompleted;
        if (attempts !== undefined) quiz.attempts = attempts;

        await quiz.save();
        return successResponse(res, 'Quiz updated successfully.', quiz);
    } catch (error) {
        console.error('❌ Error updating quiz:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route POST /api/v1/quizzes/:quizId/submit
 * @desc Submit a quiz and calculate score
 */
exports.submitQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { userAnswers } = req.body;

        // ✅ Validate Quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return errorResponse(res, 'Quiz not found.', httpStatusCodes.NOT_FOUND);
        }

        if (quiz.isCompleted) {
            return errorResponse(res, 'Quiz already completed.', httpStatusCodes.BAD_REQUEST);
        }

        let obtainedMarks = 0;
        let updatedAnswers = [];

        // ✅ Evaluate Answers
        quiz.questions.forEach((question, index) => {
            const userResponse = userAnswers.find(ans => ans.questionId.toString() === question._id.toString());

            if (userResponse) {
                const isCorrect = userResponse.answer === question.correctAnswer;
                if (isCorrect) obtainedMarks++;

                updatedAnswers.push({
                    questionId: question._id,
                    answer: userResponse.answer,
                    isCorrect
                });
            }
        });

        // ✅ Update Quiz Record
        quiz.obtainedMarks = obtainedMarks;
        quiz.userAnswers = updatedAnswers;
        quiz.isCompleted = true;
        await quiz.save();

        return successResponse(res, 'Quiz submitted successfully.', {
            obtainedMarks,
            totalQuestions: quiz.totalQuestions,
            percentage: ((obtainedMarks / quiz.totalQuestions) * 100).toFixed(2) + '%',
        });
    } catch (error) {
        console.error('❌ Error submitting quiz:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};
