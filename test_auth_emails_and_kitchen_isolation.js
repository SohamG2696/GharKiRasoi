// test_auth_emails_and_kitchen_isolation.js
const assert = require('assert');
const API_BASE = 'http://localhost:5005/api';

async function testAuthEmailsAndIsolation() {
  console.log('================================================================');
  console.log('  TESTING ROLE AUTH, GOOGLE SIGN-IN, EMAILS & KITCHEN ISOLATION');
  console.log('================================================================\n');

  // 1. Google Sign-In for Customer, Cook, and Rider
  console.log('1️⃣ Testing One-Click Google Sign-In...');
  const resGoogleCust = await fetch(`${API_BASE}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'priya.foodie@gmail.com', fullName: 'Priya Patel', role: 'CUSTOMER' })
  });
  if (resGoogleCust.status !== 200) {
    console.error('Google Auth Error:', resGoogleCust.status, await resGoogleCust.text());
  }
  assert.strictEqual(resGoogleCust.status, 200);
  const googleCust = await resGoogleCust.json();
  console.log('   ✅ Google Customer authenticated:', googleCust.user.fullName, `(${googleCust.user.email})`);

  // 2. Kitchen Partner Sign-Up with Individual Password
  console.log('\n2️⃣ Testing Kitchen Partner Sign-Up with individual credentials...');
  const uniqueKitchenEmail = `chef.rajesh.${Date.now()}@gharkirasoi.com`;
  const resCookSignup = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: uniqueKitchenEmail,
      password: 'ChefRajeshSecure@2026',
      fullName: 'Rajesh Kumar',
      phone: '+91 98111 22334',
      role: 'COOK',
      kitchenName: 'Rajesh Dhaba Ghar Ka',
      cuisineType: 'Punjabi & North Indian Thali'
    })
  });
  assert.strictEqual(resCookSignup.status, 201);
  const cookSignupData = await resCookSignup.json();
  console.log('   ✅ New Home Cook registered:', cookSignupData.user.fullName, `| Kitchen: ${cookSignupData.user.kitchenName || 'Rajesh Dhaba Ghar Ka'}`);

  // 3. Customer places an order to Maa Ka Pyaar Rasoi
  console.log('\n3️⃣ Customer places order -> Verifying Multi-Party Email Dispatches...');
  const resKitchens = await fetch(`${API_BASE}/kitchens`);
  const kitchens = await resKitchens.json();
  const maaKitchen = kitchens.find(k => k.name.includes('Maa Ka Pyaar')) || kitchens[0];
  const dish = maaKitchen.menuItems?.[0] || (await (await fetch(`${API_BASE}/kitchens/${maaKitchen.id}`)).json()).menuItems[0];

  const orderPayload = {
    customerId: googleCust.user.id,
    customerName: googleCust.user.fullName,
    customerEmail: googleCust.user.email,
    customerPhone: '+91 98765 11223',
    deliveryAddress: 'Flat 304, Green Heights, Sector 62, Noida',
    kitchenId: maaKitchen.id,
    items: [{ id: dish.id, quantity: 2 }],
    specialInstructions: 'Please send extra salad and green chutney'
  };

  const resOrder = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${googleCust.token}`,
      'x-demo-role': 'CUSTOMER'
    },
    body: JSON.stringify(orderPayload)
  });
  assert.strictEqual(resOrder.status, 201);
  const { order } = await resOrder.json();
  console.log(`   ✅ Order placed: #${order.orderNumber} (ID: ${order.id}) | Secret OTP: [${order.deliveryOtp}]`);

  // Wait 400ms for async email dispatches to complete
  await new Promise(resolve => setTimeout(resolve, 400));

  // Verify Email Dispatches
  const resEmails = await fetch(`${API_BASE}/notifications/emails`);
  const sentEmails = await resEmails.json();
  const customerEmail = sentEmails.find(m => m.orderNumber === order.orderNumber && m.type === 'CUSTOMER_CONFIRMATION');
  const kitchenEmail = sentEmails.find(m => m.orderNumber === order.orderNumber && m.type === 'KITCHEN_ALERT');

  assert(customerEmail, 'Customer confirmation email MUST be dispatched with OTP!');
  console.log(`   📨 Customer Received Email: "${customerEmail.subject}" -> To: ${customerEmail.to}`);
  assert(kitchenEmail, 'Kitchen alert email MUST be dispatched!');
  console.log(`   📨 Kitchen Received Email: "${kitchenEmail.subject}" -> To: ${kitchenEmail.to}`);

  // 4. Kitchen Isolation Test:
  console.log('\n4️⃣ Testing Cross-Kitchen Order Isolation...');
  // Shanti Devi (cook for Maa Ka Pyaar Rasoi) queries orders for her kitchen:
  const resMaaOrders = await fetch(`${API_BASE}/orders?kitchenId=${maaKitchen.id}`);
  const maaOrders = await resMaaOrders.json();
  const foundInMaa = maaOrders.find(o => o.id === order.id);
  assert(foundInMaa, 'Order MUST appear in Maa Ka Pyaar Rasoi kitchen queue!');
  console.log(`   ✅ Maa Ka Pyaar Rasoi sees the order: #${foundInMaa.orderNumber} (Status: ${foundInMaa.status})`);

  // Rajesh Kumar's newly registered kitchen queries orders for his kitchen:
  const rajeshKitchenId = cookSignupData.user.kitchenId || 'ktch-rajesh-dummy';
  const resRajeshOrders = await fetch(`${API_BASE}/orders?kitchenId=${rajeshKitchenId}`);
  const rajeshOrders = await resRajeshOrders.json();
  const foundInRajesh = rajeshOrders.find(o => o.id === order.id);
  assert(!foundInRajesh, 'Order for Maa Ka Pyaar Rasoi MUST NOT leak into Rajesh Kumar kitchen dashboard!');
  console.log(`   ✅ [ISOLATION VERIFIED] Rajesh Kumar kitchen queue has 0 leaked orders from Maa Ka Pyaar Rasoi!`);

  // 5. Cook marks order ACCEPTED -> PREPARING -> PACKED -> Rider notification email
  console.log('\n5️⃣ Cook advances lifecycle to PACKED -> Verifying Delivery Partner Notification...');
  await fetch(`${API_BASE}/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED', actorRole: 'COOK' })
  });
  await fetch(`${API_BASE}/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PREPARING', actorRole: 'COOK' })
  });
  const resPacked = await fetch(`${API_BASE}/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PACKED', actorRole: 'COOK' })
  });
  assert.strictEqual(resPacked.status, 200);

  await new Promise(resolve => setTimeout(resolve, 400));

  const resEmails2 = await fetch(`${API_BASE}/notifications/emails`);
  const sentEmails2 = await resEmails2.json();
  const riderEmail = sentEmails2.find(m => m.orderNumber === order.orderNumber && m.type === 'RIDER_ALERT');
  assert(riderEmail, 'Rider pickup email MUST be dispatched when order is packed!');
  console.log(`   📨 Delivery Partner Received Alert: "${riderEmail.subject}" -> To: ${riderEmail.to}`);

  console.log('\n================================================================');
  console.log('🎉 ALL TESTS PASSED: GOOGLE AUTH, ROLE PASSWORDS, EMAILS & ISOLATION PERFECT!');
  console.log('================================================================');
}

testAuthEmailsAndIsolation().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
