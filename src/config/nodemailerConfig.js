const nodemailer = require('nodemailer');
const config = require('./appConfig');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465, // true if using port 465 (SSL)
    requireTLS: true, // Force TLS
    auth: {
        user: config.smtpUser,
        pass: config.smtpPass
    }
});

// Verify SMTP connection
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection Failed:', error);
    } else {
        console.log('✅ SMTP Connection Successful');
    }
});

module.exports = transporter;
