// 📂 src/middlewares/restrictMaterialModification.js
const Course = require('../models/courseModel');
const { errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');

/**
 * Prevent uploading materials if the course is complete
 */
exports.preventUploadIfComplete = async (req, res, next) => {
    const { courseId } = req.body || req.params;


    if (!courseId) {
        return errorResponse(res, 'Course ID is required.', httpStatusCodes.BAD_REQUEST);
    }

    const course = await Course.findById(courseId);
    if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    if (course.materialUploadStatus === 'complete') {
        return errorResponse(res, 'This course has been marked as complete. New materials cannot be uploaded.', httpStatusCodes.FORBIDDEN);
    }
    next();
};

/**
 * Prevent updating course details if the course is complete
 */
exports.preventUpdateIfComplete = async (req, res, next) => {
    const { courseId } = req.params;

    if (!courseId) {
        return errorResponse(res, 'Course ID is required.', httpStatusCodes.BAD_REQUEST);
    }

    const course = await Course.findById(courseId);
    if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    if (course.materialUploadStatus === 'complete') {
        return errorResponse(res, 'This course has been marked as complete and cannot be updated.', httpStatusCodes.FORBIDDEN);
    }
    next();
};
