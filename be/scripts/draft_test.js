const sendEmail = require('../utils/emailHelper');

// Mock nodemailer to prevent actual sending but log the html
jest.mock('nodemailer');
const nodemailer = require('nodemailer');

const mockSendMail = jest.fn();
nodemailer.createTransport.mockReturnValue({
    sendMail: mockSendMail
});

const runTest = async () => {
    // 1. Test Welcome Email
    console.log("--- Testing Verification Email ---");
    await sendEmail({
        email: 'test@example.com',
        subject: 'Verify your email for BookStore',
        message: 'Hi John,\n\nPlease verify your email by clicking the link below:\n\nhttp://localhost:5173/verify-email/123456',
        ctaUrl: 'http://localhost:5173/verify-email/123456',
        ctaText: 'Verify Email'
    });

    const verificationCall = mockSendMail.mock.calls[0][0];
    console.log("Subject:", verificationCall.subject);
    console.log("HTML Preview:\n", verificationCall.html);

    // 2. Test Reset Password Email
    console.log("\n--- Testing Password Reset Email ---");
    await sendEmail({
        email: 'test@example.com',
        subject: 'Password Reset Request',
        message: 'You are receiving this email because you (or someone else) has requested the reset of a password.',
        ctaUrl: 'http://localhost:5173/reset-password/abcdef',
        ctaText: 'Reset Password'
    });

    const resetCall = mockSendMail.mock.calls[1][0];
    console.log("Subject:", resetCall.subject);
    console.log("HTML Preview:\n", resetCall.html);
};

// Simple mock runner since we might not have jest installed globally or configured for this script
// We need to bypass the jest part and just run the file manually by importing the helper.
// Actually, since I can't easily run jest in `run_command` without setup, I'll make a standalone script that doesn't rely on jest.
