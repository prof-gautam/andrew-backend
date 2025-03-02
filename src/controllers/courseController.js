const Course = require('../models/courseModel');
const Material = require('../models/materialModel');
const { uploadCourseMaterial } = require('../utils/s3MaterialHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const { paginateQuery } = require('../utils/paginationHelper');
const mongoose = require('mongoose');

/**
 * @route POST /api/v1/courses
 * @desc Create a new course with materials (PDF, audio, video, or link) and quiz configuration
 */
exports.createCourse = async (req, res) => {
    try {
        const { title, description, timeline, goal, quizConfig, materials } = req.body;
        const files = req.files; // ✅ Get uploaded files
        const parsedTimeline = Number(timeline); // Convert string to number

        if (isNaN(parsedTimeline)) {
            return errorResponse(res, 'Timeline must be a valid number.', httpStatusCodes.BAD_REQUEST);
        }


        // ✅ Validate input
        if (!title || !parsedTimeline || !quizConfig) {
            return errorResponse(res, 'Title, timeline and quiz configuration are required.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Parse `quizConfig`
        let parsedQuizConfig;
        try {
            parsedQuizConfig = JSON.parse(quizConfig);
        } catch (err) {
            return errorResponse(res, 'Invalid JSON format for quizConfig.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Validate `quizConfig`
        const validQuizTypes = ['MCQ', 'Open-ended', 'True/False', 'Coding Exercises'];
        const validDifficulties = ['Easy', 'Medium', 'Hard'];

        if (!Array.isArray(parsedQuizConfig.quizTypes) || parsedQuizConfig.quizTypes.length === 0) {
            return errorResponse(res, 'quizTypes must be a non-empty array.', httpStatusCodes.BAD_REQUEST);
        }

        if (!parsedQuizConfig.quizTypes.every(type => validQuizTypes.includes(type))) {
            return errorResponse(res, `Invalid quiz type. Allowed: ${validQuizTypes.join(', ')}`, httpStatusCodes.BAD_REQUEST);
        }

        if (!Number.isInteger(parsedQuizConfig.numberOfQuestions) || parsedQuizConfig.numberOfQuestions <= 0) {
            return errorResponse(res, 'numberOfQuestions must be a positive integer.', httpStatusCodes.BAD_REQUEST);
        }

        if (!validDifficulties.includes(parsedQuizConfig.difficultyLevel)) {
            return errorResponse(res, `Invalid difficulty level. Allowed: ${validDifficulties.join(', ')}`, httpStatusCodes.BAD_REQUEST);
        }

        if (typeof parsedQuizConfig.isTimed !== 'boolean') {
            return errorResponse(res, 'isTimed must be a boolean (true/false).', httpStatusCodes.BAD_REQUEST);
        }

        if (parsedQuizConfig.isTimed && (!Number.isInteger(parsedQuizConfig.timeDuration) || parsedQuizConfig.timeDuration <= 0)) {
            return errorResponse(res, 'timeDuration must be a positive integer if isTimed is true.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Create Course
        const course = await Course.create({
            userId: req.user.userId,
            title,
            description,
            timeline: parsedTimeline,
            goal,
            quizConfig: parsedQuizConfig
        });

        let materialList = [];

        // ✅ Handle File Uploads if Provided
        if (files && files.length > 0) {
            for (let file of files) {
                let type;
                
                // ✅ Determine file type based on MIME type
                if (file.mimetype.startsWith('application/pdf')) {
                    type = 'pdf';
                } else if (file.mimetype.startsWith('audio/')) {
                    type = 'audio';
                } else if (file.mimetype.startsWith('video/')) {
                    type = 'video';
                } else {
                    return errorResponse(res, `Invalid file type: ${file.mimetype}. Allowed: PDF, Audio, Video.`, httpStatusCodes.BAD_REQUEST);
                }

                const fileUrl = await uploadCourseMaterial(file.buffer, course._id, file.originalname, file.mimetype);

                const newMaterial = await Material.create({
                    courseId: course._id,
                    title: file.originalname,
                    type,
                    fileUrl
                });

                materialList.push(newMaterial);
            }

            // ✅ Update Material Count
            await Course.findByIdAndUpdate(course._id, {
                materialCount: materialList.length,
                materials: materialList.map(m => m._id)
            });
        }

        // ✅ Handle Link Materials
        if (materials) {
            const parsedMaterials = JSON.parse(materials);
            for (let material of parsedMaterials) {
                if (!material.type || material.type !== 'link' || !material.fileUrl) {
                    return errorResponse(res, 'Invalid link material. It must have type "link" and a valid URL.', httpStatusCodes.BAD_REQUEST);
                }

                const newMaterial = await Material.create({
                    courseId: course._id,
                    title: material.title || 'Untitled Link',
                    type: 'link',
                    fileUrl: material.fileUrl
                });

                materialList.push(newMaterial);
            }

            await Course.findByIdAndUpdate(course._id, {
                materialCount: materialList.length,
                materials: materialList.map(m => m._id)
            });
        }

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

        // ✅ Fetch course with materials
        const course = await Course.findById(courseId).populate('materials');
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
 * @desc Update a course (Restricted if materials are marked complete)
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

        if (course.materialUploadStatus === 'complete') {
            return errorResponse(res, 'This course has been marked as complete and cannot be updated.', httpStatusCodes.FORBIDDEN);
        }

        // ✅ Convert `timeline` to a Number
        const parsedTimeline = Number(timeline);
        if (timeline && (isNaN(parsedTimeline) || parsedTimeline <= 0)) {
            return errorResponse(res, 'Timeline must be a valid positive number.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Validate and parse `quizConfig` if provided
        let parsedQuizConfig = course.quizConfig;
        if (quizConfig) {
            try {
                parsedQuizConfig = JSON.parse(quizConfig);
            } catch (err) {
                return errorResponse(res, 'Invalid JSON format for quizConfig.', httpStatusCodes.BAD_REQUEST);
            }

            // ✅ Validate `quizConfig`
            const validQuizTypes = ['MCQ', 'Open-ended', 'True/False', 'Coding Exercises'];
            const validDifficulties = ['Easy', 'Medium', 'Hard'];

            if (!Array.isArray(parsedQuizConfig.quizTypes) || parsedQuizConfig.quizTypes.length === 0) {
                return errorResponse(res, 'quizTypes must be a non-empty array.', httpStatusCodes.BAD_REQUEST);
            }

            if (!parsedQuizConfig.quizTypes.every(type => validQuizTypes.includes(type))) {
                return errorResponse(res, `Invalid quiz type. Allowed: ${validQuizTypes.join(', ')}`, httpStatusCodes.BAD_REQUEST);
            }

            if (!Number.isInteger(parsedQuizConfig.numberOfQuestions) || parsedQuizConfig.numberOfQuestions <= 0) {
                return errorResponse(res, 'numberOfQuestions must be a positive integer.', httpStatusCodes.BAD_REQUEST);
            }

            if (!validDifficulties.includes(parsedQuizConfig.difficultyLevel)) {
                return errorResponse(res, `Invalid difficulty level. Allowed: ${validDifficulties.join(', ')}`, httpStatusCodes.BAD_REQUEST);
            }

            if (typeof parsedQuizConfig.isTimed !== 'boolean') {
                return errorResponse(res, 'isTimed must be a boolean (true/false).', httpStatusCodes.BAD_REQUEST);
            }

            if (parsedQuizConfig.isTimed && (!Number.isInteger(parsedQuizConfig.timeDuration) || parsedQuizConfig.timeDuration <= 0)) {
                return errorResponse(res, 'timeDuration must be a positive integer if isTimed is true.', httpStatusCodes.BAD_REQUEST);
            }
        }

        // ✅ Update course fields
        course.title = title || course.title;
        course.description = description || course.description;
        course.timeline = timeline ? parsedTimeline : course.timeline;
        course.goal = goal || course.goal;
        course.quizConfig = parsedQuizConfig || course.quizConfig;

        await course.save();
        return successResponse(res, 'Course updated successfully.', course);
    } catch (error) {
        console.error('Error updating course:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route DELETE /api/v1/courses/:courseId
 * @desc Delete a course (Allowed even if materials are complete)
 */
exports.deleteCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        const course = await Course.findOneAndDelete({ _id: courseId, userId: req.user.userId });
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Delete associated materials
        await Material.deleteMany({ courseId });

        return successResponse(res, 'Course and associated materials deleted successfully.');
    } catch (error) {
        console.error('Error deleting course:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};
