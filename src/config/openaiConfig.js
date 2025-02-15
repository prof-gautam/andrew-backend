// Import axios to handle HTTP requests
const axios = require('axios');

// Retrieve OpenAI API key from environment variables
const openaiApiKey = process.env.OPENAI_API_KEY;

// Create axios instance with default headers for OpenAI API
const openaiInstance = axios.create({
    baseURL: 'https://api.openai.com/v1', // Base URL for OpenAI API
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
    }
});

// Export the configured axios instance
module.exports = openaiInstance;
