// test_integration.js - End-to-End Automated Integration Test Suite
const assert = require('assert');
const app = require('./server');

const TEST_PORT = 5097;

async function runTests() {
  console.log('🧪 Starting Ghar Ki Rasoi End-to-End Test Suite...\n');
  const server = app.listen(TEST_PORT);
  const baseUrl = `http://localhost:${TEST_PORT}`;

  try {
    // 1. Health Check
    console.log('1️⃣ Testing API Health Endpoint...');
    const resHealth = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(resHealth.status, 200);
    const healthData = await resHealth.json();
    assert.strictEqual(healthData.status, 'ok');
    console.log('   ✅ API Health Check passed.');

    // 2. Kitchen Discovery & Filters
    console.log('\n2️⃣ Testing Kitchen Discovery & Geolocation Distance...');
    const resKitchens = await fetch(`${baseUrl}/api/kitchens?lat=28.6280&lng=77.3649&vegOnly=true`);
    assert.strictEqual(resKitchens.status, 200);
    const kitchens = await resKitchens.json();
    assert(kitchens.length > 0, 'Should return at least 1 kitchen');
    assert(kitchens[0].distanceKm !== undefined, 'Should calculate distance');
    const targetKitchen = kitchens[0];
    console.log(`   ✅ Found ${kitchens.length} kitchens. Nearest: "${targetKitchen.name}" (${targetKitchen.distanceKm} km).`);

    // 3. Dynamic Menu Items
    console.log('\n3️⃣ Testing Dynamic Menu Management (CRUD)...');
    const resMenu = await fetch(`${baseUrl}/api/kitchens/${targetKitchen.id}`);
    const kitchenDetails = await resMenu.json();
    assert(kitchenDetails.menuItems && kitchenDetails.menuItems.length > 0);
    const firstDish = kitchenDetails.menuItems[0];
    console.log(`   ✅ Kitchen has ${kitchenDetails.menuItems.length} menu items. Sample: "${firstDish.name}" - ₹${firstDish.price}`);

    // Add new test dish
    const resAddDish = await fetch(`${baseUrl}/api/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kitchenId: targetKitchen.id,
        name: 'Ghar Ka Paneer Tikka (Test)',
        description: 'Roasted paneer cubes with capsicum',
        price: 150,
        category: 'Daily Specials',
        isVeg: true,
        dailyQuantity: 15
      })
    });
    assert.strictEqual(resAddDish.status, 201);
    const addedDishData = await resAddDish.json();
    const testDishId = addedDishData.item.id;
    console.log(`   ✅ Created dynamic dish "${addedDishData.item.name}" (ID: ${testDishId}).`);

    // 4. Cart Calculation & Order Placement
    console.log('\n4️⃣ Testing Server-Side Price Calculation & Order Placement...');
    const orderPayload = {
      customerId: 'usr-customer-1',
      customerName: 'Aarav Sharma',
      customerPhone: '+91 98765 43210',
      kitchenId: targetKitchen.id,
      deliveryAddress: 'Boys Hostel Room 304, Sector 62, Noida',
      specialInstructions: 'Test order: extra chutney please',
      items: [
        { id: firstDish.id, quantity: 2 },
        { id: testDishId, quantity: 1 }
      ],
      paymentMethod: 'UPI'
    };

    const resOrder = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    assert.strictEqual(resOrder.status, 201);
    const orderData = await resOrder.json();
    const order = orderData.order;

    // Validate price recalculation on server
    const expectedSubtotal = firstDish.price * 2 + 150 * 1;
    assert.strictEqual(order.subtotal, expectedSubtotal, 'Subtotal must be accurately verified on server');
    assert.strictEqual(order.totalAmount, expectedSubtotal + 30 + 10, 'Total must include delivery and platform fee');
    assert.strictEqual(order.status, 'AWAITING_KITCHEN');
    assert(order.deliveryOtp && order.deliveryOtp.length === 4, 'Order must generate 4-digit delivery OTP');
    console.log(`   ✅ Placed Order ${order.orderNumber}. Subtotal: ₹${order.subtotal}, Total: ₹${order.totalAmount}, OTP: ${order.deliveryOtp}`);

    // 5. Order State Machine: Cook Acceptance & Preparation
    console.log('\n5️⃣ Testing Order Lifecycle State Machine...');
    // Accept
    const resAccept = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACCEPTED', actorRole: 'COOK' })
    });
    assert.strictEqual(resAccept.status, 200);
    console.log('   ✅ Cook accepted order -> status: ACCEPTED');

    // Start Cooking
    const resPrep = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PREPARING', actorRole: 'COOK' })
    });
    assert.strictEqual(resPrep.status, 200);
    console.log('   ✅ Food cooking on stove -> status: PREPARING');

    // Food Packed
    const resPacked = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PACKED', actorRole: 'COOK' })
    });
    assert.strictEqual(resPacked.status, 200);
    console.log('   ✅ Food packed hot in thermal box -> status: PACKED');

    // 6. Delivery Partner Atomic Assignment
    console.log('\n6️⃣ Testing Delivery Partner Atomic Assignment...');
    const resRiderAssign = await fetch(`${baseUrl}/api/delivery/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        riderId: 'usr-rider-1',
        riderName: 'Vikram Singh'
      })
    });
    assert.strictEqual(resRiderAssign.status, 200);
    console.log('   ✅ Rider Vikram Singh assigned to order.');

    // Concurrency / Race Condition test: Second rider tries to claim the same order
    const resDuplicateRider = await fetch(`${baseUrl}/api/delivery/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        riderId: 'usr-rider-2',
        riderName: 'Rajesh Rider'
      })
    });
    assert.strictEqual(resDuplicateRider.status, 409, 'Must prevent race condition');
    console.log('   ✅ Race condition prevented: Second rider correctly rejected (409 Conflict).');

    // Rider Pickup & Transit
    const resPickup = await fetch(`${baseUrl}/api/delivery/pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, riderId: 'usr-rider-1' })
    });
    assert.strictEqual(resPickup.status, 200);
    console.log('   ✅ Food picked up from kitchen -> status: PICKED_UP');

    const resTransit = await fetch(`${baseUrl}/api/delivery/out-for-delivery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, riderId: 'usr-rider-1' })
    });
    assert.strictEqual(resTransit.status, 200);
    console.log('   ✅ Rider in transit -> status: OUT_FOR_DELIVERY');

    // 7. Delivery OTP Verification
    console.log('\n7️⃣ Testing Delivery OTP Verification...');
    // Incorrect OTP attempt
    const resWrongOtp = await fetch(`${baseUrl}/api/delivery/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        riderId: 'usr-rider-1',
        otp: '0000'
      })
    });
    assert.strictEqual(resWrongOtp.status, 400, 'Invalid OTP must be rejected');
    console.log('   ✅ Invalid OTP correctly rejected.');

    // Correct OTP completion
    const resCorrectOtp = await fetch(`${baseUrl}/api/delivery/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        riderId: 'usr-rider-1',
        otp: order.deliveryOtp
      })
    });
    assert.strictEqual(resCorrectOtp.status, 200);
    const finalOrderData = await resCorrectOtp.json();
    assert.strictEqual(finalOrderData.order.status, 'DELIVERED');
    console.log('   ✅ Order verified via OTP and marked DELIVERED successfully.');

    // 8. Tiffin Subscriptions
    console.log('\n8️⃣ Testing Homemade Tiffin Subscription System...');
    const subRes = await fetch(`${baseUrl}/api/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'usr-customer-1',
        customerName: 'Aarav Sharma',
        kitchenId: targetKitchen.id,
        planType: 'MONTHLY',
        mealSlot: 'LUNCH',
        startDate: new Date().toISOString().split('T')[0],
        dietaryNotes: 'Pure veg test subscription'
      })
    });
    assert.strictEqual(subRes.status, 201);
    const subData = await subRes.json();
    assert(subData.subscription.totalAmount > 0);
    console.log(`   ✅ Tiffin Subscription activated for ${subData.subscription.kitchenName} (Total: ₹${subData.subscription.totalAmount}).`);

    // 9. Admin Metrics
    console.log('\n9️⃣ Testing Platform Admin Metrics...');
    const resAdmin = await fetch(`${baseUrl}/api/admin/metrics`);
    assert.strictEqual(resAdmin.status, 200);
    const adminMetrics = await resAdmin.json();
    assert(adminMetrics.totalRevenue > 0);
    assert(adminMetrics.completedOrders >= 1);
    console.log(`   ✅ Admin metrics verified: GMV ₹${adminMetrics.totalRevenue}, Platform Commission ₹${adminMetrics.platformCommission}.`);

    // 10. Reviews & Rating Recalculation
    console.log('\n🔟 Testing Customer Reviews & Dynamic Star Rating Recalculation...');
    const resReview = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        kitchenId: targetKitchen.id,
        customerId: 'usr-customer-1',
        customerName: 'Aarav Sharma',
        rating: 5,
        comment: 'Outstanding homestyle taste! Perfectly cooked phulkas and fresh dal.'
      })
    });
    assert.strictEqual(resReview.status, 201);
    const revJson = await resReview.json();
    assert.strictEqual(revJson.review.rating, 5);

    const resUpdatedKitchen = await fetch(`${baseUrl}/api/kitchens/${targetKitchen.id}`);
    const updatedKitchenData = await resUpdatedKitchen.json();
    assert(updatedKitchenData.totalRatings >= 1);
    console.log(`   ✅ Review submitted successfully! Kitchen now has ${updatedKitchenData.totalRatings} ratings with average ${updatedKitchenData.rating} ★.`);

    // 11. Subscription Actions (Pause & Skip)
    console.log('\n1️⃣1️⃣ Testing Subscription Pause & Skip Tomorrow...');
    const resPause = await fetch(`${baseUrl}/api/subscriptions/${subData.subscription.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAUSED', skippedDate: '2026-10-22' })
    });
    assert.strictEqual(resPause.status, 200);
    const pauseJson = await resPause.json();
    assert.strictEqual(pauseJson.subscription.status, 'PAUSED');
    console.log('   ✅ Subscription paused and tomorrow\'s meal skipped successfully.');

    // 12. Home Cook Onboarding
    console.log('\n1️⃣2️⃣ Testing Home Cook Onboarding Wizard...');
    const resOnboard = await fetch(`${baseUrl}/api/kitchens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vaishno Rasoi Test',
        cookName: 'Kamla Devi',
        phone: '+91 98999 11223',
        description: 'Pure satvik meal preparation',
        addressText: 'Flat 101, Shanti Enclave, Noida',
        cuisineTypes: ['North Indian', 'Jain Friendly'],
        isVegOnly: true,
        prepTimeMinutes: 20
      })
    });
    assert.strictEqual(resOnboard.status, 201);
    const onboardJson = await resOnboard.json();
    assert.strictEqual(onboardJson.kitchen.name, 'Vaishno Rasoi Test');
    console.log(`   ✅ Onboarded new home cook kitchen: "${onboardJson.kitchen.name}".`);

    console.log('\n======================================================');
    console.log('🎉 ALL 12 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST FAILURE:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    process.exit(process.exitCode || 0);
  }
}

runTests();
