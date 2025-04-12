const mongoose = require("mongoose");

const quizReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true },
  moduleName: { type: String },
  courseName: { type: String },
  attemptNumber: Number,
  percentage: Number,
  correctAnswers: Number,
  incorrectAnswers: Number,
  totalQuestions: Number,
  strongestArea: String,
  weakestArea: String,
  goodAt: String,
  struggledWith: [String],
  trend: [
    {
      attemptNumber: { type: Number, required: true },
      percentage: { type: String, required: true }
    }
  ],
  aiSummary: String,
  aiRecommendations: {
    topics: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, required: true }, // Unique topic ID
        isQuizGenerated: { type: Boolean, default: false }, // Optional global flag
        label: { type: String, required: true },                        // e.g. "Loops in JS"
        quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" }  // ✅ Optional: if a quiz is already generated
      }
    ]
  },
  isQuizGenerated: { type: Boolean, default: false }, // Optional global flag
  generatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("QuizReport", quizReportSchema);
