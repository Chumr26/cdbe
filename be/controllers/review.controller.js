const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Product = require('../models/Product.model');
const Review = require('../models/Review.model');
const Order = require('../models/Order.model');

const ensureProductExists = async (productId) => {
  const product = await Product.findById(productId).select('_id');
  return product;
};

const ensureCompletedPurchase = async (userId, productId) => {
  const order = await Order.findOne({
    userId,
    paymentStatus: 'completed',
    'items.productId': productId
  }).select('_id');

  return order;
};

const recalculateProductRating = async (productId) => {
  const productObjectId = new mongoose.Types.ObjectId(productId);

  const stats = await Review.aggregate([
    { $match: { productId: productObjectId } },
    {
      $group: {
        _id: '$productId',
        avgRating: { $avg: '$rating' },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  const numReviews = stats.length > 0 ? stats[0].numReviews : 0;
  const rating = stats.length > 0 ? stats[0].avgRating : 0;

  await Product.findByIdAndUpdate(
    productId,
    {
      numReviews,
      rating: Math.round(rating * 10) / 10
    },
    { new: false }
  );
};

// @desc    Get reviews for a product
// @route   GET /api/products/:id/reviews
// @access  Public
exports.getProductReviews = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await ensureProductExists(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const query = { productId };

  const reviews = await Review.find(query)
    .populate('userId', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Review.countDocuments(query);

  res.status(200).json({
    success: true,
    count: reviews.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: reviews
  });
});

// @desc    Create a review for a product (completed purchasers only)
// @route   POST /api/products/:id/reviews
// @access  Private
exports.createProductReview = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await ensureProductExists(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const hasPurchased = await ensureCompletedPurchase(req.user._id, productId);
  if (!hasPurchased) {
    return res.status(403).json({
      success: false,
      message: 'Only completed purchasers can review this product'
    });
  }

  const existingReview = await Review.findOne({ productId, userId: req.user._id }).select('_id');
  if (existingReview) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this product'
    });
  }

  const rating = Number(req.body.rating);
  const comment = typeof req.body.comment === 'string' ? req.body.comment : '';

  const review = await Review.create({
    productId,
    userId: req.user._id,
    rating,
    comment
  });

  await recalculateProductRating(productId);

  res.status(201).json({
    success: true,
    data: review
  });
});

// @desc    Update my review for a product (completed purchasers only)
// @route   PUT /api/products/:id/reviews/me
// @access  Private
exports.updateMyProductReview = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await ensureProductExists(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const hasPurchased = await ensureCompletedPurchase(req.user._id, productId);
  if (!hasPurchased) {
    return res.status(403).json({
      success: false,
      message: 'Only completed purchasers can review this product'
    });
  }

  const review = await Review.findOne({ productId, userId: req.user._id });
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  if (req.body.rating !== undefined) {
    review.rating = Number(req.body.rating);
  }

  if (req.body.comment !== undefined) {
    review.comment = typeof req.body.comment === 'string' ? req.body.comment : '';
  }

  await review.save();
  await recalculateProductRating(productId);

  res.status(200).json({
    success: true,
    data: review
  });
});

// @desc    Delete my review for a product (completed purchasers only)
// @route   DELETE /api/products/:id/reviews/me
// @access  Private
exports.deleteMyProductReview = asyncHandler(async (req, res) => {
  const productId = req.params.id;

  const product = await ensureProductExists(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  const hasPurchased = await ensureCompletedPurchase(req.user._id, productId);
  if (!hasPurchased) {
    return res.status(403).json({
      success: false,
      message: 'Only completed purchasers can review this product'
    });
  }

  const review = await Review.findOneAndDelete({ productId, userId: req.user._id });
  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found'
    });
  }

  await recalculateProductRating(productId);

  res.status(200).json({
    success: true,
    message: 'Review deleted successfully'
  });
});
