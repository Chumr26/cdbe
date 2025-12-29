const nodemailer = require('nodemailer');
const sendEmail = require('../utils/emailHelper');

// Mock nodemailer.createTransport
nodemailer.createTransport = () => ({
    sendMail: async (message) => {
        console.log('\n--- Email Sent ---');
        console.log('To:', message.to);
        console.log('Subject:', message.subject);
        console.log('HTML (preview first 500 chars):');
        console.log(message.html.substring(0, 500) + '...');
        console.log('------------------\n');
        return { messageId: 'mock-id' };
    }
});

const runTest = async () => {
    // 1. Test Welcome Email
    console.log("Testing Verification Email...");
    await sendEmail({
        email: 'test@example.com',
        subject: 'Verify your email for BookStore',
        message: 'Hi John,\n\nPlease verify your email by clicking the link below:\n\nhttp://example.com/verify/123456',
        ctaUrl: 'http://example.com/verify/123456',
        ctaText: 'Verify Email'
    });

    // 2. Test Reset Password Email
    console.log("Testing Password Reset Email...");
    await sendEmail({
        email: 'test@example.com',
        subject: 'Password Reset Request',
        message: 'You are receiving this email because you (or someone else) has requested the reset of a password.',
        ctaUrl: 'http://example.com/reset/abcdef',
        ctaText: 'Reset Password'
    });
};

runTest().catch(console.error);
