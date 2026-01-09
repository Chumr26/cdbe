const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart.model');
const Coupon = require('../models/Coupon.model');
const { normalizeCouponCode, recalculateCartTotals, validateCouponForCart } = require('../utils/couponPricing');

// @desc    Validate coupon against current cart (preview)
// @route   POST /api/coupons/validate
// @access  Private
exports.validateCoupon = asyncHandler(async (req, res) => {
  const code = normalizeCouponCode(req.body.code);

  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Coupon code is required'
    });
  }

  let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] });
  }

  // In-memory preview: don't persist coupon to cart
  const previewCart = cart.toObject({ virtuals: false });
  previewCart.coupon = { code };

  const { cart: recalculated, couponResult } = await recalculateCartTotals(previewCart, req.user.id);

  if (couponResult && couponResult.applied === false) {
    return res.status(200).json({
      success: true,
      data: {
        valid: false,
        reason: couponResult.reason || 'Coupon is not valid',
        preview: {
          subtotal: recalculated.subtotal,
          discountTotal: recalculated.discountTotal,
          total: recalculated.total
        }
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      valid: true,
      preview: {
        subtotal: recalculated.subtotal,
        discountTotal: recalculated.discountTotal,
        total: recalculated.total
      }
    }
  });
});

// @desc    List coupons available for current cart
// @route   GET /api/coupons/available
// @access  Private
exports.listAvailableCoupons = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');
  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] });
    cart = await Cart.findById(cart._id).populate('items.productId');
  }

  const items = cart.items || [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

  const candidates = await Coupon.find({ isActive: true }).sort({ createdAt: -1 });

  const available = [];
  for (const coupon of candidates) {
    const validation = await validateCouponForCart({
      coupon,
      userId: req.user.id,
      cartSubtotal: subtotal,
      cartItems: items
    });

    if (!validation.valid) continue;

    available.push({
      _id: coupon._id,
      code: coupon.code,
      name: coupon.name,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minSubtotal: coupon.minSubtotal
    });
  }

  res.status(200).json({
    success: true,
    count: available.length,
    data: available
  });
});
