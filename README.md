## Project Structure:

```
AndrewAI-LearningAssistant/
   ├── src/
    │   ├── config/            # Configuration files
    │   │   └── db.js
    │   │   └── appConfig.js
    │   │   └── openaiConfig.js
    │   │
    │   ├── controllers/       # Route controllers (business logic)
    │   │   └── authController.js
    │   │   └── userController.js
    │   │   └── courseController.js
    │   │   └── moduleController.js
    │   │   └── quizController.js
    │   │   └── chatController.js
    │   │   └── analyticsController.js
    │   │
    │   ├── middlewares/       # Custom middleware (e.g., auth, validation)
    │   │   └── authMiddleware.js
    │   │   └── errorMiddleware.js
    │   │   └── roleMiddleware.js
    │   │
    │   ├── models/            # Mongoose models (MongoDB)
    │   │   └── userModel.js
    │   │   └── courseModel.js
    │   │   └── moduleModel.js
    │   │   └── quizModel.js
    │   │   └── materialModel.js
    │   │   └── chatHistoryModel.js
    │   │   └── progressTrackingModel.js
    │   │   └── learningPathModel.js
    │   │   └── notificationModel.js
    │   │   └── reminderModel.js
    │   │   └── restartModel.js
    │   │
    │   ├── routes/            # Route definitions
    │   │   └── authRoutes.js
    │   │   └── userRoutes.js
    │   │   └── courseRoutes.js
    │   │   └── moduleRoutes.js
    │   │   └── quizRoutes.js
    │   │   └── chatRoutes.js
    │   │   └── analyticsRoutes.js
    │   │
    │   ├── services/          # Service layer (business logic)
    │   │   └── authService.js
    │   │   └── courseService.js
    │   │   └── quizService.js
    │   │   └── chatService.js
    │   │   └── analyticsService.js
    │   │
    │   ├── utils/             # Utility functions
    │   │   └── logger.js         # Logging functionality
    │   │   └── jwtHelper.js      # JWT token handling
    │   │   └── responseHelper.js # Standardized responses
    │   │   └── openaiHelper.js   # OpenAI integration
    │   │   └── httpStatusCodes.js # HTTP status codes
    │   │   └── validators.js    # Input validators
    │   │
    │   └── app.js             # Main Express app configuration
    │
    ├── tests/                 # Unit and integration tests
    │   └── auth.test.js
    │   └── course.test.js
    │   └── module.test.js
    │   └── quiz.test.js
    │
    ├── .env                   # Environment variables
    ├── .gitignore             # Git ignore file
    ├── package.json            # Node.js project dependencies
    ├── README.md               # Project documentation
    └── server.js               # Entry point for the application 

```
