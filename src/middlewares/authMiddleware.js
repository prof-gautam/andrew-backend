const jwt = require('jsonwebtoken');
const config = require('../config/appConfig');
const User = require('../models/userModel');

module.exports = async (req, res, next) => {
    console.log("🔥 Auth Middleware Triggered");  // ✅ Log when middleware runs

    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("🚨 Unauthorized: Missing or invalid token.");
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Missing or invalid token.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 🔥 Decode token (Does NOT verify yet)
        const decoded = jwt.verify(token, config.jwtSecret);
        console.log("🔹 Decoded Token:", decoded);  // ✅ Log token payload

        // 🔥 Find user in database
        const user = await User.findById(decoded.userId);
        if (!user) {
            console.log("🚨 Unauthorized: User not found.");
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: User not found.'
            });
        }

        // 🔥 Block access if `tokenVersion` does not match
        if (decoded.tokenVersion !== user.tokenVersion) {
            console.log("🚨 Access Denied: Token version mismatch.");
            return res.status(401).json({
                status: 'error',
                message: 'Access token expired. Please log in again.'
            });
        }

        console.log("✅ Token Valid. Access Granted."); // ✅ Log when access is allowed

        // ✅ Attach user info to request object
        req.user = decoded;
        next();
    } catch (error) {
        console.log("🚨 Forbidden: Invalid or expired token.");
        return res.status(403).json({
            status: 'error',
            message: 'Forbidden: Invalid or expired token.'
        });
    }
};
