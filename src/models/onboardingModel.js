// 📂 src/models/onboardingModel.js
const mongoose = require('mongoose');

const onboardingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    userType: { type: String, enum: ['Student', 'Professional', 'Lifelong Learner'], required: true },
    primaryGoals: [{ type: String }],
    preferredFormats: [{ type: String }],
    studyHoursPerWeek: { type: Number, required: true },
    enableReminders: { type: Boolean, default: true },
    isCompleted: { type: Boolean, default: false }, // 🆕 Tracks onboarding completion
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Onboarding', onboardingSchema);
