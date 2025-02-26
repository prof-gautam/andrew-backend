// 📂 src/utils/s3MaterialHelper.js
const AWS = require('aws-sdk');
const config = require('../config/appConfig');

// Configure AWS S3
const s3 = new AWS.S3({
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
    region: config.awsRegion
});

// ✅ Allowed file types & max size
const allowedFileTypes = {
    pdf: 'application/pdf',
    audio: ['audio/mpeg', 'audio/wav'],
    video: ['video/mp4', 'video/mkv']
};
const maxFileSize = 10 * 1024 * 1024; // 10MB

/**
 * Upload course material file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} courseId - Course ID
 * @param {string} fileName - Name of the file
 * @param {string} contentType - MIME type of the file
 * @returns {string} - URL of the uploaded file
 */
exports.uploadCourseMaterial = async (fileBuffer, courseId, fileName, contentType) => {
    // Validate file type
    if (!Object.values(allowedFileTypes).flat().includes(contentType)) {
        throw new Error('Invalid file type. Allowed types: PDF, MP3, WAV, MP4, MKV.');
    }

    // Validate file size
    if (fileBuffer.length > maxFileSize) {
        throw new Error('File size exceeds the 10MB limit.');
    }

    const key = `course-materials/${courseId}/${fileName}`;

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType
    };

    try {
        const result = await s3.upload(params).promise();
        console.log(`✅ Course material uploaded: ${result.Location}`);
        return result.Location;
    } catch (error) {
        console.error('❌ S3 Upload Error (Course Material):', error);
        throw new Error('Failed to upload course material to S3');
    }
};
