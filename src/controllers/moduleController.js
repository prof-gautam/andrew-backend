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
const updateModuleStatusIfDue = require('../utils/updateModuleStatusIfDue');
const mongoose = require('mongoose')
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
        You are an expert course curriculum designer.
        
        Based on the following extracted text, create structured learning modules with:
        - Title
        - Description
        - Key Learning Points (bullet points)
        - Timeline in days (integer value)
        
        Guidelines:
        - Distribute the course's total timeline of **${course.timeline} days** fairly across all modules.
        - Each module should have a reasonable timeline (at least a few days).
        - Ensure the timeline across all modules adds up to approximately ${course.timeline} days.
        - Keep modules logically coherent, balanced, and relevant to the provided content.
        
        Output Format (STRICT JSON ONLY):
        [
            {
                "title": "Module Title",
                "description": "Short summary of the module",
                "keyPoints": ["Point 1", "Point 2", "Point 3"],
                "timeline": 7
            }
        ]
        
        Constraints:
        - Maximum modules: 10
        - Strict JSON only. No explanations, markdown, or extra text outside JSON.
        - If timeline cannot divide perfectly, adjust by adding or removing 1-2 days to balance.
        
        --- START EXTRACTED TEXT ---
        ${extractedText}
        --- END EXTRACTED TEXT ---
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
        console.log(generatedModules);
        

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
                timeline: moduleData.timeline || 2
            });

            modules.push(newModule);
        }
        
        await Course.findByIdAndUpdate(courseId, {
            $pullAll: { unprocessedMaterials: unprocessedMaterials.map(m => m._id) },
            $push: {
              materials: { $each: unprocessedMaterials.map(m => m._id) },
              modules: { $each: modules.map(m => m._id) }
            },
            $set: {
              "learningSummary.totalModules": (course.learningSummary.totalModules || 0) + modules.length,
              "learningSummary.completedModules": 0,
              "learningSummary.firstIncompleteModule": modules.length > 0 ? modules[0].title : null,
              courseStatus: 'on-track'
            }
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

        const prompt = `
        You are an expert course curriculum designer.
        
        Based on the newly provided extracted material, generate additional structured learning modules with:
        - Title
        - Description
        - Key Learning Points (bullet points)
        - Timeline in days (integer value)
        
        Guidelines:
        - These modules should expand and complement the existing course structure.
        - Distribute a fair portion of the course's remaining timeline across these new modules.
        - Each module should have a reasonable timeline (at least a few days).
        - Timeline must reflect the depth and importance of the module content.
        
        Output Format (STRICT JSON ONLY):
        [
            {
                "title": "Module Title",
                "description": "Short summary of the module",
                "keyPoints": ["Point 1", "Point 2", "Point 3"],
                "timeline": 5
            }
        ]
        
        Constraints:
        - Maximum modules: 10
        - Strict JSON only. No explanations, markdown, or extra text outside JSON.
        - Timeline (in days) must be an integer.
        - Time must be based on need of module and while adding all time of modules it should be equal to course timeline.
        
        --- START NEW MATERIAL TEXT ---
        ${extractedText}
        --- END NEW MATERIAL TEXT ---
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
                timeline: moduleData.timeline
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

        let module = await Module.findById(moduleId).populate('materials quizzes');
        if (!module) {
          return errorResponse(res, 'Module not found.', httpStatusCodes.NOT_FOUND);
        }
        
        updateModuleStatusIfDue(module);
        if (module.isModified && module.moduleStatus === 'late') {
          await module.save(); // Save only if modified and status became 'late'
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
        let modules = await Module.find({ courseId }).sort({ order: 1 }).populate('materials quizzes');

        for (const module of modules) {
          updateModuleStatusIfDue(module);
          if (module.moduleStatus === 'late') {
            await module.save();
          }
        }
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

      for (const module of paginatedModules.data) {
        updateModuleStatusIfDue(module);
        if (module.moduleStatus === 'late') {
          await module.save();
        }
      }
      
  
      return successResponse(res, 'Modules for user retrieved successfully.', paginatedModules);
    } catch (error) {
      console.error('❌ Error fetching modules for user:', error);
      return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  };
  

  /**
 * @route PUT /api/v1/modules/:moduleId/mark-completed
 * @desc Mark a module as completed
 */
  exports.markModuleAsCompleted = async (req, res) => {
    try {
      const { moduleId } = req.params;
  
      // ✅ Validate Module ID
      if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        return errorResponse(res, 'Invalid Module ID format.', httpStatusCodes.BAD_REQUEST);
      }
  
      // ✅ Fetch Module
      const module = await Module.findById(moduleId);
      if (!module) {
        return errorResponse(res, 'Module not found.', httpStatusCodes.NOT_FOUND);
      }
  
      // ✅ Check if already completed
      if (module.moduleStatus === 'completed') {
        return errorResponse(res, 'Module is already marked as completed.', httpStatusCodes.BAD_REQUEST);
      }
  
      // ✅ Mark module as completed
      module.moduleStatus = 'completed';
      module.isCompleted = true;
      await module.save();
  
      // ✅ Update Course Learning Summary
      const course = await Course.findById(module.courseId).populate('modules');
  
      if (!course) {
        return errorResponse(res, 'Course not found.', httpStatusCodes.NOT_FOUND);
      }
  
      // 1. Increment completed modules
      course.learningSummary.completedModules = (course.learningSummary.completedModules || 0) + 1;
  
      // 2. Find the first incomplete module (ordered by `order`)
      const nextIncompleteModule = course.modules.find(m => !m.isCompleted);
      console.log(nextIncompleteModule);
      

      course.learningSummary.firstIncompleteModule = nextIncompleteModule ? nextIncompleteModule.title: null;  
      // 3. If all modules completed, optionally you can mark course as completed here if you want:
      // if (course.learningSummary.completedModules === course.learningSummary.totalModules) {
      //   course.courseStatus = 'completed';
      // }
  
      await course.save();
  
      return successResponse(res, 'Module marked as completed successfully.', module);
    } catch (error) {
      console.error('❌ Error marking module as completed:', error);
      return errorResponse(res, 'Internal server error.', httpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  };
  