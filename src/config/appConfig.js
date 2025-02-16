// Load environment variables
require('dotenv').config();

module.exports = {
    // Server Config
    port: process.env.PORT || 5000,

    // JWT Config
    jwtSecret: process.env.JWT_SECRET || 'default_secret',

    // Database Config
    databaseUri: process.env.MONGO_URI,

    // OpenAI API Key
    openaiApiKey: process.env.OPENAI_API_KEY,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Email Config
    emailFromName: process.env.EMAIL_FROM_NAME,
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS,
    smtpHost: process.env.SMTP_HOST,
    smtpPort: parseInt(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,

    // OTP Config
    otpExpirationMinutes: parseInt(process.env.OTP_EXPIRATION_MINUTES) || 10
};
