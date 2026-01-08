const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const generateEmailTemplate = ({ title, message, ctaUrl, ctaText }) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #4f46e5; padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
        .content { padding: 40px 30px; color: #333333; line-height: 1.6; }
        .content h2 { color: #1f2937; margin-top: 0; font-size: 20px; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; transition: background-color 0.3s; }
        .button:hover { background-color: #4338ca; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
        .footer p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BookStore</h1>
        </div>
        <div class="content">
            <h2>${title}</h2>
            <p>${message.replace(/\n/g, '<br>')}</p>
            ${ctaUrl ? `
            <div class="button-container">
                <a href="${ctaUrl}" class="button">${ctaText || 'Click Here'}</a>
            </div>
            ` : ''}
            <p style="margin-top: 20px; font-size: 14px; color: #666;">
                If you have checked this email and it was not intended for you, please ignore it.
            </p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} BookStore. All rights reserved.</p>
            <p>123 Book Street, Reading City, RC 12345</p>
        </div>
    </div>
</body>
</html>
    `;
};

const sendEmail = async (options) => {
    try {
        const htmlContent = options.html || generateEmailTemplate({
            title: options.subject,
            message: options.message,
            ctaUrl: options.ctaUrl,
            ctaText: options.ctaText
        });

        const emailData = {
            from: 'BookStore <noreply@bookstore.nguyenanhkhoa.me>',
            to: options.email,
            subject: options.subject,
            html: htmlContent,
        };

        const result = await resend.emails.send(emailData);
        
        console.log(`Email sent to: ${options.email}`);
        
        return result;
    } catch (error) {
        console.error('Email send failed:', error.message);
        throw error;
    }
};

module.exports = sendEmail;
