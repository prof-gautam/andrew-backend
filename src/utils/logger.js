// Logger utility for consistent and readable logs
const logger = (message, level = 'info') => {
    // Generate timestamp
    const timestamp = new Date().toISOString();
    // Print log message with timestamp and level
    console.log(`[${timestamp}] [${level.toUpperCase()}]: ${message}`);
};

module.exports = logger;



// Usage Example:

    // const logger = require('../utils/logger');
    // logger('Server started', 'info');
    // logger('Database connection failed', 'error');