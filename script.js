// ✅ Initialize Supabase dynamically via backend config
let supabaseClient = null;

async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const config = await res.json();
    if (config.supabaseUrl && config.supabaseKey && window.supabase) {
      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      return supabaseClient;
    }
  } catch (err) {
    console.error("Failed to load Supabase configuration:", err);
  }
  return supabaseClient;
}

// Pre-initialize on load
getSupabase();

// ✅ Show / Hide Sections
function showSection(id) {
  document.querySelectorAll("section").forEach((sec) => sec.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
}

function goHome() {
  document.querySelectorAll("section").forEach((sec) => sec.classList.add("hidden"));
  document.getElementById("home").classList.remove("hidden");
}

// ✅ CHEF REGISTRATION
document.getElementById("chefForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const kitchenName = document.getElementById("kitchenName").value;
  const chefName = document.getElementById("chefName").value;
  const chefPhone = document.getElementById("chefPhone").value;
  const chefLocation = document.getElementById("chefLocation").value;

  // Insert chef row (menu will be stored in 'menu' table linked by chef_id)
  const chefPayload = {
    kitchen_name: kitchenName,
    chef_name: chefName,
    phone: chefPhone,
    location: chefLocation
  };

  try {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase.from("chefs").insert([chefPayload]).select();
    if (error) throw error;
    // keep the newly inserted chef id in a hidden field so menu updates can reference it
    const inserted = data && data[0];
    if (inserted && inserted.id) {
      // store current chef id to window state for menu section
      window.currentChefId = inserted.id;
    }
    alert("✅ Chef registered successfully!");
    showSection("menuSection");
  } catch (err) {
    console.error(err);
    alert("❌ Error saving chef: " + (err.message || JSON.stringify(err)));
  }
});

// ✅ MENU FORM
document.getElementById("menuForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const sabzi = document.getElementById("sabzi").value;
  const roti = document.getElementById("roti").value;
  const rice = document.getElementById("rice").value;
  const daal = document.getElementById("daal").value;
  const side = document.getElementById("side").value;
  const drink = document.getElementById("drink").value;

  const menuObj = { sabzi, roti, rice, daal, side, drink };

  // If we have a currentChefId (from the registration flow), insert into `menu` table linked to chef
  if (window.currentChefId) {
    try {
      const supabase = await getSupabase();
      if (!supabase) throw new Error("Supabase client not initialized");
      const { data, error } = await supabase.from('menu').insert([
        {
          chef_id: window.currentChefId,
          sabzi: menuObj.sabzi,
          roti: menuObj.roti,
          rice: menuObj.rice,
          daal: menuObj.daal,
          side: menuObj.side,
          drink: menuObj.drink
        }
      ]).select();
      if (error) throw error;
      alert('✅ Menu saved successfully!');
      window.currentChefId = null;
      goHome();
      return;
    } catch (err) {
      console.error(err);
      alert('❌ Error saving menu: ' + (err.message || JSON.stringify(err)));
    }
  }

  alert('✅ Menu saved (no chef id)');
  goHome();
});

// ✅ CUSTOMER FORM
document.getElementById("customerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const location = document.getElementById("custLocation").value;

  try {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase
      .from("chefs")
      .select("*")
      .ilike("location", `%${location}%`);

    if (error) throw error;

    const chefCards = document.getElementById("chefCards");
    chefCards.innerHTML = "";

    if (!data || data.length === 0) {
      chefCards.innerHTML = "<p>No chefs found in your area 😢</p>";
    } else {
      data.forEach((chef) => {
        const div = document.createElement("div");
        div.classList.add("chef-card");
        div.innerHTML = `
          <h4>${chef.kitchen_name}</h4>
          <p>👨‍🍳 ${chef.chef_name}</p>
          <p>📞 ${chef.phone}</p>
          <p>📍 ${chef.location}</p>
          <button onclick="openOrderForm(${chef.id})">Order from this Chef</button>
        `;
        chefCards.appendChild(div);
      });
    }

    document.getElementById("customerChefList").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("❌ Error fetching chefs: " + (err.message || JSON.stringify(err)));
  }
});

