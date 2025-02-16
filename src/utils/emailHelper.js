const transporter = require('../config/nodemailerConfig');
const OTP = require('../models/otpModel');
const config = require('../config/appConfig');

// Generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send a generic email
const sendEmail = async (to, subject, text) => {
    try {
        const mailOptions = {
            from: `${config.emailFromName} <${config.emailFromAddress}>`,
            to,
            subject,
            text
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`📨 Email sent to ${to}: ${info.response}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send email:', error);
        throw new Error('Failed to send email.');
    }
};

// Send OTP Email
const sendOTP = async (email, purpose) => {
    const otp = generateOTP();

    const otpDoc = new OTP({
        email,
        otp,
        purpose
    });
    await otpDoc.save();

    const subject = '🔐 Your OTP Code';
    const text = `🔢 OTP: ${otp}\nThis code will expire in ${config.otpExpirationMinutes} minutes.`;

    return await sendEmail(email, subject, text);
};

// Validate OTP
const validateOTP = async (email, otp, purpose) => {
    const otpDoc = await OTP.findOne({ email, otp, purpose, isUsed: false });
    if (!otpDoc) return false;

    otpDoc.isUsed = true;
    await otpDoc.save();
    return true;
};

module.exports = { sendEmail, sendOTP, validateOTP };
