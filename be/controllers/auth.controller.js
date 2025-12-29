const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const User = require('../models/User.model');
const sendEmail = require('../utils/emailHelper');
const { sendTokenResponse } = require('../utils/tokenHelper');
const { generateRandomToken, hashToken } = require('../utils/cryptoHelper');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, phoneNumber } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
        return res.status(400).json({
            success: false,
            message: 'User already exists with this email'
        });
    }

    // Generate verification token
    const verificationToken = generateRandomToken();
    const verificationTokenHash = hashToken(verificationToken);

    // Create user
    const user = await User.create({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        emailVerificationToken: verificationTokenHash,
        isEmailVerified: false
    });

    // Create verification url
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${verificationToken}`;

    // Send verification email
    try {
        await sendEmail({
            email: user.email,
            subject: 'Verify your email for BookStore',
            message: `Hi ${user.firstName},\n\nPlease verify your email by clicking the link below:\n\n${verifyUrl}`,
            ctaUrl: verifyUrl,
            ctaText: 'Verify Email'
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your email to verify your account.'
        });
    } catch (error) {
        console.error('Email send failed:', error);
        // We could delete the user here if email fails, but let's keep it for now and maybe allow resending later
        res.status(201).json({
            success: true,
            message: 'Registration successful, but email could not be sent. Please contact support.'
        });
    }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide email and password'
        });
    }

    // Check for user (include password)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
        return res.status(401).json({
            success: false,
            message: 'Please verify your email before logging in'
        });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Send token response
    sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    res.status(200).json({
        success: true,
        data: user
    });
});

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'No user found with this email'
        });
    }

    // Generate reset token
    const resetToken = generateRandomToken();

    // Hash token and set to passwordResetToken field
    user.passwordResetToken = hashToken(resetToken);
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save({ validateBeforeSave: false });

    // Create reset url
    // Assuming frontend is running on port 5173 or configured via env
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password.`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Password Reset Request',
            message,
            ctaUrl: resetUrl,
            ctaText: 'Reset Password'
        });

        res.status(200).json({
            success: true,
            message: 'Email sent'
        });
    } catch (error) {
        console.error(error);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return res.status(500).json({
            success: false,
            message: 'Email could not be sent'
        });
    }
});

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:resetToken
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
    // Get hashed token
    const passwordResetToken = hashToken(req.params.resetToken);

    const user = await User.findOne({
        passwordResetToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }

    // Set new password
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
});

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(req.body.currentPassword);

    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Current password is incorrect'
        });
    }

    // Update password
    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
});

// @desc    Verify email
// @route   PUT /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res) => {
    const rawToken = req.params.token;
    const verificationTokenHash = hashToken(rawToken);

    console.log(`Verifying email. Raw token: ${rawToken}`);
    console.log(`Hashed token: ${verificationTokenHash}`);

    const user = await User.findOne({
        emailVerificationToken: verificationTokenHash
    });

    if (!user) {
        console.log('User not found with this token.');
        return res.status(400).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    console.log(`User ${user.email} verified successfully.`);
    sendTokenResponse(user, 200, res);
});
