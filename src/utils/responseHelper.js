// Import predefined HTTP status codes and messages
const { httpStatusCodes, messages } = require('./httpStatusCodes');

// Send success response
const successResponse = (res, message = messages.SUCCESS, data = {}, statusCode = httpStatusCodes.SUCCESS) => {
    return res.status(statusCode).json({
        status: 'success',
        message,
        data
    });
};

// Send error response
const errorResponse = (res, message = messages.INTERNAL_SERVER_ERROR, statusCode = httpStatusCodes.INTERNAL_SERVER_ERROR) => {
    return res.status(statusCode).json({
        status: 'error',
        message
    });
};

module.exports = { successResponse, errorResponse };


// const { successResponse, errorResponse } = require('../utils/responseHelper');

// // In controller:
// return successResponse(res, "User created successfully", { userId: "12345" });
// return errorResponse(res, "Invalid email address", 400);
