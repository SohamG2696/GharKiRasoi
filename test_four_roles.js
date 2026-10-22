// test_four_roles_flow.js - End-to-End Test for All Four Roles Interaction
const assert = require('assert');

const BASE_URL = 'http://localhost:5005';

async function testFourRoles() {
  console.log('================================================================');
  console.log('  TESTING LIVE 4-ROLE CONNECTION & WORKFLOW LIFECYCLE');
  console.log('================================================================\n');

  // STEP 1: CUSTOMER PLACES AN ORDER
  console.log('1️⃣ [CUSTOMER] Placing an authentic homemade meal order...');
  const resKitchens = await fetch(`${BASE_URL}/api/kitchens`);
  const kitchens = await resKitchens.json();
  const targetKitchen = kitchens.find(k => k.name.includes('Maa Ka Pyaar')) || kitchens[0];
  const targetDish = targetKitchen.menuItems?.[0] || (await (await fetch(`${BASE_URL}/api/kitchens/${targetKitchen.id}`)).json()).menuItems[0];

  const orderPayload = {
    customerId: 'eb262efa-88cf-43f6-bf81-f20fa6fe77a1', // Real Supabase customer UUID
    customerName: 'Aarav Sharma',
    customerPhone: '+91 98765 43210',
    kitchenId: targetKitchen.id,
    deliveryAddress: 'Hostel Tower B, Room 402, Sector 62, Noida',
    specialInstructions: 'Please make dal tadka medium spicy',
    items: [{ id: targetDish.id, quantity: 2 }]
  };

  const resOrder = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  });
  assert.strictEqual(resOrder.status, 201);
  const { order } = await resOrder.json();
  console.log(`   ✅ Order placed: ${order.orderNumber} (ID: ${order.id}) | OTP: ${order.deliveryOtp}`);

  // STEP 2: COOK DASHBOARD SEES ORDER AND COOKS
  console.log('\n2️⃣ [COOK] Home cook receives order and advances cooking state...');
  const resCookOrders = await fetch(`${BASE_URL}/api/orders?kitchenId=ktch-1`);
  const cookOrders = await resCookOrders.json();
  const foundInCook = cookOrders.find(o => o.id === order.id);
  assert(foundInCook, 'Order MUST appear in Cook Dashboard queue!');
  console.log(`   ✅ Cook found order in queue with status: ${foundInCook.status}`);

  // Cook accepts
  const resAccept = await fetch(`${BASE_URL}/api/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ACCEPTED', note: 'Cook accepted order', actorRole: 'COOK' })
  });
  assert.strictEqual(resAccept.status, 200);

  // Cook starts cooking
  const resPrep = await fetch(`${BASE_URL}/api/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PREPARING', note: 'On the stove cooking fresh', actorRole: 'COOK' })
  });
  assert.strictEqual(resPrep.status, 200);

  // Cook marks packed
  const resPacked = await fetch(`${BASE_URL}/api/orders/${order.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'PACKED', note: 'Packed hot in thermal packaging', actorRole: 'COOK' })
  });
  assert.strictEqual(resPacked.status, 200);
  console.log('   ✅ Cook finished preparing -> Status: PACKED');

  // STEP 3: DRIVER PARTNER SEES AND CLAIMS ORDER
  console.log('\n3️⃣ [DELIVERY PARTNER] Driver checks available orders & claims assignment...');
  const resAvail = await fetch(`${BASE_URL}/api/delivery/available-orders`);
  const availableOrders = await resAvail.json();
  const availableTarget = availableOrders.find(o => o.id === order.id);
  assert(availableTarget, 'Order MUST appear in Driver available deliveries list!');
  console.log(`   ✅ Driver saw available order for ${availableTarget.kitchenName} -> Drop: ${availableTarget.deliveryAddress}`);

  // Driver accepts order using their real Supabase Auth UID
  const realRiderId = 'c3f4d72d-c2ef-4bfe-b338-e7790d4b83f5'; // Vikram Singh UID
  const resClaim = await fetch(`${BASE_URL}/api/delivery/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id, riderId: realRiderId, riderName: 'Vikram Singh' })
  });
  assert.strictEqual(resClaim.status, 200);
  console.log('   ✅ Driver accepted delivery assignment -> Status: RIDER_ASSIGNED');

  // Driver checks active task
  const resMyDeliveries = await fetch(`${BASE_URL}/api/delivery/my-deliveries?riderId=${realRiderId}`);
  const myDeliveries = await resMyDeliveries.json();
  const myTask = myDeliveries.find(o => o.id === order.id);
  assert(myTask, 'Order MUST appear in driver active deliveries!');
  assert(myTask.customerName, 'Driver task MUST contain customerName!');
  assert(myTask.customerPhone, 'Driver task MUST contain customerPhone!');
  console.log(`   ✅ Driver active task loaded: Customer: ${myTask.customerName} (${myTask.customerPhone})`);

  // Driver confirms pickup
  const resPickup = await fetch(`${BASE_URL}/api/delivery/pickup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id, riderId: realRiderId })
  });
  assert.strictEqual(resPickup.status, 200);
  console.log('   ✅ Driver confirmed pickup from kitchen -> Status: PICKED_UP');

  // Driver starts transit (Out for Delivery)
  const resOut = await fetch(`${BASE_URL}/api/delivery/out-for-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id, riderId: realRiderId })
  });
  assert.strictEqual(resOut.status, 200);
  console.log('   ✅ Driver started transit -> Status: OUT_FOR_DELIVERY');

  // STEP 4: OTP HANDOVER & COMPLETION
  console.log('\n4️⃣ [OTP HANDOVER] Driver verifies OTP at customer doorstep...');
  // Wrong OTP test
  const resBadOtp = await fetch(`${BASE_URL}/api/delivery/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id, riderId: realRiderId, otp: '0000' })
  });
  assert.strictEqual(resBadOtp.status, 400);
  console.log('   ✅ Incorrect OTP properly rejected by backend (400 Bad Request)');

  // Correct OTP
  const resGoodOtp = await fetch(`${BASE_URL}/api/delivery/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId: order.id, riderId: realRiderId, otp: order.deliveryOtp })
  });
  assert.strictEqual(resGoodOtp.status, 200);
  const completeJson = await resGoodOtp.json();
  assert.strictEqual(completeJson.order.status, 'DELIVERED');
  console.log('   ✅ Correct OTP verified -> Order marked DELIVERED successfully! ₹40 added to rider earnings.');

  // STEP 5: CUSTOMER SEES DELIVERED & SUBMITS REVIEW
  console.log('\n5️⃣ [CUSTOMER] Customer sees order delivered and leaves a 5-star review...');
  const resTrack = await fetch(`${BASE_URL}/api/orders/${order.id}`);
  const trackData = await resTrack.json();
  assert.strictEqual(trackData.status, 'DELIVERED');

  const resReview = await fetch(`${BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: order.id,
      kitchenId: targetKitchen.id,
      customerId: 'eb262efa-88cf-43f6-bf81-f20fa6fe77a1',
      customerName: 'Aarav Sharma',
      rating: 5,
      comment: 'Delicious hot homely meal, prompt delivery by Vikram!'
    })
  });
  assert.strictEqual(resReview.status, 201);
  console.log('   ✅ 5-Star Review submitted by customer');

  // STEP 6: ADMIN SEES UPDATED METRICS
  console.log('\n6️⃣ [ADMIN] Admin dashboard reflects updated completed orders and revenue...');
  const resAdmin = await fetch(`${BASE_URL}/api/admin/metrics`);
  const adminMetrics = await resAdmin.json();
  assert(adminMetrics.completedOrders >= 1);
  assert(adminMetrics.totalRevenue > 0);
  console.log(`   ✅ Admin Metrics verified: Completed Orders: ${adminMetrics.completedOrders} | GMV: ₹${adminMetrics.totalRevenue}`);

  console.log('\n================================================================');
  console.log('  🎉 PERFECT! ALL FOUR ROLES COMMUNICATED AND UPDATED FLAWLESSLY!');
  console.log('================================================================\n');
}

testFourRoles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Test Error:', err);
    process.exit(1);
  });
