const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gateway: {
        type: String,
        enum: ['stripe', 'paypal', 'payos'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed', 'refunded'],
        default: 'pending'
    },
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema);
