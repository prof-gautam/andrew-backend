const Material = require('../models/materialModel');
const Course = require('../models/courseModel');
const { uploadCourseMaterial } = require('../utils/s3MaterialHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const mongoose = require('mongoose');


exports.uploadMaterial = async (req, res) => {
    const { title, description, type, courseId } = req.body;
    const file = req.file;


    console.log("Received courseId:", req.body.courseId);

    // Validate input
    
    if (!type || !courseId) {
        return errorResponse(res, 'Type and course ID are required.', httpStatusCodes.BAD_REQUEST);
    }

    // Validate course existence
    const course = await Course.findOne({ _id: courseId, userId: req.user.userId });
    if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
    }

    // Use provided title/description or fallback to course title and empty description
    const materialTitle = title || course.title;
    const materialDescription = description || '';

    let fileUrl = null;
    
    // Handle file upload (if not a link)
    if (type !== 'link' && file) {
        try {
            fileUrl = await uploadCourseMaterial(file.buffer, courseId, file.originalname, file.mimetype);
        } catch (error) {
            return errorResponse(res, error.message, httpStatusCodes.BAD_REQUEST);
        }
    }

    // Create material record
    const material = await Material.create({ courseId, title: materialTitle, description: materialDescription, type, fileUrl });

    return successResponse(res, 'Material uploaded successfully.', material, httpStatusCodes.CREATED);
};

exports.getMaterialsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params; // ✅ Extract from URL params

        // ✅ Validate if courseId exists
        if (!courseId) {
            return errorResponse(res, 'Course ID is required.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Check if courseId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Query for the course with userId verification
        const course = await Course.findOne({ _id: courseId, userId: req.user.userId });
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Fetch materials for the course
        const materials = await Material.find({ courseId });

        return successResponse(res, 'Materials retrieved successfully.', materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

exports.getMaterialById = async (req, res) => {
    try {
        const { materialId } = req.params; // ✅ Extract from URL params

        // ✅ Validate if materialId exists
        if (!materialId) {
            return errorResponse(res, 'Material ID is required.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Check if materialId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            return errorResponse(res, 'Invalid Material ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Query for material
        const material = await Material.findById(materialId);
        if (!material) {
            return errorResponse(res, 'Material not found.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'Material retrieved successfully.', material);
    } catch (error) {
        console.error('Error fetching material:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

exports.deleteMaterial = async (req, res) => {
    try {
        const { materialId } = req.params; // ✅ Extract from URL params

        // ✅ Validate if materialId is provided
        if (!materialId) {
            return errorResponse(res, 'Material ID is required.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Check if materialId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            return errorResponse(res, 'Invalid Material ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Check if material exists
        const material = await Material.findById(materialId);
        if (!material) {
            return errorResponse(res, 'Material not found.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Check if the user owns the course associated with this material
        const course = await Course.findOne({ _id: material.courseId, userId: req.user.userId });
        if (!course) {
            return errorResponse(res, 'Unauthorized to delete this material.', httpStatusCodes.FORBIDDEN);
        }

        // ✅ Delete the material
        await Material.deleteOne({ _id: materialId });

        return successResponse(res, 'Material deleted successfully.');
    } catch (error) {
        console.error('Error deleting material:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};
