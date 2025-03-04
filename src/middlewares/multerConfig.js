const multer = require('multer');

const storage = multer.memoryStorage(); // Store files in memory for S3 upload

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'audio/', 'video/'];
        if (allowedTypes.some(type => file.mimetype.startsWith(type))) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, audio, and video files are allowed.'));
        }
    }
});

module.exports = upload;
