const Course = require('../models/courseModel');
const Material = require('../models/materialModel');
const Quiz = require('../models/quizModel');
const Module = require('../models/moduleModel');
const { extractTextFromPDF, extractTextFromAudio, extractTextFromWebLink } = require('../utils/materialProcessingHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { httpStatusCodes } = require('../utils/httpStatusCodes');
const OpenAI = require('openai');
const config = require('../config/appConfig');
const {paginateQuery} = require('../utils/paginationHelper')
// ✅ Initialize DeepSeek API
const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: config.deepseekApi, // ✅ Using configured API key from appConfig
});

/**
 * Processes unprocessed materials & generates modules via DeepSeek
 * @route POST /api/v1/modules/generate/:courseId
 */
exports.generateModules = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Validate Course
        const course = await Course.findById(courseId).populate('unprocessedMaterials');
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        // ✅ Get Unprocessed Materials (PDF, Audio, WebLink)
        const unprocessedMaterials = course.unprocessedMaterials || [];
        if (unprocessedMaterials.length === 0) {
            return errorResponse(res, 'No unprocessed materials available to generate modules.', httpStatusCodes.BAD_REQUEST);
        }

        let extractedText = '';

        // ✅ Process each unprocessed material
        for (const material of unprocessedMaterials) {
            if (material.type === 'pdf') {
                const result = await extractTextFromPDF(material.fileUrl);
                if (result.status === httpStatusCodes.OK) {
                    extractedText += result.data + '\n\n';
                }
            } else if (material.type === 'audio') {
                const result = await extractTextFromAudio(material.fileUrl);
                if (result.status === httpStatusCodes.OK) {
                    extractedText += result.data + '\n\n';
                }
            } else if (material.type === 'link') {
                const result = await extractTextFromWebLink(material.fileUrl);
                if (result.status === httpStatusCodes.OK) {
                    extractedText += result.data + '\n\n';
                }
            }
        }

        if (!extractedText.trim()) {
            return errorResponse(res, 'Failed to extract text from materials.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Send extracted text to DeepSeek API
        const prompt = `
        Based on the following text, generate structured learning modules with:
        - Title
        - Description
        - Key Learning Points (as bullet points)
        
        Ensure the response is **strict JSON** format:
        [
            {
                "title": "Module Title",
                "description": "Short summary of the module",
                "keyPoints": ["Point 1", "Point 2", "Point 3"]
            }
        ]

        --- START TEXT ---
        ${extractedText}
        --- END TEXT ---
        `;

        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
        });

        let rawResponse = response.choices[0].message.content.trim();
        rawResponse = rawResponse.replace(/```json|```/g, "").trim();

        let generatedModules;
        try {
            generatedModules = JSON.parse(rawResponse);
        } catch (error) {
            return errorResponse(res, 'Invalid JSON response from DeepSeek.', httpStatusCodes.INTERNAL_SERVER_ERROR);
        }

        // ✅ Assign module order and save them in DB
        let modules = [];
        let currentOrder = (await Module.countDocuments({ courseId })) + 1;

        for (const moduleData of generatedModules) {
            const newModule = await Module.create({
                courseId,
                title: moduleData.title,
                description: moduleData.description,
                order: currentOrder++,
                keyPoints: moduleData.keyPoints || [],
                materials: unprocessedMaterials.map(m => m._id), // Link used materials
            });

            modules.push(newModule);
        }

        // ✅ Remove used materials from `unprocessedMaterials`
        await Course.findByIdAndUpdate(courseId, {
            $pullAll: { unprocessedMaterials: unprocessedMaterials.map(m => m._id) }, // Remove from unprocessedMaterials
            $push: { materials: { $each: unprocessedMaterials.map(m => m._id) } }, // Move to processed materials list
            $push: { modules: modules.map(m => m._id) }, // Link generated modules
            $set: { "learningSummary.totalModules": modules.length } // Update module count
        });

        return successResponse(res, 'Modules generated successfully.', { modules });
    } catch (error) {
        console.error('❌ Error generating modules:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route POST /api/v1/modules/update/:courseId
 * @desc Updates existing modules when new materials are added
 */
exports.updateModules = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Validate Course
        const course = await Course.findById(courseId).populate('unprocessedMaterials');
        if (!course) {
            return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
        }

        const newUnprocessedMaterials = course.unprocessedMaterials || [];
        if (newUnprocessedMaterials.length === 0) {
            return errorResponse(res, 'No new materials available for module update.', httpStatusCodes.BAD_REQUEST);
        }

        let extractedText = '';

        // ✅ Process each newly added material
        for (const material of newUnprocessedMaterials) {
            if (material.type === 'pdf') {
                const result = await extractTextFromPDF(material.fileUrl);
                if (result.status === httpStatusCodes.OK) {
                    extractedText += result.data + '\n\n';
                }
            } else if (material.type === 'audio') {
                const result = await extractTextFromAudio(material.fileUrl);
                if (result.status === httpStatusCodes.OK) {
                    extractedText += result.data + '\n\n';
                }
            } else if (material.type === 'link') {
                const result = await extractTextFromWebLink(material.fileUrl);
                if (result.status === httpStatusCodes.OK) {
                    extractedText += result.data + '\n\n';
                }
            }
        }

        if (!extractedText.trim()) {
            return errorResponse(res, 'Failed to extract text from new materials.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Send extracted text to DeepSeek API
        const prompt = `
        Based on the following text, generate additional structured learning modules with:
        - Title
        - Description
        - Key Learning Points (as bullet points)

        Ensure the response is **strict JSON** format:
        [
            {
                "title": "Module Title",
                "description": "Short summary of the module",
                "keyPoints": ["Point 1", "Point 2", "Point 3"]
            }
        ]

        --- START TEXT ---
        ${extractedText}
        --- END TEXT ---
        `;

        const response = await openai.chat.completions.create({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 2000,
        });

        let rawResponse = response.choices[0].message.content.trim();
        rawResponse = rawResponse.replace(/```json|```/g, "").trim();

        let generatedModules;
        try {
            generatedModules = JSON.parse(rawResponse);
        } catch (error) {
            return errorResponse(res, 'Invalid JSON response from DeepSeek.', httpStatusCodes.INTERNAL_SERVER_ERROR);
        }

        // ✅ Add new modules to the end of existing ones
        let modules = [];
        let lastOrder = (await Module.countDocuments({ courseId })) + 1;

        for (const moduleData of generatedModules) {
            const newModule = await Module.create({
                courseId,
                title: moduleData.title,
                description: moduleData.description,
                keyPoints: moduleData.keyPoints || [],
                order: lastOrder++,
                materials: newUnprocessedMaterials.map(m => m._id),
            });

            modules.push(newModule);
        }

        await Course.findByIdAndUpdate(courseId, {
            $pullAll: { unprocessedMaterials: newUnprocessedMaterials.map(m => m._id) },
            $push: { materials: { $each: newUnprocessedMaterials.map(m => m._id) } },
            $push: { modules: modules.map(m => m._id) }
        });

        return successResponse(res, 'Modules updated successfully.', { modules });
    } catch (error) {
        console.error('❌ Error updating modules:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

exports.getModuleById = async (req, res) => {
    try {
        const { moduleId } = req.params;

        // ✅ Validate Module ID
        if (!moduleId || !moduleId.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 'Invalid Module ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Fetch Module
        const module = await Module.findById(moduleId).populate('materials quizzes');
        if (!module) {
            return errorResponse(res, 'Module not found.', httpStatusCodes.NOT_FOUND);
        }

        return successResponse(res, 'Module retrieved successfully.', module);
    } catch (error) {
        console.error('❌ Error fetching module:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route GET /api/v1/modules/course/:courseId
 * @desc Get all modules for a course (ordered)
 */
exports.getAllModulesByCourse = async (req, res) => {
    try {
        const { courseId } = req.params;

        // ✅ Validate Course ID
        if (!courseId || !courseId.match(/^[0-9a-fA-F]{24}$/)) {
            return errorResponse(res, 'Invalid Course ID format.', httpStatusCodes.BAD_REQUEST);
        }

        // ✅ Fetch Modules for Course (Ordered)
        const modules = await Module.find({ courseId }).sort({ order: 1 }).populate('materials quizzes');

        return successResponse(res, 'Modules retrieved successfully.', { modules });
    } catch (error) {
        console.error('❌ Error fetching modules:', error);
        return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
};

/**
 * @route GET /api/v1/modules
 * @desc Get all modules across all courses (paginated)
 */
exports.getAllModules = async (req, res) => {
    try {
      const { page, limit, search } = req.query;
      const userId = req.user.userId;
  
      // Step 1: Find all courses created by the user
      const courses = await Course.find({ userId }).select('_id');
      const courseIds = courses.map(course => course._id);
  
      // Step 2: Build query for modules under those courses
      const query = { courseId: { $in: courseIds } };
      if (search) {
        query.title = { $regex: search, $options: 'i' };
      }
  
      // Step 3: Paginate modules
      const paginatedModules = await paginateQuery(Module, query, page, limit);
  
      return successResponse(res, 'Modules for user retrieved successfully.', paginatedModules);
    } catch (error) {
      console.error('❌ Error fetching modules for user:', error);
      return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  };
  