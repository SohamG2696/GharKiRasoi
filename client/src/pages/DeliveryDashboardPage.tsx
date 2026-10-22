// client/src/pages/DeliveryDashboardPage.tsx - Delivery Partner Portal & OTP Verification
import React, { useState, useEffect } from 'react';
import {
  Bike,
  CheckCircle2,
  Navigation,
  MapPin,
  Clock,
  KeyRound,
  RefreshCw,
  Wallet,
  Package,
  ShieldCheck,
  AlertCircle,
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';

export const DeliveryDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [activeOtpModalOrder, setActiveOtpModalOrder] = useState<Order | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const riderId = user?.id || 'usr-rider-1';
  const riderName = user?.fullName || 'Vikram Singh';

  const fetchDeliveryData = async () => {
    try {
      const resAvail = await fetch('/api/delivery/available-orders');
      if (resAvail.ok) {
        const availData = await resAvail.json();
        setAvailableOrders(availData);
      }

      const resMine = await fetch(`/api/delivery/my-deliveries?riderId=${riderId}`);
      if (resMine.ok) {
        const mineData = await resMine.json();
        setMyDeliveries(mineData);
      }
    } catch (err) {
      console.error('Failed to load delivery data:', err);
    }
  };

  useEffect(() => {
    fetchDeliveryData();
    const interval = setInterval(fetchDeliveryData, 3000);
    const handlePushEvent = () => fetchDeliveryData();
    window.addEventListener('gkr_order_update', handlePushEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('gkr_order_update', handlePushEvent);
    };
  }, [riderId]);

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await fetch('/api/delivery/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, riderId, riderName })
      });
      if (res.ok) {
        await fetchDeliveryData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to accept order');
      }
    } catch {
      alert('Error accepting delivery assignment');
    }
  };

  const handlePickup = async (orderId: string) => {
    try {
      const res = await fetch('/api/delivery/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, riderId })
      });
      if (res.ok) {
        await fetchDeliveryData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to mark order as picked up');
      }
    } catch {
      alert('Failed to mark order as picked up');
    }
  };

  const handleOutForDelivery = async (orderId: string) => {
    try {
      const res = await fetch('/api/delivery/out-for-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, riderId })
      });
      if (res.ok) {
        await fetchDeliveryData();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to update out for delivery');
      }
    } catch {
      alert('Failed to update out for delivery');
    }
  };

  const handleCompleteWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOtpModalOrder) return;
    setIsCompleting(true);
    setOtpError('');

    try {
      const res = await fetch('/api/delivery/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeOtpModalOrder.id,
          riderId,
          otp: enteredOtp
        })
      });

      if (res.ok) {
        setActiveOtpModalOrder(null);
        setEnteredOtp('');
        await fetchDeliveryData();
      } else {
        const data = await res.json();
        setOtpError(data.message || 'Invalid OTP');
      }
    } catch {
      setOtpError('Failed to verify OTP');
    } finally {
      setIsCompleting(false);
    }
  };

  const activeAssigned = myDeliveries.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  const completedDeliveries = myDeliveries.filter(o => o.status === 'DELIVERED');
  const totalRiderEarnings = completedDeliveries.length * 40;

  return (
    <div className="min-h-screen bg-[#faf8f5] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* RIDER PROFILE & STATUS BANNER */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bike className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                Rider Console • Verified Partner
              </span>
              <h1 className="text-2xl font-extrabold text-stone-900">{riderName}</h1>
              <p className="text-xs text-stone-500">
                Electric Scooter • Sector 62 Zone • 4.9 ★ Rating
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isOnline
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-stone-200 text-stone-700'
              }`}
            >
              {isOnline ? '🟢 Online & Ready for Orders' : '⚪ Offline'}
            </button>
            <button
              onClick={fetchDeliveryData}
              title="Refresh deliveries"
              className="p-2 rounded-xl border border-stone-200 text-stone-500 hover:text-emerald-700 bg-white cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase">Total Earnings</span>
                <div className="text-xl font-extrabold text-stone-900">₹{totalRiderEarnings}.00</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase">Delivered</span>
                <div className="text-xl font-extrabold text-stone-900">{completedDeliveries.length + 8} Meals</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase">Avg Delivery Time</span>
                <div className="text-xl font-extrabold text-stone-900">18 Mins</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-stone-400 font-bold uppercase">Payout / Drop</span>
                <div className="text-xl font-extrabold text-stone-900">₹40.00 Fixed</div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: MY ACTIVE DELIVERIES */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">My Active Delivery Task</h2>
              <p className="text-xs text-stone-500">Pick up meal from kitchen and deliver to customer with OTP</p>
            </div>
            {activeAssigned.length > 0 && (
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                {activeAssigned.length} task in progress
              </span>
            )}
          </div>

          {activeAssigned.length === 0 ? (
            <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-500">
              No active delivery right now. Accept an available order from the list below!
            </div>
          ) : (
            <div className="space-y-4">
              {activeAssigned.map(o => (
                <div
                  key={o.id}
                  className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">{o.orderNumber}</span>
                      <span className="text-xs font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>Pickup: {o.kitchenName}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <Navigation className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Drop: {o.deliveryAddress} ({o.customerName || 'Customer'} - {o.customerPhone || 'Phone in App'})</span>
                      </div>
                      <div className="text-[11px] text-stone-600 pl-5">
                        Dishes: {(o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Homemade Meals'}
                      </div>
                      {o.specialInstructions && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 w-fit ml-5">
                          Note: {o.specialInstructions}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {o.status === 'RIDER_ASSIGNED' && (
                      <button
                        onClick={() => handlePickup(o.id)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>Confirm Picked Up</span>
                      </button>
                    )}

                    {o.status === 'PICKED_UP' && (
                      <button
                        onClick={() => handleOutForDelivery(o.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Bike className="w-3.5 h-3.5" />
                        <span>Start Transit (Out for Delivery)</span>
                      </button>
                    )}

                    {(o.status === 'OUT_FOR_DELIVERY' || o.status === 'ARRIVED_AT_CUSTOMER') && (
                      <button
                        onClick={() => {
                          setActiveOtpModalOrder(o);
                          setEnteredOtp('');
                          setOtpError('');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>Enter Customer OTP & Complete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: AVAILABLE NEARBY ORDERS */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-stone-900">Available Ready Orders</h2>
              <p className="text-xs text-stone-500">Claim deliveries in your immediate radius</p>
            </div>
            <span className="text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full">
              {availableOrders.length} nearby
            </span>
          </div>

          {availableOrders.length === 0 ? (
            <div className="text-center py-8 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-500">
              No orders waiting for pickup right now. Available orders will appear here automatically as kitchens cook!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {availableOrders.map(o => (
                <div key={o.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-900">{o.kitchenName}</span>
                      <span className="text-xs text-stone-400">→</span>
                      <span className="text-xs font-semibold text-stone-700">{o.deliveryAddress}</span>
                    </div>
                    <div className="text-xs text-stone-500">
                      {(o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ') || 'Homemade Meals'} • Payout: <strong className="text-emerald-600">₹40.00</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptOrder(o.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Accept Delivery</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OTP CONFIRMATION MODAL */}
      {activeOtpModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-stone-900">Enter Delivery OTP</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4">
              Ask <strong>{activeOtpModalOrder.customerName || 'the Customer'}</strong> for the 4-digit OTP shown in their app to confirm handover.
            </p>

            <form onSubmit={handleCompleteWithOtp} className="space-y-4">
              <input
                type="text"
                maxLength={4}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder="4-digit OTP (e.g. 4821)"
                className="w-full text-center text-2xl font-black tracking-widest p-3 rounded-2xl border-2 border-emerald-300 focus:outline-none focus:border-emerald-600"
                required
                autoFocus
              />

              {otpError && (
                <div className="text-xs text-red-600 font-semibold">{otpError}</div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveOtpModalOrder(null)}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCompleting || enteredOtp.length < 4}
                  className="w-1/2 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isCompleting ? 'Verifying...' : 'Verify & Deliver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
