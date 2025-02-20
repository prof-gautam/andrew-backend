// 📂 app.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(helmet());
app.use(morgan('dev'));

// Health Check Endpoint
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'I’m alive… but just like your hopes and dreams, it’s only a matter of time before I crash.',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});


// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/users', onboardingRoutes);

// Handle unknown routes
app.use('/api/v1/*', (req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found. Please check your request URL.'
    });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';
    console.error(`❌ [Error]: ${message}`);
    res.status(statusCode).json({
        status: 'error',
        message
    });
});

module.exports = app;
