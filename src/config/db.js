// Import mongoose for database connection
const mongoose = require('mongoose');

// Function to establish MongoDB connection
const connectDB = async () => {
    try {
        // Connect to the MongoDB database using the connection string from environment variables
        await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('✅ MongoDB connected successfully.');
    } catch (error) {
        // Log and exit if connection fails
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};

// Export the database connection function
module.exports = connectDB;
