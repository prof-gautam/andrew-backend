// 📂 src/models/materialModel.js
const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }, // 🔗 Links to Course
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ['pdf', 'audio', 'video', 'link'], required: true },
    fileUrl: { type: String }, // Stores S3 URL if applicable
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Material', materialSchema);
