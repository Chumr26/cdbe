const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth.middleware');
const { validateCoupon, listAvailableCoupons } = require('../controllers/coupon.controller');

const router = express.Router();

const validateCouponValidation = [
  body('code')
    .isString().withMessage('Coupon code must be a string')
    .trim()
    .isLength({ min: 1, max: 32 }).withMessage('Coupon code must be 1-32 characters')
];

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0]?.msg || 'Validation error',
      errors: errors.array()
    });
  }
  next();
}

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon validation
 */

/**
 * @swagger
 * /coupons/validate:
 *   post:
 *     summary: Validate coupon against current cart (preview)
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: WELCOME10
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/validate', protect, validateCouponValidation, handleValidationErrors, validateCoupon);

// List coupons applicable to the current cart (for selection UI)
router.get('/available', protect, listAvailableCoupons);

module.exports = router;
