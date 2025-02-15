// Import OpenAI axios instance
const openaiInstance = require('../config/openaiConfig');

// Function to generate content using OpenAI API
const generateModuleContent = async (prompt) => {
    try {
        const response = await openaiInstance.post('/completions', {
            model: 'text-davinci-003', // Model selection
            prompt, // Prompt provided
            max_tokens: 500 // Max tokens for response
        });
        // Return the generated content
        return response.data.choices[0].text;
    } catch (error) {
        // Throw a new error if request fails
        throw new Error('Failed to generate content via OpenAI');
    }
};

module.exports = { generateModuleContent };
