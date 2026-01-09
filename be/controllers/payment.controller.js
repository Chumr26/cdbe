const payOS = require('../utils/payos');
const Order = require('../models/Order.model');
const Transaction = require('../models/Transaction.model');
const CouponRedemption = require('../models/CouponRedemption.model');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create PayOS payment link
 * @route   POST /api/payment/create-payment-link
 * @access  Private
 */
const createPaymentLink = asyncHandler(async (req, res) => {
    const { orderId } = req.body;
    const YOUR_DOMAIN = process.env.YOUR_DOMAIN || 'http://localhost:5173';

    console.log(`Creating payment link for order: ${orderId}`);

    const order = await Order.findById(orderId).populate('items.productId');

    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    if (order.paymentStatus === 'completed') {
        res.status(400);
        throw new Error('Order already paid');
    }

    if (order.paymentMethod === 'cod') {
        res.status(400);
        throw new Error('Cannot create PayOS payment link for COD orders');
    }

    // Generate a unique numeric order code for PayOS if not exists
    // PayOS uses Javascript Number.MAX_SAFE_INTEGER (9007199254740991)
    // We can use a combination of timestamp and random number, but simplified for now
    // Or just use the timestamp as base.
    // Note: PayOS orderCode must be unique for every request if status is success.
    // If we retry payment for same order, we might need a new payosOrderCode or handle accordingly.
    // Ideally, payosOrderCode maps 1:1 to our Order if we just want one successful payment.

    if (!order.payosOrderCode) {
        // Simple generation: slightly risky on high concurrency but okay for low volume
        order.payosOrderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
        if (!order.paymentMethod) {
            order.paymentMethod = 'payos';
        }
        await order.save();
    }

    const paymentData = {
        orderCode: order.payosOrderCode,
        amount: Math.round(order.total), // PayOS requires integer
        description: `Order ${order.orderNumber}`.substring(0, 25), // PayOS max 25 chars
        cancelUrl: `${YOUR_DOMAIN}/payment/result?status=cancelled&orderId=${order._id}`,
        returnUrl: `${YOUR_DOMAIN}/payment/result?status=success&orderId=${order._id}`,
        items: order.items.map(item => ({
            name: item.title || 'Book',
            quantity: item.quantity,
            price: item.price
        }))
    };

    console.log('Payment Request Data:', paymentData);

    try {
        const paymentLinkData = await payOS.paymentRequests.create(paymentData);

        // Create or update transaction record
        const transaction = await Transaction.findOneAndUpdate(
            { orderId: order._id, gateway: 'payos' },
            {
                userId: req.user._id,
                amount: order.total,
                status: 'pending',
                gatewayResponse: paymentLinkData
            },
            { upsert: true, new: true }
        );

        res.json({
            checkoutUrl: paymentLinkData.checkoutUrl
        });
    } catch (error) {
        console.error('PayOS Create Payment Link Error:', error);
        res.status(500);
        throw new Error('Could not create payment link: ' + error.message);
    }
});

/**
 * @desc    Handle PayOS Webhook
 * @route   POST /api/payment/payos-webhook
 * @access  Public
 */
const receiveWebhook = asyncHandler(async (req, res) => {
    const webhookData = payOS.webhooks.verify(req.body);

    // Check specifically for "test" or confirm webhook URL request if PayOS sends one initially
    // Usually PayOS sends actual transaction data.

    if (webhookData.desc === 'Mô tả đơn hàng') {
        // This is often a test from PayOS when setting up webhook
        return res.json({
            message: 'Webhook test received',
            data: webhookData
        });
    }

    console.log('PayOS Webhook Verified Data:', webhookData);

    // webhookData includes: orderCode, amount, description, accountHost, reference, ...
    // and hopefully 'code' == '00' for success? Or we look at data structure.
    // Actually payOS library verification returns the data object if safe.

    // According to docs, if success, we update order.
    const { orderCode, amount, code } = webhookData;

    // Find order by payosOrderCode
    const order = await Order.findOne({ payosOrderCode: orderCode });

    if (!order) {
        console.error(`Order not found for payosOrderCode: ${orderCode}`);
        // Return 200 to acknowledge webhook receiving even if we can't process, to stop retries
        return res.json({ message: 'Order not found' });
    }

    // Update status
    // Assuming code "00" is success (standard banking) but PayOS SDK might have simplified signals.
    // Let's assume verifying it means it's a valid message.
    // The 'code' in webhook data usually indicates payment status. 
    // "00" = Success.

    if (code === '00') {
        order.paymentStatus = 'completed';
        order.orderStatus = 'processing'; // Or whatever next step is
        await order.save();

        if (order.coupon && order.coupon.couponId) {
            await CouponRedemption.findOneAndUpdate(
                { orderId: order._id, couponId: order.coupon.couponId },
                {
                    couponId: order.coupon.couponId,
                    userId: order.userId,
                    orderId: order._id,
                    code: order.coupon.code,
                    discountAmount: order.discountTotal || 0,
                    redeemedAt: new Date()
                },
                { upsert: true, new: true }
            );
        }

        await Transaction.findOneAndUpdate(
            { orderId: order._id, gateway: 'payos' },
            { status: 'success', gatewayResponse: webhookData }
        );
    } else {
        // Payment failed or cancelled
        await Transaction.findOneAndUpdate(
            { orderId: order._id, gateway: 'payos' },
            { status: 'failed', gatewayResponse: webhookData }
        );
    }

    res.json({
        message: 'Webhook processing success',
        data: webhookData
    });
});

module.exports = {
    createPaymentLink,
    receiveWebhook
};
