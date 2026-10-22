// server/routes/admin.js - Platform Administration & Moderation
const express = require('express');
const store = require('../dataStore');
const { supabaseAdmin, isCloudMode } = require('../supabaseClient');

const router = express.Router();

// GET /api/admin/metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await store.getAdminMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ message: 'Failed to compute admin metrics', error: err.message });
  }
});

// PATCH /api/admin/kitchens/:id/verify
router.patch('/kitchens/:id/verify', async (req, res) => {
  try {
    const { isVerified } = req.body;
    const updated = await store.updateKitchen(req.params.id, { isVerified: Boolean(isVerified) });
    if (!updated) return res.status(404).json({ message: 'Kitchen not found' });
    res.json({ message: 'Kitchen verification updated', kitchen: updated });
  } catch (err) {
    res.status(500).json({ message: 'Verification update failed', error: err.message });
  }
});

// POST /api/admin/purge-dummy-data - Clean all test kitchens and old dummy orders
router.post('/purge-dummy-data', async (req, res) => {
  try {
    if (isCloudMode()) {
      // 1. Delete test kitchens and associated data
      const { data: testK } = await supabaseAdmin
        .from('kitchens')
        .select('id, name')
        .ilike('name', '%test%');

      if (testK && testK.length > 0) {
        for (const k of testK) {
          await supabaseAdmin.from('menu_items').delete().eq('kitchen_id', k.id);
          const { data: kOrders } = await supabaseAdmin.from('orders').select('id').eq('kitchen_id', k.id);
          if (kOrders && kOrders.length > 0) {
            for (const o of kOrders) {
              await supabaseAdmin.from('order_items').delete().eq('order_id', o.id);
              await supabaseAdmin.from('delivery_assignments').delete().eq('order_id', o.id);
              await supabaseAdmin.from('orders').delete().eq('id', o.id);
            }
          }
          await supabaseAdmin.from('kitchens').delete().eq('id', k.id);
        }
      }

      // 2. Clear old dummy test orders
      const { data: allOrders } = await supabaseAdmin.from('orders').select('id, order_number');
      if (allOrders && allOrders.length > 0) {
        for (const o of allOrders) {
          await supabaseAdmin.from('order_items').delete().eq('order_id', o.id);
          await supabaseAdmin.from('delivery_assignments').delete().eq('order_id', o.id);
          await supabaseAdmin.from('orders').delete().eq('id', o.id);
        }
      }
    }

    res.json({
      success: true,
      message: 'All dummy test kitchens and orders purged. Only real registered accounts remain!'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
