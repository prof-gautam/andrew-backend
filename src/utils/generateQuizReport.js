const mongoose = require("mongoose");

const Quiz = require("../models/quizModel");
const QuizReport = require("../models/quizReportModel");
const Course = require("../models/courseModel");
const Module = require("../models/moduleModel");
const OpenAI = require("openai");
const config = require("../config/appConfig");

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: config.deepseekApi,
});

exports.generateQuizReport = async (userId, quizId, attemptNumber) => {
  let reportDoc;

  try {
    const quiz = await Quiz.findById(quizId).populate("moduleId");
    if (!quiz) throw new Error("Quiz not found");

    const module = quiz.moduleId;
    const course = await Course.findById(module.courseId);

    const attempt = quiz.attempts.find(
      (a) => a.attemptNumber === attemptNumber && a.isCompleted
    );

    const correctAnswers = attempt.answers.filter((ans) => ans.isCorrect).length;
    const incorrectAnswers = attempt.answers.length - correctAnswers;
    const percentage = ((correctAnswers / quiz.totalQuestions) * 100).toFixed(2);

    // Step 1: Create initial report with status "pending"
    reportDoc = await QuizReport.create({
      userId,
      quizId,
      moduleId: module._id,
      moduleName: module.title,
      courseName: course.title,
      quizTitle: quiz.title,
      attemptNumber,
      percentage,
      correctAnswers,
      incorrectAnswers,
      totalQuestions: quiz.totalQuestions,
      trend: quiz.attempts
        .filter((a) => a.isCompleted)
        .map((a) => ({
          attemptNumber: a.attemptNumber,
          percentage: a.percentage,
        }))
        .sort((a, b) => a.attemptNumber - b.attemptNumber),
      reportStatus: "pending",
    });

    //AI Prompt
    const prompt = `
    You are an expert learning performance evaluator.
    
    Analyze this quiz:
    - Correct answers: ${correctAnswers}
    - Incorrect answers: ${incorrectAnswers}
    - Total questions: ${quiz.totalQuestions}
    - Question data: ${JSON.stringify(quiz.questions, null, 2)}
    
    Return a concise JSON:
    {
      "strongestArea": "One short topic name",
      "weakestArea": "One short topic name",
      "goodAt": "Short skill or trait",
      "struggledWith": ["Topic 1", "Topic 2"],
      "aiSummary": "Brief performance overview (max 10 words)",
      "aiRecommendations": {
        "topics": [
          { "title": "Topic name", "description": "Why it's weak" },
          { "title": "Another topic", "description": "Why it's weak" }
        ]
      },
      "studyMaterials": [
        {
          "title": "Resource title",
          "description": "What it teaches",
          "url": "https://..."
        },
        {
          "title": "Another resource",
          "description": "Short content summary",
          "url": "https://..."
        }
      ]
    }
    
    Rules:
    - All fields must be filled.
    - Keep each value under 10 words except aiRecommendations description.
    - Use real or realistic resource URLs.
    - No markdown or extra text, just JSON.
    `;
    

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1800,
    });

    const raw = response.choices[0].message.content.trim();
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("Invalid JSON format returned by AI");
    }

    const data = JSON.parse(raw.substring(jsonStart, jsonEnd + 1));

    const formattedTopics = Array.isArray(data.aiRecommendations?.topics)
      ? data.aiRecommendations.topics.map((t) => ({
          _id: new mongoose.Types.ObjectId(),
          title: t.title || "",
          description: t.description || "",
          isQuizGenerated: false,
          quizId: null,
        }))
      : [];

    const studyMaterials = Array.isArray(data.studyMaterials)
      ? data.studyMaterials
      : [];

    Object.assign(reportDoc, {
      strongestArea: data.strongestArea,
      weakestArea: data.weakestArea,
      goodAt: data.goodAt,
      struggledWith: data.struggledWith || [],
      aiSummary: data.aiSummary,
      aiRecommendations: {
        topics: formattedTopics,
      },
      studyMaterials,
      reportStatus: "completed",
    });

    await reportDoc.save();

    console.log("✅ Quiz report generated with ID:", reportDoc._id);

    return {
      reportId: reportDoc._id,
      userId,
      quizId,
      moduleId: module._id,
      quizTitle: quiz.title,

    };
  } catch (err) {
    console.error("❌ Error generating quiz report:", err);

    if (reportDoc) {
      reportDoc.reportStatus = "failed";
      await reportDoc.save();
    }

    return null;
  }
};
