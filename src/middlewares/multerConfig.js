const multer = require('multer');

// ✅ Use memory storage (for direct S3 uploads)
const storage = multer.memoryStorage();

// ✅ Remove file filtering to allow all file types
const upload = multer({ storage });

module.exports = upload;
