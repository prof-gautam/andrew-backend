const Course = require('../models/courseModel');
const Material = require('../models/materialModel');
const { uploadCourseMaterial } = require('../utils/s3MaterialHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const { paginateQuery } = require('../utils/paginationHelper');
const mongoose = require('mongoose');
const { validateQuizConfig } = require('../utils/quizValidationHelper');
const Module = require('../models/moduleModel');
const Quiz = require('../models/quizModel');
const QuizReport = require('../models/quizReportModel');
const updateCourseStatusIfDue = require('../utils/updateCourseStatusIfDue')


/**
 * @route POST /api/v1/courses
 * @desc Create a new course with optional materials & quiz configuration
 */
exports.createCourse = async (req, res) => {
    try {
        const { title, description, timeline, goal, quizConfig, materials } = req.body;
        const uploadedMaterials = req.files || [];
        const parsedTimeline = Number(timeline);

        if (!title || isNaN(parsedTimeline) || !quizConfig || !goal) {
            return errorResponse(res, 'Title, timeline, goal, and quiz configuration are required.', httpStatusCodes.BAD_REQUEST);
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

        // Handle Mongoose validation error specifically
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return errorResponse(res, `Validation error: ${messages.join(', ')}`, httpStatusCodes.BAD_REQUEST);
        }

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
        updateCourseStatusIfDue(course);
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

        if (Array.isArray(paginatedCourses.data)) {
          paginatedCourses.data.forEach(updateCourseStatusIfDue);
        }
        
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

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        const course = await Course.findById(courseId);
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        const updates = req.body;
        console.log(req.body);

        

        // ✅ Handle quizConfig separately
        if (updates.quizConfig) {
            let parsedQuizConfig;

            try {
                parsedQuizConfig = typeof updates.quizConfig === 'string'
                    ? JSON.parse(updates.quizConfig)
                    : updates.quizConfig;
            } catch (err) {
                return errorResponse(res, 'Invalid JSON format for quizConfig.', httpStatusCodes.BAD_REQUEST);
            }

            console.log(parsedQuizConfig);
            
            const validationErrors = validateQuizConfig(parsedQuizConfig);
            console.log(validationErrors);
            
            if (validationErrors.length > 0) {
                return errorResponse(res, validationErrors.join(' '), httpStatusCodes.BAD_REQUEST);
            }

            // Merge existing quizConfig with new updates
            course.quizConfig = {
                ...(course.quizConfig?.toObject ? course.quizConfig.toObject() : course.quizConfig),
                ...parsedQuizConfig,
            };
        }

        // ✅ Update only provided fields
        if (updates.title !== undefined) course.title = updates.title;
        if (updates.description !== undefined) course.description = updates.description;
        if (updates.timeline !== undefined) course.timeline = Number(updates.timeline);
        if (updates.goal !== undefined) course.goal = updates.goal;

        await course.save();

        updateCourseStatusIfDue(course); // Update course status dynamically if needed

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

    // ✅ 1. Find and delete the course
    const course = await Course.findByIdAndDelete(courseId);
    if (!course) {
      return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    // ✅ 2. Delete associated materials
    await Material.deleteMany({ _id: { $in: course.materials } });

    // ✅ 3. Get all module IDs for this course
    const modules = await Module.find({ courseId });
    const moduleIds = modules.map(m => m._id);

    // ✅ 4. Get all quizzes under those modules
    const quizzes = await Quiz.find({ moduleId: { $in: moduleIds } });
    const quizIds = quizzes.map(q => q._id);

    // ✅ 5. Delete quizzes
    await Quiz.deleteMany({ _id: { $in: quizIds } });

    // ✅ 6. Delete quiz reports associated with those quizzes
    await QuizReport.deleteMany({ quizId: { $in: quizIds } });

    // ✅ 7. Finally, delete modules
    await Module.deleteMany({ courseId });

    return successResponse(res, 'Course and all associated data deleted successfully.');
  } catch (error) {
    console.error('❌ Error deleting course:', error);
    return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
  }
};

/**
 * @route PUT /api/v1/courses/:courseId/mark-completed
 * @desc Mark a course as completed
 */
exports.markCourseAsCompleted = async (req, res) => {
    try {
      const { courseId } = req.params;
  
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
      }
  
      const course = await Course.findById(courseId);
      if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
      }
  
      if (course.courseStatus === 'completed') {
        return errorResponse(res, 'Course is already marked as completed.', httpStatusCodes.BAD_REQUEST);
      }
  
      course.courseStatus = 'completed';
      await course.save();
  
      return successResponse(res, 'Course marked as completed successfully.', course);
    } catch (error) {
      console.error('❌ Error marking course as completed:', error);
      return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  };
  