const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: parseInt(process.env.OTP_EXPIRATION_MINUTES) * 60 },
    isUsed: { type: Boolean, default: false },
    purpose: { type: String, required: true } // e.g., 'email_verification', 'password_reset'
});

module.exports = mongoose.model('OTP', otpSchema);
