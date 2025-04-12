// 📂 app.js
const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const courseRoutes = require('./routes/courseRoutes');
const materialRoutes = require('./routes/materialRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const quizRoutes = require('./routes/quizRoutes');
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
const allowedOrigins = [
    'https://andrew.gautamphuyal.com.np',
    'https://andrew-frontend-git-main-phuyelgautam3gmailcoms-projects.vercel.app',
    'https://andrew-frontend-pctqiww9h-phuyelgautam3gmailcoms-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:4000'
  ];
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  
  // Allow preflight
  app.options('*', cors());
  
app.options('*', cors());
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
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/materials', materialRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/quizzes', quizRoutes);

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
