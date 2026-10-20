// client/src/pages/CartCheckoutPage.tsx - Itemized Checkout & Interactive Payment Gateway Simulator
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export const CartCheckoutPage: React.FC = () => {
  const {
    items,
    kitchen,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    deliveryFee,
    platformFee,
    totalAmount,
    specialInstructions,
    setSpecialInstructions
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.addresses?.[0]?.addressLine || 'Hostel Block B, Room 304, Sector 62, Noida'
  );
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+91 98765 43210');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CARD' | 'CASH_ON_DELIVERY'>('UPI');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Interactive Payment Gateway Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalTab, setModalTab] = useState<'UPI' | 'CARD' | 'COD'>('UPI');
  const [paymentError, setPaymentError] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

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

  // Trigger payment modal
  const handleInitiatePayment = () => {
    setPaymentError('');
    setShowPaymentModal(true);
  };

  // Execute actual order creation on payment verification
  const handleConfirmOrder = async (isSuccess = true) => {
    if (!isSuccess) {
      setPaymentError('❌ Payment declined by simulated bank gateway: Insufficient balance or user cancelled.');
      return;
    }

    setIsSubmitting(true);
    setPaymentError('');

    try {
      const orderPayload = {
        customerId: user?.id || 'usr-customer-1',
        customerName: user?.fullName || 'Aarav Sharma',
        customerPhone,
        kitchenId: kitchen.id,
        deliveryAddress,
        specialInstructions,
        items: items.map(i => ({ id: i.item.id, quantity: i.quantity })),
        paymentMethod: modalTab === 'COD' ? 'CASH_ON_DELIVERY' : modalTab === 'CARD' ? 'CARD' : 'UPI'
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

      setShowPaymentModal(false);
      clearCart();
      navigate(`/order/${placedOrder.id}`);
    } catch (err: any) {
      setPaymentError(err.message || 'Order creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillTestCard = () => {
    setCardNumber('4532 8920 4589 1234');
    setCardExpiry('12/28');
    setCardCvv('782');
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
                          className="p-1 hover:bg-stone-200 rounded-sm cursor-pointer"
                        >
                          <Minus className="w-3 h-3 text-stone-700" />
                        </button>
                        <span className="px-2">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, quantity + 1)}
                          className="p-1 hover:bg-stone-200 rounded-sm cursor-pointer"
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
          </div>

          {/* RIGHT 1 COLUMN: Bill Summary & Proceed Button */}
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
                onClick={handleInitiatePayment}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-orange-600/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Proceed to Pay ₹{totalAmount}</span>
              </button>

              <div className="text-[11px] text-stone-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>100% Refund Guarantee if rejected by cook</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 💳 INTERACTIVE PAYMENT GATEWAY MODAL (SIMULATOR & TEST GATEWAY) */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Ghar Ki Rasoi Payment</h3>
                  <p className="text-[10px] text-stone-400">Secure Test Payment Simulator</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-stone-400">Amount to Pay</div>
                <div className="text-base font-extrabold text-orange-600">₹{totalAmount}</div>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <button
                onClick={() => { setModalTab('UPI'); setPaymentError(''); }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalTab === 'UPI'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI / QR</span>
              </button>

              <button
                onClick={() => { setModalTab('CARD'); setPaymentError(''); }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalTab === 'CARD'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>

              <button
                onClick={() => { setModalTab('COD'); setPaymentError(''); }}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  modalTab === 'COD'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Cash/COD</span>
              </button>
            </div>

            {/* TAB CONTENT: UPI */}
            {modalTab === 'UPI' && (
              <div className="text-center py-2 space-y-3">
                <div className="w-36 h-36 mx-auto bg-stone-50 border-2 border-stone-200 rounded-2xl p-2 flex items-center justify-center shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=upi://pay?pa=gharkirasoi@icici&pn=GharKiRasoi&am=${totalAmount}&cu=INR`}
                    alt="UPI QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-stone-500">
                  Scan with <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Card */}
            {modalTab === 'CARD' && (
              <div className="space-y-3 py-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] font-semibold text-stone-600">Card Number</label>
                    <button
                      type="button"
                      onClick={handleFillTestCard}
                      className="text-[10px] text-orange-600 hover:underline font-bold"
                    >
                      Fill Test Card
                    </button>
                  </div>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4532 8920 4589 1234"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">Expiry</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">CVV</label>
                    <input
                      type="password"
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="•••"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: COD */}
            {modalTab === 'COD' && (
              <div className="text-center py-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-600 space-y-1">
                <div className="font-bold text-stone-800">Pay Upon Meal Handover</div>
                <div className="text-[11px] text-stone-500">
                  You can pay cash or scan the delivery partner's QR code when your food arrives.
                </div>
              </div>
            )}

            {/* Payment Error Alert */}
            {paymentError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{paymentError}</span>
              </div>
            )}

            {/* Action Simulator Buttons */}
            <div className="pt-5 space-y-2">
              <button
                onClick={() => handleConfirmOrder(true)}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Verifying & Placing Order...' : 'Simulate Payment Success (Place Order)'}</span>
              </button>

              <button
                onClick={() => handleConfirmOrder(false)}
                disabled={isSubmitting}
                className="w-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Simulate Payment Failure / Decline</span>
              </button>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full text-stone-500 hover:text-stone-700 py-1.5 text-xs font-semibold"
              >
                Cancel & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
