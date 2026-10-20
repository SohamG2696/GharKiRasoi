// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🔑 Supabase credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️ Warning: SUPABASE_URL or SUPABASE_KEY is missing in environment variables (.env).");
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_KEY || "");

// ✅ Test status endpoint
app.get("/api/health", (req, res) => {
  res.send("🚀 Ghar Ki Rasoi backend is running...");
});

// 🔑 Client configuration endpoint (for frontend)
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_KEY,
  });
});


// =========================================================
// 👨‍🍳 CHEF REGISTRATION
// =========================================================
app.post("/chef", async (req, res) => {
  try {
    const body = req.body;
    // map incoming fields to DB column names (snake_case)
    const chefObj = {
      kitchen_name: body.kitchenName || body.kitchen_name,
      chef_name: body.chefName || body.chef_name,
      phone: body.chefPhone || body.phone,
      location: body.chefLocation || body.location,
    };

    console.log("🔹 Inserting Chef:", chefObj);

    // insert (do not upsert to avoid schema mismatch); select inserted row
    const { data, error } = await supabase.from('chefs').insert([chefObj]).select();

    if (error) {
      console.error("❌ Supabase Insert Error:", error.message);
      return res.status(500).json({ message: "Database error", error });
    }

    console.log("✅ Chef Added:", data);
    res.status(200).json({ message: "Chef added successfully", data });
  } catch (err) {
    console.error("❌ Exception:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// =========================================================
// 🍱 ADD MENU (Linked to a Chef)
// =========================================================
app.post("/menu", async (req, res) => {
  try {
    const body = req.body;
    // Insert a menu row linked to a chef. Accept chefId (preferred) or chefName.
    const chefId = body.chefId || body.chef_id;
    const chefName = body.chefName || body.chef_name;
    const menuRow = {
      sabzi: body.sabzi,
      roti: body.roti,
      rice: body.rice,
      daal: body.daal,
      side: body.side,
      drink: body.drink,
    };

    let insertPayload = null;
    if (chefId) {
      insertPayload = { chef_id: chefId, ...menuRow };
    } else if (chefName) {
      // try to resolve chef id by name
      const { data: chefData, error: chefErr } = await supabase.from('chefs').select('id').eq('chef_name', chefName).limit(1).single();
      if (chefErr) throw chefErr;
      insertPayload = { chef_id: chefData.id, ...menuRow };
    } else {
      return res.status(400).json({ message: 'chefId or chefName required' });
    }

    console.log('🔹 Inserting menu for chef_id:', insertPayload.chef_id);

    const { data, error } = await supabase.from('menu').insert([insertPayload]).select();

    if (error) {
      console.error("❌ Menu Update Error:", error.message);
      return res.status(500).json({ message: "Menu update failed", error });
    }

    console.log("✅ Menu Updated:", data);
    res.status(200).json({ message: "Menu updated successfully", data });
  } catch (err) {
    console.error("❌ Exception:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// =========================================================
// 🧍‍♀️ CUSTOMER FETCH CHEFS
// =========================================================
app.get("/chefs", async (req, res) => {
  try {
    const { data, error } = await supabase.from("chefs").select("*");

    if (error) {
      console.error("❌ Fetch Chefs Error:", error.message);
      return res.status(500).json({ message: "Database error", error });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Exception:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// =========================================================
// 🛒 PLACE ORDER
// =========================================================
app.post("/order", async (req, res) => {
  try {
    const body = req.body;
    // map incoming order fields to DB columns
    const chefId = body.chefId || body.chef_id || body.chefId;
    const chefName = body.chefName || body.chef_name;
    const orderPayload = {
      chef_id: chefId || null,
      chef_name: chefName || null,
      cust_name: body.custName || body.cust_name,
      cust_phone: body.custPhone || body.cust_phone || body.phone,
      location: body.location || body.custLocation || body.cust_location,
      quantity: body.quantity,
      items: body.items || body.selectedItems || null,
      note: body.note,
      status: 'Pending'
    };

    console.log('🛍️ New Order:', orderPayload);

    const { data, error } = await supabase.from('orders').insert([orderPayload]).select();

    if (error) {
      console.error("❌ Order Insert Error:", error.message);
      return res.status(500).json({ message: "Order failed", error });
    }

    console.log("✅ Order Added:", data);
    res.status(200).json({ message: "Order placed successfully", data });
  } catch (err) {
    console.error("❌ Exception:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// =========================================================
// 🚴 DELIVERY PARTNER FETCH ORDERS
// =========================================================
app.get("/orders", async (req, res) => {
  try {
    const { data, error } = await supabase.from("orders").select("*").eq("status", "Pending");

    if (error) {
      console.error("❌ Fetch Orders Error:", error.message);
      return res.status(500).json({ message: "Database error", error });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("❌ Exception:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});


// =========================================================
// 🚀 Start Server
// =========================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
