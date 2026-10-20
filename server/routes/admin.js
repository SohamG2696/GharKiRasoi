// server/routes/admin.js - Platform Administration & Moderation
const express = require('express');
const store = require('../dataStore');

const router = express.Router();

// GET /api/admin/metrics
router.get('/metrics', (req, res) => {
  try {
    const orders = store.getOrders();
    const kitchens = store.getKitchens();
    const users = store.data.users;
    const riders = users.filter(u => u.role === 'DELIVERY_PARTNER');
    const customers = users.filter(u => u.role === 'CUSTOMER');
    const cooks = users.filter(u => u.role === 'COOK');

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
    const activeOrders = orders.filter(o => !['DELIVERED', 'REJECTED', 'CANCELLED'].includes(o.status)).length;
    const platformCommission = Math.round(totalRevenue * 0.08); // 8% commission

    res.json({
      totalRevenue,
      platformCommission,
      totalOrders: orders.length,
      activeOrders,
      completedOrders,
      totalKitchens: kitchens.length,
      totalRiders: riders.length,
      totalCustomers: customers.length,
      totalCooks: cooks.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute admin metrics', error: err.message });
  }
});

// PATCH /api/admin/kitchens/:id/verify
router.patch('/kitchens/:id/verify', (req, res) => {
  try {
    const { isVerified } = req.body;
    const updated = store.updateKitchen(req.params.id, { isVerified: Boolean(isVerified) });
    if (!updated) return res.status(404).json({ message: 'Kitchen not found' });
    res.json({ message: 'Kitchen verification updated', kitchen: updated });
  } catch (err) {
    res.status(500).json({ message: 'Verification update failed', error: err.message });
  }
});

module.exports = router;
