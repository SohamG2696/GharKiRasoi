// client/src/pages/LandingPage.tsx - Modern Marketplace Discovery & Hero
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Search,
  Star,
  Clock,
  Navigation,
  ShieldCheck,
  Utensils,
  Leaf,
  ChevronRight,
  Sparkles,
  HeartHandshake,
  Soup,
  CalendarCheck
} from 'lucide-react';
import type { Kitchen } from '../types';

export const LandingPage: React.FC = () => {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [userLocation, setUserLocation] = useState('Sector 62, Noida (Hostel Zone)');
  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    fetchKitchens();
  }, [searchQuery, selectedCategory]);

  const fetchKitchens = async () => {
    setIsLoading(true);
    try {
      let url = `/api/kitchens?q=${encodeURIComponent(searchQuery)}`;
      if (selectedCategory === 'VEG') url += '&vegOnly=true';
      if (selectedCategory !== 'ALL' && selectedCategory !== 'VEG') {
        url += `&cuisine=${encodeURIComponent(selectedCategory)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setKitchens(data);
      }
    } catch (err) {
      console.error('Failed to load kitchens:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocating(false);
          setUserLocation(`Live GPS (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`);
          fetchKitchens();
        },
        () => {
          setIsLocating(false);
          setUserLocation('Sector 62, Noida (Auto-selected)');
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  const categories = [
    { id: 'ALL', label: 'All Kitchens', icon: <Utensils className="w-4 h-4" /> },
    { id: 'VEG', label: 'Pure Veg', icon: <Leaf className="w-4 h-4 text-emerald-600" /> },
    { id: 'North Indian', label: 'North Indian', icon: <Soup className="w-4 h-4 text-amber-600" /> },
    { id: 'Gujarati', label: 'Gujarati / Kathiawadi', icon: <Sparkles className="w-4 h-4 text-orange-600" /> },
    { id: 'South Indian', label: 'South Indian', icon: <Utensils className="w-4 h-4 text-amber-700" /> },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* 🌟 HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50/70 via-amber-50/30 to-transparent pt-12 pb-20 border-b border-orange-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-5">
            <div className="inline-flex items-center gap-2 bg-orange-100/90 text-orange-800 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-xs border border-orange-200">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>For College Students, PG Residents & Working Bachelors</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 leading-[1.15]">
              Craving <span className="text-orange-600 underline decoration-amber-400 decoration-wavy decoration-2">Maa Ke Haath Ka</span> Khana?
            </h1>

            <p className="text-base sm:text-lg text-stone-600 font-normal leading-relaxed">
              Order fresh, hygienic, affordable meals prepared daily by verified home cooks right in your neighborhood. No commercial restaurants, no heavy oil.
            </p>

            {/* 📍 Location Search Bar */}
            <div className="pt-4 max-w-2xl mx-auto">
              <div className="bg-white p-2.5 rounded-2xl shadow-xl shadow-stone-200/50 border border-stone-200/80 flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center gap-2.5 px-3 py-2 flex-1 w-full border-b sm:border-b-0 sm:border-r border-stone-100">
                  <MapPin className="w-5 h-5 text-orange-500 shrink-0" />
                  <input
                    type="text"
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    placeholder="Enter delivery area (e.g. Sector 62, Hostel)"
                    className="w-full text-sm font-medium text-stone-800 placeholder-stone-400 focus:outline-none"
                  />
                  <button
                    onClick={handleUseLocation}
                    disabled={isLocating}
                    className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 shrink-0 px-2 py-1 rounded-md bg-orange-50 hover:bg-orange-100 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    <span>{isLocating ? 'Locating...' : 'Locate'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 flex-1 w-full">
                  <Search className="w-5 h-5 text-stone-400 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search rajma, thali, biryani, kitchen..."
                    className="w-full text-sm font-medium text-stone-800 placeholder-stone-400 focus:outline-none"
                  />
                </div>

                <button
                  onClick={fetchKitchens}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md shadow-orange-600/20 shrink-0 cursor-pointer"
                >
                  Find Food
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🏷️ FILTER PILLS */}
      <section className="py-6 border-b border-stone-200/70 bg-white sticky top-18 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1 no-scrollbar">
            <div className="flex items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0 border ${
                    selectedCategory === cat.id
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            <div className="text-xs font-medium text-stone-500 shrink-0 hidden sm:block">
              Showing <strong>{kitchens.length}</strong> verified kitchens near you
            </div>
          </div>
        </div>
      </section>

      {/* 🍲 KITCHENS GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Today's Verified Home Kitchens</h2>
            <p className="text-xs text-stone-500 mt-1">Cooked fresh in small domestic batches with genuine care</p>
          </div>
          <Link
            to="/subscriptions"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 group"
          >
            <span>Book Monthly Tiffin</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-80 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : kitchens.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8">
            <Soup className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-800">No kitchens found in this area</h3>
            <p className="text-xs text-stone-500 mt-1">Try searching another location or resetting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {kitchens.map((k) => (
              <div
                key={k.id}
                className="group bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-orange-200 transition-all duration-300 flex flex-col"
              >
                {/* Kitchen Banner Photo */}
                <div className="relative h-48 overflow-hidden bg-stone-100">
                  <img
                    src={k.bannerUrl}
                    alt={k.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    {k.isVegOnly && (
                      <span className="bg-emerald-600/95 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <Leaf className="w-3 h-3" /> Pure Veg
                      </span>
                    )}
                    {k.isVerified && (
                      <span className="bg-amber-500/95 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                        <ShieldCheck className="w-3 h-3" /> Verified Cook
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-bold text-stone-800 flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{k.rating}</span>
                    <span className="text-[10px] text-stone-400">({k.totalRatings})</span>
                  </div>

                  {/* Cook Avatar & Name Over Banner */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2.5">
                    <img
                      src={k.avatarUrl}
                      alt={k.cookName}
                      className="w-10 h-10 rounded-full border-2 border-white object-cover shadow-sm"
                    />
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight drop-shadow-xs">{k.name}</h3>
                      <p className="text-xs text-orange-200">By Chef {k.cookName}</p>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {k.cuisineTypes.map((c) => (
                        <span
                          key={c}
                          className="text-[11px] font-medium bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md"
                        >
                          {c}
                        </span>
                      ))}
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">
                      {k.description}
                    </p>
                  </div>

                  {/* Footer Stats & Button */}
                  <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] text-stone-500 font-medium">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span>{k.estimatedDeliveryTimeMin || 30} mins • {k.distanceKm || 1.8} km</span>
                      </div>
                      <div className="text-xs font-bold text-stone-900">
                        Meals from <span className="text-orange-600 text-sm">₹{k.startingPrice}</span>
                      </div>
                    </div>

                    <Link
                      to={`/kitchen/${k.id}`}
                      className="bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-700 border border-orange-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                    >
                      <span>View Menu</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 💡 HOW GHAR KI RASOI WORKS */}
      <section id="how-it-works" className="py-16 bg-white border-t border-stone-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Simple & Wholesome
            </span>
            <h2 className="text-3xl font-extrabold text-stone-900 mt-3">How Ghar Ki Rasoi Works</h2>
            <p className="text-xs text-stone-500 mt-2">
              Unlike commercial delivery apps, we connect you directly to passionate home cooks in your locality.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#faf8f5] p-6 rounded-3xl border border-stone-200/80 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-lg font-bold">
                1
              </div>
              <h3 className="text-base font-bold text-stone-900">Choose a Local Home Cook</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Browse nearby home kitchens run by homemakers and experienced cooks. Check today's fresh daily menu.
              </p>
            </div>

            <div className="bg-[#faf8f5] p-6 rounded-3xl border border-stone-200/80 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-lg font-bold">
                2
              </div>
              <h3 className="text-base font-bold text-stone-900">Cooked on Real Gas Stoves</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Meals are cooked fresh upon order with pure ingredients, authentic masalas, and zero commercial preservatives.
              </p>
            </div>

            <div className="bg-[#faf8f5] p-6 rounded-3xl border border-stone-200/80 space-y-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto text-lg font-bold">
                3
              </div>
              <h3 className="text-base font-bold text-stone-900">Delivered Hot to Your Room</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Our local delivery partners pick up the food in thermal bags and deliver straight to your hostel or desk with OTP verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🍱 STUDENT TIFFIN BANNER */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl z-10">
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
              Campus Special Plan
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Tired of Mess Food? Subscribe to Weekly Tiffins!
            </h2>
            <p className="text-sm text-orange-100 leading-relaxed">
              Save up to 40% on daily meals with prepaid weekly and monthly lunch & dinner subscriptions. Pause or skip anytime during exams or holidays.
            </p>
            <div className="pt-2">
              <Link
                to="/subscriptions"
                className="bg-white text-orange-700 hover:bg-orange-50 px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2 shadow-md transition-all"
              >
                <CalendarCheck className="w-4 h-4" />
                <span>Explore Tiffin Plans</span>
              </Link>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 text-center w-full md:w-80 space-y-3 z-10">
            <div className="text-xs text-orange-200 font-semibold uppercase">Daily Homely Meals</div>
            <div className="text-4xl font-extrabold">₹750<span className="text-base font-normal text-orange-100">/week</span></div>
            <p className="text-xs text-orange-100">7 Days • 4 Phulkas, Sabzi, Dal, Rice & Salad</p>
            <div className="pt-2 text-[11px] text-white/80">
              ✓ Free delivery to hostel gates<br />
              ✓ Pure RO water & homemade ghee
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
