const asyncHandler = require('express-async-handler');
const Product = require('../models/Product.model');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Build query
  let query = { isActive: true };

  // Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Filter by price range
  if (req.query.minPrice || req.query.maxPrice) {
    query.price = {};
    if (req.query.minPrice) query.price.$gte = parseFloat(req.query.minPrice);
    if (req.query.maxPrice) query.price.$lte = parseFloat(req.query.maxPrice);
  }

  // Search by text
  if (req.query.search) {
    query.$text = { $search: req.query.search };
  }

  // Sort
  let sort = {};
  if (req.query.sort) {
    const sortField = req.query.sort;
    const sortOrder = req.query.order === 'desc' ? -1 : 1;
    sort[sortField] = sortOrder;
  } else {
    sort = { createdAt: -1 }; // Default: newest first
  }

  const products = await Product.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip);

  const total = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    count: products.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: products
  });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ featured: true, isActive: true }).limit(8);

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res) => {
  const productData = req.body;
  
  // Handle uploaded cover image
  if (req.file) {
    productData.coverImage = {
      source: 'upload',
      url: `/uploads/covers/${req.file.filename}`
    };
  } else if (!productData.coverImage || !productData.coverImage.url) {
    // Set to use API if no upload and no explicit coverImage provided
    productData.coverImage = {
      source: 'api',
      url: null
    };
  }
  
  const product = await Product.create(productData);

  res.status(201).json({
    success: true,
    data: product
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = asyncHandler(async (req, res) => {
  const productData = req.body;
  
  // Handle uploaded cover image
  if (req.file) {
    productData.coverImage = {
      source: 'upload',
      url: `/uploads/covers/${req.file.filename}`
    };
  }
  
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    productData,
    { new: true, runValidators: true }
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.status(200).json({
    success: true,
    data: product
  });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});
