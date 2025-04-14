const mongoose = require("mongoose")

const Quiz = require("../models/quizModel")
const QuizReport = require("../models/quizReportModel")
const Course = require("../models/courseModel")
const Module = require("../models/moduleModel")
const OpenAI = require("openai")
const config = require("../config/appConfig")

const openai = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: config.deepseekApi,
})

exports.generateQuizReport = async (userId, quizId, attemptNumber) => {
  try {
    const quiz = await Quiz.findById(quizId).populate("moduleId")
    const module = quiz.moduleId
    const course = await Course.findById(module.courseId)

    const attempt = quiz.attempts.find(
      (a) => a.attemptNumber === attemptNumber && a.isCompleted
    )

    const correctAnswers = attempt.answers.filter((ans) => ans.isCorrect).length
    const incorrectAnswers = attempt.answers.length - correctAnswers
    const percentage = ((correctAnswers / quiz.totalQuestions) * 100).toFixed(2)

    const prompt = `
    You are an expert performance analyzer.
    
    Analyze this quiz result:
    - Correct: ${correctAnswers}
    - Incorrect: ${incorrectAnswers}
    - Total: ${quiz.totalQuestions}
    - Questions: ${JSON.stringify(quiz.questions, null, 2)}
    
    Find:
    - Strongest topic
    - Weakest topic
    - Good at (assume which is his/her good aspect)
    - Suggestions
    - Areas they struggled with
    
    Also suggest 2-3 study materials. These can be books, chapters, YouTube videos or online tutorials. Each should include:
    - title
    - short description
    - URL (realistic or helpful)
    
    Return JSON:
    {
      "strongestArea": "...",
      "weakestArea": "...",
      "goodAt": "...",
      "struggledWith": ["...", "..."],
      "aiSummary": "short AI summary of performance",
      "aiRecommendations": {
        "topics": [
          { "title": "Functions in JS", "description": "Struggled with function scope" },
          { "title": "Loops", "description": "Had difficulty in loop conditions" }
        ]
      },
      "studyMaterials": [
        {
          "title": "Introduction to Algorithms",
          "description": "Chapter 3 - Sorting and Searching",
          "url": "A valid url"
        },
        {
          "title": "YouTube Video - Graph Traversal Explained",
          "description": "Covers BFS and DFS with visuals",
          "url": "A valid url"
        }
      ]
    }
    `

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1800,
    })

    const raw = response.choices[0].message.content.trim()
    const jsonStart = raw.indexOf("{")
    const jsonEnd = raw.lastIndexOf("}")

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No valid JSON found in AI response")
    }

    const reportJson = raw.substring(jsonStart, jsonEnd + 1)
    const data = JSON.parse(reportJson)

    // 🧠 Format topics with unique ObjectIds
    const formattedTopics = Array.isArray(data.aiRecommendations?.topics)
      ? data.aiRecommendations.topics.map((t) => ({
          _id: new mongoose.Types.ObjectId(),
          title: t.title || "",
          description: t.description || "",
          isQuizGenerated: false,
          quizId: null,
        }))
      : []

    const trend = quiz.attempts
      .filter((a) => a.isCompleted)
      .map((a) => ({
        attemptNumber: a.attemptNumber,
        percentage: a.percentage,
      }))
      .sort((a, b) => a.attemptNumber - b.attemptNumber)

    const studyMaterials = Array.isArray(data.studyMaterials) ? data.studyMaterials : [];

    const report = await QuizReport.create({
      userId,
      quizId,
      moduleId: module._id,
      moduleName: module.title,
      courseName: course.title,
      attemptNumber,
      percentage,
      correctAnswers,
      incorrectAnswers,
      totalQuestions: quiz.totalQuestions,
      strongestArea: data.strongestArea,
      weakestArea: data.weakestArea,
      goodAt: data.goodAt,
      struggledWith: data.struggledWith || [],
      aiSummary: data.aiSummary,
      aiRecommendations: {
        topics: formattedTopics,
      },
      studyMaterials,
      trend,
      isQuizGenerated: false,
    })

    console.log("Quiz report generated with ID:", report._id)

    return {
      reportId: report._id,
      userId,
      quizId,
      moduleId: module._id,
    }
  } catch (err) {
    console.error("❌ Error generating quiz report:", err)
    return null
  }
}
