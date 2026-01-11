const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['percent', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  minSubtotal: {
    type: Number,
    min: 0
  },
  startsAt: {
    type: Date
  },
  endsAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimitTotal: {
    type: Number,
    min: 0
  },
  usageLimitPerUser: {
    type: Number,
    min: 0
  },
  eligibleProductIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  eligibleCategorySlugs: [{
    type: String,
    trim: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Coupon', couponSchema);
