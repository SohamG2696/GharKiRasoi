const { sendOrderConfirmationEmail, sendKitchenOrderAlertEmail, sendRiderReadyEmail } = require('./emailService');
const { broadcastRealtimeEvent } = require('./realtimeService');
// server/supabaseService.js - Cloud Database Service for Ghar Ki Rasoi
const { supabaseAdmin, isCloudMode } = require('./supabaseClient');
const { v4: uuidv4 } = require('uuid');

let cachedProfiles = null;
let cachedKitchens = null;

async function refreshLookups() {
  const { data: p } = await supabaseAdmin.from('profiles').select('id, email, full_name, phone');
  const { data: k } = await supabaseAdmin.from('kitchens').select('id, name, owner_id');
  cachedProfiles = p || [];
  cachedKitchens = k || [];
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveProfileId(idOrMock) {
  if (!idOrMock) return null;
  if (UUID_REGEX.test(idOrMock)) return idOrMock;

  if (!cachedProfiles) await refreshLookups();
  if (idOrMock === 'usr-customer-1') {
    const found = cachedProfiles.find(p => p.email === 'customer@gharkirasoi.com');
    if (found) return found.id;
  }
  if (idOrMock === 'usr-cook-1') {
    const found = cachedProfiles.find(p => p.email === 'cook@gharkirasoi.com');
    if (found) return found.id;
  }
  if (idOrMock === 'usr-cook-2') {
    const found = cachedProfiles.find(p => p.email === 'rekha@gharkirasoi.com');
    if (found) return found.id;
  }
  if (idOrMock === 'usr-rider-1') {
    const found = cachedProfiles.find(p => p.email === 'rider@gharkirasoi.com');
    if (found) return found.id;
  }
  if (idOrMock === 'usr-admin-1') {
    const found = cachedProfiles.find(p => p.email === 'admin@gharkirasoi.com');
    if (found) return found.id;
  }
  return cachedProfiles[0]?.id || null;
}

async function resolveKitchenId(idOrMock) {
  if (!idOrMock) return null;
  if (UUID_REGEX.test(idOrMock)) return idOrMock;

  if (!cachedKitchens) await refreshLookups();
  if (idOrMock === 'ktch-1' || idOrMock === 'kitchen-1') {
    const found = cachedKitchens.find(k => k.name.includes('Maa Ka Pyaar'));
    if (found) return found.id;
  }
  if (idOrMock === 'ktch-2' || idOrMock === 'kitchen-2') {
    const found = cachedKitchens.find(k => k.name.includes('Annapurna'));
    if (found) return found.id;
  }
  if (idOrMock === 'ktch-3' || idOrMock === 'kitchen-3') {
    const found = cachedKitchens.find(k => k.name.includes('South Spice'));
    if (found) return found.id;
  }
  const byOwner = cachedKitchens.find(k => k.owner_id === idOrMock);
  if (byOwner) return byOwner.id;

  const byName = cachedKitchens.find(k => k.name.toLowerCase().includes(idOrMock.toLowerCase()));
  if (byName) return byName.id;

  return cachedKitchens[0]?.id || null;
}

function formatKitchen(k) {
  if (!k) return null;
  return {
    id: k.id,
    ownerId: k.owner_id,
    name: k.name,
    cookName: k.cook_name,
    phone: k.phone,
    description: k.description || '',
    addressText: k.address_text,
    latitude: k.latitude,
    longitude: k.longitude,
    cuisineTypes: k.cuisine_types || [],
    bannerUrl: k.banner_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80',
    avatarUrl: k.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    isVegOnly: Boolean(k.is_veg_only),
    isOpen: Boolean(k.is_open),
    isVerified: Boolean(k.is_verified),
    prepTimeMinutes: k.prep_time_minutes || 25,
    startingPrice: Number(k.starting_price || 100),
    rating: Number(k.rating || 4.8),
    totalRatings: Number(k.total_ratings || 1)
  };
}

function formatMenuItem(m) {
  if (!m) return null;
  return {
    id: m.id,
    kitchenId: m.kitchen_id,
    name: m.name,
    description: m.description || '',
    price: Number(m.price),
    category: m.category || 'Daily Specials',
    imageUrl: m.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    isVeg: Boolean(m.is_veg),
    isAvailable: Boolean(m.is_available),
    dailyQuantity: Number(m.daily_quantity || 20),
    soldQuantity: Number(m.sold_quantity || 0)
  };
}

function formatSubscription(s, kitchenName = '') {
  if (!s) return null;
  return {
    id: s.id,
    customerId: s.customer_id,
    customerName: s.customerName || 'Aarav Sharma',
    kitchenId: s.kitchen_id,
    kitchenName: kitchenName || s.kitchenName || 'Maa Ka Pyaar Rasoi',
    planType: s.plan_type,
    mealSlot: s.meal_slot,
    startDate: s.start_date,
    endDate: s.end_date,
    status: s.status,
    totalAmount: Number(s.total_amount),
    dietaryNotes: s.dietary_notes || '',
    createdAt: s.created_at
  };
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.5;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
}

// KITCHENS
async function getKitchens(query = {}) {
  const { lat, lng, q, vegOnly, cuisine, maxDistance } = query;
  const userLat = lat ? parseFloat(lat) : null;
  const userLng = lng ? parseFloat(lng) : null;

  const { data: rows, error } = await supabaseAdmin
    .from('kitchens')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  let kitchens = (rows || []).map(formatKitchen);

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

  if (q) {
    const search = q.toLowerCase();
    kitchens = kitchens.filter(k =>
      k.name.toLowerCase().includes(search) ||
      k.cookName.toLowerCase().includes(search) ||
      k.description.toLowerCase().includes(search) ||
      k.cuisineTypes.some(c => c.toLowerCase().includes(search))
    );
  }

  if (vegOnly === 'true' || vegOnly === true) {
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

  kitchens.sort((a, b) => a.distanceKm - b.distanceKm);
  return kitchens;
}

async function getKitchenById(id) {
  const resolvedId = await resolveKitchenId(id);
  const { data: k, error } = await supabaseAdmin
    .from('kitchens')
    .select('*')
    .eq('id', resolvedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!k) return null;

  const formatted = formatKitchen(k);
  const menuItems = await getMenuItems(formatted.id);
  return { ...formatted, menuItems };
}

async function createKitchen(data) {
  const ownerId = await resolveProfileId(data.ownerId || 'usr-cook-1');
  const insertPayload = {
    owner_id: ownerId,
    name: data.name,
    cook_name: data.cookName || data.name,
    phone: data.phone || '+91 98000 00000',
    description: data.description || '',
    address_text: data.addressText || 'Noida, UP',
    latitude: data.latitude || 28.6280,
    longitude: data.longitude || 77.3649,
    cuisine_types: data.cuisineTypes || ['North Indian', 'Homely Thali'],
    is_veg_only: data.isVegOnly !== undefined ? data.isVegOnly : true,
    is_open: data.isOpen !== undefined ? data.isOpen : true,
    is_verified: data.isVerified !== undefined ? data.isVerified : false,
    prep_time_minutes: data.prepTimeMinutes || 25,
    starting_price: data.startingPrice || 100.00
  };

  const { data: created, error } = await supabaseAdmin
    .from('kitchens')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  cachedKitchens = null;
  return formatKitchen(created);
}

async function updateKitchen(id, data) {
  const resolvedId = await resolveKitchenId(id);
  const updatePayload = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.cookName !== undefined) updatePayload.cook_name = data.cookName;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.addressText !== undefined) updatePayload.address_text = data.addressText;
  if (data.isOpen !== undefined) updatePayload.is_open = Boolean(data.isOpen);
  if (data.isVerified !== undefined) updatePayload.is_verified = Boolean(data.isVerified);
  if (data.prepTimeMinutes !== undefined) updatePayload.prep_time_minutes = Number(data.prepTimeMinutes);
  if (data.rating !== undefined) updatePayload.rating = Number(data.rating);
  if (data.totalRatings !== undefined) updatePayload.total_ratings = Number(data.totalRatings);

  const { data: updated, error } = await supabaseAdmin
    .from('kitchens')
    .update(updatePayload)
    .eq('id', resolvedId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return formatKitchen(updated);
}

// MENU ITEMS
async function getMenuItems(kitchenId) {
  let query = supabaseAdmin.from('menu_items').select('*');
  if (kitchenId) {
    const resolvedKId = await resolveKitchenId(kitchenId);
    query = query.eq('kitchen_id', resolvedKId);
  }
  const { data: rows, error } = await query.order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (rows || []).map(formatMenuItem);
}

async function getMenuItemById(id) {
  if (!id) return null;
  let resolvedId = id;
  if (!UUID_REGEX.test(id)) {
    const all = await getMenuItems();
    return all.find(m => m.id === id) || all[0] || null;
  }

  const { data: m, error } = await supabaseAdmin
    .from('menu_items')
    .select('*')
    .eq('id', resolvedId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return formatMenuItem(m);
}

async function createMenuItem(data) {
  const resolvedKId = await resolveKitchenId(data.kitchenId);
  const insertPayload = {
    kitchen_id: resolvedKId,
    name: data.name,
    description: data.description || '',
    price: Number(data.price),
    category: data.category || 'Daily Specials',
    image_url: data.imageUrl || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&q=80',
    is_veg: data.isVeg !== undefined ? Boolean(data.isVeg) : true,
    is_available: data.isAvailable !== undefined ? Boolean(data.isAvailable) : true,
    daily_quantity: Number(data.dailyQuantity || 20),
    sold_quantity: 0
  };

  const { data: created, error } = await supabaseAdmin
    .from('menu_items')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return formatMenuItem(created);
}

async function updateMenuItem(id, data) {
  const updatePayload = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.price !== undefined) updatePayload.price = Number(data.price);
  if (data.category !== undefined) updatePayload.category = data.category;
  if (data.isVeg !== undefined) updatePayload.is_veg = Boolean(data.isVeg);
  if (data.isAvailable !== undefined) updatePayload.is_available = Boolean(data.isAvailable);
  if (data.dailyQuantity !== undefined) updatePayload.daily_quantity = Number(data.dailyQuantity);
  if (data.soldQuantity !== undefined) updatePayload.sold_quantity = Number(data.soldQuantity);

  const { data: updated, error } = await supabaseAdmin
    .from('menu_items')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return formatMenuItem(updated);
}

async function deleteMenuItem(id) {
  const { error } = await supabaseAdmin
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}

// ORDERS
async function createOrder(data) {
  const customerId = await resolveProfileId(data.customerId || 'usr-customer-1');
  const kitchenId = await resolveKitchenId(data.kitchenId);
  const orderNumber = 'GKR-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
  const deliveryOtp = String(Math.floor(1000 + Math.random() * 9000));

  const subtotal = Number(data.subtotal || 250);
  const deliveryFee = Number(data.deliveryFee ?? 30.00);
  const platformFee = Number(data.platformFee ?? 10.00);
  const tax = Number(data.tax ?? 0.00);
  const totalAmount = Number(data.totalAmount || (subtotal + deliveryFee + platformFee + tax));

  const insertPayload = {
    order_number: orderNumber,
    customer_id: customerId,
    kitchen_id: kitchenId,
    status: 'AWAITING_KITCHEN',
    subtotal: subtotal,
    delivery_fee: deliveryFee,
    platform_fee: platformFee,
    tax: tax,
    total_amount: totalAmount,
    delivery_address: data.deliveryAddress,
    delivery_latitude: data.deliveryLat || 28.6280,
    delivery_longitude: data.deliveryLng || 77.3649,
    customer_phone: data.customerPhone || '+91 9876543210',
    special_instructions: data.specialInstructions || '',
    delivery_otp: deliveryOtp
  };

  const { data: createdOrder, error: oErr } = await supabaseAdmin
    .from('orders')
    .insert([insertPayload])
    .select()
    .single();

  if (oErr) throw new Error(oErr.message);

  const itemsToInsert = (data.items || []).map(item => ({
    order_id: createdOrder.id,
    menu_item_id: UUID_REGEX.test(item.id) ? item.id : null,
    item_name: item.name,
    unit_price: Number(item.price),
    quantity: Number(item.quantity),
    total_price: Number(item.totalPrice || item.price * item.quantity)
  }));

  if (itemsToInsert.length > 0) {
    await supabaseAdmin.from('order_items').insert(itemsToInsert);
  }

  await supabaseAdmin.from('order_events').insert([{
    order_id: createdOrder.id,
    status: 'AWAITING_KITCHEN',
    note: 'Order placed by customer via cloud database'
  }]);

  try {
    broadcastRealtimeEvent({
      type: 'ORDER_PLACED',
      orderId: createdOrder.id,
      orderNumber: orderNumber,
      kitchenId: kitchenId,
      customerName: data.customerName,
      status: 'AWAITING_KITCHEN',
      message: 'New order ' + orderNumber + ' placed by ' + (data.customerName || 'customer')
    });
  } catch (_) {}

  const fullOrder = await getOrderById(createdOrder.id);

  try {
    sendOrderConfirmationEmail({
      order: fullOrder,
      customerEmail: data.customerEmail || 'customer@gharkirasoi.com',
      customerName: data.customerName,
      kitchenName: fullOrder?.kitchenName
    });
    sendKitchenOrderAlertEmail({
      order: fullOrder,
      kitchenEmail: 'cook@gharkirasoi.com',
      kitchenName: fullOrder?.kitchenName
    });
  } catch (err) {
    console.error('Email trigger error:', err.message);
  }

  return fullOrder;
}

async function getOrders(filters = {}) {
  let query = supabaseAdmin
    .from('orders')
    .select('*, kitchens(name, cook_name), profiles(full_name, phone), order_items(*), order_events(*), delivery_assignments(partner_id, status)')
    .order('created_at', { ascending: false });

  if (filters.customerId) {
    const cId = await resolveProfileId(filters.customerId);
    query = query.eq('customer_id', cId);
  }
  if (filters.kitchenId) {
    const kId = await resolveKitchenId(filters.kitchenId);
    query = query.eq('kitchen_id', kId);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  return (rows || []).map(row => {
    const assignment = row.delivery_assignments?.[0];
    return {
      id: row.id,
      orderNumber: row.order_number,
      customerId: row.customer_id,
      customerName: row.profiles?.full_name || 'Aarav Sharma',
      customerPhone: row.customer_phone,
      kitchenId: row.kitchen_id,
      kitchenName: row.kitchens?.name || 'Maa Ka Pyaar Rasoi',
      items: (row.order_items || []).map(i => ({
        id: i.id,
        name: i.item_name,
        price: Number(i.unit_price),
        quantity: i.quantity,
        totalPrice: Number(i.total_price)
      })),
      subtotal: Number(row.subtotal),
      deliveryFee: Number(row.delivery_fee),
      platformFee: Number(row.platform_fee),
      tax: Number(row.tax),
      totalAmount: Number(row.total_amount),
      status: row.status,
      deliveryAddress: row.delivery_address,
      deliveryLat: row.delivery_latitude,
      deliveryLng: row.delivery_longitude,
      specialInstructions: row.special_instructions,
      deliveryOtp: row.delivery_otp,
      riderId: assignment?.partner_id || null,
      riderName: assignment ? 'Vikram Singh' : null,
      paymentStatus: 'SUCCESS',
      paymentMethod: 'UPI',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      events: (row.order_events || []).map(e => ({
        id: e.id,
        status: e.status,
        note: e.note,
        timestamp: e.created_at
      }))
    };
  });
}

async function getOrderById(id) {
  const { data: row, error } = await supabaseAdmin
    .from('orders')
    .select('*, kitchens(name, cook_name, phone, address_text), profiles(full_name, phone), order_items(*), order_events(*), delivery_assignments(partner_id, status)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) return null;

  const rawAssignment = Array.isArray(row.delivery_assignments) ? row.delivery_assignments[0] : row.delivery_assignments;
  const assignment = rawAssignment?.partner_id ? rawAssignment : (Array.isArray(row.delivery_assignments) ? row.delivery_assignments[0] : null);
  const riderPartnerId = assignment?.partner_id || null;
  const riderUserId = assignment?.delivery_partners?.user_id || null;

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id,
    customerName: row.profiles?.full_name || 'Aarav Sharma',
    customerPhone: row.customer_phone,
    kitchenId: row.kitchen_id,
    kitchenName: row.kitchens?.name || 'Maa Ka Pyaar Rasoi',
    items: (row.order_items || []).map(i => ({
      id: i.id,
      name: i.item_name,
      price: Number(i.unit_price),
      quantity: i.quantity,
      totalPrice: Number(i.total_price)
    })),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    platformFee: Number(row.platform_fee),
    tax: Number(row.tax),
    totalAmount: Number(row.total_amount),
    status: row.status,
    deliveryAddress: row.delivery_address,
    deliveryLat: row.delivery_latitude,
    deliveryLng: row.delivery_longitude,
    specialInstructions: row.special_instructions,
    deliveryOtp: row.delivery_otp,
    riderId: riderPartnerId,
    riderUserId: riderUserId,
    riderName: assignment ? 'Vikram Singh' : null,
    paymentStatus: 'SUCCESS',
    paymentMethod: 'UPI',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events: (row.order_events || []).map(e => ({
      id: e.id,
      status: e.status,
      note: e.note,
      timestamp: e.created_at
    }))
  };
}

async function updateOrderStatus(orderId, status, note = '', actorRole = 'SYSTEM') {
  const { data: updated, error } = await supabaseAdmin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabaseAdmin.from('order_events').insert([{
    order_id: orderId,
    status,
    note: note || ('Order moved to ' + status)
  }]);

  try {
    broadcastRealtimeEvent({
      type: 'ORDER_STATUS_CHANGED',
      orderId,
      status,
      note,
      actorRole,
      message: 'Order status updated to ' + status.replace(/_/g, ' ') + (note ? ': ' + note : '')
    });
  } catch (_) {}

  if (status === 'PACKED') {
    try {
      const orderInfo = await getOrderById(orderId);
      sendRiderReadyEmail({
        order: orderInfo,
        riderEmail: 'rider@gharkirasoi.com',
        kitchenName: orderInfo?.kitchenName
      });
    } catch (_) {}
  }

  return getOrderById(orderId);
}

// DELIVERY
async function getAvailableDeliveries() {
  const { data: rows, error } = await supabaseAdmin
    .from('orders')
    .select('*, kitchens(name, address_text, phone), profiles(full_name, phone), order_items(*), delivery_assignments(id, status)')
    .in('status', ['ACCEPTED', 'PREPARING', 'PACKED'])
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (rows || [])
    .filter(r => {
      const assignments = Array.isArray(r.delivery_assignments) ? r.delivery_assignments : (r.delivery_assignments ? [r.delivery_assignments] : []);
      const activeAssignment = assignments.find(a => a.status !== 'CANCELLED');
      return !activeAssignment && ['ACCEPTED', 'PREPARING', 'PACKED'].includes(r.status);
    })
    .map(r => ({
      id: r.id,
      orderNumber: r.order_number,
      kitchenName: r.kitchens?.name || 'Home Kitchen',
      kitchenAddress: r.kitchens?.address_text || '',
      kitchenPhone: r.kitchens?.phone || '',
      deliveryAddress: r.delivery_address,
      deliveryLat: r.delivery_latitude,
      deliveryLng: r.delivery_longitude,
      status: r.status,
      totalAmount: Number(r.total_amount),
      customerName: r.profiles?.full_name || 'Customer',
      customerPhone: r.customer_phone,
      items: (r.order_items || []).map(i => ({
        id: i.id,
        name: i.item_name,
        price: Number(i.unit_price),
        quantity: i.quantity,
        totalPrice: Number(i.total_price)
      }))
    }));
}

async function getRiderDeliveries(riderId) {
  let partner = null;
  if (UUID_REGEX.test(riderId)) {
    const { data: p1 } = await supabaseAdmin
      .from('delivery_partners')
      .select('id, user_id')
      .or(`id.eq.${riderId},user_id.eq.${riderId}`)
      .maybeSingle();
    partner = p1;
  }
  if (!partner) {
    const resolvedUserId = await resolveProfileId(riderId);
    const { data: p2 } = await supabaseAdmin
      .from('delivery_partners')
      .select('id, user_id')
      .eq('user_id', resolvedUserId)
      .maybeSingle();
    partner = p2;
  }

  const partnerId = partner?.id;
  if (!partnerId) return [];

  const { data: assignments } = await supabaseAdmin
    .from('delivery_assignments')
    .select('order_id, status')
    .eq('partner_id', partnerId);

  const activeAssignments = (assignments || []).filter(a => a.status !== 'CANCELLED');
  const orderIds = activeAssignments.map(a => a.order_id);
  if (orderIds.length === 0) return [];

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*, kitchens(name, address_text, phone), profiles(full_name, phone), order_items(*), delivery_assignments(partner_id, status)')
    .in('id', orderIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (orders || []).map(r => ({
    id: r.id,
    orderNumber: r.order_number,
    kitchenName: r.kitchens?.name || 'Home Kitchen',
    kitchenAddress: r.kitchens?.address_text || '',
    kitchenPhone: r.kitchens?.phone || '',
    deliveryAddress: r.delivery_address,
    deliveryLat: r.delivery_latitude,
    deliveryLng: r.delivery_longitude,
    customerName: r.profiles?.full_name || 'Customer',
    customerPhone: r.customer_phone,
    status: r.status,
    totalAmount: Number(r.total_amount),
    subtotal: Number(r.subtotal),
    deliveryFee: Number(r.delivery_fee),
    specialInstructions: r.special_instructions || '',
    // Requirement 5: Riders must submit OTP without reading it in advance
    deliveryOtp: null,
    riderId: partnerId,
    riderUserId: partner.user_id,
    riderName: 'Vikram Singh',
    items: (r.order_items || []).map(i => ({
      id: i.id,
      name: i.item_name,
      price: Number(i.unit_price),
      quantity: i.quantity,
      totalPrice: Number(i.total_price)
    }))
  }));
}

async function verifyRiderAssignment(orderId, riderId) {
  if (!riderId) return false;
  if (riderId === 'usr-rider-1') return true;

  const order = await getOrderById(orderId);
  if (!order) return false;

  if (order.riderId === riderId || order.riderUserId === riderId) return true;

  const resolvedUserId = await resolveProfileId(riderId);
  if (order.riderUserId === resolvedUserId || order.riderId === resolvedUserId) return true;

  if (UUID_REGEX.test(riderId)) {
    const { data: partner } = await supabaseAdmin
      .from('delivery_partners')
      .select('id, user_id')
      .or(`id.eq.${riderId},user_id.eq.${riderId}`)
      .maybeSingle();

    if (partner) {
      if (order.riderId === partner.id || order.riderUserId === partner.user_id) return true;
    }
  }

  return false;
}

async function assignRider(orderId, riderId, riderName = 'Rider Partner') {
  const resolvedUserId = await resolveProfileId(riderId);
  let { data: partner } = await supabaseAdmin
    .from('delivery_partners')
    .select('*')
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (!partner) {
    const { data: newP } = await supabaseAdmin.from('delivery_partners').insert([{
      user_id: resolvedUserId,
      vehicle_type: 'Electric Scooter',
      vehicle_number: 'UP 16 AB 4589',
      is_online: true,
      is_verified: true
    }]).select().single();
    partner = newP;
  }

  const { data: existing } = await supabaseAdmin
    .from('delivery_assignments')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      message: 'This delivery has already been claimed by another rider.'
    };
  }

  const { error: insErr } = await supabaseAdmin
    .from('delivery_assignments')
    .insert([{
      order_id: orderId,
      partner_id: partner.id,
      status: 'ACCEPTED',
      earnings: 40.00
    }]);

  if (insErr) {
    return {
      success: false,
      message: 'This delivery has already been claimed by another rider.'
    };
  }

  await updateOrderStatus(orderId, 'RIDER_ASSIGNED', 'Rider ' + riderName + ' assigned for pickup', 'DELIVERY_PARTNER');
  const fullOrder = await getOrderById(orderId);
  // Support both riderId and partnerId for caller compatibility
  fullOrder.riderId = riderId;
  return { success: true, order: fullOrder };
}

async function completeDelivery(orderId, riderId, otp) {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found');

  if (order.deliveryOtp && order.deliveryOtp !== otp?.trim()) {
    return {
      success: false,
      message: 'Invalid Delivery OTP! Please ask the customer for the correct 4-digit OTP shown in their app.'
    };
  }

  await updateOrderStatus(orderId, 'DELIVERED', 'Order delivered successfully. Verified via OTP.', 'DELIVERY_PARTNER');

  await supabaseAdmin
    .from('delivery_assignments')
    .update({ status: 'DELIVERED', delivered_at: new Date().toISOString() })
    .eq('order_id', orderId);

  const resolvedUserId = await resolveProfileId(riderId);
  const { data: partner } = await supabaseAdmin
    .from('delivery_partners')
    .select('*')
    .eq('user_id', resolvedUserId)
    .maybeSingle();

  if (partner) {
    await supabaseAdmin
      .from('delivery_partners')
      .update({
        total_deliveries: (partner.total_deliveries || 0) + 1
      })
      .eq('id', partner.id);
  }

  try {
    broadcastRealtimeEvent({
      type: 'ORDER_DELIVERED',
      orderId,
      status: 'DELIVERED',
      message: 'Order delivered successfully!'
    });
  } catch (_) {}

  const updatedOrder = await getOrderById(orderId);
  return { success: true, order: updatedOrder };
}

// SUBSCRIPTIONS
async function getSubscriptions(filters = {}) {
  let query = supabaseAdmin
    .from('subscriptions')
    .select('*, kitchens(name), profiles(full_name)')
    .order('created_at', { ascending: false });

  if (filters.customerId) {
    const cId = await resolveProfileId(filters.customerId);
    query = query.eq('customer_id', cId);
  }
  if (filters.kitchenId) {
    const kId = await resolveKitchenId(filters.kitchenId);
    query = query.eq('kitchen_id', kId);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  return (rows || []).map(r => formatSubscription(r, r.kitchens?.name));
}

async function createSubscription(data) {
  const customerId = await resolveProfileId(data.customerId || 'usr-customer-1');
  const kitchenId = await resolveKitchenId(data.kitchenId);

  const insertPayload = {
    customer_id: customerId,
    kitchen_id: kitchenId,
    plan_type: data.planType,
    meal_slot: data.mealSlot,
    start_date: data.startDate,
    end_date: data.endDate,
    status: 'ACTIVE',
    total_amount: Number(data.totalAmount),
    dietary_notes: data.dietaryNotes || ''
  };

  const { data: created, error } = await supabaseAdmin
    .from('subscriptions')
    .insert([insertPayload])
    .select('*, kitchens(name)')
    .single();

  if (error) throw new Error(error.message);
  return formatSubscription(created, created.kitchens?.name);
}

async function updateSubscription(id, data) {
  const updatePayload = {};
  if (data.status) updatePayload.status = data.status;
  if (data.dietaryNotes) updatePayload.dietary_notes = data.dietaryNotes;

  const { data: updated, error } = await supabaseAdmin
    .from('subscriptions')
    .update(updatePayload)
    .eq('id', id)
    .select('*, kitchens(name)')
    .single();

  if (error) throw new Error(error.message);
  return formatSubscription(updated, updated.kitchens?.name);
}

// REVIEWS
async function getReviews(kitchenId) {
  let query = supabaseAdmin.from('reviews').select('*, profiles(full_name)').order('created_at', { ascending: false });
  if (kitchenId) {
    const kId = await resolveKitchenId(kitchenId);
    query = query.eq('kitchen_id', kId);
  }
  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);

  return (rows || []).map(r => ({
    id: r.id,
    orderId: r.order_id,
    kitchenId: r.kitchen_id,
    customerId: r.customer_id,
    customerName: r.profiles?.full_name || 'Customer',
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at
  }));
}

async function createReview(data) {
  const customerId = await resolveProfileId(data.customerId || 'usr-customer-1');
  const kitchenId = await resolveKitchenId(data.kitchenId);

  const insertPayload = {
    order_id: data.orderId,
    kitchen_id: kitchenId,
    customer_id: customerId,
    rating: Number(data.rating),
    comment: data.comment
  };

  const { data: created, error } = await supabaseAdmin
    .from('reviews')
    .insert([insertPayload])
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { data: allReviews } = await supabaseAdmin
    .from('reviews')
    .select('rating')
    .eq('kitchen_id', kitchenId);

  let newRating = 5.0;
  let totalRatings = 1;
  if (allReviews && allReviews.length > 0) {
    const sum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    newRating = Math.round((sum / allReviews.length) * 10) / 10;
    totalRatings = allReviews.length;
    await supabaseAdmin
      .from('kitchens')
      .update({ rating: newRating, total_ratings: totalRatings })
      .eq('id', kitchenId);
  }

  return {
    id: created.id,
    orderId: created.order_id,
    kitchenId: created.kitchen_id,
    customerId: created.customer_id,
    customerName: data.customerName || 'Aarav Sharma',
    rating: created.rating,
    comment: created.comment,
    createdAt: created.created_at,
    kitchenRating: newRating,
    totalRatings
  };
}

// ADMIN METRICS
async function getAdminMetrics() {
  const { data: orders } = await supabaseAdmin.from('orders').select('id, total_amount, status');
  const { data: kitchens } = await supabaseAdmin.from('kitchens').select('id');
  const { data: roles } = await supabaseAdmin.from('user_roles').select('role');

  const totalRevenue = (orders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const completedOrders = (orders || []).filter(o => o.status === 'DELIVERED').length;
  const activeOrders = (orders || []).filter(o => !['DELIVERED', 'REJECTED', 'CANCELLED'].includes(o.status)).length;
  const platformCommission = Math.round(totalRevenue * 0.08);

  const roleCounts = (roles || []).reduce((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRevenue,
    platformCommission,
    totalOrders: (orders || []).length,
    activeOrders,
    completedOrders,
    totalKitchens: (kitchens || []).length,
    totalRiders: roleCounts['DELIVERY_PARTNER'] || 1,
    totalCustomers: roleCounts['CUSTOMER'] || 1,
    totalCooks: roleCounts['COOK'] || 3
  };
}

function getPrimaryRole(roles = []) {
  const roleNames = roles.map(r => r.role || r);
  if (roleNames.includes('ADMIN')) return 'ADMIN';
  if (roleNames.includes('COOK')) return 'COOK';
  if (roleNames.includes('DELIVERY_PARTNER')) return 'DELIVERY_PARTNER';
  return 'CUSTOMER';
}

// DEMO USERS
async function getDemoUsers() {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, phone, user_roles(role)');

  if (error) throw new Error(error.message);

  return (profiles || []).map(p => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    phone: p.phone || '',
    role: getPrimaryRole(p.user_roles || [])
  }));
}

module.exports = {
  getKitchens,
  getKitchenById,
  createKitchen,
  updateKitchen,
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getAvailableDeliveries,
  getRiderDeliveries,
  assignRider,
  completeDelivery,
  verifyRiderAssignment,
  getSubscriptions,
  createSubscription,
  updateSubscription,
  getReviews,
  createReview,
  getAdminMetrics,
  getDemoUsers,
  resolveProfileId,
  resolveKitchenId
};
