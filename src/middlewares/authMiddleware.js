const jwt = require('jsonwebtoken');
const config = require('../config/appConfig');

// Middleware to protect private routes
module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Missing or invalid token.'
        });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            status: 'error',
            message: 'Forbidden: Invalid or expired token.'
        });
    }
};
