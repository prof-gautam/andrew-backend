const Material = require('../models/materialModel');
const Course = require('../models/courseModel');
const { uploadCourseMaterial } = require('../utils/s3MaterialHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const mongoose = require('mongoose');

/**
 * @route POST /api/v1/materials
 * @desc Upload material (PDF, Audio, Video, or Link) for a course
 */
exports.uploadMaterial = async (req, res) => {
    try {
        const { title, description, type, courseId, fileUrl } = req.body;
        const file = req.file;

        // ✅ Validate input
        if (!type || !courseId) {
            return errorResponse(res, 'Type and Course ID are required.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Validate course existence and ownership
        const course = await Course.findOne({ _id: courseId, userId: req.user.userId });
        if (!course) {
            return errorResponse(res, 'Course not found or unauthorized.', httpStatusCodes.NOT_FOUND);
        }

        let materialType = type.toLowerCase();
        let uploadedFileUrl = fileUrl || null;

        // ✅ Handle file upload if not a link
        if (materialType !== 'link') {
            if (!file) {
                return errorResponse(res, 'File is required for non-link materials.', httpStatusCodes.BAD_REQUEST);
            }

            // ✅ Validate file type
            if (file.mimetype.startsWith('application/pdf')) {
                materialType = 'pdf';
            } else if (file.mimetype.startsWith('audio/')) {
                materialType = 'audio';
            } else if (file.mimetype.startsWith('video/')) {
                materialType = 'video';
            } else {
                return errorResponse(res, 'Invalid file type. Allowed: PDF, Audio, Video.', httpStatusCodes.BAD_REQUEST);
            }

            // ✅ Upload to S3
            try {
                uploadedFileUrl = await uploadCourseMaterial(file.buffer, courseId, file.originalname, file.mimetype);
            } catch (error) {
                return errorResponse(res, error.message, httpStatusCodes.BAD_REQUEST);
            }
        } else {
            // ✅ Validate link material
            if (!fileUrl) {
                return errorResponse(res, 'File URL is required for link materials.', httpStatusCodes.BAD_REQUEST);
            }
        }

        // ✅ Create material record
        const material = await Material.create({
            courseId,
            title: title || 'Untitled Material',
            description: description || '',
            type: materialType,
            fileUrl: uploadedFileUrl
        });

        // ✅ Update course material count
        await Course.findByIdAndUpdate(courseId, {
            $inc: { materialCount: 1 },
            $push: { materials: material._id }
        });

        return successResponse(res, 'Material uploaded successfully.', material, httpStatusCodes.CREATED);
    } catch (error) {
        console.error('Error uploading material:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route GET /api/v1/materials/:courseId
 * @desc Get all materials for a course
 */
exports.getMaterialsByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Validate course ownership
        const course = await Course.findOne({ _id: courseId, userId: req.user.userId });
        if (!course) {
            return errorResponse(res, 'Course not found or unauthorized.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Fetch materials
        const materials = await Material.find({ courseId });

        return successResponse(res, 'Materials retrieved successfully.', materials);
    } catch (error) {
        console.error('Error fetching materials:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route GET /api/v1/materials/material/:materialId
 * @desc Get a single material by ID
 */
exports.getMaterialById = async (req, res) => {
    try {
        const { materialId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(materialId)) {
            return errorResponse(res, 'Invalid Material ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Fetch material
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
/**
 * @route DELETE /api/v1/materials/:materialId
 * @desc Delete a material (Requires courseId, validates ownership)
 */
exports.deleteMaterial = async (req, res) => {
    try {
        const { materialId } = req.params;
        const { courseId } = req.body; // ✅ Course ID is now required

        // ✅ Validate if materialId and courseId are provided
        if (!materialId || !courseId) {
            return errorResponse(res, 'Material ID and Course ID are required.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Check if materialId and courseId are valid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(materialId) || !mongoose.Types.ObjectId.isValid(courseId)) {
            return errorResponse(res, 'Invalid Material ID or Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Check if the course exists and belongs to the user
        const course = await Course.findOne({ _id: courseId, userId: req.user.userId });
        if (!course) {
            return errorResponse(res, 'Course not found or unauthorized.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Check if the material belongs to the given course
        const material = await Material.findOne({ _id: materialId, courseId });
        if (!material) {
            return errorResponse(res, 'Material not found in the specified course.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Delete the material
        await Material.deleteOne({ _id: materialId });

        // ✅ Update course material count
        await Course.findByIdAndUpdate(courseId, {
            $inc: { materialCount: -1 },
            $pull: { materials: materialId }
        });

        return successResponse(res, 'Material deleted successfully.');
    } catch (error) {
        console.error('Error deleting material:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};