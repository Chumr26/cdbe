const asyncHandler = require('express-async-handler');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const CouponRedemption = require('../models/CouponRedemption.model');
const { recalculateCartTotals } = require('../utils/couponPricing');
const sendEmail = require('../utils/emailHelper');

const SUPPORTED_LANGS = new Set(['en', 'vi']);

const detectLang = (req) => {
  const raw = (req?.query?.lang || req?.headers?.['accept-language'] || '').toString();
  const primary = raw.split(',')[0]?.trim() || '';
  const short = primary.split('-')[0]?.trim().toLowerCase();
  return SUPPORTED_LANGS.has(short) ? short : 'en';
};

const getI18nValue = (i18nMapOrObject, lang) => {
  if (!i18nMapOrObject) return undefined;
  if (typeof i18nMapOrObject.get === 'function') return i18nMapOrObject.get(lang);
  return i18nMapOrObject[lang];
};

const resolveTitle = (item, lang) => {
  const i18n = item?.titleI18n;
  return (
    getI18nValue(i18n, lang) ||
    getI18nValue(i18n, 'en') ||
    getI18nValue(i18n, 'vi') ||
    item?.title ||
    ''
  );
};

const validateShippingAddress = (shippingAddress) => {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return 'Shipping address is required';
  }

  const requiredFields = [
    'firstName',
    'lastName',
    'street',
    'city',
    'state',
    'zipCode',
    'country',
    'phoneNumber'
  ];

  for (const field of requiredFields) {
    const value = shippingAddress[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return `Shipping address ${field} is required`;
    }
  }

  const phoneDigits = String(shippingAddress.phoneNumber).replace(/\D/g, '');
  if (phoneDigits.length < 8) {
    return 'Shipping address phoneNumber is invalid';
  }

  const zip = String(shippingAddress.zipCode).trim();
  if (zip.length < 3) {
    return 'Shipping address zipCode is invalid';
  }

  return null;
};

const formatMoney = (amount) => {
  const numeric = Number(amount || 0);
  try {
    return `${numeric.toLocaleString('vi-VN')} ₫`;
  } catch {
    return `${numeric} ₫`;
  }
};

const buildOrderConfirmationMessage = ({ user, order, shippingAddress, lang }) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'there';
  const itemsText = (order.items || [])
    .map((item) => `- ${resolveTitle(item, lang)} (x${item.quantity})`) 
    .join('\n');

  const addressLine = [
    shippingAddress?.street,
    shippingAddress?.city,
    shippingAddress?.state,
    shippingAddress?.zipCode,
    shippingAddress?.country
  ]
    .filter(Boolean)
    .join(', ');

  const paymentNote = order.paymentMethod === 'payos'
    ? 'Your order is created. Please complete payment to process your order.'
    : 'Your order is confirmed as Cash on Delivery (COD).';

  return [
    `Hi ${fullName},`,
    '',
    `Thanks for your order! We have received your order ${order.orderNumber}.`,
    '',
    'Order summary:',
    itemsText || '- (no items)',
    '',
    `Subtotal: ${formatMoney(order.subtotal)}`,
    `Discount: ${formatMoney(order.discountTotal)}`,
    `Total: ${formatMoney(order.total)}`,
    '',
    `Payment method: ${String(order.paymentMethod || '').toUpperCase()}`,
    `Payment status: ${String(order.paymentStatus || '').toUpperCase()}`,
    '',
    'Shipping address:',
    addressLine || '- (not provided)',
    shippingAddress?.phoneNumber ? `Phone: ${shippingAddress.phoneNumber}` : null,
    '',
    paymentNote,
    '',
    'You can view your orders in your account.'
  ].filter((line) => line !== null).join('\n');
};

// @desc    Create order from cart
// @route   POST /api/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  const lang = detectLang(req);
  const { shippingAddress, paymentMethod } = req.body;

  const shippingError = validateShippingAddress(shippingAddress);
  if (shippingError) {
    return res.status(400).json({
      success: false,
      message: shippingError
    });
  }

  const cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Cart is empty'
    });
  }

  // Check stock for all items
  for (const item of cart.items) {
    if (item.productId.stock < item.quantity) {
      const itemTitle = resolveTitle(item.productId, lang);
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${itemTitle}`
      });
    }
  }

  // Create order items
  const orderItems = cart.items.map(item => ({
    productId: item.productId._id,
    titleI18n: item.productId.titleI18n || {
      en: item.productId.title || '',
      vi: item.productId.title || ''
    },
    isbn: item.productId.isbn,
    quantity: item.quantity,
    price: item.price
  }));

  // Recalculate totals right before order creation (coupon-safe)
  const recalculated = await recalculateCartTotals(cart, req.user.id);
  await recalculated.cart.save();

  // Create order (use new + save to trigger pre-save hook)
  // IMPORTANT: omit `coupon` entirely when not present; setting `coupon: undefined`
  // can still trigger Mongoose casting for embedded objects.
  const orderPayload = {
    userId: req.user.id,
    items: orderItems,
    shippingAddress,
    paymentMethod: paymentMethod || 'payos',
    subtotal: cart.subtotal || 0,
    discountTotal: cart.discountTotal || 0,
    total: cart.total
  };

  if (
    cart.coupon &&
    typeof cart.coupon === 'object' &&
    (cart.coupon.couponId || cart.coupon.code)
  ) {
    orderPayload.coupon = cart.coupon;
  }

  const order = new Order(orderPayload);
  
  await order.save();

  // Coupon redemption:
  // - COD: redeem immediately on order creation
  // - PayOS: redeem on payment success webhook
  if (order.paymentMethod === 'cod' && order.coupon && order.coupon.couponId) {
    await CouponRedemption.findOneAndUpdate(
      { orderId: order._id, couponId: order.coupon.couponId },
      {
        couponId: order.coupon.couponId,
        userId: order.userId,
        orderId: order._id,
        code: order.coupon.code,
        discountAmount: order.discountTotal,
        redeemedAt: new Date()
      },
      { upsert: true, new: true }
    );
  }

  // Update product stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.productId._id, {
      $inc: { stock: -item.quantity }
    });
  }

  // Clear cart
  cart.items = [];
  cart.coupon = undefined;
  cart.subtotal = 0;
  cart.discountTotal = 0;
  cart.total = 0;
  await cart.save();

  // Send order confirmation email (do not fail checkout if email fails)
  if (req.user?.email) {
    const yourDomain = process.env.YOUR_DOMAIN || 'http://localhost:5173';
    const message = buildOrderConfirmationMessage({
      user: req.user,
      order,
      shippingAddress,
      lang
    });

    sendEmail({
      email: req.user.email,
      subject: `Order confirmation - ${order.orderNumber}`,
      message,
      ctaUrl: `${yourDomain}/orders`,
      ctaText: 'View my orders'
    }).catch((error) => {
      console.error('Order confirmation email failed:', error?.message || error);
    });
  }

  res.status(201).json({
    success: true,
    data: order
  });
});

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Make sure user owns order
  if (order.userId.toString() !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to access this order'
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Cancel order
// @route   PATCH /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Make sure user owns order
  if (order.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this order'
    });
  }

  // Can only cancel pending orders
  if (order.orderStatus !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel order in current status'
    });
  }

  order.orderStatus = 'cancelled';
  await order.save();

  // Restore product stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity }
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});
