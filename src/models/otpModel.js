const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    purpose: { type: String, required: true }, // 'email_verification' or 'password_reset'
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: process.env.OTP_EXPIRATION_MINUTES 
            ? parseInt(process.env.OTP_EXPIRATION_MINUTES) * 60 
            : 600 // Default to 10 minutes if not set in .env
    },
    isUsed: { type: Boolean, default: false }
});

module.exports = mongoose.model('OTP', otpSchema);
