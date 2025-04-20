const OpenAI = require("openai");
const config = require("../config/appConfig");
const QuizReport = require("../models/quizReportModel");
const Module = require("../models/moduleModel");
const Course = require("../models/courseModel");
const Quiz = require("../models/quizModel");
const UserRecommendation = require("../models/userRecommendationModel");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const { httpStatusCodes } = require("../utils/httpStatusCodes");

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: config.deepseekApi,
});
function shuffleArray(arr) {
  return arr.sort(() => 0.5 - Math.random());
}

exports.getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.userId;
    const days = parseInt(req.query.days) || 7;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const activities = [];

    // ✅ 1. Quiz Reports (Completed attempts)
    const quizReports = await QuizReport.find({
      userId,
      reportStatus: 'completed',
      generatedAt: { $gte: cutoffDate },
    })
      .sort({ generatedAt: -1 })
      .limit(10)
      .populate('quizId');

    const quizActivities = quizReports.map((report) => ({
      type: 'quiz',
      message: `You scored ${report.percentage}% in quiz "${report.quizId?.title || 'Untitled Quiz'}"`,
      createdAt: report.generatedAt,
    }));

    // ✅ 2. Recently created or completed Courses
    const recentCourses = await Course.find({
      userId,
      $or: [
        { createdAt: { $gte: cutoffDate } },
        { updatedAt: { $gte: cutoffDate }, courseStatus: 'completed' },
      ],
    });

    const courseActivities = [];

    for (const course of recentCourses) {
      if (course.createdAt >= cutoffDate) {
        courseActivities.push({
          type: 'course',
          message: `New course "${course.title}" created`,
          createdAt: course.createdAt,
        });
      }

      if (course.courseStatus === 'completed' && course.updatedAt >= cutoffDate) {
        courseActivities.push({
          type: 'course-completed',
          message: `Course "${course.title}" marked as completed`,
          createdAt: course.updatedAt || course.createdAt,
        });
      }
    }

    // ✅ 3. Recently created or completed Modules
    const recentModules = await Module.find({
      courseId: { $in: recentCourses.map(c => c._id) },
      $or: [
        { createdAt: { $gte: cutoffDate } },
        { isCompleted: true, updatedAt: { $gte: cutoffDate } },
      ],
    });

    const moduleActivities = [];

    for (const module of recentModules) {
      if (module.createdAt >= cutoffDate) {
        moduleActivities.push({
          type: 'module-created',
          message: `New module "${module.title}" created`,
          createdAt: module.createdAt,
        });
      }

      if (module.isCompleted && module.updatedAt >= cutoffDate) {
        moduleActivities.push({
          type: 'module-completed',
          message: `Completed module "${module.title}"`,
          createdAt: module.updatedAt || module.createdAt,
        });
      }
    }

    // ✅ Combine and shuffle final activities
    const finalActivities = [
      ...shuffleArray(quizActivities).slice(0, 2),
      ...shuffleArray(courseActivities).slice(0, 2),
      ...shuffleArray(moduleActivities).slice(0, 2),
    ];

    return successResponse(
      res,
      `Recent activities from the last ${days} day(s) retrieved successfully.`,
      shuffleArray(finalActivities)
    );
  } catch (error) {
    console.error('❌ Error fetching recent activities:', error);
    return errorResponse(res, 'Failed to fetch recent activities.', httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.userId;

    // ✅ Check cached version (optional: enable for production)
    const existing = await UserRecommendation.findOne({ userId });
    const now = new Date();
    if (existing && now - existing.generatedAt < 1000 * 60 * 60) {
      return successResponse(res, "Cached recommendations returned.", existing.recommendations);
    }

    // ✅ Fetch quiz reports (required to continue)
    const quizReports = await QuizReport.find({ userId, reportStatus: "completed" })
      .sort({ generatedAt: -1 })
      .limit(5)
      .populate("quizId");

    if (!quizReports || quizReports.length === 0) {
      return successResponse(res, "No quiz reports found. Recommendations not generated.", []);
    }

    const incompleteModules = await Module.find({ isCompleted: false });
    const activeCourses = await Course.find({ userId, courseStatus: { $ne: "completed" } });
    const allQuizzes = await Quiz.find().select("title");

    const quizInsights = quizReports.map(qr => ({
      quizTitle: qr.quizId?.title || "Unknown Quiz",
      score: qr.percentage,
      goodAt: qr.goodAt,
      weakAt: qr.weakestArea,
      courseName: qr.courseName,
      moduleName: qr.moduleName,
      quizId: qr.quizId?._id?.toString(),
    }));
    console.log(quizInsights)

    const prompt = `
You are a personal learning assistant.

Based on this user's activity, suggest 5-6 personalized study actions.

Recent quiz reports:
${JSON.stringify(quizInsights, null, 2)}

Incomplete modules:
${incompleteModules.map(m => m.title).join(", ")}

Ongoing courses:
${activeCourses.map(c => c.title).join(", ")}

Available quizzes:
${allQuizzes.map(q => q.title).join(", ")}

Return only this JSON format:
[
  {
    "type": "quiz" | "module" | "course",
    "message": "Personalized recommendation message",
    "referenceId": "Use ObjectId if available, else fallback to title"
  }
]
`;

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1800,
    });

    const content = response.choices[0].message.content.trim();
    const jsonStart = content.indexOf("[");
    const jsonEnd = content.lastIndexOf("]");
    const jsonStr = content.slice(jsonStart, jsonEnd + 1);

    const parsedRecommendations = JSON.parse(jsonStr);

    // ✅ Resolve titles to ObjectId
    const resolveReferenceIds = async (recs) => {
      const resolved = [];

      for (const rec of recs) {
        let objectId = null;

        if (rec.type === "module") {
          const mod = await Module.findOne({ title: rec.referenceId });
          objectId = mod?._id?.toString();
        } else if (rec.type === "quiz") {
          const quiz = await Quiz.findOne({ title: rec.referenceId });
          objectId = quiz?._id?.toString();
        } else if (rec.type === "course") {
          const course = await Course.findOne({ title: rec.referenceId });
          objectId = course?._id?.toString();
        }

        if (objectId) {
          resolved.push({
            type: rec.type,
            message: rec.message,
            referenceId: objectId,
          });
        }
      }

      return resolved;
    };

    const resolvedRecommendations = await resolveReferenceIds(parsedRecommendations);

    // ✅ Save to DB
    await UserRecommendation.findOneAndUpdate(
      { userId },
      {
        userId,
        recommendations: resolvedRecommendations,
        generatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return successResponse(res, "Recommendations generated successfully.", resolvedRecommendations);
  } catch (error) {
    console.error("❌ Error generating recommendations:", error);
    return errorResponse(res, "Failed to generate recommendations.", httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};