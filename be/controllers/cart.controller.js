const asyncHandler = require('express-async-handler');
const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
exports.getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.id }).populate('items.productId');

  if (!cart) {
    cart = await Cart.create({ userId: req.user.id, items: [] });
  }

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }

  // Check stock
  if (product.stock < quantity) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient stock'
    });
  }

  let cart = await Cart.findOne({ userId: req.user.id });

  if (!cart) {
    cart = await Cart.create({
      userId: req.user.id,
      items: [{ productId, quantity, price: product.price }]
    });
  } else {
    // Check if item already in cart
    const existingItem = cart.items.find(
      item => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity, price: product.price });
    }

    await cart.save();
  }

  cart = await cart.populate('items.productId');

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:productId
// @access  Private
exports.updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ userId: req.user.id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  const item = cart.items.find(
    item => item.productId.toString() === req.params.productId
  );

  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Item not found in cart'
    });
  }

  item.quantity = quantity;
  await cart.save();

  await cart.populate('items.productId');

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:productId
// @access  Private
exports.removeFromCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  cart.items = cart.items.filter(
    item => item.productId.toString() !== req.params.productId
  );

  await cart.save();
  await cart.populate('items.productId');

  res.status(200).json({
    success: true,
    data: cart
  });
});

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found'
    });
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully'
  });
});
