## Project Structure:

```
AndrewAI-LearningAssistant/
    ├── src/
    │   ├── config/               # Configuration files
    │   │   └── db.js               # Database configuration
    │   │   └── appConfig.js        # Application-wide config (environment variables)
    │   │   └── nodemailerConfig.js # Nodemailer configuration
    │   │   └── openaiConfig.js     # OpenAI API configuration
    │   │
    │   ├── controllers/          # Route controllers (business logic)
    │   │   └── authController.js    # Auth APIs controller
    │   │   └── userController.js    # User-related operations
    │   │   └── courseController.js  # Course management logic
    │   │   └── moduleController.js  # Module management logic
    │   │   └── quizController.js    # Quiz management logic
    │   │   └── chatController.js    # AI-powered chat controller
    │   │   └── analyticsController.js # Analytics and reporting controller
    │   │
    │   ├── middlewares/          # Custom middleware (e.g., auth, validation)
    │   │   └── authMiddleware.js    # JWT-based auth middleware
    │   │   └── errorMiddleware.js   # Global error handler
    │   │   └── roleMiddleware.js    # Role-based access control middleware
    │   │
    │   ├── models/               # Mongoose models (MongoDB)
    │   │   └── userModel.js         # User schema
    │   │   └── courseModel.js       # Course schema
    │   │   └── moduleModel.js       # Module schema
    │   │   └── quizModel.js         # Quiz schema
    │   │   └── materialModel.js     # Material schema
    │   │   └── chatHistoryModel.js  # Chat history schema
    │   │   └── progressTrackingModel.js # Progress tracking schema
    │   │   └── learningPathModel.js # Learning path schema
    │   │   └── notificationModel.js # Notification schema
    │   │   └── reminderModel.js     # Reminder schema
    │   │   └── restartModel.js      # Restart schema
    │   │   └── tokenModel.js        # Token management schema
    │   │   └── otpModel.js          # OTP schema for email verification
    │   │
    │   ├── routes/               # Route definitions
    │   │   └── authRoutes.js        # Auth-related routes
    │   │   └── userRoutes.js        # User management routes
    │   │   └── courseRoutes.js      # Course-related routes
    │   │   └── moduleRoutes.js      # Module-related routes
    │   │   └── quizRoutes.js        # Quiz-related routes
    │   │   └── chatRoutes.js        # AI chatbot routes
    │   │   └── analyticsRoutes.js   # Analytics and reporting routes
    │   │
    │   ├── services/            # Service layer (business logic)
    │   │   └── authService.js      # Auth-related service
    │   │   └── courseService.js    # Course-related service
    │   │   └── quizService.js      # Quiz-related service
    │   │   └── chatService.js      # Chat-related service
    │   │   └── analyticsService.js # Analytics-related service
    │   │   └── tokenService.js     # Token management service
    │   │
    │   ├── utils/               # Utility functions
    │   │   └── logger.js          # Logging utility
    │   │   └── jwtHelper.js       # JWT token handling
    │   │   └── responseHelper.js  # Standardized HTTP responses
    │   │   └── openaiHelper.js    # OpenAI integration
    │   │   └── emailHelper.js     # Nodemailer email handling
    │   │   └── httpStatusCodes.js # HTTP status codes and messages
    │   │   └── validators.js      # Input validators
    │   │
    │   └── app.js               # Main Express app configuration
    │
    ├── tests/                   # Unit and integration tests
    │   └── auth.test.js            # Auth API tests
    │   └── emailHelper.test.js     # Nodemailer utility tests
    │   └── course.test.js          # Course API tests
    │   └── module.test.js          # Module API tests
    │   └── quiz.test.js            # Quiz API tests
    │
    ├── .env                     # Environment variables
    ├── .gitignore               # Git ignore file
    ├── package.json             # Node.js project dependencies
    ├── README.md                # Project documentation
    └── server.js                # Entry point for the application

```
