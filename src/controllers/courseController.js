const Course = require('../models/courseModel');
const Material = require('../models/materialModel');
const { uploadCourseMaterial } = require('../utils/s3MaterialHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const { paginateQuery } = require('../utils/paginationHelper');
const mongoose = require('mongoose');
const { validateQuizConfig } = require('../utils/quizValidationHelper');


/**
 * @route POST /api/v1/courses
 * @desc Create a new course with optional materials & quiz configuration
 */
exports.createCourse = async (req, res) => {
    try {
        const { title, description, timeline, goal, quizConfig, materials } = req.body;
        const uploadedMaterials = req.files || [];
        const parsedTimeline = Number(timeline);

        if (!title || isNaN(parsedTimeline) || !quizConfig) {
            return errorResponse(res, 'Title, timeline, and quiz configuration are required.', httpStatusCodes.BAD_REQUEST);
        }

        let parsedQuizConfig;
        try {
            parsedQuizConfig = JSON.parse(quizConfig);
        } catch (err) {
            return errorResponse(res, 'Invalid JSON format for quizConfig.', httpStatusCodes.BAD_REQUEST);
        }

        const validQuizTypes = ['MCQ', 'Open-ended', 'True/False', 'Coding Exercises'];
        const validDifficulties = ['Easy', 'Medium', 'Hard'];

        if (!Array.isArray(parsedQuizConfig.quizTypes) || !parsedQuizConfig.quizTypes.every(type => validQuizTypes.includes(type))) {
            return errorResponse(res, `Invalid quiz type. Allowed: ${validQuizTypes.join(', ')}`, httpStatusCodes.BAD_REQUEST);
        }

        if (!validDifficulties.includes(parsedQuizConfig.difficultyLevel)) {
            return errorResponse(res, `Invalid difficulty level. Allowed: ${validDifficulties.join(', ')}`, httpStatusCodes.BAD_REQUEST);
        }

        const course = await Course.create({
            userId: req.user.userId,
            title,
            description,
            timeline: parsedTimeline,
            goal,
            quizConfig: parsedQuizConfig
        });

        let materialList = [];

        // Handle uploaded materials (PDF, audio, video)
        for (let file of uploadedMaterials) {
            let type = file.mimetype.startsWith('application/pdf') ? 'pdf' :
                       file.mimetype.startsWith('audio/') ? 'audio' :
                       file.mimetype.startsWith('video/') ? 'video' : null;

            if (!type) {
                return errorResponse(res, `Invalid file type: ${file.mimetype}. Allowed: PDF, Audio, Video.`, httpStatusCodes.BAD_REQUEST);
            }

            const fileUrl = await uploadCourseMaterial(file.buffer, course._id, file.originalname, file.mimetype);

            const newMaterial = await Material.create({
                courseId: course._id,
                title: req.body[`materialTitle_${file.originalname}`] || 'Untitled Material',
                description: req.body[`materialDescription_${file.originalname}`] || '',
                type,
                fileUrl
            });

            materialList.push(newMaterial);
        }

        // Handle external link materials
        if (materials) {
            let parsedMaterials;
            try {
                parsedMaterials = JSON.parse(materials);
            } catch (err) {
                return errorResponse(res, 'Invalid JSON format for materials.', httpStatusCodes.BAD_REQUEST);
            }

            for (let material of parsedMaterials) {
                if (!material.type || material.type !== 'link' || !material.fileUrl) {
                    return errorResponse(res, 'Invalid link material. It must have type "link" and a valid URL.', httpStatusCodes.BAD_REQUEST);
                }

                const newMaterial = await Material.create({
                    courseId: course._id,
                    title: material.title || 'Untitled Link',
                    description: material.description || '',
                    type: 'link',
                    fileUrl: material.fileUrl
                });

                materialList.push(newMaterial);
            }
        }

        await Course.findByIdAndUpdate(course._id, {
            materialCount: materialList.length,
            materials: materialList.map(m => m._id),
            unprocessedMaterials: materialList.map(m => m._id)
        });

        return successResponse(res, 'Course created successfully.', { course, materials: materialList }, httpStatusCodes.CREATED);
    } catch (error) {
        console.error('Error creating course:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route GET /api/v1/courses/:courseId
 * @desc Get course details including materials
 */
exports.getCourseById = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        const course = await Course.findById(courseId)
            .populate('materials')
            .populate('unprocessedMaterials');

        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'Course details retrieved successfully.', course);
    } catch (error) {
        console.error('Error fetching course:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route GET /api/v1/courses
 * @desc Get all courses with pagination and search
 */
exports.getAllCourses = async (req, res) => {
    try {
        const { search, page, limit } = req.query;
        const query = { userId: req.user.userId };

        if (search) {
            query.title = { $regex: search, $options: 'i' };
        }

        const paginatedCourses = await paginateQuery(Course, query, page, limit);
        return successResponse(res, 'Courses retrieved successfully.', paginatedCourses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route PUT /api/v1/courses/:courseId
 * @desc Update a course (Includes updating quiz configuration)
 */
exports.updateCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description, timeline, goal, quizConfig } = req.body;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Handle partial update of quizConfig
        if (quizConfig) {
            let parsedQuizConfig;

            try {
                parsedQuizConfig = typeof quizConfig === 'string' ? JSON.parse(quizConfig) : quizConfig;
            } catch (err) {
                return errorResponse(res, 'Invalid JSON format for quizConfig.', httpStatusCodes.BAD_REQUEST);
            }

            const validationErrors = validateQuizConfig(parsedQuizConfig);
            if (validationErrors.length > 0) {
                return errorResponse(res, validationErrors.join(' '), httpStatusCodes.BAD_REQUEST);
            }

            course.quizConfig = {
                ...course.quizConfig.toObject?.() || course.quizConfig,
                ...parsedQuizConfig
            };
        }

        // ✅ Handle other fields (if provided)
        if (title) course.title = title;
        if (description) course.description = description;
        if (timeline) course.timeline = Number(timeline);
        if (goal) course.goal = goal;

        await course.save();
        return successResponse(res, 'Course updated successfully.', course);
    } catch (error) {
        console.error('Error updating course:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};


/**
 * @route DELETE /api/v1/courses/:courseId
 * @desc Delete a course and its materials
 */
exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        const course = await Course.findByIdAndDelete(courseId);
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        await Material.deleteMany({ courseId });

        return successResponse(res, 'Course and associated materials deleted successfully.');
    } catch (error) {
        console.error('Error deleting course:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};
