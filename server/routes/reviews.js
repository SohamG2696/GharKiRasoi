// server/routes/reviews.js - Customer Reviews & Rating Moderation
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');

const router = express.Router();

const reviewSchema = z.object({
  orderId: z.string().min(1),
  kitchenId: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3)
});

// GET /api/reviews?kitchenId=ktch-1
router.get('/', async (req, res) => {
  try {
    const { kitchenId } = req.query;
    const reviews = await store.getReviews(kitchenId);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve reviews', error: err.message });
  }
});

// POST /api/reviews - Submit review after delivery
router.post('/', async (req, res) => {
  try {
    const validated = reviewSchema.parse({
      ...req.body,
      rating: Number(req.body.rating)
    });

    const newReview = await store.createReview(validated);
    res.status(201).json({
      message: 'Review submitted successfully! Thank you for supporting local home cooks.',
      review: newReview
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    res.status(500).json({ message: 'Failed to submit review', error: err.message });
  }
});

module.exports = router;
