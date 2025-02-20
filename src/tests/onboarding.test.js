const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Onboarding = require('../models/onboardingModel');
const { generateToken } = require('../utils/jwtHelper');

let accessToken;
let userId;

// 🛠️ Setup Test User
beforeAll(async () => {
    await User.deleteMany({});
    await Onboarding.deleteMany({});

    const user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashedpassword123',
        isEmailVerified: true,
    });

    userId = user._id;
    accessToken = generateToken({ userId, role: 'student' }, '15m');
});

// ✅ Test Onboarding Submission
describe('POST /api/v1/users/me/onboarding', () => {
    it('should submit onboarding successfully', async () => {
        const res = await request(app)
            .post('/api/v1/users/me/onboarding')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                userType: 'Student',
                primaryGoals: ['Prepare for exams'],
                preferredFormats: ['Videos'],
                studyHoursPerWeek: 5,
                enableReminders: true
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body.status).toBe('success');
        expect(res.body.data.isCompleted).toBe(true);
    });
});

// ✅ Test Getting Onboarding Data
describe('GET /api/v1/users/me/onboarding', () => {
    it('should retrieve user onboarding data', async () => {
        const res = await request(app)
            .get('/api/v1/users/me/onboarding')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.userId).toEqual(userId.toString());
    });
});

// ✅ Test Updating Onboarding Data
describe('PUT /api/v1/users/me/onboarding', () => {
    it('should update onboarding data', async () => {
        const res = await request(app)
            .put('/api/v1/users/me/onboarding')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                studyHoursPerWeek: 10
            });

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.studyHoursPerWeek).toBe(10);
    });
});

// 🛠️ Cleanup after tests
afterAll(async () => {
    await User.deleteMany({});
    await Onboarding.deleteMany({});
    await mongoose.connection.close();
});
