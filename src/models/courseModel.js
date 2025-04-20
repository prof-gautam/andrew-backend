const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    timeline: { type: Number, required: true }, // Must be a number (weeks)
    goal: { type: String, required: true },

    materialCount: { type: Number, default: 0 },
    materials: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material' }],
    unprocessedMaterials: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material' }],
    modules: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Module' }],

    quizConfig: {
        quizTypes: [{ type: String, enum: ['MCQ', 'Open-ended', 'True/False', 'Coding Exercises'] }],
        numberOfQuestions: { type: Number, default: 10 },
        difficultyLevel: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
        isTimed: { type: Boolean, default: false },
        timeDuration: { type: Number, default: 30 } // in minutes
    },

    learningSummary: {
        totalModules: { type: Number, default: 0 },
        completedModules: { type: Number, default: 0 },
        firstIncompleteModule: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', default: null },
        courseGrade: { type: Number, min: 0, max: 100, default: null },
        daysLeft: { type: Number, default: null }
    },

    // ✅ New field: course status
    courseStatus: {
        type: String,
        enum: ['new', 'on-track', 'late', 'completed'],
        default: 'new'
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
