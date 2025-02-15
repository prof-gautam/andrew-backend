// Import jsonwebtoken for token management
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/appConfig');

// Generate JWT token with given payload and expiration
const generateToken = (payload, expiresIn = '1h') => {
    return jwt.sign(payload, jwtSecret, { expiresIn });
};

// Verify and decode JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, jwtSecret);
    } catch (error) {
        return null; // Return null if verification fails
    }
};

module.exports = { generateToken, verifyToken };


// Usage Example:
    // const { generateToken, verifyToken } = require('../utils/jwtHelper');

    // const token = generateToken({ userId: '1234', role: 'student' });
    // console.log('Generated Token:', token);

    // const decoded = verifyToken(token);
    // console.log('Decoded Token:', decoded);
