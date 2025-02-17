// 📂 src/controllers/userController.js
const User = require('../models/userModel');
const { uploadUserProfileImage } = require('../utils/s3Helper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');

// Update profile image and/or name
exports.updateUserProfile = async (req, res) => {
    const userId = req.user.userId;
    const { name } = req.body;
    const file = req.file;

    try {
        let updateFields = {};

        // Handle profile image upload
        if (file) {
            const fileUrl = await uploadUserProfileImage(file.buffer, userId, file.mimetype);
            updateFields.profileImage = fileUrl;
        }

        // Handle name update
        if (name) {
            updateFields.name = name;
        }

        if (Object.keys(updateFields).length === 0) {
            return errorResponse(res, 'No data provided for update.', httpStatusCodes.BAD_REQUEST);
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true, select: '-passwordHash' });

        if (!updatedUser) {
            return errorResponse(res, 'User not found.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'User profile updated successfully.', updatedUser);
    } catch (error) {
        return errorResponse(res, error.message, httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// Get user details
exports.getUserDetails = async (req, res) => {
    const userId = req.user.userId;

    try {
        const user = await User.findById(userId).select('-passwordHash');
        if (!user) {
            return errorResponse(res, 'User not found.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'User details retrieved successfully.', user);
    } catch (error) {
        return errorResponse(res, 'Failed to retrieve user details.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// Delete user
exports.deleteUser = async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return errorResponse(res, 'User not found.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'User deleted successfully.');
    } catch (error) {
        return errorResponse(res, 'Failed to delete user.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// Get all users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-passwordHash');
        return successResponse(res, 'Users retrieved successfully.', users);
    } catch (error) {
        return errorResponse(res, 'Failed to retrieve users.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};
