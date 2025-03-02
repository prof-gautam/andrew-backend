const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/appConfig');

/**
 * 🔐 Generate JWT Token
 * @param {Object} payload - Data to encode (e.g., userId, role)
 * @param {string} expiresIn - Expiration duration (e.g., '15m', '7d')
 * @returns {string} - Signed JWT token
 */
const generateToken = (payload, expiresIn = '150000d') => {
    try {
        return jwt.sign(payload, jwtSecret, { expiresIn });
    } catch (error) {
        console.error('❌ Error generating token:', error.message);
        throw new Error('Token generation failed.');
    }
};

/**
 * 🔍 Verify JWT Token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded payload if valid, else null
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, jwtSecret);
    } catch (error) {
        console.error('❌ Token verification failed:', error.message);
        return null;
    }
};

/**
 * 🛠️ Decode JWT Token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object|null} - Decoded payload if valid, else null
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        console.error('❌ Failed to decode token:', error.message);
        return null;
    }
};

module.exports = { generateToken, verifyToken, decodeToken };
