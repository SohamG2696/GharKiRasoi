// server/dataStore.js - Resilient Persistence & Seed Engine for Ghar Ki Rasoi
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial Realistic Seed Data
const INITIAL_SEED = {
  users: [
    {
      id: "usr-customer-1",
      email: "customer@gharkirasoi.com",
      password: "password123",
      fullName: "Aarav Sharma",
      phone: "+91 98765 43210",
      role: "CUSTOMER",
      addresses: [
        {
          id: "addr-1",
          label: "Hostel Room 304",
          addressLine: "Boys Hostel Block B, Sector 62, Noida",
          latitude: 28.6280,
          longitude: 77.3649,
          isDefault: true
        }
      ]
    },
    {
      id: "usr-cook-1",
      email: "cook@gharkirasoi.com",
      password: "password123",
      fullName: "Shanti Devi",
      phone: "+91 98111 22334",
      role: "COOK",
      addresses: []
    },
    {
      id: "usr-cook-2",
      email: "rekha@gharkirasoi.com",
      password: "password123",
      fullName: "Rekha Patel",
      phone: "+91 98222 33445",
      role: "COOK",
      addresses: []
    },
    {
      id: "usr-rider-1",
      email: "rider@gharkirasoi.com",
      password: "password123",
      fullName: "Vikram Singh",
      phone: "+91 98333 44556",
      role: "DELIVERY_PARTNER",
      vehicleType: "Electric Scooter",
      vehicleNumber: "UP 16 AB 4589",
      isOnline: true,
      currentLat: 28.6310,
      currentLng: 77.3680,
      earnings: 320.00,
      totalDeliveries: 8
    },
    {
      id: "usr-admin-1",
      email: "admin@gharkirasoi.com",
      password: "password123",
      fullName: "Platform Administrator",
      phone: "+91 99999 88888",
      role: "ADMIN",
      addresses: []
    }
  ],
  kitchens: [
    {
      id: "ktch-1",
      ownerId: "usr-cook-1",
      name: "Maa Ka Pyaar Rasoi",
      cookName: "Shanti Devi",
      phone: "+91 98111 22334",
      description: "Authentic North Indian Ghar Ka Khana prepared with love, minimal oil, and fresh homemade masalas. Special rajma chawal and hot phulkas daily.",
      addressText: "Flat 204, Ganga Apartments, Sector 62, Noida",
      latitude: 28.6295,
      longitude: 77.3660,
      cuisineTypes: ["North Indian", "Homely Thali", "Punjabi"],
      bannerUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      isVegOnly: true,
      isOpen: true,
      isVerified: true,
      prepTimeMinutes: 25,
      startingPrice: 90,
      rating: 4.9,
      totalRatings: 42
    },
    {
      id: "ktch-2",
      ownerId: "usr-cook-2",
      name: "Annapurna Kitchen",
      cookName: "Rekha Patel",
      phone: "+91 98222 33445",
      description: "Mild and wholesome Gujarati thalis, soft theplas, kathiawadi sev tameta, and light moong dal khichdi. Perfect for daily healthy digestion.",
      addressText: "B-42, Krishna Vihar, Sector 63, Noida",
      latitude: 28.6350,
      longitude: 77.3750,
      cuisineTypes: ["Gujarati", "Jain Friendly", "Healthy"],
      bannerUrl: "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=800&q=80",
      avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80",
      isVegOnly: true,
      isOpen: true,
      isVerified: true,
      prepTimeMinutes: 20,
      startingPrice: 110,
      rating: 4.8,
      totalRatings: 31
    },
    {
      id: "ktch-3",
      ownerId: "usr-cook-1",
      name: "South Spice Homely Meals",
      cookName: "Lakshmi Amma",
      phone: "+91 98444 55667",
      description: "Traditional Tamil and Kerala homely meals. Sambar infused with homemade podi, fresh rasam, beans poriyal, and steamed parboiled ponni rice.",
      addressText: "C-12, Green Enclave, Indirapuram, Ghaziabad",
      latitude: 28.6420,
      longitude: 77.3710,
      cuisineTypes: ["South Indian", "Kerala", "Tamil"],
      bannerUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80",
      avatarUrl: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=200&q=80",
      isVegOnly: true,
      isOpen: true,
      isVerified: true,
      prepTimeMinutes: 30,
      startingPrice: 85,
      rating: 4.7,
      totalRatings: 28
    }
  ],
  menuItems: [
    // Maa Ka Pyaar Rasoi Items
    {
      id: "menu-101",
      kitchenId: "ktch-1",
      name: "Special Homely Rajma Chawal Combo",
      description: "Slow-cooked Punjabi spiced Jammu rajma served with fragrant steamed basmati rice, onion pickle, and mint chutney.",
      price: 120.00,
      category: "Thali & Combos",
      imageUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80",
      isVeg: true,
      isAvailable: true,
      dailyQuantity: 30,
      soldQuantity: 12
    },
    {
      id: "menu-102",
      kitchenId: "ktch-1",
      name: "Maa Ki Deluxe Veg Thali",
      description: "4 Hot Ghee Phulkas + Paneer Bhurji + Tadka Dal + Jeera Rice + Boondi Raita + Gulab Jamun.",
      price: 160.00,
      category: "Thali & Combos",
      imageUrl: "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=500&q=80",
      isVeg: true,
      isAvailable: true,
      dailyQuantity: 25,
      soldQuantity: 9
    },
    {
      id: "menu-103",
      kitchenId: "ktch-1",
      name: "Aloo Gobhi Adraki + 3 Phulkas",
      description: "Dry roasted potato & cauliflower cooked with ginger juliennes and whole spices, served with 3 soft whole wheat chapatis.",
      price: 100.00,
      category: "Daily Specials",
      imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=500&q=80",
      isVeg: true,
      isAvailable: true,
      dailyQuantity: 20,
      soldQuantity: 5
    },
    {
      id: "menu-104",
      kitchenId: "ktch-1",
      name: "Chilled Masala Chaas (300ml)",
      description: "Fresh homemade buttermilk tempered with roasted cumin, black salt, and coriander leaves.",
      price: 35.00,
      category: "Beverages",
      imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=500&q=80",
      isVeg: true,
      isAvailable: true,
      dailyQuantity: 40,
      soldQuantity: 18
    },
    // Annapurna Kitchen Items
    {
      id: "menu-201",
      kitchenId: "ktch-2",
      name: "Kathiawadi Sev Tameta + 4 Soft Theplas",
      description: "Tangy sweet and spicy tomato curry garnished with crisp Ratlami sev, served with 4 fenugreek spiced theplas.",
      price: 130.00,
      category: "Thali & Combos",
      imageUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=500&q=80",
      isVeg: true,
      isAvailable: true,
      dailyQuantity: 20,
      soldQuantity: 6
    },
    {
      id: "menu-202",
      kitchenId: "ktch-2",
      name: "Comfort Moong Dal Khichdi & Kadhi",
      description: "Easy on the stomach yellow moong dal khichdi prepared with desi cow ghee, served with Gujarati sweet kadhi.",
      price: 110.00,
      category: "Daily Specials",
      imageUrl: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=500&q=80",
      isVeg: true,
      isAvailable: true,
      dailyQuantity: 15,
      soldQuantity: 4
    },
    // South Spice Homely Meals Items
    {
      id: "menu-301",
      kitchenId: "ktch-3",
      name: "Traditional South Meals (Meals Thali)",
      description: "Rice, Drumstick Shallot Sambar, Pepper Rasam, Cabbage Kootu, Appalam, Curd & Pickle.",
      price: 140.00,
      category: "Thali & Combos",
      imageUrl: "https://images.unsplash.com/photo-1610057099431-d73a1c9d2f2f?auto=format&fit=crop&w=500&q=80",
      isVeg: true,
      isAvailable: true,
      dailyQuantity: 25,
      soldQuantity: 8
    }
  ],
  orders: [
    {
      id: "ord-1001",
      orderNumber: "GKR-2026-1001",
      customerId: "usr-customer-1",
      customerName: "Aarav Sharma",
      customerPhone: "+91 98765 43210",
      kitchenId: "ktch-1",
      kitchenName: "Maa Ka Pyaar Rasoi",
      items: [
        {
          id: "menu-101",
          name: "Special Homely Rajma Chawal Combo",
          price: 120.00,
          quantity: 2,
          totalPrice: 240.00
        },
        {
          id: "menu-104",
          name: "Chilled Masala Chaas (300ml)",
          price: 35.00,
          quantity: 1,
          totalPrice: 35.00
        }
      ],
      subtotal: 275.00,
      deliveryFee: 30.00,
      platformFee: 10.00,
      tax: 0.00,
      totalAmount: 315.00,
      status: "PREPARING",
      deliveryAddress: "Hostel Room 304, Boys Hostel Block B, Sector 62, Noida",
      deliveryLat: 28.6280,
      deliveryLng: 77.3649,
      specialInstructions: "Less spicy, please send extra pickle if possible.",
      deliveryOtp: "4821",
      riderId: null,
      riderName: null,
      paymentStatus: "SUCCESS",
      paymentMethod: "UPI",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      events: [
        {
          id: "evt-1",
          status: "PLACED",
          note: "Order placed by customer via UPI",
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          id: "evt-2",
          status: "ACCEPTED",
          note: "Accepted by Chef Shanti Devi",
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString()
        },
        {
          id: "evt-3",
          status: "PREPARING",
          note: "Meal is being freshly cooked on stove",
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString()
        }
      ]
    }
  ],
  subscriptions: [
    {
      id: "sub-1",
      customerId: "usr-customer-1",
      customerName: "Aarav Sharma",
      kitchenId: "ktch-1",
      kitchenName: "Maa Ka Pyaar Rasoi",
      planType: "WEEKLY",
      mealSlot: "LUNCH",
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: "ACTIVE",
      totalAmount: 750.00,
      dietaryNotes: "Pure veg, no garlic preferred in dal",
      createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    }
  ]
};

