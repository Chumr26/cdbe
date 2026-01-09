const mongoose = require('mongoose');

const couponRedemptionSchema = new mongoose.Schema({
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0
  },
  redeemedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

couponRedemptionSchema.index({ couponId: 1, userId: 1 });
couponRedemptionSchema.index({ couponId: 1 });
couponRedemptionSchema.index({ orderId: 1 });
couponRedemptionSchema.index({ orderId: 1, couponId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('CouponRedemption', couponRedemptionSchema);
