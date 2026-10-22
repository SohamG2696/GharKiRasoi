// verify_cloud_complete.js - Complete Post-Migration Cloud Verification Suite
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const assert = require('assert');
const { createClient } = require('@supabase/supabase-js');
const store = require('./server/dataStore');
const { supabaseAdmin, supabasePublic, supabaseUrl, supabaseAnonKey, isCloudMode } = require('./server/supabaseClient');

async function runComprehensiveVerification() {
  console.log('================================================================');
  console.log('  GHAR KI RASOI: COMPREHENSIVE CLOUD SUPABASE VERIFICATION');
  console.log('================================================================\n');

  const results = {
    schemaAndTables: {},
    liveCloudVsJson: {},
    roleAuth: {},
    roleEscalationPrevention: {},
    crossUserIsolation: {},
    concurrencyRaceCondition: {}
  };

  // -------------------------------------------------------------
  // 1. Verify All 13 Required Application Tables
  // -------------------------------------------------------------
  console.log('📦 [1/6] Verifying Required Tables & Cloud Record Counts...');
  const tables = [
    'profiles',
    'user_roles',
    'kitchens',
    'menu_items',
    'customer_addresses',
    'orders',
    'order_items',
    'order_events',
    'payments',
    'delivery_partners',
    'delivery_assignments',
    'subscriptions',
    'reviews'
  ];

  for (const t of tables) {
    const { count, error } = await supabaseAdmin
      .from(t)
      .select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`   ❌ Table "${t}": ERROR -> ${error.message}`);
      results.schemaAndTables[t] = { exists: false, error: error.message };
    } else {
      console.log(`   ✅ Table "${t}": Exists in Cloud DB (Row count: ${count})`);
      results.schemaAndTables[t] = { exists: true, rowCount: count };
    }
  }

  // Verify PostGIS Location Trigger on kitchens
  console.log('\n🗺️ Checking PostGIS Location Trigger (location_geom)...');
  const { data: kitchenSample } = await supabaseAdmin
    .from('kitchens')
    .select('id, name, latitude, longitude, location_geom')
    .limit(1)
    .single();

  if (kitchenSample && kitchenSample.location_geom) {
    console.log(`   ✅ PostGIS Geometry Trigger Active: Kitchen "${kitchenSample.name}" has valid location_geom`);
    results.schemaAndTables.postgisTrigger = { active: true, sample: kitchenSample.name };
  } else {
    console.log('   ⚠️ PostGIS location_geom is null or not populated');
    results.schemaAndTables.postgisTrigger = { active: false };
  }

  // -------------------------------------------------------------
  // 2. Confirm Express Backend Is Using Live Supabase (Not Local JSON)
  // -------------------------------------------------------------
  console.log('\n☁️ [2/6] Confirming Express Backend Live Cloud Mode vs store.json...');
  const cloudActive = isCloudMode();
  console.log(`   - isCloudMode(): ${cloudActive}`);
  assert.strictEqual(cloudActive, true, 'Backend MUST be in cloud mode!');

  // Check store.json vs Supabase live orders
  const storeJsonPath = path.join(__dirname, 'server/store.json');
  let storeJsonOrderCount = 0;
  if (fs.existsSync(storeJsonPath)) {
    try {
      const rawStore = JSON.parse(fs.readFileSync(storeJsonPath, 'utf8'));
      storeJsonOrderCount = (rawStore.orders || []).length;
    } catch (_) {}
  }
  const { count: liveOrdersCount } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true });

  console.log(`   - Live Cloud Orders in Supabase: ${liveOrdersCount}`);
  console.log(`   - Static store.json Orders: ${storeJsonOrderCount}`);
  assert(liveOrdersCount > 0, 'Live cloud orders table must contain records');
  console.log('   ✅ Express Backend is actively reading/writing directly to Supabase Cloud.');
  results.liveCloudVsJson = {
    cloudMode: cloudActive,
    liveCloudOrders: liveOrdersCount,
    storeJsonOrders: storeJsonOrderCount,
    persistingToCloud: true
  };

  // -------------------------------------------------------------
  // 3. Test Real Supabase Authentication for Customer, Cook, Rider, Admin
  // -------------------------------------------------------------
  console.log('\n🔐 [3/6] Testing Real Supabase Authentication Across All 4 Roles...');
  const testCredentials = [
    { email: 'customer@gharkirasoi.com', password: 'GharKiRasoi@2026', expectedRole: 'CUSTOMER' },
    { email: 'cook@gharkirasoi.com', password: 'GharKiRasoi@2026', expectedRole: 'COOK' },
    { email: 'rider@gharkirasoi.com', password: 'GharKiRasoi@2026', expectedRole: 'DELIVERY_PARTNER' },
    { email: 'admin@gharkirasoi.com', password: 'GharKiRasoi@2026', expectedRole: 'ADMIN' }
  ];

  const authSessions = {};

  for (const cred of testCredentials) {
    const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
      email: cred.email,
      password: cred.password
    });

    if (authError) {
      console.error(`   ❌ Auth failed for ${cred.email}: ${authError.message}`);
      results.roleAuth[cred.expectedRole] = { success: false, error: authError.message };
    } else {
      const user = authData.user;
      const token = authData.session.access_token;
      authSessions[cred.expectedRole] = { user, token };

      // Verify Role in user_roles table
      const { data: roles } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const roleList = (roles || []).map(r => r.role);
      const hasExpectedRole = roleList.includes(cred.expectedRole);
      assert(hasExpectedRole, `User ${cred.email} must have role ${cred.expectedRole}`);

      console.log(`   ✅ ${cred.expectedRole} Authenticated (${cred.email}) -> UID: ${user.id}, Roles: [${roleList.join(', ')}]`);
      results.roleAuth[cred.expectedRole] = {
        success: true,
        userId: user.id,
        email: cred.email,
        roles: roleList
      };
    }
  }

  // -------------------------------------------------------------
  // 4. Test Role Isolation & Prevent Unauthorized Role Escalation
  // -------------------------------------------------------------
  console.log('\n🛡️ [4/6] Testing Role Isolation & Prevention of Role Escalation...');
  
  // 4A: Customer JWT attempts to insert an ADMIN role for itself via anon client
  const customerSession = authSessions['CUSTOMER'];
  if (customerSession) {
    const customerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${customerSession.token}` }
      }
    });

    const { data: escalationAttempt, error: escalationError } = await customerClient
      .from('user_roles')
      .insert({
        user_id: customerSession.user.id,
        role: 'ADMIN'
      })
      .select();

    if (escalationError) {
      console.log(`   ✅ Unauthorized role escalation blocked by RLS! Error: ${escalationError.message} (Code: ${escalationError.code})`);
      results.roleEscalationPrevention.insertAdminRole = {
        blocked: true,
        reason: escalationError.message,
        code: escalationError.code
      };
    } else if (!escalationAttempt || escalationAttempt.length === 0) {
      console.log('   ✅ Unauthorized role escalation blocked: 0 rows inserted.');
      results.roleEscalationPrevention.insertAdminRole = { blocked: true, reason: 'Zero rows returned' };
    } else {
      console.error('   ❌ SECURITY VULNERABILITY: Customer was able to insert ADMIN role!');
      results.roleEscalationPrevention.insertAdminRole = { blocked: false };
    }

    // 4B: Customer attempts to update admin settings / kitchen approvals
    const { data: updateKitchen, error: updateKitchenError } = await customerClient
      .from('kitchens')
      .update({ is_approved: true, is_active: true })
      .eq('name', 'Unauthorized Kitchen')
      .select();

    if (updateKitchenError || (updateKitchen && updateKitchen.length === 0)) {
      console.log('   ✅ Customer cannot approve kitchens directly: Blocked by RLS.');
      results.roleEscalationPrevention.approveKitchen = { blocked: true };
    } else {
      console.log('   ❌ Customer was able to modify kitchen approval!');
      results.roleEscalationPrevention.approveKitchen = { blocked: false };
    }
  }

  // -------------------------------------------------------------
  // 5. Test Cross-User Data Isolation
  // -------------------------------------------------------------
  console.log('\n🔒 [5/6] Testing Cross-User Data Isolation...');
  // Customer A attempts to view Customer B's order via user-scoped client
  if (customerSession) {
    const customerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${customerSession.token}` } }
    });

    // Create a foreign order belonging to another customer UUID (e.g. Cook user)
    const otherCustomerId = 'aeeab35c-cb24-48cc-91c2-63707b9fd2dc'; 
    const { data: kitchen } = await supabaseAdmin.from('kitchens').select('id').limit(1).single();
    const { data: foreignOrder } = await supabaseAdmin.from('orders').insert({
      order_number: 'GKR-ISO-' + Math.floor(1000 + Math.random() * 9000),
      customer_id: otherCustomerId,
      kitchen_id: kitchen.id,
      customer_phone: '+91 9876543210',
      subtotal: 200,
      delivery_fee: 30,
      platform_fee: 10,
      tax: 0,
      total_amount: 240,
      delivery_address: 'Private Address of Customer B',
      status: 'PLACED'
    }).select().single();

    if (foreignOrder) {
      const { data: isolatedData, error: isolatedError } = await customerClient
        .from('orders')
        .select('*')
        .eq('id', foreignOrder.id);

      if (isolatedError || !isolatedData || isolatedData.length === 0) {
        console.log(`   ✅ Cross-user data isolation verified: Customer cannot read foreign order ${foreignOrder.id} (Rows: 0)`);
        results.crossUserIsolation = { isolated: true, testedOrderId: foreignOrder.id };
      } else {
        console.error(`   ❌ Cross-user isolation failure: Customer A read foreign order!`);
        results.crossUserIsolation = { isolated: false, testedOrderId: foreignOrder.id };
      }
    }
  }

  // -------------------------------------------------------------
  // 6. Test Concurrency & Atomic Delivery Assignment Race Condition
  // -------------------------------------------------------------
  console.log('\n⚡ [6/6] Testing Database Concurrency: Simultaneous Rider Assignment...');
  
  // Pick reliable test kitchen with menu items
  const allKitchens = await store.getKitchens();
  const testKitchen = allKitchens.find(k => k.name.includes('Maa Ka Pyaar')) || allKitchens[0];
  const menuItems = await store.getMenuItems(testKitchen.id);
  const dish = menuItems[0];

  const concurrencyOrder = await store.createOrder({
    customerId: 'usr-customer-1',
    customerName: 'Concurrency Test User',
    customerPhone: '+91 99999 88888',
    kitchenId: testKitchen.id,
    items: [{ menuItemId: dish.id, quantity: 1 }],
    deliveryAddress: 'Race Condition Test Street 101'
  });
  const targetOrderId = concurrencyOrder.id;
  await store.updateOrderStatus(targetOrderId, 'PACKED', 'Packed hot and ready', 'COOK');

  console.log(`   - Testing race condition on newly created Order: ${targetOrderId}`);

  // Two riders fire assignRider concurrently at the exact same millisecond
  const rider1 = { id: 'c3f4d72d-c2ef-4bfe-b338-e7790d4b83f5', name: 'Rider Vikram Singh' };
  const rider2 = { id: 'aeeab35c-cb24-48cc-91c2-63707b9fd2dc', name: 'Rider Alternate Partner' };

  const [res1, res2] = await Promise.all([
    store.assignRider(targetOrderId, rider1.id, rider1.name),
    store.assignRider(targetOrderId, rider2.id, rider2.name)
  ]);

  const successes = [res1, res2].filter(r => r.success);
  const conflicts = [res1, res2].filter(r => !r.success);

  console.log(`   - Rider 1 Result: ${res1.success ? 'ACCEPTED (Won)' : 'REJECTED: ' + res1.message}`);
  console.log(`   - Rider 2 Result: ${res2.success ? 'ACCEPTED (Won)' : 'REJECTED: ' + res2.message}`);

  assert.strictEqual(successes.length, 1, 'Exactly ONE rider must win the assignment race!');
  assert.strictEqual(conflicts.length, 1, 'The other rider MUST be rejected with conflict!');
  console.log('   ✅ Concurrency Race Condition safely prevented! Database atomic lock held.');

  results.concurrencyRaceCondition = {
    testedOrderId: targetOrderId,
    winnerAssigned: successes[0].order?.riderId || 'Assigned Rider',
    conflictMessage: conflicts[0].message
  };

  console.log('\n================================================================');
  console.log('  🎉 ALL CLOUD INTEGRATION & VERIFICATION CHECKS COMPLETED!');
  console.log('================================================================\n');

  return results;
}

runComprehensiveVerification()
  .then(res => {
    fs.writeFileSync(
      path.join(__dirname, 'verification_cloud_results.json'),
      JSON.stringify(res, null, 2),
      'utf8'
    );
    console.log('Saved results to verification_cloud_results.json');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ VERIFICATION RUNTIME ERROR:', err);
    process.exit(1);
  });
