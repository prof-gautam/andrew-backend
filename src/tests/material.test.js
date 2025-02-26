const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Course = require('../models/courseModel');
const Material = require('../models/materialModel');
const { generateToken } = require('../utils/jwtHelper');

let accessToken;
let userId;
let courseId;
let materialId;

// 🛠️ Setup Test User & Course
beforeAll(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Material.deleteMany({});

    // Create a test user
    const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        isEmailVerified: true
    });

    userId = user._id;
    accessToken = generateToken({ userId, role: 'student' }, '15m');

    // Create a test course
    const course = await Course.create({
        userId: userId,
        title: 'Test Course',
        description: 'Course for testing',
        timeline: '4 weeks',
        goal: 'Exam Preparation'
    });

    courseId = course._id;
});

// ✅ Test Upload Material
describe('POST /api/v1/materials', () => {
    it('should upload a material successfully', async () => {
        const res = await request(app)
            .post('/api/v1/materials')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                title: 'Lecture 1',
                description: 'Introduction to AI',
                type: 'pdf',
                courseId: courseId.toString()
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.status).toBe('success');
        materialId = res.body.data._id; // Store material ID for later tests
    });

    it('should prevent material upload if course is complete', async () => {
        await Course.findByIdAndUpdate(courseId, { materialUploadStatus: 'complete' });

        const res = await request(app)
            .post('/api/v1/materials')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                title: 'Lecture 2',
                description: 'Advanced AI',
                type: 'pdf',
                courseId: courseId.toString()
            });

        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toBe('This course has been marked as complete. New materials cannot be uploaded.');
    });
});

// ✅ Test Get All Materials by Course
describe('GET /api/v1/materials/:courseId', () => {
    it('should fetch all materials for a course', async () => {
        const res = await request(app)
            .get(`/api/v1/materials/${courseId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return 404 if course does not exist', async () => {
        const res = await request(app)
            .get('/api/v1/materials/65abcdef1234567890abcdef') // Invalid ObjectId
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(404);
    });
});

// ✅ Test Get Material by ID
describe('GET /api/v1/materials/material/:materialId', () => {
    it('should fetch a specific material', async () => {
        const res = await request(app)
            .get(`/api/v1/materials/material/${materialId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data._id).toBe(materialId.toString());
    });

    it('should return 404 if material does not exist', async () => {
        const res = await request(app)
            .get('/api/v1/materials/material/65abcdef1234567890abcdef') // Invalid ObjectId
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(404);
    });
});

// ✅ Test Delete Material
describe('DELETE /api/v1/materials/:materialId', () => {
    it('should delete a material successfully', async () => {
        const res = await request(app)
            .delete(`/api/v1/materials/${materialId}`)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.message).toBe('Material deleted successfully.');
    });

    it('should return 404 if material does not exist', async () => {
        const res = await request(app)
            .delete(`/api/v1/materials/${materialId}`) // Already deleted
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(404);
    });
});

// 🛠️ Cleanup after tests
afterAll(async () => {
    await User.deleteMany({});
    await Course.deleteMany({});
    await Material.deleteMany({});
    await mongoose.connection.close();
});
