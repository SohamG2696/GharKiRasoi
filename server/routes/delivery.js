// server/routes/delivery.js - Delivery Partner Portal, Atomic Assignment & OTP Verification
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');

const router = express.Router();

// GET /api/delivery/available-orders - Orders ready for pickup and unassigned
router.get('/available-orders', (req, res) => {
  try {
    const orders = store.getOrders().filter(o =>
      (o.status === 'PACKED' || o.status === 'PREPARING') && !o.riderId
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available deliveries', error: err.message });
  }
});

// GET /api/delivery/my-deliveries - Assigned deliveries for a rider
router.get('/my-deliveries', (req, res) => {
  try {
    const { riderId } = req.query;
    if (!riderId) {
      return res.status(400).json({ message: 'riderId required' });
    }
    const orders = store.getOrders().filter(o => o.riderId === riderId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rider deliveries', error: err.message });
  }
});

// POST /api/delivery/accept - Atomic Rider Assignment
router.post('/accept', (req, res) => {
  try {
    const { orderId, riderId, riderName } = req.body;
    if (!orderId || !riderId) {
      return res.status(400).json({ message: 'orderId and riderId required' });
    }

    const result = store.assignRider(orderId, riderId, riderName || 'Rider Partner');
    if (!result.success) {
      return res.status(409).json({ message: result.message });
    }

    res.json({ message: 'Order accepted for delivery successfully!', order: result.order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign order', error: err.message });
  }
});

// POST /api/delivery/pickup - Rider picks up food from kitchen
router.post('/pickup', (req, res) => {
  try {
    const { orderId, riderId } = req.body;
    const order = store.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.riderId !== riderId) {
      return res.status(403).json({ message: 'You are not assigned to this order.' });
    }

    const updated = store.updateOrderStatus(
      order.id,
      'PICKED_UP',
      'Food picked up from home kitchen by delivery partner.',
      'DELIVERY_PARTNER'
    );

    res.json({ message: 'Order marked as picked up!', order: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update pickup status', error: err.message });
  }
});

// POST /api/delivery/out-for-delivery
router.post('/out-for-delivery', (req, res) => {
  try {
    const { orderId, riderId } = req.body;
    const order = store.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.riderId !== riderId) {
      return res.status(403).json({ message: 'Unauthorized rider.' });
    }

    const updated = store.updateOrderStatus(
      order.id,
      'OUT_FOR_DELIVERY',
      'Delivery partner is on the way to your location.',
      'DELIVERY_PARTNER'
    );

    res.json({ message: 'Order is out for delivery!', order: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// POST /api/delivery/complete - OTP Verified Delivery Completion
router.post('/complete', (req, res) => {
  try {
    const { orderId, riderId, otp } = req.body;
    const order = store.getOrderById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.riderId !== riderId) {
      return res.status(403).json({ message: 'Unauthorized delivery partner.' });
    }

    // Verify OTP
    if (order.deliveryOtp && order.deliveryOtp !== otp?.trim()) {
      return res.status(400).json({
        message: 'Invalid Delivery OTP! Please ask the customer for the correct 4-digit OTP shown in their app.'
      });
    }

    const updated = store.updateOrderStatus(
      order.id,
      'DELIVERED',
      `Order delivered successfully. Verified via OTP.`,
      'DELIVERY_PARTNER'
    );

    // Update rider earnings
    const rider = store.findUserById(riderId);
    if (rider) {
      rider.earnings = (rider.earnings || 0) + 40;
      rider.totalDeliveries = (rider.totalDeliveries || 0) + 1;
      store.save();
    }

    res.json({ message: 'Delivery completed successfully! ₹40 added to earnings.', order: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to complete delivery', error: err.message });
  }
});

module.exports = router;
