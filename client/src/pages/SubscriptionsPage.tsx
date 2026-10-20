// client/src/pages/SubscriptionsPage.tsx - Homemade Tiffin Subscription Plans
import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Sparkles,
  Utensils,
  Clock,
  ShieldCheck,
  HeartHandshake
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import type { Kitchen, Subscription } from '../types';

export const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [selectedKitchenId, setSelectedKitchenId] = useState('ktch-1');
  const [planType, setPlanType] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [mealSlot, setMealSlot] = useState<'LUNCH' | 'DINNER' | 'BOTH'>('LUNCH');
  const [dietaryNotes, setDietaryNotes] = useState('Pure veg, minimal oil preferred');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSubscriptions = async () => {
    try {
      const resK = await fetch('/api/kitchens');
      if (resK.ok) setKitchens(await resK.json());

      const resS = await fetch('/api/subscriptions');
      if (resS.ok) setSubscriptions(await resS.json());
    } catch (err) {
      console.error('Failed to load subscriptions:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const selectedKitchen = kitchens.find(k => k.id === selectedKitchenId) || kitchens[0];
  const baseRate = selectedKitchen?.startingPrice || 100;
  const days = planType === 'WEEKLY' ? 7 : 30;
  const multiplier = mealSlot === 'BOTH' ? 1.8 : 1.0;
  const estimatedPrice = Math.round(baseRate * days * multiplier);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubscribing(true);
    setSuccessMessage('');

    try {
      const payload = {
        customerId: user?.id || 'usr-customer-1',
        customerName: user?.fullName || 'Aarav Sharma',
        kitchenId: selectedKitchenId,
        planType,
        mealSlot,
        startDate: new Date().toISOString().split('T')[0],
        dietaryNotes
      };

      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        confetti({ particleCount: 70, spread: 60 });
        setSuccessMessage('🎉 You have successfully subscribed to the Homemade Tiffin Plan!');
        fetchSubscriptions();
      } else {
        alert('Failed to create subscription');
      }
    } catch {
      alert('Error creating subscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 px-3.5 py-1 rounded-full text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Monthly & Weekly Homely Tiffins</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Campus & PG Daily Tiffin Plans
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
            Never worry about lunch or dinner again. Fresh, healthy home-cooked meals delivered every day directly to your hostel gate or PG room.
          </p>
        </div>

        {successMessage && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold text-center">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* LEFT 2 COLUMNS: Plan Customizer */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
            <form onSubmit={handleSubscribe} className="space-y-6">
              {/* Select Home Cook */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  1. Select Your Home Cook
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kitchens.map(k => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setSelectedKitchenId(k.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        selectedKitchenId === k.id
                          ? 'border-orange-500 bg-orange-50/70 shadow-xs'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <div className="font-bold text-xs text-stone-900">{k.name}</div>
                      <div className="text-[11px] text-stone-500">By Chef {k.cookName}</div>
                      <div className="text-[10px] text-orange-700 font-semibold mt-1">
                        Meals from ₹{k.startingPrice}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Duration */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  2. Plan Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPlanType('WEEKLY')}
                    className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                      planType === 'WEEKLY'
                        ? 'border-orange-500 bg-orange-50 text-orange-900 font-bold'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="text-sm font-bold">Weekly (7 Days)</div>
                    <div className="text-xs text-stone-500 mt-0.5">Flexible trial for the week</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanType('MONTHLY')}
                    className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                      planType === 'MONTHLY'
                        ? 'border-orange-500 bg-orange-50 text-orange-900 font-bold'
                        : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="text-sm font-bold">Monthly (30 Days)</div>
                    <div className="text-xs text-stone-500 mt-0.5">Best savings • Save 20%</div>
                  </button>
                </div>
              </div>

              {/* Meal Slot */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  3. Select Meals
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['LUNCH', 'DINNER', 'BOTH'] as const).map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setMealSlot(slot)}
                      className={`p-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer ${
                        mealSlot === slot
                          ? 'border-orange-500 bg-orange-50 text-orange-800'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      {slot === 'BOTH' ? 'Lunch & Dinner' : slot}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Preferences */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  4. Custom Notes for Cook
                </label>
                <input
                  type="text"
                  value={dietaryNotes}
                  onChange={(e) => setDietaryNotes(e.target.value)}
                  placeholder="e.g. Jain friendly, no onion, less spicy, soft rotis..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 bg-stone-50 focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubscribing}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-orange-600/20 cursor-pointer"
              >
                {isSubscribing ? 'Activating Subscription...' : `Activate Subscription for ₹${estimatedPrice}`}
              </button>
            </form>
          </div>

          {/* RIGHT 1 COLUMN: Plan Summary Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
                Plan Economics
              </h3>

              <div className="space-y-3 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Selected Cook:</span>
                  <span className="font-bold text-stone-900">{selectedKitchen?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-bold text-stone-900">{days} Days</span>
                </div>
                <div className="flex justify-between">
                  <span>Slot:</span>
                  <span className="font-bold text-stone-900">{mealSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Delivery Fee:</span>
                  <span className="font-bold text-emerald-600">FREE Included</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-between items-center text-sm font-extrabold text-stone-900">
                <span>Total Amount:</span>
                <span className="text-xl text-orange-600">₹{estimatedPrice}</span>
              </div>

              <div className="bg-stone-50 rounded-xl p-3 text-[11px] text-stone-600 space-y-1.5 border border-stone-100">
                <div className="flex items-center gap-1.5 text-stone-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pause or skip days with 1 tap</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-800 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero preservatives or reused cooking oil</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIVE SUBSCRIPTIONS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
          <h2 className="text-lg font-bold text-stone-900 mb-1">My Active Tiffin Subscriptions</h2>
          <p className="text-xs text-stone-500 mb-6">Track your scheduled daily meals and active kitchen</p>

          <div className="space-y-4">
            {subscriptions.map(s => (
              <div
                key={s.id}
                className="p-5 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-900">{s.kitchenName}</span>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    {s.planType} Plan • {s.mealSlot} • Active until {s.endDate}
                  </div>
                  {s.dietaryNotes && (
                    <div className="text-[11px] text-stone-500 mt-1 italic">
                      Notes: {s.dietaryNotes}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-orange-600">₹{s.totalAmount}</div>
                  <div className="text-[10px] text-stone-400">Prepaid</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
