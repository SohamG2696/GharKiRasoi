// server/routes/subscriptions.js - Homemade Tiffin Subscriptions
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');

const router = express.Router();

const subscriptionSchema = z.object({
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  kitchenId: z.string().min(1),
  planType: z.enum(['WEEKLY', 'MONTHLY']),
  mealSlot: z.enum(['LUNCH', 'DINNER', 'BOTH']),
  startDate: z.string(),
  dietaryNotes: z.string().optional()
});

// GET /api/subscriptions
router.get('/', (req, res) => {
  try {
    const { customerId, kitchenId } = req.query;
    const subs = store.getSubscriptions({ customerId, kitchenId });
    res.json(subs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch subscriptions', error: err.message });
  }
});

// POST /api/subscriptions
router.post('/', (req, res) => {
  try {
    const validated = subscriptionSchema.parse(req.body);
    const kitchen = store.getKitchenById(validated.kitchenId);
    if (!kitchen) return res.status(404).json({ message: 'Kitchen not found' });

    // Calculate plan pricing
    // Weekly: 7 days. Monthly: 30 days.
    // Lunch = base, Dinner = base, Both = base * 1.8
    const baseDailyRate = kitchen.startingPrice || 100;
    const days = validated.planType === 'WEEKLY' ? 7 : 30;
    const multiplier = validated.mealSlot === 'BOTH' ? 1.8 : 1.0;
    const totalAmount = Math.round(baseDailyRate * days * multiplier);

    const start = new Date(validated.startDate);
    const end = new Date(start.getTime() + days * 24 * 3600 * 1000);

    const newSub = store.createSubscription({
      ...validated,
      kitchenName: kitchen.name,
      endDate: end.toISOString().split('T')[0],
      totalAmount
    });

    res.status(201).json({
      message: 'Subscribed to Homemade Tiffin plan successfully!',
      subscription: newSub
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    res.status(500).json({ message: 'Subscription creation failed', error: err.message });
  }
});

module.exports = router;
