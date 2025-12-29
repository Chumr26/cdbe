const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Create transporter using Gmail
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME || 'BookStore'} <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #333;">BookStore</h2>
            </div>
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px;">
                <h3 style="color: #444; margin-top: 0;">${options.subject}</h3>
                <p style="color: #555; line-height: 1.6;">${options.message.replace(/\n/g, '<br>')}</p>
                ${options.ctaUrl ? `
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${options.ctaUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">${options.ctaText || 'Click Here'}</a>
                </div>
                ` : ''}
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #888;">
                <p>&copy; ${new Date().getFullYear()} BookStore. All rights reserved.</p>
                <p>If you did not request this email, please ignore it.</p>
            </div>
        </div>
        `,
    };

    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
