// Import necessary modules
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Token = require('../models/tokenModel');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes, messages } = require('../utils/httpStatusCodes');
const { validateEmail, validatePassword } = require('../utils/validators');
const { generateToken } = require('../utils/jwtHelper');
const { sendOTP, validateOTP } = require('../utils/emailHelper');
const config = require('../config/appConfig');
const OTP = require('../models/otpModel');

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
    const { email, otp } = req.body;

    // Validate request
    if (!email || !otp) {
        return errorResponse(res, 'Email and OTP are required.', httpStatusCodes.BAD_REQUEST);
    }

    // Check if OTP exists
    const otpRecord = await OTP.findOne({ email, otp, purpose: 'email_verification', isUsed: false });

    if (!otpRecord) {
        return errorResponse(res, 'Invalid or expired OTP.', httpStatusCodes.UNAUTHORIZED);
    }

    // ✅ Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // ✅ Mark email as verified
    await User.findOneAndUpdate({ email }, { isEmailVerified: true });

    return successResponse(res, 'Email verified successfully. You can now proceed to signup.');
};

// ✅ 3️⃣ Signup
exports.signup = async (req, res) => {
    const { email, name, password } = req.body;

    // Validate input
    if (!email || !name || !password) {
        return errorResponse(res, 'All fields are required.', httpStatusCodes.BAD_REQUEST);
    }

    // Check if email is verified
    const existingUser = await User.findOne({ email });

    if (existingUser && !existingUser.isEmailVerified) {
        return errorResponse(res, 'Email is not verified. Please verify OTP first.', httpStatusCodes.FORBIDDEN);
    }

    if (existingUser) {
        return errorResponse(res, 'Email already registered.', httpStatusCodes.CONFLICT);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
        email,
        name,
        passwordHash,
        isEmailVerified: true,  // ✅ Ensuring user is verified
        isFirstLogin: true      // ✅ Track first login
    });

    return successResponse(res, 'Signup successful.', { userId: newUser._id });
};

// ✅ 4️⃣ Login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate tokens (Include `tokenVersion`)
    const accessToken = jwt.sign(
        { userId: user._id, role: user.role, tokenVersion: user.tokenVersion }, 
        config.jwtSecret, 
        { expiresIn: '15d' }
    );

    const refreshToken = jwt.sign({ userId: user._id }, config.jwtSecret, { expiresIn: '30d' });

    // Remove old refresh tokens & store new one
    await Token.deleteMany({ userId: user._id });
    await Token.create({ userId: user._id, refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    return res.json({ accessToken, refreshToken, userId: user._id, isFirstLogin: user.isFirstLogin });
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
        console.log("🚨 Logout Error: Refresh token missing.");
        return res.status(400).json({ message: 'Refresh token missing.' });
    }

    // Find user by refresh token
    const tokenDoc = await Token.findOne({ refreshToken });
    if (!tokenDoc) {
        console.log("🚨 Logout Error: Invalid refresh token.");
        return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    // 🔥 1️⃣ Log Current `tokenVersion` Before Update
    const user = await User.findById(tokenDoc.userId);
    console.log(`🔹 Before Logout: User's tokenVersion = ${user.tokenVersion}`);

    // 🔥 2️⃣ Increase `tokenVersion` in the database
    await User.findByIdAndUpdate(tokenDoc.userId, { $inc: { tokenVersion: 1 } });

    // 🔥 3️⃣ Fetch Updated `tokenVersion`
    const updatedUser = await User.findById(tokenDoc.userId);
    console.log(`✅ After Logout: User's tokenVersion = ${updatedUser.tokenVersion}`);

    // 🔥 4️⃣ Delete all refresh tokens for this user
    await Token.deleteMany({ userId: tokenDoc.userId });

    return res.json({ message: 'Logout successful. All access tokens are now invalid.' });
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
