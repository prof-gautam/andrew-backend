// Validate email format using regex
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Validate password: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
};

// Validate UUID format (version 4)
const validateUUID = (uuid) => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return uuidRegex.test(uuid);
};

// Validate a string is non-empty
const validateNonEmptyString = (str) => {
    return typeof str === 'string' && str.trim().length > 0;
};

module.exports = { validateEmail, validatePassword, validateUUID, validateNonEmptyString };