// server/routes/delivery.js - Delivery Partner Portal, Atomic Assignment & OTP Verification
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');
const { verifyRiderAssignment } = require('../supabaseService');

const router = express.Router();

// GET /api/delivery/available-orders - Orders ready for pickup and unassigned (NO dummy orders, only currently active)
router.get('/available-orders', async (req, res) => {
  try {
    let orders = await store.getAvailableDeliveries();
    // Exclude dummy test orders and only include orders that are actively ready for pickup
    orders = (orders || []).filter(o => {
      const orderNum = (o.orderNumber || o.id || '').toUpperCase();
      const isTest = orderNum.includes('TEST') || orderNum.includes('ISO') || orderNum.includes('MOCK');
      const isReadyStatus = o.status === 'PACKED' || o.status === 'READY_FOR_PICKUP';
      return !isTest && isReadyStatus && !o.riderId;
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available deliveries', error: err.message });
  }
});

// GET /api/delivery/my-deliveries - Assigned deliveries for a rider
router.get('/my-deliveries', async (req, res) => {
  try {
    const { riderId } = req.query;
    if (!riderId) {
      return res.status(400).json({ message: 'riderId required' });
    }
    let orders = await store.getRiderDeliveries(riderId);
    // Exclude dummy test orders
    orders = (orders || []).filter(o => {
      const orderNum = (o.orderNumber || o.id || '').toUpperCase();
      return !orderNum.includes('TEST') && !orderNum.includes('ISO') && !orderNum.includes('MOCK');
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rider deliveries', error: err.message });
  }
});

// POST /api/delivery/accept - Atomic Rider Assignment
router.post('/accept', async (req, res) => {
  try {
    const { orderId, riderId, riderName } = req.body;
    if (!orderId || !riderId) {
      return res.status(400).json({ message: 'orderId and riderId required' });
    }

    const result = await store.assignRider(orderId, riderId, riderName || 'Rider Partner');
    if (!result.success) {
      return res.status(409).json({ message: result.message || 'Order already claimed or unavailable' });
    }

    res.json({
      message: 'Delivery assignment confirmed!',
      order: result.order
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to accept delivery', error: err.message });
  }
});

// POST /api/delivery/pickup - Mark picked up
router.post('/pickup', async (req, res) => {
  try {
    const { orderId, riderId } = req.body;
    const updated = await store.updateOrderStatus(orderId, 'PICKED_UP', riderId);
    res.json({ message: 'Order marked as picked up', order: updated });
  } catch (err) {
    res.status(500).json({ message: 'Pickup update failed', error: err.message });
  }
});

// POST /api/delivery/out-for-delivery - Transit started
router.post('/out-for-delivery', async (req, res) => {
  try {
    const { orderId, riderId } = req.body;
    const updated = await store.updateOrderStatus(orderId, 'OUT_FOR_DELIVERY', riderId);
    res.json({ message: 'Order is out for delivery', order: updated });
  } catch (err) {
    res.status(500).json({ message: 'Out for delivery update failed', error: err.message });
  }
});

// POST /api/delivery/complete - OTP Verification & Order Completion
const completeDeliverySchema = z.object({
  orderId: z.string(),
  riderId: z.string(),
  otp: z.string().length(4)
});

router.post('/complete', async (req, res) => {
  try {
    const validated = completeDeliverySchema.parse(req.body);

    const completed = await store.completeDelivery(
      validated.orderId,
      validated.riderId,
      validated.otp
    );

    res.json({
      success: true,
      message: 'OTP verified successfully! Order delivered.',
      order: completed
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid OTP format. Must be a 4-digit code.' });
    }
    if (err.message && err.message.toLowerCase().includes('otp')) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: 'Delivery completion failed', error: err.message });
  }
});

module.exports = router;
