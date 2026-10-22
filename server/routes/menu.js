// server/routes/menu.js - Dynamic Menu Item CRUD & Inventory
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');

const router = express.Router();

const menuItemSchema = z.object({
  kitchenId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.number().positive(),
  category: z.string().default('Daily Specials'),
  imageUrl: z.string().optional(),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  dailyQuantity: z.number().int().positive().default(20)
});

// GET /api/menu?kitchenId=ktch-1
router.get('/', async (req, res) => {
  try {
    const { kitchenId } = req.query;
    const items = await store.getMenuItems(kitchenId);
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve menu items', error: err.message });
  }
});

// POST /api/menu - Add dynamic item
router.post('/', async (req, res) => {
  try {
    const validated = menuItemSchema.parse({
      ...req.body,
      price: Number(req.body.price),
      dailyQuantity: req.body.dailyQuantity ? Number(req.body.dailyQuantity) : 20
    });
    const newItem = await store.createMenuItem(validated);
    res.status(201).json({ message: 'Menu item created', item: newItem });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    res.status(500).json({ message: 'Failed to create menu item', error: err.message });
  }
});

// PUT /api/menu/:id - Edit item
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.price) updateData.price = Number(updateData.price);
    if (updateData.dailyQuantity) updateData.dailyQuantity = Number(updateData.dailyQuantity);
    const updated = await store.updateMenuItem(req.params.id, updateData);
    if (!updated) return res.status(404).json({ message: 'Menu item not found' });
    res.json({ message: 'Menu item updated', item: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update item', error: err.message });
  }
});

// DELETE /api/menu/:id - Delete item
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await store.deleteMenuItem(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Menu item not found' });
    res.json({ message: 'Menu item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete item', error: err.message });
  }
});

module.exports = router;
