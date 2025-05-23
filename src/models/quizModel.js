const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  title: { type: String, required: true },
  description: { type: String },
  questions: [
    {
      questionText: { type: String, required: true },
      options: [{ type: String }], // Only for MCQs & True/False
      correctAnswer: { type: String, required: true },
      questionType: {
        type: String,
        enum: ['MCQ', 'Open-ended', 'True/False', 'Coding'],
        required: true,
      },
    },
  ],
  totalQuestions: { type: Number, required: true },
  maxScore: { type: Number, required: true },
  timeLimit: { type: Number, default: null }, // In minutes
  attempts: [
    {
      attemptNumber: { type: Number, required: true },
      submittedAt: { type: Date, default: Date.now },
      obtainedMarks: { type: Number, default: 0 },
      percentage: { type: String }, // e.g. "80%"
      isCompleted: { type: Boolean, default: true },
      timeTaken: { type: Number, default: 0 }, // Time in seconds
      answers: [
        {
          questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
          answer: { type: String },
          isCorrect: { type: Boolean },
        },
      ],
    },
  ],
  gradingMethod: { type: String, enum: ['auto', 'manual'], default: 'auto' },

  quizConfig: {
    quizTypes: [{ type: String, enum: ['MCQ', 'Open-ended', 'True/False', 'Coding Exercises'] }],
    numberOfQuestions: { type: Number, default: 10 },
    difficultyLevel: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
    isTimed: { type: Boolean, default: false },
    timeDuration: { type: Number, default: 30 } // in minutes
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Quiz', quizSchema);
