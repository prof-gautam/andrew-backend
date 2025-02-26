const express = require('express');
const multer = require('multer');
const router = express.Router();
const materialController = require('../controllers/materialController');
const authMiddleware = require('../middlewares/authMiddleware');
const { preventUploadIfComplete } = require('../middlewares/restrictMaterialModification');

const upload = multer(); // Memory storage

router.post(
    '/',
    authMiddleware,
    upload.single('file'),
    preventUploadIfComplete,
    materialController.uploadMaterial
);

router.get('/:courseId', authMiddleware, materialController.getMaterialsByCourse);
router.get('/material/:materialId', authMiddleware, materialController.getMaterialById);
router.delete('/:materialId', authMiddleware, materialController.deleteMaterial);

module.exports = router;
