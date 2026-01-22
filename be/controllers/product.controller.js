const asyncHandler = require('express-async-handler');
const Product = require('../models/Product.model');
const { usdToVnd } = require('../utils/currency');
const { embedText } = require('../utils/geminiEmbeddings');

const withVndPrice = (productDoc) => {
  const obj = productDoc?.toObject ? productDoc.toObject() : productDoc;
  return {
    ...obj,
    priceVnd: usdToVnd(obj?.price),
    currency: 'USD'
  };
};

const normalizeProductI18n = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  const titleEn = payload['titleI18n.en'] ?? payload['titleI18n[en]'];
  const titleVi = payload['titleI18n.vi'] ?? payload['titleI18n[vi]'];
  const descEn = payload['descriptionI18n.en'] ?? payload['descriptionI18n[en]'];
  const descVi = payload['descriptionI18n.vi'] ?? payload['descriptionI18n[vi]'];

  if (typeof titleEn !== 'undefined' || typeof titleVi !== 'undefined') {
    payload.titleI18n = {
      ...(payload.titleI18n || {}),
      ...(typeof titleEn !== 'undefined' ? { en: titleEn } : {}),
      ...(typeof titleVi !== 'undefined' ? { vi: titleVi } : {})
    };
  }

  if (typeof descEn !== 'undefined' || typeof descVi !== 'undefined') {
    payload.descriptionI18n = {
      ...(payload.descriptionI18n || {}),
      ...(typeof descEn !== 'undefined' ? { en: descEn } : {}),
      ...(typeof descVi !== 'undefined' ? { vi: descVi } : {})
    };
  }

  delete payload['titleI18n.en'];
  delete payload['titleI18n.vi'];
  delete payload['titleI18n[en]'];
  delete payload['titleI18n[vi]'];
  delete payload['descriptionI18n.en'];
  delete payload['descriptionI18n.vi'];
  delete payload['descriptionI18n[en]'];
  delete payload['descriptionI18n[vi]'];

  return payload;
};

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
    data: products.map((p) => withVndPrice(p))
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
    data: withVndPrice(product)
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
    data: products.map((p) => withVndPrice(p))
  });
});

// @desc    Semantic search products
// @route   GET /api/products/semantic-search
// @access  Public
exports.semanticSearchProducts = asyncHandler(async (req, res) => {
  const rawQuery = (req.query.q || '').toString().trim();

  if (!rawQuery) {
    return res.status(400).json({
      success: false,
      message: 'Query q is required'
    });
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
  const category = req.query.category ? req.query.category.toString() : undefined;
  const indexName = process.env.ATLAS_VECTOR_INDEX || 'product_embedding';
  const vectorPath = process.env.ATLAS_VECTOR_PATH || 'embedding';
  const numCandidates = Math.max(limit * 20, 200);

  const queryVector = await embedText(rawQuery);

  const filter = { isActive: true };
  if (category) {
    filter.category = category;
  }

  const results = await Product.aggregate([
    {
      $vectorSearch: {
        index: indexName,
        path: vectorPath,
        queryVector,
        numCandidates,
        limit,
        filter
      }
    },
    {
      $addFields: {
        score: { $meta: 'vectorSearchScore' }
      }
    },
    {
      $project: {
        embedding: 0,
        __v: 0
      }
    }
  ]);

  res.status(200).json({
    success: true,
    count: results.length,
    data: results.map((p) => withVndPrice(p))
  });
});

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = asyncHandler(async (req, res) => {
  const productData = normalizeProductI18n(req.body);
  
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
  const productData = normalizeProductI18n(req.body);
  
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
