const asyncHandler = require('express-async-handler');
const User = require('../models/User.model');
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get all orders
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  let query = {};
  if (req.query.status) {
    query.orderStatus = req.query.status;
  }

  const orders = await Order.find(query)
    .populate('userId', 'email firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Order.countDocuments(query);

  res.status(200).json({
    success: true,
    count: orders.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: orders
  });
});

// @desc    Update order status
// @route   PATCH /api/admin/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, trackingNumber } = req.body;

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { orderStatus, trackingNumber },
    { new: true }
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Update payment status for COD order
// @route   PATCH /api/admin/orders/:id/payment-status
// @access  Private/Admin
exports.updateCodPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;

  if (!['pending', 'completed', 'failed'].includes(paymentStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid paymentStatus'
    });
  }

  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  if (order.paymentMethod !== 'cod') {
    return res.status(400).json({
      success: false,
      message: 'Payment status can only be updated for COD orders'
    });
  }

  order.paymentStatus = paymentStatus;

  // If admin marks COD payment as completed, move order into fulfillment unless already cancelled
  if (paymentStatus === 'completed' && order.orderStatus === 'pending') {
    order.orderStatus = 'processing';
  }

  await order.save();

  res.status(200).json({
    success: true,
    data: order
  });
});

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalProducts = await Product.countDocuments();
  const totalOrders = await Order.countDocuments();
  
  const orders = await Order.find({ paymentStatus: 'completed' });
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
  const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 } });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
      lowStockProducts
    }
  });
});
