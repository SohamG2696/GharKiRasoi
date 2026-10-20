// server/routes/kitchens.js - Kitchen discovery, search, filters & profiles
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');

const router = express.Router();

// Helper: Haversine distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.5; // fallback reasonable distance
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

// GET /api/kitchens - Search, filter, distance
router.get('/', (req, res) => {
  try {
    const { lat, lng, q, vegOnly, cuisine, maxDistance } = req.query;
    const userLat = lat ? parseFloat(lat) : null;
    const userLng = lng ? parseFloat(lng) : null;

    let kitchens = store.getKitchens();

    // Map distance & delivery time
    kitchens = kitchens.map(k => {
      const distance = (userLat && userLng)
        ? calculateDistanceKm(userLat, userLng, k.latitude, k.longitude)
        : 2.1;
      const estimatedTime = Math.round(k.prepTimeMinutes + distance * 5);
      return {
        ...k,
        distanceKm: distance,
        estimatedDeliveryTimeMin: estimatedTime
      };
    });

    // Filters
    if (q) {
      const search = q.toLowerCase();
      kitchens = kitchens.filter(k =>
        k.name.toLowerCase().includes(search) ||
        k.cookName.toLowerCase().includes(search) ||
        k.description.toLowerCase().includes(search) ||
        k.cuisineTypes.some(c => c.toLowerCase().includes(search))
      );
    }

    if (vegOnly === 'true') {
      kitchens = kitchens.filter(k => k.isVegOnly);
    }

    if (cuisine) {
      kitchens = kitchens.filter(k =>
        k.cuisineTypes.some(c => c.toLowerCase() === cuisine.toLowerCase())
      );
    }

    if (maxDistance) {
      const max = parseFloat(maxDistance);
      kitchens = kitchens.filter(k => k.distanceKm <= max);
    }

    // Sort by distance
    kitchens.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(kitchens);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch kitchens', error: err.message });
  }
});

// GET /api/kitchens/:id - Kitchen details with its menu items
router.get('/:id', (req, res) => {
  try {
    const kitchen = store.getKitchenById(req.params.id);
    if (!kitchen) {
      return res.status(404).json({ message: 'Kitchen not found' });
    }
    const menuItems = store.getMenuItems(kitchen.id);
    res.json({
      ...kitchen,
      menuItems
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving kitchen', error: err.message });
  }
});

// POST /api/kitchens - Onboarding
const kitchenSchema = z.object({
  name: z.string().min(2),
  cookName: z.string().min(2),
  phone: z.string().min(8),
  description: z.string().optional(),
  addressText: z.string().min(5),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  cuisineTypes: z.array(z.string()).optional(),
  isVegOnly: z.boolean().optional(),
  prepTimeMinutes: z.number().optional()
});

router.post('/', (req, res) => {
  try {
    const validated = kitchenSchema.parse(req.body);
    const newKitchen = store.createKitchen({
      ...validated,
      ownerId: req.body.ownerId || 'usr-cook-1'
    });
    res.status(201).json({ message: 'Kitchen created successfully', kitchen: newKitchen });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    res.status(500).json({ message: 'Failed to create kitchen', error: err.message });
  }
});

// PATCH /api/kitchens/:id - Update kitchen status (open/close)
router.patch('/:id', (req, res) => {
  try {
    const updated = store.updateKitchen(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: 'Kitchen not found' });
    res.json({ message: 'Kitchen updated successfully', kitchen: updated });
  } catch (err) {
    res.status(500).json({ message: 'Update failed', error: err.message });
  }
});

module.exports = router;
