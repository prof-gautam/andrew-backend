// 📂 src/models/courseModel.js
const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 🔗 Links to User
    title: { type: String, required: true },
    description: { type: String, required: true },
    timeline: { type: String, required: true }, // e.g. "4 weeks"
    goal: { type: String, required: true }, // e.g. "Exam Preparation"
    materialUploadStatus: { type: String, enum: ['incomplete', 'complete'], default: 'incomplete' }, // 🚀 Prevents updates after completion
    materialCount: { type: Number, default: 0 }, // ✅ Tracks number of uploaded materials
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);
