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
            questionType: { type: String, enum: ['MCQ', 'Open-ended', 'True/False', 'Coding'], required: true },
        }
    ],
    totalQuestions: { type: Number, required: true },
    maxScore: { type: Number, required: true }, // Total marks available
    timeLimit: { type: Number, default: null }, // Time in minutes
    isCompleted: { type: Boolean, default: false },
    obtainedMarks: { type: Number, default: 0 },
    userAnswers: [
        {
            questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
            answer: { type: String },
            isCorrect: { type: Boolean },
        }
    ],
    attempts: { type: Number, default: 0 },
    gradingMethod: { type: String, enum: ['auto', 'manual'], default: 'auto' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);
