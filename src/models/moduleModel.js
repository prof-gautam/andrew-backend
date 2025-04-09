const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    keyPoints: [{ type: String }],
    order: { type: Number, required: true },
    materials: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material' }],
    quizzes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
    isCompleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Module', moduleSchema);

