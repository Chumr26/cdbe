const asyncHandler = require('express-async-handler');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const CouponRedemption = require('../models/CouponRedemption.model');
const { recalculateCartTotals } = require('../utils/couponPricing');

// @desc    Create order from cart
// @route   POST /api/orders
// @access  Private
exports.createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod } = req.body;

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
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${item.productId.title}`
      });
    }
  }

  // Create order items
  const orderItems = cart.items.map(item => ({
    productId: item.productId._id,
    title: item.productId.title,
    isbn: item.productId.isbn,
    quantity: item.quantity,
    price: item.price
  }));

  // Recalculate totals right before order creation (coupon-safe)
  const recalculated = await recalculateCartTotals(cart, req.user.id);
  await recalculated.cart.save();

  // Create order (use new + save to trigger pre-save hook)
  const order = new Order({
    userId: req.user.id,
    items: orderItems,
    shippingAddress,
    paymentMethod: paymentMethod || 'payos',
    subtotal: cart.subtotal || 0,
    discountTotal: cart.discountTotal || 0,
    coupon: cart.coupon || undefined,
    total: cart.total
  });
  
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
