const asyncHandler = require('express-async-handler');
const User = require('../models/User.model');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phoneNumber } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { firstName, lastName, phoneNumber },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Add address
// @route   POST /api/users/addresses
// @access  Private
exports.addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  user.addresses.push(req.body);
  await user.save();

  res.status(201).json({
    success: true,
    data: user.addresses
  });
});

// @desc    Update address
// @route   PUT /api/users/addresses/:id
// @access  Private
exports.updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  const address = user.addresses.id(req.params.id);

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found'
    });
  }

  Object.assign(address, req.body);
  await user.save();

  res.status(200).json({
    success: true,
    data: user.addresses
  });
});

// @desc    Delete address
// @route   DELETE /api/users/addresses/:id
// @access  Private
exports.deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  
  user.addresses = user.addresses.filter(
    addr => addr._id.toString() !== req.params.id
  );
  
  await user.save();

  res.status(200).json({
    success: true,
    data: user.addresses
  });
});
