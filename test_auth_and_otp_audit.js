// test_auth_and_otp_audit.js
const assert = require('assert');
const API_BASE = 'http://localhost:5005/api';

const ROLES = [
  { role: 'CUSTOMER', email: 'customer@gharkirasoi.com', pass: 'GharKiRasoi@2026' },
  { role: 'COOK', email: 'cook@gharkirasoi.com', pass: 'GharKiRasoi@2026' },
  { role: 'DELIVERY_PARTNER', email: 'rider@gharkirasoi.com', pass: 'GharKiRasoi@2026' },
  { role: 'ADMIN', email: 'admin@gharkirasoi.com', pass: 'GharKiRasoi@2026' }
];

async function runAudit() {
  console.log('================================================================');
  console.log('🔒 1. AUDITING REAL SUPABASE AUTH SESSIONS FOR ALL 4 ROLES');
  console.log('================================================================');

  const sessions = {};

  for (const r of ROLES) {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.email, password: r.pass })
    });

    if (!loginRes.ok) {
      console.error(`❌ Failed to sign in as ${r.role} (${r.email}):`, await loginRes.text());
      process.exit(1);
    }

    const data = await loginRes.json();
    console.log(`✅ [${r.role}] Authenticated via Supabase Cloud!`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Name: ${data.user.fullName || data.user.name}`);
    console.log(`   Role Claim: ${data.user.role}`);
    console.log(`   Supabase JWT Token: ${data.token.slice(0, 30)}... (length: ${data.token.length})`);
    sessions[r.role] = {
      token: data.token,
      userId: data.user.id,
      email: r.email
    };
  }

  console.log('\n================================================================');
  console.log('🔍 2. AUDITING DELIVERY OTP EXPOSURE & ROLE DATA ISOLATION');
  console.log('================================================================');

  // Fetch kitchen and dish
  const resKitchens = await fetch(`${API_BASE}/kitchens`);
  const kitchens = await resKitchens.json();
  const targetKitchen = kitchens.find(k => k.name.includes('Maa Ka Pyaar')) || kitchens[0];
  const targetDish = targetKitchen.menuItems?.[0] || (await (await fetch(`${API_BASE}/kitchens/${targetKitchen.id}`)).json()).menuItems[0];

  const orderPayload = {
    customerId: sessions.CUSTOMER.userId,
    customerName: 'Aarav Sharma (OTP Security Audit)',
    customerPhone: '+91 98765 43210',
    deliveryAddress: 'Hostel Tower B, Room 402, Sector 62, Noida',
    kitchenId: targetKitchen.id,
    items: [{ id: targetDish.id, quantity: 2 }],
    specialInstructions: 'Do not disclose OTP to rider until arrived'
  };

  const createRes = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.CUSTOMER.token}`,
      'x-demo-role': 'CUSTOMER'
    },
    body: JSON.stringify(orderPayload)
  });

  assert.strictEqual(createRes.status, 201, 'Order creation must succeed with 201');
  const { order } = await createRes.json();
  const orderId = order.id;
  const realOtp = order.deliveryOtp;

  console.log(`📦 Created Test Order: ${order.orderNumber} (ID: ${orderId})`);
  console.log(`🔑 Customer's Received Order OTP at Checkout: [${realOtp}]`);
  assert(realOtp, 'Customer must receive delivery OTP');

  // Move order to PACKED so rider can see it
  await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.COOK.token}`,
      'x-demo-role': 'COOK'
    },
    body: JSON.stringify({ status: 'ACCEPTED', actorRole: 'COOK' })
  });
  await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.COOK.token}`,
      'x-demo-role': 'COOK'
    },
    body: JSON.stringify({ status: 'PACKED', actorRole: 'COOK' })
  });

  // 1. Check if rider can read OTP via GET /api/orders/:id
  const riderGetOrderRes = await fetch(`${API_BASE}/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    }
  });
  const riderOrderView = await riderGetOrderRes.json();
  const exposedRiderOtp = riderOrderView.order ? riderOrderView.order.deliveryOtp : riderOrderView.deliveryOtp;
  if (exposedRiderOtp !== undefined && exposedRiderOtp !== null) {
    console.error(`❌ SECURITY BREACH: Delivery Partner was able to read deliveryOtp via GET /orders/:id! Value: ${exposedRiderOtp}`);
    process.exit(1);
  } else {
    console.log(`✅ [SECURE] Delivery Partner querying GET /orders/:id CANNOT read OTP (redacted: ${exposedRiderOtp})`);
  }

  // 2. Check if rider can read OTP via GET /api/delivery/available-orders
  const availableRes = await fetch(`${API_BASE}/delivery/available-orders`, {
    headers: {
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    }
  });
  const availableOrders = await availableRes.json();
  const orderList = Array.isArray(availableOrders) ? availableOrders : (availableOrders.availableOrders || []);
  const matchedAvail = orderList.find(o => o.id === orderId);
  if (matchedAvail && matchedAvail.deliveryOtp) {
    console.error(`❌ SECURITY BREACH: Delivery Partner was able to read deliveryOtp in available orders! Value: ${matchedAvail.deliveryOtp}`);
    process.exit(1);
  } else {
    console.log(`✅ [SECURE] Delivery Partner /delivery/available-orders does NOT leak OTP (omitted/null)`);
  }

  // Assign order to rider
  const realRiderId = sessions.DELIVERY_PARTNER.userId;
  const acceptRes = await fetch(`${API_BASE}/delivery/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    },
    body: JSON.stringify({ orderId, riderId: realRiderId, riderName: 'Vikram Singh' })
  });
  assert.strictEqual(acceptRes.status, 200, 'Rider accept delivery must return 200');

  // 3. Check if rider can read OTP via GET /api/delivery/my-deliveries
  const myDeliveriesRes = await fetch(`${API_BASE}/delivery/my-deliveries?riderId=${realRiderId}`, {
    headers: {
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    }
  });
  const myDeliveries = await myDeliveriesRes.json();
  const activeTask = myDeliveries.find(o => o.id === orderId);
  assert(activeTask, 'Order must appear in rider active deliveries');
  if (activeTask.deliveryOtp) {
    console.error(`❌ SECURITY BREACH: Delivery Partner was able to read deliveryOtp in my-deliveries! Value: ${activeTask.deliveryOtp}`);
    process.exit(1);
  } else {
    console.log(`✅ [SECURE] Delivery Partner /delivery/my-deliveries does NOT leak OTP (deliveryOtp is null)`);
  }

  // 4. Verify Customer STILL sees their OTP
  const customerGetOrderRes = await fetch(`${API_BASE}/orders/${orderId}`, {
    headers: {
      'Authorization': `Bearer ${sessions.CUSTOMER.token}`,
      'x-demo-role': 'CUSTOMER'
    }
  });
  const customerOrderView = await customerGetOrderRes.json();
  const custOtp = customerOrderView.order ? customerOrderView.order.deliveryOtp : customerOrderView.deliveryOtp;
  if (!custOtp || custOtp !== realOtp) {
    console.error(`❌ Customer is missing their delivery OTP! Value: ${custOtp}`);
    process.exit(1);
  } else {
    console.log(`✅ [SECURE] Customer retains full visibility of their delivery OTP: [${custOtp}]`);
  }

  // 5. Rider pickup
  await fetch(`${API_BASE}/delivery/pickup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    },
    body: JSON.stringify({ orderId, riderId: realRiderId })
  });

  // Driver starts transit
  await fetch(`${API_BASE}/delivery/out-for-delivery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    },
    body: JSON.stringify({ orderId, riderId: realRiderId })
  });

  // 6. Rider submits OTP for server-side verification
  console.log(`\nTesting Rider submission of OTP for server-side verification...`);
  // Try wrong OTP
  const failRes = await fetch(`${API_BASE}/delivery/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    },
    body: JSON.stringify({ orderId, riderId: realRiderId, otp: '0000' })
  });
  const failData = await failRes.json();
  if (failRes.status === 400 && /Invalid Delivery OTP/i.test(JSON.stringify(failData))) {
    console.log(`✅ Wrong OTP '0000' successfully rejected by server with 400 Bad Request.`);
  } else {
    console.error(`❌ Server did not reject invalid OTP! Status: ${failRes.status}`, failData);
    process.exit(1);
  }

  // Try correct OTP
  const successRes = await fetch(`${API_BASE}/delivery/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessions.DELIVERY_PARTNER.token}`,
      'x-demo-role': 'DELIVERY_PARTNER'
    },
    body: JSON.stringify({ orderId, riderId: realRiderId, otp: realOtp })
  });
  const successData = await successRes.json();
  if (successRes.status === 200 && successData.order?.status === 'DELIVERED') {
    console.log(`✅ Correct OTP [${realOtp}] verified by server! Order marked DELIVERED.`);
  } else {
    console.error(`❌ Verification failed for correct OTP!`, successData);
    process.exit(1);
  }

  console.log('\n================================================================');
  console.log('🎉 AUDIT COMPLETE: REAL AUTH & OTP PRIVACY VERIFIED 100% SECURE');
  console.log('================================================================');
}

runAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