// Load or initialize store
class DataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('⚠️ Could not read store.json, resetting with initial seed:', err.message);
    }
    this.save(INITIAL_SEED);
    return JSON.parse(JSON.stringify(INITIAL_SEED));
  }

  save(dataToSave) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('❌ Failed to save store.json:', err.message);
    }
  }

  // --- Users & Auth ---
  findUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  createUser(userData) {
    const newUser = {
      id: 'usr-' + uuidv4().slice(0, 8),
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      phone: userData.phone || '',
      role: userData.role || 'CUSTOMER',
      addresses: userData.addresses || [],
      createdAt: new Date().toISOString()
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // --- Kitchens ---
  getKitchens() {
    return this.data.kitchens;
  }

  getKitchenById(id) {
    return this.data.kitchens.find(k => k.id === id);
  }

  createKitchen(kitchenData) {
    const newKitchen = {
      id: 'ktch-' + uuidv4().slice(0, 8),
      ownerId: kitchenData.ownerId,
      name: kitchenData.name,
      cookName: kitchenData.cookName,
      phone: kitchenData.phone,
      description: kitchenData.description || 'Fresh homemade food daily.',
      addressText: kitchenData.addressText || kitchenData.location || '',
      latitude: Number(kitchenData.latitude) || 28.6295,
      longitude: Number(kitchenData.longitude) || 77.3660,
      cuisineTypes: kitchenData.cuisineTypes || ["Homely Thali", "North Indian"],
      bannerUrl: kitchenData.bannerUrl || "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80",
      avatarUrl: kitchenData.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
      isVegOnly: kitchenData.isVegOnly !== undefined ? kitchenData.isVegOnly : true,
      isOpen: true,
      isVerified: true, // auto-verified for demo convenience
      prepTimeMinutes: Number(kitchenData.prepTimeMinutes) || 25,
      startingPrice: Number(kitchenData.startingPrice) || 80,
      rating: 4.8,
      totalRatings: 1,
      createdAt: new Date().toISOString()
    };
    this.data.kitchens.push(newKitchen);
    this.save();
    return newKitchen;
  }

  updateKitchen(id, updateData) {
    const idx = this.data.kitchens.findIndex(k => k.id === id);
    if (idx === -1) return null;
    this.data.kitchens[idx] = { ...this.data.kitchens[idx], ...updateData };
    this.save();
    return this.data.kitchens[idx];
  }

  // --- Dynamic Menus ---
  getMenuItems(kitchenId) {
    if (!kitchenId) return this.data.menuItems;
    return this.data.menuItems.filter(m => m.kitchenId === kitchenId);
  }

  getMenuItemById(id) {
    return this.data.menuItems.find(m => m.id === id);
  }

  createMenuItem(itemData) {
    const newItem = {
      id: 'menu-' + uuidv4().slice(0, 8),
      kitchenId: itemData.kitchenId,
      name: itemData.name,
      description: itemData.description || '',
      price: Number(itemData.price) || 50,
      category: itemData.category || 'Daily Specials',
      imageUrl: itemData.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80',
      isVeg: itemData.isVeg !== undefined ? itemData.isVeg : true,
      isAvailable: itemData.isAvailable !== undefined ? itemData.isAvailable : true,
      dailyQuantity: Number(itemData.dailyQuantity) || 30,
      soldQuantity: 0,
      createdAt: new Date().toISOString()
    };
    this.data.menuItems.push(newItem);
    this.save();
    return newItem;
  }

  updateMenuItem(id, updateData) {
    const idx = this.data.menuItems.findIndex(m => m.id === id);
    if (idx === -1) return null;
    this.data.menuItems[idx] = { ...this.data.menuItems[idx], ...updateData };
    this.save();
    return this.data.menuItems[idx];
  }

  deleteMenuItem(id) {
    const initialLen = this.data.menuItems.length;
    this.data.menuItems = this.data.menuItems.filter(m => m.id !== id);
    this.save();
    return this.data.menuItems.length < initialLen;
  }

  // --- Orders & State Machine ---
  getOrders(filter = {}) {
    let result = [...this.data.orders];
    if (filter.customerId) {
      result = result.filter(o => o.customerId === filter.customerId);
    }
    if (filter.kitchenId) {
      result = result.filter(o => o.kitchenId === filter.kitchenId);
    }
    if (filter.status) {
      result = result.filter(o => o.status === filter.status);
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getOrderById(id) {
    return this.data.orders.find(o => o.id === id || o.orderNumber === id);
  }

  createOrder(orderData) {
    const orderNumber = 'GKR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const newOrder = {
      id: 'ord-' + uuidv4().slice(0, 8),
      orderNumber,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      kitchenId: orderData.kitchenId,
      kitchenName: orderData.kitchenName,
      items: orderData.items,
      subtotal: Number(orderData.subtotal),
      deliveryFee: Number(orderData.deliveryFee || 30),
      platformFee: Number(orderData.platformFee || 10),
      tax: Number(orderData.tax || 0),
      totalAmount: Number(orderData.totalAmount),
      status: 'AWAITING_KITCHEN',
      deliveryAddress: orderData.deliveryAddress,
      deliveryLat: orderData.deliveryLat || 28.6280,
      deliveryLng: orderData.deliveryLng || 77.3649,
      specialInstructions: orderData.specialInstructions || '',
      deliveryOtp: otp,
      riderId: null,
      riderName: null,
      paymentStatus: 'SUCCESS',
      paymentMethod: orderData.paymentMethod || 'UPI',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      events: [
        {
          id: 'evt-' + uuidv4().slice(0, 6),
          status: 'AWAITING_KITCHEN',
          note: 'Order placed by customer and sent to kitchen for confirmation.',
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Update item stock counts
    orderData.items.forEach(item => {
      const dbItem = this.data.menuItems.find(m => m.id === item.id);
      if (dbItem) {
        dbItem.soldQuantity = (dbItem.soldQuantity || 0) + item.quantity;
      }
    });

    this.data.orders.push(newOrder);
    this.save();
    return newOrder;
  }

  updateOrderStatus(orderId, nextStatus, note = '', actorRole = 'SYSTEM') {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    order.status = nextStatus;
    order.updatedAt = new Date().toISOString();
    order.events.push({
      id: 'evt-' + uuidv4().slice(0, 6),
      status: nextStatus,
      note: note || `Order updated to ${nextStatus} by ${actorRole}`,
      timestamp: new Date().toISOString()
    });

    this.save();
    return order;
  }

  // --- Atomic Rider Assignment ---
  assignRider(orderId, riderId, riderName) {
    const order = this.getOrderById(orderId);
    if (!order) return { success: false, message: 'Order not found' };

    // Atomic guard: check if already assigned
    if (order.riderId && order.riderId !== riderId) {
      return { success: false, message: 'Order was already accepted by another delivery partner.' };
    }

    order.riderId = riderId;
    order.riderName = riderName;
    order.status = 'RIDER_ASSIGNED';
    order.updatedAt = new Date().toISOString();
    order.events.push({
      id: 'evt-' + uuidv4().slice(0, 6),
      status: 'RIDER_ASSIGNED',
      note: `Delivery partner ${riderName} accepted the order assignment.`,
      timestamp: new Date().toISOString()
    });

    this.save();
    return { success: true, order };
  }

  // --- Subscriptions ---
  getSubscriptions(filter = {}) {
    let result = [...this.data.subscriptions];
    if (filter.customerId) {
      result = result.filter(s => s.customerId === filter.customerId);
    }
    if (filter.kitchenId) {
      result = result.filter(s => s.kitchenId === filter.kitchenId);
    }
    return result;
  }

  createSubscription(subData) {
    const newSub = {
      id: 'sub-' + uuidv4().slice(0, 8),
      customerId: subData.customerId,
      customerName: subData.customerName,
      kitchenId: subData.kitchenId,
      kitchenName: subData.kitchenName,
      planType: subData.planType || 'WEEKLY',
      mealSlot: subData.mealSlot || 'LUNCH',
      startDate: subData.startDate || new Date().toISOString().split('T')[0],
      endDate: subData.endDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      status: 'ACTIVE',
      totalAmount: Number(subData.totalAmount) || 750,
      dietaryNotes: subData.dietaryNotes || '',
      createdAt: new Date().toISOString()
    };
    this.data.subscriptions.push(newSub);
    this.save();
    return newSub;
  }
}

const store = new DataStore();
module.exports = store;
