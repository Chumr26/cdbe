const asyncHandler = require('express-async-handler');
const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');

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

  // Create order (use new + save to trigger pre-save hook)
  const order = new Order({
    userId: req.user.id,
    items: orderItems,
    shippingAddress,
    paymentMethod: paymentMethod || 'payos',
    total: cart.total
  });
  
  await order.save();

  // Update product stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.productId._id, {
      $inc: { stock: -item.quantity }
    });
  }

  // Clear cart
  cart.items = [];
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
