const { sendEmail } = require('../utils/emailHelper');

// Generate OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// In-memory OTP store
let otpMemoryStore = {};

(async () => {
    try {
        // Test generic email
        console.log('🚀 Sending generic email...');
        const genericEmail = await sendEmail('phuyelgautam3@gmail.com', 'Test Email', 'Hello from Andrew AI!');
        console.log('✅ Generic Email Sent:', genericEmail);

        // Generate OTP
        const otp = generateOTP();
        const email = 'phuyelgautam3@gmail.com';
        otpMemoryStore[email] = otp;

        // Send OTP email
        console.log('🔢 Sending OTP...');
        const otpText = `Your OTP code is: ${otp}. It will expire in 10 minutes.`;
        const otpEmail = await sendEmail(email, 'Your OTP Code', otpText);
        console.log('✅ OTP Email Sent:', otpEmail);

        // Simulate OTP validation
        console.log('🔍 Validating OTP...');
        const userProvidedOTP = otp; // simulate correct OTP
        const isValid = otpMemoryStore[email] === userProvidedOTP;
        console.log(`🔍 OTP Validation Result: ${isValid ? 'Valid ✅' : 'Invalid ❌'}`);

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
})();
