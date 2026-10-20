# Ghar Ki Rasoi 🍛🍱 — Modern Hyperlocal Homemade Food Platform

> **"Bringing the warmth, purity, and health of home-cooked food straight to students, hostelites, and working professionals."**

**Ghar Ki Rasoi** is a production-grade, full-stack hyperlocal homemade-food marketplace. Unlike commercial restaurant aggregator apps (Swiggy, Zomato), Ghar Ki Rasoi connects customers directly with verified neighborhood home cooks who prepare small batches of fresh, authentic meals on domestic stoves using pure ingredients and minimal oil.

---

## 🚀 Key Platform Features & Portals

### 1. 🧍‍♀️ Customer Portal
- **Location-Based Discovery**: Interactive distance calculation and estimated delivery times using spatial geolocation.
- **Filters & Search**: Pure Veg, North Indian, Gujarati/Kathiawadi, South Indian, and student budget meal thalis.
- **Dedicated Kitchen Pages**: View cook profiles, hygiene credentials, photos, and daily dynamic menus.
- **Cart & Server-Side Validation**: Single-kitchen ordering enforcement, item quantity controls, custom cooking instructions, itemized bill calculation.
- **Live Real-Time Order Tracking**: 8-stage visual progress timeline from *Awaiting Kitchen Confirmation* → *Cooking on Stove* → *Food Packed* → *Rider Assigned* → *Out for Delivery* → *Delivered*.
- **Delivery OTP Security**: 4-digit verification code generated per order to safeguard contactless handover.

### 2. 👨‍🍳 Home Cook Dashboard (`/cook`)
- **Kitchen Toggle**: One-click online/offline switch to open or close the kitchen for daily orders.
- **Real-Time Order Queue**: Accept or decline incoming orders with reason logging.
- **State Progression Workflow**: Advance orders from *Accepted* → *Cooking on Stove* → *Packed & Ready for Pickup*.
- **Dynamic Menu Manager**: Add, edit, and delete dishes; customize pricing, descriptions, veg/non-veg tags, daily portion caps, and toggle instant "Sold Out" status.
- **Revenue & Metrics**: Daily earnings counter and completed meal tallies.

### 3. 🚴 Delivery Partner Console (`/delivery`)
- **Fleet Availability**: Instant Online/Offline toggle.
- **Nearby Order Discovery**: Discover orders marked *Packed & Ready for Pickup*.
- **Atomic Assignment Mechanism**: Concurrency-safe order claiming preventing race conditions between riders.
- **In-Transit Actions**: Confirm food pickup from home kitchen and start transit.
- **OTP Handover Verification**: Requires the customer's 4-digit OTP to complete delivery atomically.
- **Earnings Counter**: Flat ₹40 payout per verified delivery.

### 4. 🛡️ Platform Administrator Console (`/admin`)
- **Platform Economics**: Real-time GMV, platform commission (8%), active kitchens, and rider counts.
- **Kitchen Verification Queue**: Review and verify home cooks for food quality and hygiene assurance.
- **Live Orders Stream**: Complete chronological audit trail across all platform participants.

### 5. 🍱 Homemade Tiffin Subscriptions (`/subscriptions`)
- **Student & Bachelor Meal Plans**: Weekly (7 Days) and Monthly (30 Days) options.
- **Flexible Slots**: Lunch, Dinner, or Both.
- **Custom Dietary Notes**: Diabetic, Jain, low-spice, or soft roti preferences.
- **Pause & Skip Support**: Designed for college exam schedules and holidays.

### 6. ⚡ Instant Demo Role Switcher
- Embedded in the top navigation bar, allowing one-click role switching between:
  - **Customer**: Aarav Sharma (Browse, Cart & Order)
  - **Home Cook**: Shanti Devi (*Maa Ka Pyaar Rasoi*)
  - **Delivery Partner**: Vikram Singh (Claim & Deliver with OTP)
  - **Administrator**: Platform Governance & Verification

---

## 🛠️ Modern Technology Stack

- **Frontend**:
  - React 19 + TypeScript + Vite
  - Tailwind CSS v4 with custom warm terracotta and saffron palette
  - Lucide React icons
  - React Router v7
  - Canvas Confetti celebrations
- **Backend**:
  - Node.js + Express 5
  - Zod runtime schema validation
  - Concurrency-safe state machines & atomic assignment locks
  - CORS, Helmet, and secure credential handling
