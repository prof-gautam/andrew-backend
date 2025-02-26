const mongoose = require('mongoose');
const Course = require('../models/courseModel');
const { paginateQuery } = require('../utils/paginationHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');

exports.createCourse = async (req, res) => {
    const { title, description, timeline, goal } = req.body;

    if (!title || !description || !timeline || !goal) {
        return errorResponse(res, 'All fields are required.', httpStatusCodes.BAD_REQUEST);
    }

    const newCourse = await Course.create({
        userId: req.user.userId,
        title,
        description,
        timeline,
        goal
    });

    return successResponse(res, 'Course created successfully.', newCourse, httpStatusCodes.CREATED);
};

exports.getAllCourses = async (req, res) => {
    const { page, limit, search } = req.query;

    try {
        const query = {
            userId: req.user.userId,
            ...(search && { title: { $regex: search, $options: 'i' } })
        };

        const result = await paginateQuery(Course, query, page, limit);

        return successResponse(res, 'Courses retrieved successfully.', result);
    } catch (error) {
        return errorResponse(res, 'Failed to retrieve courses.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};


exports.getCourseById = async (req, res) => {
    const { courseId } = req.params;

    // ✅ Validate if courseId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return errorResponse(res, 'Invalid course ID format.', httpStatusCodes.BAD_REQUEST);
    }

    const course = await Course.findOne({ _id: courseId, userId: req.user.userId });

    if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    return successResponse(res, 'Course details retrieved successfully.', course);
};

exports.getCourseByName = async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return errorResponse(res, 'Course name is required.', httpStatusCodes.BAD_REQUEST);
    }

    const courses = await Course.find({
        userId: req.user.userId,
        title: { $regex: name, $options: 'i' } // Case-insensitive search
    });

    if (!courses.length) {
        return errorResponse(res, 'No courses found matching the name.', httpStatusCodes.NOT_FOUND);
    }

    return successResponse(res, 'Courses retrieved successfully.', courses);
};

exports.updateCourse = async (req, res) => {
    const { courseId } = req.params;
    const { title, description, timeline, goal } = req.body;

    const course = await Course.findOne({ _id: courseId, userId: req.user.userId });

    if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    if (course.materialUploadStatus === 'complete') {
        return errorResponse(res, 'Course cannot be updated after materials are uploaded.', httpStatusCodes.FORBIDDEN);
    }

    course.title = title || course.title;
    course.description = description || course.description;
    course.timeline = timeline || course.timeline;
    course.goal = goal || course.goal;

    await course.save();

    return successResponse(res, 'Course updated successfully.', course);
};

exports.deleteCourse = async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, userId: req.user.userId });

    if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    if (course.materialUploadStatus === 'complete') {
        return errorResponse(res, 'Course cannot be deleted after completion.', httpStatusCodes.FORBIDDEN);
    }

    await Course.deleteOne({ _id: courseId });

    return successResponse(res, 'Course deleted successfully.');
};

exports.completeCourseUpload = async (req, res) => {
    const { courseId } = req.params;

    const course = await Course.findOne({ _id: courseId, userId: req.user.userId });

    if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    if (course.materialUploadStatus === 'complete') {
        return errorResponse(res, 'Course is already marked as complete.', httpStatusCodes.BAD_REQUEST);
    }

    course.materialUploadStatus = 'complete';
    await course.save();

    return successResponse(res, 'Course marked as complete.', course);
};
