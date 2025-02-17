// Import necessary modules
const bcrypt = require('bcrypt');
const User = require('../models/userModel');
const Token = require('../models/tokenModel');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes, messages } = require('../utils/httpStatusCodes');
const { validateEmail, validatePassword } = require('../utils/validators');
const { generateToken } = require('../utils/jwtHelper');
const { sendOTP, validateOTP } = require('../utils/emailHelper');
const config = require('../config/appConfig');

// ✅ 1️⃣ Request Email Verification
exports.requestEmailVerification = async (req, res) => {
    const { email } = req.body;

    if (!validateEmail(email)) {
        return errorResponse(res, 'Invalid email address.', httpStatusCodes.BAD_REQUEST);
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return errorResponse(res, 'Email already registered.', httpStatusCodes.CONFLICT);
    }

    // Send OTP for email verification
    const otpSent = await sendOTP(email, 'email_verification');
    if (!otpSent) {
        return errorResponse(res, 'Failed to send verification email.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    return successResponse(res, 'Verification email sent successfully.');
};

// ✅ 2️⃣ Verify Email
exports.verifyEmail = async (req, res) => {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
        return errorResponse(res, 'Email and verification code are required.', httpStatusCodes.BAD_REQUEST);
    }

    const isValid = await validateOTP(email, verificationCode, 'email_verification');
    if (!isValid) {
        return errorResponse(res, 'Invalid or expired verification code.', httpStatusCodes.BAD_REQUEST);
    }

    return successResponse(res, 'Email verified successfully.');
};

// ✅ 3️⃣ Signup
exports.signup = async (req, res) => {
    const { email, name, password } = req.body;

    if (!validateEmail(email) || !validatePassword(password)) {
        return errorResponse(res, 'Invalid email or password.', httpStatusCodes.BAD_REQUEST);
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return errorResponse(res, 'Email already exists.', httpStatusCodes.CONFLICT);
    }

    // Hash password and create user
    const passwordHash = await bcrypt.hash(password, config.saltRounds || 10);
    const newUser = new User({ email, name, passwordHash, isEmailVerified: true });
    await newUser.save();

    return successResponse(res, 'Signup successful.', { userId: newUser._id }, httpStatusCodes.CREATED);
};

// ✅ 4️⃣ Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
        return errorResponse(res, 'Invalid email or password.', httpStatusCodes.UNAUTHORIZED);
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
        return errorResponse(res, 'Invalid email or password.', httpStatusCodes.UNAUTHORIZED);
    }

    // Generate tokens
    const accessToken = generateToken({ userId: user._id, role: user.role }, '15m');
    const refreshToken = generateToken({ userId: user._id }, '7d');

    // Save refresh token in DB
    await Token.create({
        userId: user._id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Set refresh token as a secure cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return successResponse(res, 'Login successful.', { accessToken, userId: user._id });
};

// ✅ 5️⃣ Refresh Token
exports.refreshToken = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return errorResponse(res, 'Refresh token missing.', httpStatusCodes.BAD_REQUEST);
    }

    // Check if refresh token exists
    const tokenDoc = await Token.findOne({ refreshToken });
    if (!tokenDoc) {
        return errorResponse(res, 'Invalid or expired refresh token.', httpStatusCodes.UNAUTHORIZED);
    }

    // Generate new access token
    const newAccessToken = generateToken({ userId: tokenDoc.userId }, '15m');

    return successResponse(res, 'Access token refreshed successfully.', { accessToken: newAccessToken });
};

// ✅ 6️⃣ Logout (Protected)
exports.logout = async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return errorResponse(res, 'Refresh token missing.', httpStatusCodes.BAD_REQUEST);
    }

    // // Remove refresh token from DB
    // await Token.deleteOne({ refreshToken });
    // res.clearCookie('refreshToken');

    return successResponse(res, 'Logout successful.');
};

// ✅ 7️⃣ Forgot Password
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return errorResponse(res, 'Email is required.', httpStatusCodes.BAD_REQUEST);
    }

    const user = await User.findOne({ email });
    if (!user) {
        return errorResponse(res, 'User not found.', httpStatusCodes.NOT_FOUND);
    }

    // Send OTP for password reset
    const otpSent = await sendOTP(email, 'password_reset');
    if (!otpSent) {
        return errorResponse(res, 'Failed to send password reset instructions.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }

    return successResponse(res, 'Password reset instructions sent successfully.');
};

// // ✅ 8️⃣ Verify OTP
// exports.verifyOTP = async (req, res) => {
//     const { email, otp, purpose } = req.body;

//     if (!email || !otp || !purpose) {
//         return errorResponse(res, 'Email, OTP, and purpose are required.', httpStatusCodes.BAD_REQUEST);
//     }

//     const isValid = await validateOTP(email, otp, purpose);
//     if (!isValid) {
//         return errorResponse(res, 'Invalid or expired OTP.', httpStatusCodes.BAD_REQUEST);
//     }

//     return successResponse(res, 'OTP verified successfully.');
// };

// ✅ 9️⃣ Reset Password
exports.resetPassword = async (req, res) => {
    const { email, newPassword, otp } = req.body;

    if (!email || !newPassword || !otp) {
        return errorResponse(res, 'Email, new password, and OTP are required.', httpStatusCodes.BAD_REQUEST);
    }

    // Validate OTP
    const isValid = await validateOTP(email, otp, 'password_reset');
    if (!isValid) {
        return errorResponse(res, 'Invalid or expired OTP.', httpStatusCodes.BAD_REQUEST);
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, config.saltRounds || 10);
    const user = await User.findOneAndUpdate({ email }, { passwordHash }, { new: true });

    if (!user) {
        return errorResponse(res, 'User not found.', httpStatusCodes.NOT_FOUND);
    }

    // Invalidate all refresh tokens after password reset
    await Token.deleteMany({ userId: user._id });

    return successResponse(res, 'Password reset successfully.');
};

// ✅ 🔍 1️⃣0️⃣ Check Email Verification
exports.checkEmailVerification = async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return errorResponse(res, 'Email query parameter is required.', httpStatusCodes.BAD_REQUEST);
    }

    const user = await User.findOne({ email });
    if (!user) {
        return errorResponse(res, 'User not found.', httpStatusCodes.NOT_FOUND);
    }

    return successResponse(res, 'Email verification status retrieved.', {
        email,
        isEmailVerified: user.isEmailVerified
    });
};
