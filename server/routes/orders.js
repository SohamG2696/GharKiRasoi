// server/routes/orders.js - Order Placement, Calculation & Full State Machine
const express = require('express');
const { z } = require('zod');
const store = require('../dataStore');

const router = express.Router();

// Order placement schema
const orderPlacementSchema = z.object({
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().min(5),
  kitchenId: z.string().min(1),
  deliveryAddress: z.string().min(3),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  specialInstructions: z.string().optional(),
  items: z.array(z.object({
    id: z.string(),
    quantity: z.number().int().positive()
  })).min(1),
  paymentMethod: z.enum(['UPI', 'CARD', 'NET_BANKING', 'CASH_ON_DELIVERY']).default('UPI')
});

// POST /api/orders - Place Order with Server-Side Price Recalculation
router.post('/', (req, res) => {
  try {
    const validated = orderPlacementSchema.parse(req.body);

    const kitchen = store.getKitchenById(validated.kitchenId);
    if (!kitchen) {
      return res.status(404).json({ message: 'Selected kitchen does not exist.' });
    }

    if (!kitchen.isOpen) {
      return res.status(400).json({ message: 'Kitchen is currently closed for orders.' });
    }

    // Verify each item from DB and calculate prices server-side
    let calculatedSubtotal = 0;
    const populatedItems = [];

    for (const requestedItem of validated.items) {
      const dbItem = store.getMenuItemById(requestedItem.id);
      if (!dbItem || dbItem.kitchenId !== kitchen.id) {
        return res.status(400).json({
          message: `Invalid item selected: ${requestedItem.id} is not available from this kitchen.`
        });
      }

      if (!dbItem.isAvailable) {
        return res.status(400).json({
          message: `Item "${dbItem.name}" is currently sold out.`
        });
      }

      const itemTotal = Number(dbItem.price) * requestedItem.quantity;
      calculatedSubtotal += itemTotal;

      populatedItems.push({
        id: dbItem.id,
        name: dbItem.name,
        price: Number(dbItem.price),
        quantity: requestedItem.quantity,
        totalPrice: itemTotal
      });
    }

    const deliveryFee = 30.00;
    const platformFee = 10.00;
    const tax = 0.00;
    const totalAmount = calculatedSubtotal + deliveryFee + platformFee + tax;

    const newOrder = store.createOrder({
      customerId: validated.customerId,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      kitchenId: kitchen.id,
      kitchenName: kitchen.name,
      items: populatedItems,
      subtotal: calculatedSubtotal,
      deliveryFee,
      platformFee,
      tax,
      totalAmount,
      deliveryAddress: validated.deliveryAddress,
      deliveryLat: validated.deliveryLat,
      deliveryLng: validated.deliveryLng,
      specialInstructions: validated.specialInstructions,
      paymentMethod: validated.paymentMethod
    });

    res.status(201).json({
      message: 'Order placed successfully!',
      order: newOrder
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    res.status(500).json({ message: 'Failed to place order', error: err.message });
  }
});

// GET /api/orders - List orders with filters (customer, kitchen, status)
router.get('/', (req, res) => {
  try {
    const { customerId, kitchenId, status } = req.query;
    const orders = store.getOrders({ customerId, kitchenId, status });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve orders', error: err.message });
  }
});

// GET /api/orders/:id - Single order details with live event history
router.get('/:id', (req, res) => {
  try {
    const order = store.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: 'Failed to retrieve order', error: err.message });
  }
});

// PATCH /api/orders/:id/status - State Machine Transitions
const VALID_TRANSITIONS = {
  'AWAITING_KITCHEN': ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  'ACCEPTED': ['PREPARING', 'CANCELLED'],
  'PREPARING': ['PACKED', 'CANCELLED'],
  'PACKED': ['RIDER_ASSIGNED', 'PICKED_UP'],
  'RIDER_ASSIGNED': ['PICKED_UP', 'CANCELLED'],
  'PICKED_UP': ['OUT_FOR_DELIVERY'],
  'OUT_FOR_DELIVERY': ['ARRIVED_AT_CUSTOMER', 'DELIVERED'],
  'ARRIVED_AT_CUSTOMER': ['DELIVERED'],
  'DELIVERED': [],
  'REJECTED': [],
  'CANCELLED': []
};

router.patch('/:id/status', (req, res) => {
  try {
    const { status, note, actorRole, rejectionReason } = req.body;
    const order = store.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const currentStatus = order.status;
    const allowed = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: `Invalid state transition from ${currentStatus} to ${status}. Allowed: ${allowed.join(', ') || 'None'}`
      });
    }

    if (status === 'REJECTED' && !rejectionReason && !note) {
      return res.status(400).json({ message: 'Rejection reason is required.' });
    }

    const updated = store.updateOrderStatus(
      order.id,
      status,
      note || (status === 'REJECTED' ? `Order rejected: ${rejectionReason}` : `Status updated to ${status}`),
      actorRole || 'SYSTEM'
    );

    res.json({ message: 'Order status updated', order: updated });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order status', error: err.message });
  }
});

module.exports = router;
