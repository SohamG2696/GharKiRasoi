// server/routes/auth.js - Authentication & Role Switching
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');

const router = express.Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'COOK', 'DELIVERY_PARTNER', 'ADMIN']).default('CUSTOMER')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  try {
    const validated = signupSchema.parse(req.body);
    const existing = store.findUserByEmail(validated.email);
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = store.createUser(validated);
    // Return sanitized user (no plain password)
    const { password, ...safeUser } = user;
    res.status(201).json({ message: 'User created successfully', user: safeUser, token: 'mock-jwt-' + user.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);
    const user = store.findUserByEmail(validated.email);
    if (!user || user.password !== validated.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { password, ...safeUser } = user;
    res.status(200).json({
      message: 'Login successful',
      user: safeUser,
      token: 'mock-jwt-' + user.id
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: err.errors });
    }
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// GET /api/auth/users (for Demo Role Switcher)
router.get('/demo-users', (req, res) => {
  const safeUsers = store.data.users.map(u => {
    const { password, ...safe } = u;
    return safe;
  });
  res.json(safeUsers);
});

module.exports = router;
