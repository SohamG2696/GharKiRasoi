// server.js - Upgraded Modular Express Backend for Ghar Ki Rasoi
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const store = require("./server/dataStore");

// Route modules
const authRoutes = require("./server/routes/auth");
const kitchenRoutes = require("./server/routes/kitchens");
const menuRoutes = require("./server/routes/menu");
const orderRoutes = require("./server/routes/orders");
const deliveryRoutes = require("./server/routes/delivery");
const subscriptionRoutes = require("./server/routes/subscriptions");
const adminRoutes = require("./server/routes/admin");
const paymentRoutes = require("./server/routes/payments");

const app = express();
app.use(cors());
app.use(express.json());

// Safe public config (DO NOT expose secret service keys or master keys)
app.get("/api/config", (req, res) => {
  res.json({
    appName: "Ghar Ki Rasoi",
    version: "2.0.0",
    hasSupabase: Boolean(process.env.SUPABASE_URL),
    hasRazorpay: Boolean(process.env.RAZORPAY_KEY_ID),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_demo_gkr_mode",
  });
});

// ✅ Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "🚀 Ghar Ki Rasoi Modular API Backend is running...",
    timestamp: new Date().toISOString()
  });
});

// 📌 Mount Modern REST API Endpoints
app.use("/api/auth", authRoutes);
app.use("/api/kitchens", kitchenRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);

// =========================================================
// 🔄 Backward-Compatibility Adapters for Legacy Routes
// =========================================================
app.get("/chefs", (req, res) => {
  const kitchens = store.getKitchens();
  // Map to legacy format
  const legacy = kitchens.map(k => ({
    id: k.id,
    kitchen_name: k.name,
    chef_name: k.cookName,
    phone: k.phone,
    location: k.addressText
  }));
  res.json(legacy);
});

app.post("/chef", (req, res) => {
  try {
    const body = req.body;
    const newKitchen = store.createKitchen({
      name: body.kitchenName || body.kitchen_name,
      cookName: body.chefName || body.chef_name,
      phone: body.chefPhone || body.phone,
      addressText: body.chefLocation || body.location || "Noida",
      ownerId: "usr-cook-1"
    });
    res.json({ message: "Chef added successfully", data: [newKitchen] });
  } catch (err) {
    res.status(500).json({ message: "Database error", error: err.message });
  }
});

app.get("/orders", (req, res) => {
  const orders = store.getOrders().filter(o => o.status === 'AWAITING_KITCHEN' || o.status === 'PREPARING');
  const legacy = orders.map(o => ({
    id: o.id,
    cust_name: o.customerName,
    location: o.deliveryAddress,
    status: o.status
  }));
  res.json(legacy);
});

app.post("/order", (req, res) => {
  try {
    const body = req.body;
    const newOrder = store.createOrder({
      customerId: "usr-customer-1",
      customerName: body.custName || body.cust_name || "Guest Customer",
      customerPhone: body.custPhone || body.phone || "+91 9876543210",
      kitchenId: body.chefId || "ktch-1",
      kitchenName: body.chefName || "Maa Ka Pyaar Rasoi",
      items: [
        {
          id: "menu-101",
          name: "Homely Thali Meal",
          price: 120,
          quantity: Number(body.quantity) || 1,
          totalPrice: (Number(body.quantity) || 1) * 120
        }
      ],
      subtotal: (Number(body.quantity) || 1) * 120,
      deliveryAddress: body.location || "Hostel Room, Sector 62",
      specialInstructions: body.note || ""
    });
    res.json({ message: "Order placed successfully", data: [newOrder] });
  } catch (err) {
    res.status(500).json({ message: "Order failed", error: err.message });
  }
});

// Serve frontend client in production if built
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));
// Fallback route for SPA client
app.use((req, res, next) => {
  if (req.path.startsWith("/api") || req.path === "/chefs" || req.path === "/orders") {
    return next();
  }
  const indexPath = path.join(clientDist, "index.html");
  if (require("fs").existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`✅ Ghar Ki Rasoi API Backend running on port ${PORT}`));
}

module.exports = app;
