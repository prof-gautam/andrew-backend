const request = require('supertest');
const app = require('../app');

let accessToken = '';
let refreshToken = '';
let testEmail = 'testuser@example.com';
let testPassword = 'Password@123';
let otp = '123456';

describe('🔐 Auth API Tests', () => {

    // 📨 1️⃣ Request Email Verification
    test('POST /api/v1/auth/request-email-verification - Should send verification email', async () => {
        const res = await request(app)
            .post('/api/v1/auth/request-email-verification')
            .send({ email: testEmail });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
    });

    // ✅ 2️⃣ Verify Email
    test('POST /api/v1/auth/verify-email - Should verify email with OTP', async () => {
        const res = await request(app)
            .post('/api/v1/auth/verify-email')
            .send({ email: testEmail, verificationCode: otp });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
    });

    // 🧾 3️⃣ Signup
    test('POST /api/v1/auth/signup - Should create a new user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/signup')
            .send({
                email: testEmail,
                name: 'Test User',
                password: testPassword
            });
        
        expect(res.statusCode).toBe(201);
        expect(res.body.status).toBe('success');
    });

    // 🔑 4️⃣ Login
    test('POST /api/v1/auth/login - Should log in the user', async () => {
        const res = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testEmail,
                password: testPassword
            });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.userId).toBeDefined();

        accessToken = res.body.data.accessToken;
    });

    // 🔄 5️⃣ Refresh Token
    test('POST /api/v1/auth/refresh - Should refresh the access token', async () => {
        const res = await request(app)
            .post('/api/v1/auth/refresh')
            .send({ refreshToken });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.accessToken).toBeDefined();
    });

    // 🔑 6️⃣ Check Email Verification
    test('GET /api/v1/auth/check-email-verification - Should check email verification status', async () => {
        const res = await request(app)
            .get(`/api/v1/auth/check-email-verification?email=${testEmail}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
        expect(res.body.data.isEmailVerified).toBe(true);
    });

    // 🔓 7️⃣ Forgot Password
    test('POST /api/v1/auth/forgot-password - Should send password reset OTP', async () => {
        const res = await request(app)
            .post('/api/v1/auth/forgot-password')
            .send({ email: testEmail });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
    });

    // 🔢 8️⃣ Verify OTP
    test('POST /api/v1/auth/verify-otp - Should verify OTP', async () => {
        const res = await request(app)
            .post('/api/v1/auth/verify-otp')
            .send({
                email: testEmail,
                otp: otp,
                purpose: 'password_reset'
            });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
    });

    // 🔑 9️⃣ Reset Password
    test('POST /api/v1/auth/reset-password - Should reset password', async () => {
        const res = await request(app)
            .post('/api/v1/auth/reset-password')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                email: testEmail,
                newPassword: 'NewPassword@123',
                otp: otp
            });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
    });

    // 🚪 🔟 Logout
    test('POST /api/v1/auth/logout - Should log the user out', async () => {
        const res = await request(app)
            .post('/api/v1/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ refreshToken });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('success');
    });

});
