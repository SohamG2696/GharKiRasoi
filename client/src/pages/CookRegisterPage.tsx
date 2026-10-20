// client/src/pages/CookRegisterPage.tsx - Home Cook Kitchen Onboarding Wizard
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChefHat, CheckCircle2, ShieldCheck, ArrowLeft, Sparkles, MapPin, Phone, Upload } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

export const CookRegisterPage: React.FC = () => {
  const { user, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [cookName, setCookName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '+91 98111 22334');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('Flat 402, Block C, Green View Apartments, Sector 62, Noida');
  const [isVegOnly, setIsVegOnly] = useState(true);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState('25');
  const [startingPrice, setStartingPrice] = useState('90');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(['North Indian', 'Homely Thali']);
  const [bannerUrl, setBannerUrl] = useState(
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'
  );
  const [fssaiPledge, setFssaiPledge] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableCuisines = [
    'North Indian',
    'Homely Thali',
    'Punjabi',
    'Gujarati',
    'Kathiawadi',
    'South Indian',
    'Jain Friendly',
    'Maharashtrian',
    'Healthy Diet'
  ];

  const handleCuisineToggle = (c: string) => {
    setSelectedCuisines(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fssaiPledge) {
      alert('Please accept the kitchen hygiene & purity pledge to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name,
        cookName,
        phone,
        description,
        addressText,
        cuisineTypes: selectedCuisines,
        isVegOnly,
        prepTimeMinutes: Number(prepTimeMinutes),
        startingPrice: Number(startingPrice),
        bannerUrl,
        ownerId: user?.id || 'usr-cook-1'
      };

      const res = await fetch('/api/kitchens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to register kitchen');
      }

      confetti({ particleCount: 80, spread: 70 });
      switchDemoRole('COOK');
      alert('🎉 Kitchen registered successfully! Welcome to the Ghar Ki Rasoi home cook family.');
      navigate('/cook');
    } catch (err: any) {
      alert(err.message || 'Error onboarding kitchen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] py-10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-orange-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* HEADER */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <ChefHat className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider">
                Home Cook Onboarding
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
                Start Your Home Kitchen
              </h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Turn your passion for cooking into a rewarding daily livelihood from your own home stove.
              </p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Privacy & Safety Guarantee</span>
            </div>
            <p className="text-[11px] text-amber-700">
              Your exact apartment number is never publicly shared with customers. Only delivery partners receive the pickup address once an order is accepted.
            </p>
          </div>
        </div>

        {/* REGISTRATION FORM */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kitchen Name & Cook Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Kitchen Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Radhe Krishna Homely Thali"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Cook / Homemaker Name
                </label>
                <input
                  type="text"
                  value={cookName}
                  onChange={(e) => setCookName(e.target.value)}
                  placeholder="e.g. Sunita Agrawal"
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Phone & Pickup Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Contact Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98..."
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Starting Meal Price (₹)
                </label>
                <input
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Pickup Address (For Delivery Partner)
              </label>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            {/* Kitchen Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Kitchen Story & Specialties
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell customers about your cooking style, pure ingredients, oil usage, and daily homemade thali specialties..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            {/* Cuisine Specialties */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Cuisine Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCuisines.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCuisineToggle(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      selectedCuisines.includes(c)
                        ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Veg Only Toggle */}
            <div className="flex items-center gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
              <input
                type="checkbox"
                id="vegOnlyCheck"
                checked={isVegOnly}
                onChange={(e) => setIsVegOnly(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="vegOnlyCheck" className="text-xs font-bold text-emerald-900 cursor-pointer">
                Strict 100% Pure Vegetarian Kitchen (No eggs, no meat prepared in utensils)
              </label>
            </div>

            {/* Hygiene Pledge */}
            <div className="flex items-start gap-3 p-4 bg-stone-50 border border-stone-200 rounded-2xl">
              <input
                type="checkbox"
                id="pledgeCheck"
                checked={fssaiPledge}
                onChange={(e) => setFssaiPledge(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-orange-600 focus:ring-orange-500"
                required
              />
              <label htmlFor="pledgeCheck" className="text-[11px] text-stone-700 leading-relaxed cursor-pointer">
                <strong>Ghar Ki Rasoi Hygiene Pledge:</strong> I commit to cooking with fresh daily vegetables, drinking RO water, pure spices, and clean domestic utensils.
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-orange-600/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Your Kitchen...' : 'Launch Home Kitchen on Ghar Ki Rasoi 🚀'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