// ✅ DELIVERY FORM
document.getElementById("deliveryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase.from("orders").select("*");

    if (error) {
      alert("❌ Error fetching orders: " + error.message);
    } else {
      const ordersToDeliver = document.getElementById("ordersToDeliver");
      ordersToDeliver.innerHTML = data.length
        ? data.map(o => `<div>📦 Order #${o.id}: ${o.cust_name} → ${o.location}</div>`).join("")
        : "<p>No orders yet.</p>";

      document.getElementById("deliveryOrders").classList.remove("hidden");
    }
  } catch (err) {
    console.error(err);
    alert("❌ Error fetching orders: " + (err.message || JSON.stringify(err)));
  }
});

// -------------------------
// Customer order helpers
// -------------------------
async function openOrderForm(chefId) {
  try {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");

    // fetch chef details
    const { data: chefData, error: chefError } = await supabase.from('chefs').select('*').eq('id', chefId).single();
    if (chefError) throw chefError;
    const chef = chefData;

    // fetch menu rows for this chef from `menu` table
    const { data: menuRows, error: menuError } = await supabase.from('menu').select('*').eq('chef_id', chefId);
    if (menuError) throw menuError;

    // fill order form
    document.getElementById('orderChefName').value = chef.kitchen_name + ' (' + chef.chef_name + ')';
    document.getElementById('custNameOrder').value = '';
    document.getElementById('quantity').value = 1;
    document.getElementById('note').value = '';

    // populate menuItems from menuRows (use first row as current menu)
    const menuItems = document.getElementById('menuItems');
    menuItems.innerHTML = '';
    const currentMenu = (menuRows && menuRows[0]) || {};
    // create displayable entries for keys that have non-empty values
    const keys = ['sabzi','roti','rice','daal','side','drink'];
    const available = keys.filter(k => currentMenu[k]);
    if (available.length === 0) {
      menuItems.innerHTML = '<p>Chef has not published a menu yet.</p>';
    } else {
      available.forEach(k => {
        const val = currentMenu[k];
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.innerHTML = `
          <label>
            <input type="checkbox" name="menu_item" value="${k}"> ${k}: ${val}
          </label>
        `;
        menuItems.appendChild(item);
      });
    }

    // store selected chef id for order submission
    window.orderChefId = chefId;

    // show order section
    document.getElementById('orderSection').classList.remove('hidden');
    showSection('customerFormSection');
  } catch (err) {
    console.error(err);
    alert('❌ Could not open order form: ' + (err.message || JSON.stringify(err)));
  }
}

// handle order form submission
document.getElementById('orderForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const chefId = window.orderChefId;
  if (!chefId) return alert('No chef selected');

  const custName = document.getElementById('custNameOrder').value || document.getElementById('custName').value || '';
  const custPhone = document.getElementById('custPhone') ? document.getElementById('custPhone').value : '';
  const custLocation = document.getElementById('custLocation') ? document.getElementById('custLocation').value : '';
  const quantity = Number(document.getElementById('quantity').value) || 1;
  const note = document.getElementById('note').value || '';

  // collect selected menu item keys
  const selected = Array.from(document.querySelectorAll('input[name="menu_item"]:checked')).map(i => i.value);

  const orderPayload = {
    chef_id: chefId,
    cust_name: custName,
    cust_phone: custPhone,
    location: custLocation,
    quantity,
    items: selected,
    note,
    status: 'Pending'
  };

  try {
    const supabase = await getSupabase();
    if (!supabase) throw new Error("Supabase client not initialized");
    const { data, error } = await supabase.from('orders').insert([orderPayload]).select();
    if (error) throw error;
    alert('✅ Order placed!');
    // show qr/pay section
    document.getElementById('qrSection').classList.remove('hidden');
  } catch (err) {
    console.error(err);
    alert('❌ Error placing order: ' + (err.message || JSON.stringify(err)));
  }
});

function confirmPayment() {
  // hide qr and return home
  document.getElementById('qrSection').classList.add('hidden');
  goHome();
}
