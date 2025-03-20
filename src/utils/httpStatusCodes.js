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
    INTERNAL_SERVER_ERROR: "An unexpected error occurred.",
    INVALID_AUDIO_URL: "Invalid audio file URL.",
    TRANSCRIPTION_SUCCESS: "Transcription completed successfully.",
    NO_TRANSCRIPTION_FOUND: "No transcription results found.",
    TRANSCRIPTION_ERROR: "Error occurred while transcribing audio.",

    INVALID_PDF_URL: "Invalid PDF file URL.",
    PDF_EXTRACTION_SUCCESS: "PDF text extraction successful.",
    NO_TEXT_FOUND_IN_PDF: "No text found in the PDF.",
    PDF_EXTRACTION_ERROR: "Error occurred while extracting text from PDF.",

    INVALID_WEB_URL: "Invalid webpage URL.",
    WEBPAGE_EXTRACTION_SUCCESS: "Webpage text extraction successful.",
    NO_TEXT_FOUND_IN_WEBPAGE: "No relevant text found on the webpage.",
    WEBPAGE_EXTRACTION_ERROR: "Error occurred while extracting text from webpage.",
};

module.exports = { httpStatusCodes, messages };
