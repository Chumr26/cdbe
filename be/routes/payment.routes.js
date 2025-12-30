const express = require('express');
const router = express.Router();
const { createPaymentLink, receiveWebhook } = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/create-payment-link', protect, createPaymentLink);
router.post('/payos-webhook', receiveWebhook);

module.exports = router;
