const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Links to User
    title: { type: String, required: true },
    description: { type: String, required: true },
    timeline: { type: Number, required: true }, // must be a number
    goal: { type: String, required: true }, // e.g. "Exam Preparation"
    materialUploadStatus: { type: String, enum: ['incomplete', 'complete'], default: 'incomplete' }, 
    materialCount: { type: Number, default: 0 }, // ✅ Tracks number of uploaded materials
    materials: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material' }], // Store Material References

    quizConfig: {
        quizTypes: [{ type: String, enum: ['MCQ', 'Open-ended', 'True/False', 'Coding Exercises'] }],
        numberOfQuestions: { type: Number, default: 10 },
        difficultyLevel: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Easy' },
        isTimed: { type: Boolean, default: false },
        timeDuration: { type: Number, default: 30 } // In minutes, only applicable if isTimed=true
    },

    learningSummary: {
        totalModules: { type: Number, default: null },
        completedModules: { type: Number, default: 0 },
        firstIncompleteModule: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', default: null },
        courseGrade: { type: Number, min: 0, max: 100, default: null }, // Grade as a percentage
        daysLeft: { type: Number, default: null } // Number of days left for completion
    },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);




