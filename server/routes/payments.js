// server/routes/payments.js - Payment Gateway & Demo Simulator
const express = require('express');
const store = require('../dataStore');

const router = express.Router();

// POST /api/payments/create-order
router.post('/create-order', (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const order = store.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Use Razorpay or Demo Simulator
    const isLiveGateway = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

    const paymentSession = {
      gateway: isLiveGateway ? 'RAZORPAY' : 'DEMO_SIMULATOR',
      gatewayOrderId: 'pay_' + Math.random().toString(36).substring(2, 12),
      amount: order.totalAmount,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo_gkr_mode',
      isDemo: !isLiveGateway
    };

    res.json(paymentSession);
  } catch (err) {
    res.status(500).json({ message: 'Failed to initiate payment', error: err.message });
  }
});

// POST /api/payments/verify
router.post('/verify', (req, res) => {
  try {
    const { orderId, paymentId, signature, status } = req.body;
    const order = store.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.paymentStatus = status === 'FAILED' ? 'FAILED' : 'SUCCESS';
    order.updatedAt = new Date().toISOString();
    store.save();

    res.json({
      success: order.paymentStatus === 'SUCCESS',
      message: order.paymentStatus === 'SUCCESS' ? 'Payment verified successfully.' : 'Payment failed or cancelled.'
    });
  } catch (err) {
    res.status(500).json({ message: 'Payment verification failed', error: err.message });
  }
});

module.exports = router;
