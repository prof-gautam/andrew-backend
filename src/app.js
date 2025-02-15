const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
app.use(express.json());

// Simple GET API to check if the app is running
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'App is running smoothly!'
    });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
        status: 'error',
        message: err.message || 'Internal Server Error',
    });
});

module.exports = app;