- **Database**:
  - PostgreSQL + PostGIS spatial geometries
  - Complete schema migrations in `supabase/migrations/20261020_init_schema.sql`
  - Resilient dual-engine architecture: connects to live cloud Supabase or operates seamlessly with persistent local fallback storage (`server/data/store.json`).
- **Payments**:
  - Razorpay test-mode integration support + built-in interactive demo simulator.

---

## 📁 Directory Structure

```text
GharKiRasoi/
├── client/                     # Modern React + Vite + TypeScript Frontend
│   ├── src/
│   │   ├── components/         # Navbar, Footer, DemoRoleSwitcher
│   │   ├── context/            # AuthContext, CartContext
│   │   ├── pages/              # LandingPage, KitchenDetailPage, CartCheckoutPage,
│   │   │                       # OrderTrackingPage, OrdersListPage, CookDashboardPage,
│   │   │                       # DeliveryDashboardPage, AdminDashboardPage, SubscriptionsPage
│   │   ├── types.ts            # Core TypeScript data contracts
│   │   ├── App.tsx             # Route orchestration
│   │   └── index.css           # Tailwind v4 theme tokens
│   ├── vite.config.ts          # Vite configuration with API proxy
│   └── package.json
├── server/                     # Modular Express REST API
│   ├── routes/                 # auth, kitchens, menu, orders, delivery, subscriptions, admin, payments
│   ├── dataStore.js            # Resilient persistence engine & realistic Indian culinary seed data
│   └── data/store.json         # Local persistent database
├── supabase/
│   └── migrations/             # PostgreSQL + PostGIS migration scripts
├── server.js                   # Main API entrypoint & static client server
├── test_integration.js         # Automated end-to-end integration test suite
├── .env.example                # Safe environment configuration template
├── package.json                # Project orchestration scripts
└── README.md                   # Platform documentation
```

---

## ⚙️ Quick Start Guide

### 1. Install Dependencies
```bash
# Install root backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Run Automated Integration Tests
Verify all API endpoints, pricing math, atomic rider assignments, and OTP verification:
```bash
npm test
```

### 3. Build Client Bundle
```bash
npm run build
```

### 4. Start the Application
```bash
npm start
```
Open your browser at **`http://localhost:5000`**.

For active frontend hot-reload during development:
```bash
# Terminal 1: API Backend
npm run dev

# Terminal 2: Vite Frontend Dev Server
npm run dev:client
```
Navigate to **`http://localhost:5173`** (Vite proxies all `/api/*` calls automatically to port 5000).

---

## 🧪 End-to-End Demonstration Walkthrough

1. **Customer Order Flow**:
   - Open `http://localhost:5000`.
   - Click on **Maa Ka Pyaar Rasoi**.
   - Add **Special Homely Rajma Chawal Combo** and **Chilled Masala Chaas** to your cart.
   - Go to Checkout, enter delivery instructions (*e.g. Less spicy*), and confirm order.
   - You are redirected to `/order/:id` with real-time tracking and an assigned **4-digit Delivery OTP**.

2. **Home Cook Fulfillment Flow**:
   - In the top-right navigation bar, click the **Role Switcher** badge and select **Home Cook View** (or navigate to `/cook`).
   - See the newly placed order in the **Incoming & Active Orders** queue.
   - Click **Accept Order** → Click **Start Cooking** → Click **Mark Food Packed**.
   - In the **Dynamic Menu Manager**, test adding a new dish or toggling items between *In Stock* and *Sold Out*.

3. **Delivery Partner Delivery Flow**:
   - Switch role to **Delivery Partner View** (or navigate to `/delivery`).
   - Under **Available Ready Orders**, see the packed order and click **Accept Delivery**.
   - Click **Confirm Picked Up** → Click **Start Transit**.
   - Click **Enter Customer OTP & Complete** and enter the 4-digit OTP from the customer's tracking screen.
   - Order is marked **Delivered**, and ₹40 is credited to the rider's earnings balance!

4. **Admin Oversight Flow**:
   - Switch role to **Platform Admin** (or navigate to `/admin`).
   - Review live GMV economics, 8% platform fee collection, and verify/unverify kitchens.

---

## 🔒 Security & Quality Standards
- No secret credentials or API keys exposed to browser clients.
- Rigorous server-side calculation of all subtotals, platform fees, and delivery charges.
- Concurrency-safe atomic locks preventing duplicate order acceptance.
- Sanitized user profiles with zero password leakage.
