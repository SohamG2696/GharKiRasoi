// client/src/pages/OrderTrackingPage.tsx - Real-Time State Machine Tracker with Route Map & Reviews
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Package,
  Bike,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Star,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DeliveryRouteMap } from '../components/DeliveryRouteMap';
import type { Order, OrderStatus } from '../types';

export const OrderTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Review State
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch order status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setIsSubmittingReview(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          kitchenId: order.kitchenId,
          customerId: order.customerId,
          customerName: order.customerName,
          rating,
          comment
        })
      });

      if (res.ok) {
        confetti({ particleCount: 50, spread: 60 });
        setReviewSubmitted(true);
      } else {
        alert('Failed to submit review');
      }
    } catch {
      alert('Error submitting review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading && !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs text-stone-500">Connecting to live order stream...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-stone-800">Order Not Found</h2>
        <Link to="/" className="text-xs text-orange-600 font-semibold mt-4 inline-block">
          ← Return to Home
        </Link>
      </div>
    );
  }

  const steps: Array<{ status: OrderStatus; label: string; desc: string; icon: React.ReactNode }> = [
    {
      status: 'AWAITING_KITCHEN',
      label: 'Order Placed',
      desc: 'Waiting for home cook to confirm preparation',
      icon: <Clock className="w-4 h-4" />
    },
    {
      status: 'ACCEPTED',
      label: 'Accepted by Kitchen',
      desc: 'Chef reviewed and scheduled your dish',
      icon: <ChefHat className="w-4 h-4" />
    },
    {
      status: 'PREPARING',
      label: 'Cooking on Stove',
      desc: 'Freshly preparing with homemade spices',
      icon: <ChefHat className="w-4 h-4" />
    },
    {
      status: 'PACKED',
      label: 'Food Packed',
      desc: 'Sealed hot in thermal containers',
      icon: <Package className="w-4 h-4" />
    },
    {
      status: 'RIDER_ASSIGNED',
      label: 'Rider Assigned',
      desc: order.riderName ? `Rider ${order.riderName} is heading to kitchen` : 'Matching nearby delivery partner',
      icon: <Bike className="w-4 h-4" />
    },
    {
      status: 'PICKED_UP',
      label: 'Picked Up',
      desc: 'Rider has collected your meal',
      icon: <Bike className="w-4 h-4" />
    },
    {
      status: 'OUT_FOR_DELIVERY',
      label: 'Out for Delivery',
      desc: 'Rider is on the way to your door',
      icon: <Bike className="w-4 h-4" />
    },
    {
      status: 'DELIVERED',
      label: 'Delivered',
      desc: 'Meal enjoyed hot and fresh!',
      icon: <CheckCircle2 className="w-4 h-4" />
    }
  ];

  const statusOrder: OrderStatus[] = [
    'AWAITING_KITCHEN',
    'ACCEPTED',
    'PREPARING',
    'PACKED',
    'RIDER_ASSIGNED',
    'PICKED_UP',
    'OUT_FOR_DELIVERY',
    'DELIVERED'
  ];

  const currentIdx = statusOrder.indexOf(order.status);
  const isRejected = order.status === 'REJECTED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-[#faf8f5] py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>My Orders</span>
          </Link>

          <button
            onClick={fetchOrder}
            className="text-xs text-stone-500 hover:text-orange-600 flex items-center gap-1 font-medium bg-white px-2.5 py-1 rounded-lg border border-stone-200"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refreshed {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
          </button>
        </div>

        {/* ORDER HEADER CARD */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                  {order.orderNumber}
                </span>
                <span className="text-xs text-stone-400">•</span>
                <span className="text-xs text-stone-500">
                  {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-stone-900 mt-1">{order.kitchenName}</h1>
            </div>

            {/* OTP BADGE */}
            {order.status !== 'DELIVERED' && !isRejected && !isCancelled && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-2.5 text-center shadow-xs">
                <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-center gap-1">
                  <KeyRound className="w-3 h-3 text-amber-600" />
                  <span>Delivery OTP</span>
                </div>
                <div className="text-2xl font-black text-amber-900 tracking-widest mt-0.5">
                  {order.deliveryOtp || '4821'}
                </div>
                <div className="text-[9px] text-amber-700">Give this to rider on arrival</div>
              </div>
            )}
          </div>

          {/* ACTIVE STATUS BANNER */}
          <div className="pt-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-stone-500">Current Status</div>
              <div className="text-base font-bold text-stone-900 capitalize">
                {order.status.replace(/_/g, ' ').toLowerCase()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500">Total Amount</div>
              <div className="text-base font-bold text-orange-600">₹{order.totalAmount}</div>
            </div>
          </div>
        </div>

        {/* 🗺️ LIVE DELIVERY ROUTE MAP */}
        {!isRejected && !isCancelled && (
          <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Bike className="w-4 h-4 text-orange-500" />
                <span>Live Route & Delivery Map</span>
              </h2>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                GPS Tracking Active
              </span>
            </div>
            <DeliveryRouteMap
              kitchenLat={order.deliveryLat ? order.deliveryLat + 0.003 : 28.6295}
              kitchenLng={order.deliveryLng ? order.deliveryLng + 0.002 : 77.3660}
              kitchenName={order.kitchenName}
              customerLat={order.deliveryLat || 28.6280}
              customerLng={order.deliveryLng || 77.3649}
              customerAddress={order.deliveryAddress}
              orderStatus={order.status}
              riderName={order.riderName}
            />
          </div>
        )}

        {/* ORDER PROGRESS STATE MACHINE */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs mb-6">
          <h2 className="text-sm font-bold text-stone-900 mb-6 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>Live Preparation & Delivery Timeline</span>
          </h2>

          {isRejected ? (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-red-800 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <div className="text-xs font-bold">Order was declined by the cook</div>
                <div className="text-[11px] text-red-700 mt-0.5">
                  The home cook was unavailable or ran out of ingredients. Your refund of ₹{order.totalAmount} has been processed back to source.
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {steps.map((s, idx) => {
                const isPassed = currentIdx >= idx;
                const isCurrent = currentIdx === idx;

                return (
                  <div key={s.status} className="relative flex items-start gap-3">
                    <div
                      className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-xs ${
                        isPassed
                          ? 'bg-orange-600 ring-4 ring-orange-100'
                          : 'bg-stone-300'
                      }`}
                    >
                      {isPassed ? '✓' : ''}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${isCurrent ? 'text-orange-600' : isPassed ? 'text-stone-900' : 'text-stone-400'}`}>
                          {s.label}
                        </span>
                        {isCurrent && (
                          <span className="bg-orange-100 text-orange-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse">
                            IN PROGRESS
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isPassed ? 'text-stone-600' : 'text-stone-400'}`}>
                        {s.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ⭐ RATE YOUR MEAL SECTION (SHOWN WHEN DELIVERED) */}
        {order.status === 'DELIVERED' && (
          <div className="bg-white rounded-3xl p-6 border-2 border-orange-200 shadow-sm mb-6">
            <h2 className="text-base font-bold text-stone-900 flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>How was your home-cooked meal?</span>
            </h2>
            <p className="text-xs text-stone-500 mb-4">
              Your feedback directly supports <strong>Chef {order.kitchenName}</strong>!
            </p>

            {reviewSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold text-center">
                ✨ Thank you for your review! Your feedback helps your local home cook grow.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          rating >= star
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-stone-700 ml-2">
                    {rating} of 5 Stars
                  </span>
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about taste, spices, packaging, and warmth..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  rows={3}
                  required
                />

                <button
                  type="submit"
                  disabled={isSubmittingReview || !comment.trim()}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReview ? 'Submitting...' : 'Submit Cook Review'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ORDER ITEMS BREAKDOWN */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
          <h2 className="text-sm font-bold text-stone-900 mb-4">Meal Items Ordered</h2>
          <div className="divide-y divide-stone-100 text-xs">
            {order.items.map(i => (
              <div key={i.id} className="py-2.5 flex justify-between">
                <div>
                  <span className="font-bold text-stone-800">{i.quantity}x</span> {i.name}
                </div>
                <div className="font-semibold text-stone-900">₹{i.totalPrice}</div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-stone-100 text-xs text-stone-500 space-y-1">
            <div className="flex justify-between">
              <span>Delivery to:</span>
              <span className="font-medium text-stone-800">{order.deliveryAddress}</span>
            </div>
            {order.specialInstructions && (
              <div className="flex justify-between">
                <span>Cooking Note:</span>
                <span className="italic text-stone-700">{order.specialInstructions}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
