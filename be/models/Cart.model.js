const mongoose = require('mongoose');

const couponSnapshotSchema = new mongoose.Schema(
  {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon'
    },
    code: {
      type: String,
      trim: true,
      uppercase: true
    },
    type: {
      type: String,
      enum: ['percent', 'fixed']
    },
    value: {
      type: Number,
      min: 0
    }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  subtotal: {
    type: Number,
    default: 0
  },
  discountTotal: {
    type: Number,
    default: 0
  },
  coupon: {
    type: couponSnapshotSchema,
    default: undefined
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  total: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    index: { expires: 0 } // TTL index - auto delete after expiration
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);
