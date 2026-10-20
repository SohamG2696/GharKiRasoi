// client/src/pages/CartCheckoutPage.tsx - Itemized Checkout & Payment Simulation
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag,
  MapPin,
  FileText,
  CreditCard,
  QrCode,
  ShieldCheck,
  Plus,
  Minus,
  Trash2,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CartCheckoutPage: React.FC = () => {
  const { items, kitchen, updateQuantity, removeItem, clearCart, subtotal, deliveryFee, platformFee, totalAmount, specialInstructions, setSpecialInstructions } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.addresses?.[0]?.addressLine || 'Hostel Block B, Room 304, Sector 62, Noida'
  );
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+91 98765 43210');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH_ON_DELIVERY'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  if (items.length === 0 || !kitchen) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900">Your Cart is Empty</h2>
        <p className="text-xs text-stone-500 mt-2 mb-6">
          Looks like you haven't added any delicious home-cooked meals yet.
        </p>
        <Link
          to="/"
          className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all shadow-md"
        >
          Explore Nearby Kitchens
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    try {
      const orderPayload = {
        customerId: user?.id || 'usr-customer-1',
        customerName: user?.fullName || 'Aarav Sharma',
        customerPhone,
        kitchenId: kitchen.id,
        deliveryAddress,
        specialInstructions,
        items: items.map(i => ({ id: i.item.id, quantity: i.quantity })),
        paymentMethod
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to place order');
      }

      const data = await res.json();
      const placedOrder = data.order;

      // Celebrate with confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      clearCart();
      navigate(`/order/${placedOrder.id}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to={`/kitchen/${kitchen.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-orange-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {kitchen.name}</span>
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mb-6">
          Order Review & Checkout
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* LEFT 2 COLUMNS: Order Items & Delivery Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Kitchen Name & Items */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div>
                  <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">Kitchen</span>
                  <h2 className="text-lg font-bold text-stone-900">{kitchen.name}</h2>
                  <p className="text-xs text-stone-500">Cooked by Chef {kitchen.cookName}</p>
                </div>
                <button
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-stone-100">
                {items.map(({ item, quantity }) => (
                  <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">{item.name}</h3>
                        <p className="text-xs text-stone-500">₹{item.price} each</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Quantity Controls */}
                      <div className="flex items-center bg-stone-100 rounded-lg p-1 text-xs font-bold">
                        <button
                          onClick={() => updateQuantity(item.id, quantity - 1)}
                          className="p-1 hover:bg-stone-200 rounded-sm"
                        >
                          <Minus className="w-3 h-3 text-stone-700" />
                        </button>
                        <span className="px-2">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                          className="p-1 hover:bg-stone-200 rounded-sm"
                        >
                          <Plus className="w-3 h-3 text-stone-700" />
                        </button>
                      </div>

                      <div className="text-sm font-bold text-stone-900 w-16 text-right">
                        ₹{item.price * quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Instructions */}
              <div className="pt-4 border-t border-stone-100">
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-500" />
                  <span>Special Cooking Instructions for Home Cook</span>
                </label>
                <input
                  type="text"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Less spicy dal, separate chutney, mild salt..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Delivery Address & Contact */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Delivery Details</span>
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Delivery Address (Hostel / Flat / PG)
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Customer Phone (For OTP Delivery Verification)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                <span>Select Payment Method</span>
              </h2>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI')}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-orange-600" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'CARD'
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <span>Cards / NetBanking</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                  className={`p-3.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    paymentMethod === 'CASH_ON_DELIVERY'
                      ? 'border-orange-500 bg-orange-50 text-orange-800'
                      : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-orange-600" />
                  <span>Pay on Delivery</span>
                </button>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 text-[11px] text-amber-800 border border-amber-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Demo Payment Gateway Active: Transactions are verified in test mode securely.</span>
              </div>
            </div>
          </div>

          {/* RIGHT 1 COLUMN: Bill Summary & Checkout Button */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4 sticky top-24">
              <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
                Bill Summary
              </h2>

              <div className="space-y-2.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-semibold text-stone-900">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Partner Fee</span>
                  <span className="font-semibold text-stone-900">₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span className="font-semibold text-stone-900">₹{platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (GST 0% Homely Exemption)</span>
                  <span className="font-semibold text-emerald-600">₹0.00</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-sm font-extrabold text-stone-900">
                <span>Total Payable</span>
                <span className="text-lg text-orange-600">₹{totalAmount.toFixed(2)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-orange-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Processing Order...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Pay ₹{totalAmount}</span>
                  </>
                )}
              </button>

              <div className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Refund Guarantee if rejected by cook</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
