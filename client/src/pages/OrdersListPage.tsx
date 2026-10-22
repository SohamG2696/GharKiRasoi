// client/src/pages/OrdersListPage.tsx - Customer Orders History
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';

export const OrdersListPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?customerId=${user?.id || 'usr-customer-1'}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 3000);
    const handlePushEvent = () => loadOrders();
    window.addEventListener('gkr_order_update', handlePushEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener('gkr_order_update', handlePushEvent);
    };
  }, [loadOrders]);

  return (
    <div className="min-h-screen bg-[#faf8f5] py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mb-2">
          My Homemade Orders
        </h1>
        <p className="text-xs text-stone-500 mb-8">
          Track active deliveries and review your homemade meal history
        </p>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-stone-400">Loading your orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
            <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-stone-800">No Orders Placed Yet</h3>
            <p className="text-xs text-stone-500 mt-1 mb-6">Explore local home cooks and order your first authentic thali!</p>
            <Link
              to="/"
              className="bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Discover Kitchens
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs hover:border-orange-200 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">{order.kitchenName}</span>
                    <span className="text-xs text-stone-400">·</span>
                    <span className="text-xs text-stone-500">{order.orderNumber}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-900">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="text-xs text-stone-600">
                    {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-stone-400 pt-1">
                    <span>{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>·</span>
                    <span className="font-bold text-stone-700">₹{order.totalAmount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <Link
                    to={`/order-tracking/${order.id}`}
                    className="flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    View Status
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default OrdersListPage;
