const asyncHandler = require('express-async-handler');
const User = require('../models/User.model');
const Order = require('../models/Order.model');
const Product = require('../models/Product.model');
const Coupon = require('../models/Coupon.model');

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
  const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
    .sort({ stock: 1, updatedAt: -1 })
    .limit(20);

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

// @desc    Get advanced analytics (time-series + top products)
// @route   GET /api/admin/analytics
// @access  Private/Admin
exports.getAdvancedAnalytics = asyncHandler(async (req, res) => {
  const requestedDays = Number.parseInt(req.query.days, 10);
  const rangeDays = Number.isFinite(requestedDays) ? requestedDays : 30;
  const safeRangeDays = Math.min(Math.max(rangeDays, 1), 365);

  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - (safeRangeDays - 1));
  from.setHours(0, 0, 0, 0);

  const orderRangeMatch = { createdAt: { $gte: from, $lte: to } };
  const userRangeMatch = { createdAt: { $gte: from, $lte: to } };

  const [
    totals,
    dailyOrdersRevenue,
    dailyUsers,
    orderStatusDistribution,
    paymentStatusDistribution,
    topProducts
  ] = await Promise.all([
    (async () => {
      const [totalOrdersInRange, newUsersInRange, completedAgg, completedOrdersCount] = await Promise.all([
        Order.countDocuments(orderRangeMatch),
        User.countDocuments(userRangeMatch),
        Order.aggregate([
          { $match: { ...orderRangeMatch, paymentStatus: 'completed' } },
          { $group: { _id: null, revenue: { $sum: '$total' } } }
        ]),
        Order.countDocuments({ ...orderRangeMatch, paymentStatus: 'completed' })
      ]);

      const revenue = completedAgg?.[0]?.revenue || 0;
      const avgOrderValue = completedOrdersCount > 0 ? revenue / completedOrdersCount : 0;

      return {
        totalOrders: totalOrdersInRange,
        revenue,
        newUsers: newUsersInRange,
        completedOrders: completedOrdersCount,
        avgOrderValue
      };
    })(),
    Order.aggregate([
      { $match: orderRangeMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' }
          },
          orders: { $sum: 1 },
          revenue: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'completed'] }, '$total', 0]
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    User.aggregate([
      { $match: userRangeMatch },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' }
          },
          users: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]),
    Order.aggregate([
      { $match: orderRangeMatch },
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Order.aggregate([
      { $match: orderRangeMatch },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Order.aggregate([
      { $match: { ...orderRangeMatch, paymentStatus: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          title: { $first: '$items.title' },
          isbn: { $first: '$items.isbn' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ])
  ]);

  // Fill missing days so the frontend can render a consistent table
  const dayKeys = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    const iso = cursor.toISOString().slice(0, 10);
    dayKeys.push(iso);
    cursor.setDate(cursor.getDate() + 1);
  }

  const byDayMap = new Map(dailyOrdersRevenue.map((d) => [d._id, { orders: d.orders, revenue: d.revenue }]));
  const usersByDayMap = new Map(dailyUsers.map((d) => [d._id, d.users]));

  const timeSeries = dayKeys.map((day) => ({
    date: day,
    orders: byDayMap.get(day)?.orders || 0,
    revenue: byDayMap.get(day)?.revenue || 0,
    newUsers: usersByDayMap.get(day) || 0
  }));

  res.status(200).json({
    success: true,
    data: {
      rangeDays: safeRangeDays,
      from: from.toISOString(),
      to: to.toISOString(),
      totals,
      timeSeries,
      distributions: {
        orderStatus: orderStatusDistribution.map((d) => ({ key: d._id || 'unknown', count: d.count })),
        paymentStatus: paymentStatusDistribution.map((d) => ({ key: d._id || 'unknown', count: d.count }))
      },
      topProducts: topProducts.map((p) => ({
        productId: p._id,
        title: p.title,
        isbn: p.isbn,
        quantitySold: p.quantitySold,
        revenue: p.revenue
      }))
    }
  });
});

// @desc    Create coupon
// @route   POST /api/admin/coupons
// @access  Private/Admin
exports.createCoupon = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    createdBy: req.user.id,
    updatedBy: req.user.id
  };

  const coupon = await Coupon.create(payload);

  res.status(201).json({
    success: true,
    data: coupon
  });
});

// @desc    List coupons
// @route   GET /api/admin/coupons
// @access  Private/Admin
exports.getAllCoupons = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = {};
  if (typeof req.query.active !== 'undefined') {
    query.isActive = req.query.active === 'true';
  }

  if (req.query.q) {
    const q = req.query.q.toString().trim();
    query.$or = [
      { code: new RegExp(q, 'i') },
      { name: new RegExp(q, 'i') }
    ];
  }

  const coupons = await Coupon.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Coupon.countDocuments(query);

  res.status(200).json({
    success: true,
    count: coupons.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: coupons
  });
});

// @desc    Get coupon by id
// @route   GET /api/admin/coupons/:id
// @access  Private/Admin
exports.getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found'
    });
  }

  res.status(200).json({
    success: true,
    data: coupon
  });
});

// @desc    Update coupon
// @route   PUT /api/admin/coupons/:id
// @access  Private/Admin
exports.updateCoupon = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    updatedBy: req.user.id
  };

  const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found'
    });
  }

  res.status(200).json({
    success: true,
    data: coupon
  });
});

// @desc    Disable coupon (soft delete)
// @route   DELETE /api/admin/coupons/:id
// @access  Private/Admin
exports.deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);

  if (!coupon) {
    return res.status(404).json({
      success: false,
      message: 'Coupon not found'
    });
  }

  coupon.isActive = false;
  coupon.updatedBy = req.user.id;
  await coupon.save();

  res.status(200).json({
    success: true,
    message: 'Coupon disabled successfully'
  });
});
