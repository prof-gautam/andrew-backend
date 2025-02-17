// 📂 src/utils/s3Helper.js
const AWS = require('aws-sdk');
const config = require('../config/appConfig');

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
    region: config.awsRegion
});

// Allowed image types for profile images
const allowedImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
const maxImageSize = 2 * 1024 * 1024; // 2 MB

/**
 * Upload user profile image to S3
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} userId - User ID
 * @param {string} contentType - MIME type of the image
 * @returns {string} - URL of the uploaded image
 */
exports.uploadUserProfileImage = async (fileBuffer, userId, contentType = 'image/jpeg') => {
    // Validate file type
    if (!allowedImageTypes.includes(contentType)) {
        throw new Error('Invalid image format. Allowed formats: JPEG, PNG, JPG, WEBP.');
    }

    // Validate file size
    if (fileBuffer.length > maxImageSize) {
        throw new Error('File size exceeds the 2MB limit.');
    }

    const fileName = `profile-images/${userId}.jpg`;

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType
    };

    try {
        const result = await s3.upload(params).promise();
        console.log(`✅ Profile image uploaded: ${result.Location}`);
        return result.Location;
    } catch (error) {
        console.error('❌ S3 Upload Error (Profile Image):', error);
        throw new Error('Failed to upload profile image to S3');
    }
};

/**
 * Upload course resource file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} courseId - Course ID
 * @param {string} fileName - Name of the file
 * @param {string} contentType - MIME type of the file
 * @returns {string} - URL of the uploaded file
 */
exports.uploadCourseResource = async (fileBuffer, courseId, fileName, contentType = 'application/octet-stream') => {
    const key = `course-resources/${courseId}/${fileName}`;

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
    };

    try {
        const result = await s3.upload(params).promise();
        console.log(`✅ Course resource uploaded: ${result.Location}`);
        return result.Location;
    } catch (error) {
        console.error('❌ S3 Upload Error (Course Resource):', error);
        throw new Error('Failed to upload course resource to S3');
    }
};
