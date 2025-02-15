// Centralized HTTP status codes and corresponding messages
const httpStatusCodes = {
    SUCCESS: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500
};

const messages = {
    SUCCESS: "Request was successful.",
    CREATED: "Resource created successfully.",
    BAD_REQUEST: "Invalid request parameters.",
    UNAUTHORIZED: "Authentication required.",
    FORBIDDEN: "You don't have permission to access this resource.",
    NOT_FOUND: "Resource not found.",
    CONFLICT: "Resource conflict detected.",
    UNPROCESSABLE_ENTITY: "Unprocessable request entity.",
    INTERNAL_SERVER_ERROR: "An unexpected error occurred."
};

module.exports = { httpStatusCodes, messages };
