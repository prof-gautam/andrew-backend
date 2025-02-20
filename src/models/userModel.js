const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'student' }, // ✅ Role-based access
    isEmailVerified: { type: Boolean, default: false }, 
    profileImage: { type: String, default: '' }, // ✅ Stores S3 URL
    isFirstLogin: { type: Boolean, default: true }, // ✅ Efficient First Login Tracking
    createdAt: { type: Date, default: Date.now }
});

// 🔥 Indexing for faster queries
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
