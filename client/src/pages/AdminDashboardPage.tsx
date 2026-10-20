// client/src/pages/AdminDashboardPage.tsx - Platform Oversight & Verification
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  Store,
  Bike,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import type { Kitchen, Order } from '../types';

export const AdminDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const resM = await fetch('/api/admin/metrics');
      if (resM.ok) setMetrics(await resM.json());

      const resK = await fetch('/api/kitchens');
      if (resK.ok) setKitchens(await resK.json());

      const resO = await fetch('/api/orders');
      if (resO.ok) setOrders(await resO.json());
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleVerification = async (kitchenId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/kitchens/${kitchenId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !currentStatus })
      });
      if (res.ok) {
        setKitchens(prev =>
          prev.map(k => (k.id === kitchenId ? { ...k, isVerified: !currentStatus } : k))
        );
      }
    } catch {
      alert('Verification update failed');
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-stone-500">Loading administrator console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">
                Platform Operations & Governance
              </span>
              <h1 className="text-2xl font-extrabold text-stone-900">Administrator Console</h1>
              <p className="text-xs text-stone-500">Live order audit, cook verification & platform economics</p>
            </div>
          </div>

          <button
            onClick={fetchAdminData}
            className="p-2.5 rounded-xl border border-stone-200 text-stone-500 hover:text-purple-700 bg-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* METRICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Gross Order Value (GMV)</div>
            <div className="text-2xl font-extrabold text-stone-900 mt-1">₹{metrics?.totalRevenue || 0}</div>
            <div className="text-[10px] text-stone-400 mt-1">{metrics?.totalOrders || 0} lifetime orders</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Platform Commission (8%)</div>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1">₹{metrics?.platformCommission || 0}</div>
            <div className="text-[10px] text-emerald-600 mt-1">Healthy unit economics</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Registered Kitchens</div>
            <div className="text-2xl font-extrabold text-orange-600 mt-1">{metrics?.totalKitchens || 0}</div>
            <div className="text-[10px] text-stone-400 mt-1">Verified home chefs</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
            <div className="text-xs text-stone-500 font-medium">Active Riders</div>
            <div className="text-2xl font-extrabold text-blue-600 mt-1">{metrics?.totalRiders || 0}</div>
            <div className="text-[10px] text-stone-400 mt-1">On-demand fleet</div>
          </div>
        </div>

        {/* KITCHEN MODERATION TABLE */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-8">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Kitchen Verification & Moderation</h2>
          <p className="text-xs text-stone-500 mb-4">Ensure strict adherence to homemade quality and hygiene standards</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3 rounded-l-xl">Kitchen Name</th>
                  <th className="p-3">Home Cook</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 rounded-r-xl text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {kitchens.map(k => (
                  <tr key={k.id} className="hover:bg-stone-50">
                    <td className="p-3 font-bold text-stone-900">{k.name}</td>
                    <td className="p-3 text-stone-700">{k.cookName}</td>
                    <td className="p-3 text-stone-500">{k.phone}</td>
                    <td className="p-3 text-stone-500">{k.addressText}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        k.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {k.isVerified ? 'Verified' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleVerification(k.id, k.isVerified)}
                        className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                          k.isVerified
                            ? 'bg-red-50 text-red-700 hover:bg-red-100'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {k.isVerified ? 'Revoke Verification' : 'Approve Kitchen'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT ORDERS AUDIT */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-1">Platform Live Orders Stream</h2>
          <p className="text-xs text-stone-500 mb-4">Complete audit trail across customer, cook and rider</p>

          <div className="divide-y divide-stone-100 text-xs">
            {orders.map(o => (
              <div key={o.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">{o.orderNumber}</span>
                    <span className="text-stone-400">•</span>
                    <span className="text-stone-700">{o.customerName} → {o.kitchenName}</span>
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')} • Paid: ₹{o.totalAmount} ({o.paymentMethod})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase bg-stone-100 text-stone-800 px-2.5 py-1 rounded-md">
                    {o.status.replace(/_/g, ' ')}
                  </span>
                  {o.riderName && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-semibold">
                      Rider: {o.riderName}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
