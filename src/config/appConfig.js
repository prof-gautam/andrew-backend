// Export application-wide configuration using environment variables
module.exports = {
    port: process.env.PORT || 5000,           // Application listening port
    jwtSecret: process.env.JWT_SECRET || 'default_secret', // JWT secret for token signing
    openaiApiKey: process.env.OPENAI_API_KEY, // OpenAI API key
    databaseUri: process.env.MONGO_URI,       // MongoDB connection string
    environment: process.env.NODE_ENV || 'development' // Application environment
};
