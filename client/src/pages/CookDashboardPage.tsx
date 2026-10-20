// client/src/pages/CookDashboardPage.tsx - Home Cook Kitchen Management & Dynamic Menu Editor
import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Plus,
  Power,
  Clock,
  CheckCircle,
  XCircle,
  PackageCheck,
  TrendingUp,
  Trash2,
  Edit2,
  Leaf,
  UtensilsCrossed,
  RefreshCw
} from 'lucide-react';
import type { Kitchen, MenuItem, Order } from '../types';

export const CookDashboardPage: React.FC = () => {
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Menu Item Form Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('110');
  const [newItemCategory, setNewItemCategory] = useState('Daily Specials');
  const [newItemVeg, setNewItemVeg] = useState(true);
  const [newItemQuantity, setNewItemQuantity] = useState('20');
  const [newItemImage, setNewItemImage] = useState(
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=500&q=80'
  );

  const fetchCookData = async () => {
    try {
      // For demo, cook is associated with ktch-1 (Maa Ka Pyaar Rasoi)
      const resK = await fetch('/api/kitchens/ktch-1');
      if (resK.ok) {
        const kData = await resK.json();
        setKitchen(kData);
        setMenuItems(kData.menuItems || []);
      }

      const resO = await fetch('/api/orders?kitchenId=ktch-1');
      if (resO.ok) {
        const oData = await resO.json();
        setOrders(oData);
      }
    } catch (err) {
      console.error('Failed to load cook dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCookData();
    const interval = setInterval(fetchCookData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleKitchen = async () => {
    if (!kitchen) return;
    try {
      const res = await fetch(`/api/kitchens/${kitchen.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOpen: !kitchen.isOpen })
      });
      if (res.ok) {
        setKitchen(prev => (prev ? { ...prev, isOpen: !prev.isOpen } : null));
      }
    } catch (err) {
      alert('Failed to update kitchen status');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string, note = '') => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, note, actorRole: 'COOK' })
      });
      if (res.ok) {
        fetchCookData();
      } else {
        const err = await res.json();
        alert(err.message || 'Status transition failed');
      }
    } catch (err) {
      alert('Error updating order');
    }
  };

  const handleRejectOrder = (orderId: string) => {
    const reason = prompt('Please enter rejection reason (e.g., Sold out of ingredients):');
    if (!reason) return;
    handleUpdateOrderStatus(orderId, 'REJECTED', reason);
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kitchen) return;
    try {
      const payload = {
        kitchenId: kitchen.id,
        name: newItemName,
        description: newItemDesc,
        price: Number(newItemPrice),
        category: newItemCategory,
        isVeg: newItemVeg,
        dailyQuantity: Number(newItemQuantity),
        imageUrl: newItemImage
      };

      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewItemName('');
        setNewItemDesc('');
        fetchCookData();
      } else {
        alert('Failed to create menu item');
      }
    } catch (err) {
      alert('Error creating item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this dish from your menu?')) return;
    try {
      const res = await fetch(`/api/menu/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        setMenuItems(prev => prev.filter(m => m.id !== itemId));
      }
    } catch {
      alert('Error deleting item');
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable })
      });
      if (res.ok) {
        setMenuItems(prev =>
          prev.map(m => (m.id === item.id ? { ...m, isAvailable: !m.isAvailable } : m))
        );
      }
    } catch {
      alert('Error updating item availability');
    }
  };

  const activeOrders = orders.filter(o => !['DELIVERED', 'REJECTED', 'CANCELLED'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'DELIVERED');
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'SUCCESS' ? o.subtotal : 0), 0);

  if (isLoading && !kitchen) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-stone-500">Loading home cook portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER & OPEN/CLOSE TOGGLE */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ChefHat className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                Home Cook Control Panel
              </span>
              <h1 className="text-2xl font-extrabold text-stone-900">{kitchen?.name}</h1>
              <p className="text-xs text-stone-500">Chef {kitchen?.cookName} • {kitchen?.addressText}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleKitchen}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs ${
                kitchen?.isOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{kitchen?.isOpen ? 'Kitchen Open (Accepting Orders)' : 'Kitchen Closed'}</span>
            </button>

            <button
              onClick={fetchCookData}
              className="p-2 rounded-xl border border-stone-200 text-stone-500 hover:text-orange-600 bg-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Pending Orders</div>
            <div className="text-3xl font-extrabold text-orange-600 mt-1">{activeOrders.length}</div>
            <div className="text-[11px] text-stone-400 mt-1">Requires kitchen preparation</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Completed Deliveries</div>
            <div className="text-3xl font-extrabold text-emerald-600 mt-1">{completedOrders.length}</div>
            <div className="text-[11px] text-stone-400 mt-1">Successfully fulfilled today</div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Total Food Revenue</div>
            <div className="text-3xl font-extrabold text-stone-900 mt-1">₹{totalRevenue.toFixed(2)}</div>
            <div className="text-[11px] text-stone-400 mt-1">Directly credited to cook account</div>
          </div>
        </div>

        {/* SECTION 1: LIVE ORDERS QUEUE */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Incoming & Active Orders</h2>
              <p className="text-xs text-stone-500">Accept, prepare, and pack meals in small batches</p>
            </div>
            <span className="text-xs font-bold bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
              {activeOrders.length} active
            </span>
          </div>

          {activeOrders.length === 0 ? (
            <div className="text-center py-10 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-500">
              No pending orders right now. Orders will appear here in real time.
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(o => (
                <div
                  key={o.id}
                  className="bg-stone-50 rounded-2xl p-5 border border-stone-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">{o.orderNumber}</span>
                      <span className="text-xs text-stone-400">•</span>
                      <span className="text-xs font-medium text-stone-600">For {o.customerName} ({o.customerPhone})</span>
                      <span className="text-[10px] font-extrabold bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full uppercase">
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-stone-800 font-medium">
                      {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>

                    {o.specialInstructions && (
                      <div className="text-[11px] text-amber-800 italic bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 w-fit">
                        Note: {o.specialInstructions}
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS BASED ON STATE */}
                  <div className="flex items-center gap-2 shrink-0">
                    {o.status === 'AWAITING_KITCHEN' && (
                      <>
                        <button
                          onClick={() => handleUpdateOrderStatus(o.id, 'ACCEPTED', 'Cook accepted the order and started preparing.')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Accept Order</span>
                        </button>
                        <button
                          onClick={() => handleRejectOrder(o.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </>
                    )}

                    {o.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(o.id, 'PREPARING', 'Meal is on the stove cooking.')}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Start Cooking</span>
                      </button>
                    )}

                    {o.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(o.id, 'PACKED', 'Food packed hot and ready for delivery partner pickup.')}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Mark Food Packed</span>
                      </button>
                    )}

                    {o.status === 'PACKED' && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-2 rounded-xl">
                        Waiting for Delivery Partner
                      </span>
                    )}

                    {o.status === 'RIDER_ASSIGNED' && (
                      <span className="text-xs font-bold text-blue-700 bg-blue-100 px-3 py-2 rounded-xl">
                        Rider {o.riderName} arriving
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: DYNAMIC MENU MANAGER */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Dynamic Menu & Daily Catalog</h2>
              <p className="text-xs text-stone-500">Add dishes, adjust daily portions, and toggle availability</p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map(item => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-stone-200 flex items-center justify-between gap-4 hover:border-orange-200 transition-colors bg-white"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">{item.name}</span>
                      {item.isVeg && <Leaf className="w-3 h-3 text-emerald-600" />}
                    </div>
                    <div className="text-xs font-bold text-orange-600">₹{item.price}</div>
                    <div className="text-[10px] text-stone-400">
                      Cap: {item.dailyQuantity} portions • Sold: {item.soldQuantity || 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleItemAvailability(item)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                      item.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}
                  >
                    {item.isAvailable ? 'In Stock' : 'Sold Out'}
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg"
                    title="Delete dish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ADD DISH MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Add Homemade Dish</h3>
            <form onSubmit={handleCreateMenuItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Kadai Paneer + 3 Phulkas"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="e.g. Mildly spiced homemade cottage cheese in slow cooked gravy..."
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Portion Limit</label>
                  <input
                    type="number"
                    value={newItemQuantity}
                    onChange={(e) => setNewItemQuantity(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="vegCheck"
                  checked={newItemVeg}
                  onChange={(e) => setNewItemVeg(e.target.checked)}
                  className="rounded-sm"
                />
                <label htmlFor="vegCheck" className="text-xs font-semibold text-stone-700">
                  Pure Vegetarian Dish
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                >
                  Publish Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
