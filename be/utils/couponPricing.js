const Coupon = require('../models/Coupon.model');
const CouponRedemption = require('../models/CouponRedemption.model');

function normalizeCouponCode(code) {
  return (code || '').toString().trim().toUpperCase();
}

function nowBetween(now, startsAt, endsAt) {
  if (startsAt && now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function computeDiscount({ subtotal, coupon }) {
  if (!coupon) return 0;

  if (coupon.type === 'percent') {
    const pct = Math.max(0, Math.min(100, Number(coupon.value || 0)));
    let discount = subtotal * (pct / 100);
    if (Number.isFinite(coupon.maxDiscountAmount)) {
      discount = Math.min(discount, Number(coupon.maxDiscountAmount));
    }
    return Math.max(0, discount);
  }

  if (coupon.type === 'fixed') {
    const value = Math.max(0, Number(coupon.value || 0));
    return Math.max(0, Math.min(value, subtotal));
  }

  return 0;
}

async function validateCouponForCart({ coupon, userId, cartSubtotal, cartItems }) {
  if (!coupon) return { valid: false, reason: 'Coupon not found' };
  if (!coupon.isActive) return { valid: false, reason: 'Coupon is inactive' };

  const now = new Date();
  if (!nowBetween(now, coupon.startsAt, coupon.endsAt)) {
    return { valid: false, reason: 'Coupon is not currently valid' };
  }

  if (Number.isFinite(coupon.minSubtotal) && cartSubtotal < coupon.minSubtotal) {
    return { valid: false, reason: `Minimum subtotal is ${coupon.minSubtotal}` };
  }

  // Eligibility checks (optional): only enforce when configured
  if (coupon.eligibleProductIds && coupon.eligibleProductIds.length > 0) {
    const eligibleIds = new Set(coupon.eligibleProductIds.map((id) => id.toString()));
    const matches = (cartItems || []).some((item) => {
      const productRef = item.productId;
      const productId = productRef && productRef._id ? productRef._id.toString() : productRef?.toString();
      return productId ? eligibleIds.has(productId) : false;
    });
    if (!matches) return { valid: false, reason: 'Coupon is not applicable to items in cart' };
  }

  if (coupon.eligibleCategorySlugs && coupon.eligibleCategorySlugs.length > 0) {
    // Cart items may be populated with product docs in some reads; be defensive
    const slugs = new Set(coupon.eligibleCategorySlugs.map((s) => (s || '').toString().trim().toLowerCase()));
    const matches = (cartItems || []).some((item) => {
      const product = item.productId;
      const category = (product && product.category) ? product.category : null;
      return category ? slugs.has(category.toString().trim().toLowerCase()) : false;
    });
    if (!matches) return { valid: false, reason: 'Coupon is not applicable to items in cart' };
  }

  if (Number.isFinite(coupon.usageLimitTotal)) {
    const totalUsed = await CouponRedemption.countDocuments({ couponId: coupon._id });
    if (totalUsed >= coupon.usageLimitTotal) {
      return { valid: false, reason: 'Coupon usage limit reached' };
    }
  }

  if (Number.isFinite(coupon.usageLimitPerUser)) {
    const usedByUser = await CouponRedemption.countDocuments({ couponId: coupon._id, userId });
    if (usedByUser >= coupon.usageLimitPerUser) {
      return { valid: false, reason: 'You have already used this coupon the maximum number of times' };
    }
  }

  return { valid: true };
}

async function recalculateCartTotals(cart, userId) {
  const items = cart.items || [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);

  let discountTotal = 0;
  let appliedCouponSnapshot = null;
  let couponResult = null;

  if (cart.coupon && (cart.coupon.couponId || cart.coupon.code)) {
    const code = normalizeCouponCode(cart.coupon.code);

    const coupon = cart.coupon.couponId
      ? await Coupon.findById(cart.coupon.couponId)
      : await Coupon.findOne({ code });

    const validation = await validateCouponForCart({
      coupon,
      userId,
      cartSubtotal: subtotal,
      cartItems: items
    });

    if (validation.valid) {
      discountTotal = computeDiscount({ subtotal, coupon });
      appliedCouponSnapshot = {
        couponId: coupon._id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value
      };
      couponResult = { applied: true };
    } else {
      cart.coupon = undefined;
      couponResult = { applied: false, reason: validation.reason || 'Coupon is not valid' };
    }
  }

  cart.subtotal = subtotal;
  cart.discountTotal = discountTotal;
  cart.total = Math.max(0, subtotal - discountTotal);
  cart.coupon = appliedCouponSnapshot;

  return { cart, couponResult };
}

module.exports = {
  normalizeCouponCode,
  recalculateCartTotals,
  validateCouponForCart
};
