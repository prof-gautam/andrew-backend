// 📂 src/controllers/onboardingController.js
const Onboarding = require('../models/onboardingModel');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');

// ✅ 1️⃣ Submit Onboarding Data (First-time Setup)
exports.submitOnboarding = async (req, res) => {
    const userId = req.user.userId;
    const { userType, primaryGoals, preferredFormats, studyHoursPerWeek, enableReminders } = req.body;

    try {
        // Ensure onboarding is not already completed
        const existingOnboarding = await Onboarding.findOne({ userId });
        if (existingOnboarding?.isCompleted) {
            return errorResponse(res, 'Onboarding already completed.', httpStatusCodes.CONFLICT);
        }

        // Create or update onboarding data
        const onboarding = await Onboarding.findOneAndUpdate(
            { userId },
            {
                userType,
                primaryGoals,
                preferredFormats,
                studyHoursPerWeek,
                enableReminders,
                isCompleted: true  // ✅ Mark onboarding as completed
            },
            { upsert: true, new: true }
        );

        return successResponse(res, 'Onboarding completed successfully.', onboarding);
    } catch (error) {
        return errorResponse(res, 'Failed to submit onboarding data.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// ✅ 2️⃣ Get Onboarding Data
exports.getOnboarding = async (req, res) => {
    const userId = req.user.userId;

    try {
        const onboarding = await Onboarding.findOne({ userId });
        if (!onboarding) {
            return errorResponse(res, 'No onboarding data found for this user.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'Onboarding data retrieved successfully.', onboarding);
    } catch (error) {
        return errorResponse(res, 'Failed to retrieve onboarding data.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

// ✅ 3️⃣ Update Onboarding Data
exports.updateOnboarding = async (req, res) => {
    const userId = req.user.userId;
    const updateData = req.body;

    try {
        const onboarding = await Onboarding.findOneAndUpdate({ userId }, updateData, { new: true });
        if (!onboarding) {
            return errorResponse(res, 'No onboarding data found for this user.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'Onboarding data updated successfully.', onboarding);
    } catch (error) {
        return errorResponse(res, 'Failed to update onboarding data.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};
