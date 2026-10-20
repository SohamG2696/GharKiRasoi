// client/src/pages/KitchenDetailPage.tsx - Kitchen Details & Dynamic Menu Selection
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star,
  Clock,
  MapPin,
  ShieldCheck,
  Leaf,
  Plus,
  Minus,
  ShoppingBag,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Kitchen, MenuItem } from '../types';

export const KitchenDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const { items, addItem, updateQuantity, itemCount, totalAmount } = useCart();

  useEffect(() => {
    async function loadKitchen() {
      try {
        const res = await fetch(`/api/kitchens/${id}`);
        if (res.ok) {
          const data = await res.json();
          setKitchen(data);
          setMenuItems(data.menuItems || []);
        }

        const resRev = await fetch(`/api/reviews?kitchenId=${id}`);
        if (resRev.ok) {
          const revData = await resRev.json();
          setReviews(revData);
        }
      } catch (err) {
        console.error('Failed to load kitchen details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadKitchen();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-stone-500">Loading today's fresh menu...</p>
      </div>
    );
  }

  if (!kitchen) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-stone-800">Kitchen Not Found</h2>
        <Link to="/" className="text-orange-600 text-sm font-semibold mt-4 inline-block">
          ← Back to All Kitchens
        </Link>
      </div>
    );
  }

  const categories = ['ALL', ...Array.from(new Set(menuItems.map(m => m.category)))];
  const displayedItems = activeCategory === 'ALL'
    ? menuItems
    : menuItems.filter(m => m.category === activeCategory);

  const getItemCountInCart = (itemId: string) => {
    const found = items.find(i => i.item.id === itemId);
    return found ? found.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] pb-24">
      {/* 🔙 BACK NAV */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Kitchens</span>
        </Link>
      </div>

      {/* 🏠 KITCHEN HERO BANNER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/90 shadow-sm">
          <div className="relative h-64 sm:h-80 w-full overflow-hidden">
            <img
              src={kitchen.bannerUrl}
              alt={kitchen.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-900/30 to-transparent" />

            <div className="absolute top-4 left-4 flex gap-2">
              {kitchen.isVegOnly && (
                <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5" /> Pure Veg
                </span>
              )}
              {kitchen.isVerified && (
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> FSSAI & Hygiene Verified
                </span>
              )}
            </div>

            <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 text-white">
              <div className="flex items-center gap-4">
                <img
                  src={kitchen.avatarUrl}
                  alt={kitchen.cookName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white object-cover shadow-lg"
                />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-md">
                    {kitchen.name}
                  </h1>
                  <p className="text-sm text-orange-200">
                    Prepared with love by Chef {kitchen.cookName}
                  </p>
                  <p className="text-xs text-stone-300 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>{kitchen.addressText}</span>
                  </p>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1 text-amber-300">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{kitchen.rating} ({kitchen.totalRatings} ratings)</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <div className="flex items-center gap-1 text-stone-200">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>{kitchen.prepTimeMinutes} mins prep</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
              {kitchen.description}
            </p>
            <div className="flex flex-wrap gap-2 shrink-0">
              {kitchen.cuisineTypes.map(c => (
                <span key={c} className="text-xs font-medium bg-white text-stone-700 px-3 py-1 rounded-full border border-stone-200">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🍱 DYNAMIC MENU SECTION */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span>Today's Fresh Daily Menu</span>
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">Dishes prepared fresh for lunch and dinner today</p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedItems.map(item => {
            const count = getItemCountInCart(item.id);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-stone-200/90 shadow-xs hover:border-orange-200 transition-all flex justify-between gap-4"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {item.isVeg ? (
                      <span className="w-4 h-4 rounded-sm border border-emerald-600 flex items-center justify-center p-0.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-sm border border-red-600 flex items-center justify-center p-0.5">
                        <span className="w-2 h-2 rounded-full bg-red-600" />
                      </span>
                    )}
                    <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                      {item.category}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 leading-snug">{item.name}</h3>
                  <p className="text-xs text-stone-500 leading-relaxed line-clamp-2">
                    {item.description}
                  </p>
                  <div className="text-sm font-extrabold text-stone-900 pt-1">
                    ₹{item.price}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between shrink-0 w-28">
                  <div className="w-28 h-24 rounded-xl overflow-hidden bg-stone-100 relative shadow-inner">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {!item.isAvailable && (
                      <div className="absolute inset-0 bg-stone-950/70 text-white text-[10px] font-bold flex items-center justify-center uppercase">
                        Sold Out
                      </div>
                    )}
                  </div>

                  {item.isAvailable && (
                    <div className="mt-2 w-full">
                      {count === 0 ? (
                        <button
                          onClick={() => addItem(item, kitchen)}
                          className="w-full bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-700 border border-orange-200 font-bold py-1.5 rounded-lg text-xs transition-all shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>ADD</span>
                        </button>
                      ) : (
                        <div className="w-full flex items-center justify-between bg-orange-600 text-white rounded-lg py-1 px-2 font-bold text-xs shadow-xs">
                          <button
                            onClick={() => updateQuantity(item.id, count - 1)}
                            className="p-1 hover:bg-orange-700 rounded-sm cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span>{count}</span>
                          <button
                            onClick={() => updateQuantity(item.id, count + 1)}
                            className="p-1 hover:bg-orange-700 rounded-sm cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 💬 VERIFIED CUSTOMER REVIEWS */}
        <div className="mt-12 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100">
            <div>
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                <span>Verified Customer Reviews</span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Rated {kitchen.rating} out of 5 based on {reviews.length} authentic customer experiences
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
              {kitchen.rating} ★ Average
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8 text-xs text-stone-500 bg-stone-50 rounded-2xl">
              Be the first to order and review Chef {kitchen.cookName}'s food!
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-4 rounded-2xl border border-stone-100 bg-stone-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-800">{r.customerName}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Verified Order
                      </span>
                    </div>
                    <div className="flex text-amber-500">
                      {Array.from({ length: r.rating || 5 }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed italic">
                    "{r.comment}"
                  </p>
                  <div className="text-[10px] text-stone-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 🛒 FLOATING BOTTOM CART BAR */}
      {itemCount > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-xl mx-auto z-40">
          <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between border border-stone-700 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-stone-300 font-medium">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} from <strong>{kitchen.name}</strong>
                </div>
                <div className="text-sm font-bold text-white">
                  ₹{totalAmount} <span className="text-[10px] text-stone-400 font-normal">(incl. ₹30 delivery)</span>
                </div>
              </div>
            </div>

            <Link
              to="/checkout"
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Proceed to Checkout →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
