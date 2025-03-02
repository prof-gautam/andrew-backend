const express = require('express');
const multer = require('multer');
const router = express.Router();
const materialController = require('../controllers/materialController');
const authMiddleware = require('../middlewares/authMiddleware');
const { preventUploadIfComplete } = require('../middlewares/restrictMaterialModification');

const upload = multer(); // ✅ Memory storage

// ✅ Upload Material (Single File)
router.post('/', authMiddleware, upload.single('file'), preventUploadIfComplete, materialController.uploadMaterial);

// ✅ Get Materials for a Course
router.get('/:courseId', authMiddleware, materialController.getMaterialsByCourse);

// ✅ Get Single Material
router.get('/material/:materialId', authMiddleware, materialController.getMaterialById);

// ✅ Delete Material
router.delete('/:materialId', authMiddleware, materialController.deleteMaterial);

module.exports = router;
