// client/src/components/Footer.tsx - Modern Startup Footer
import React from 'react';
import { UtensilsCrossed, Heart, ShieldCheck, Award, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Ghar Ki Rasoi</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Hyperlocal homemade-food marketplace bringing wholesome, healthy meals prepared by verified home cooks straight to students, hostelites, and professionals.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>100% Home Cooked • Zero Palm Oil</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Explore</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/" className="hover:text-amber-400 transition-colors">Nearby Kitchens</Link></li>
              <li><Link to="/subscriptions" className="hover:text-amber-400 transition-colors">Tiffin Subscriptions</Link></li>
              <li><Link to="/orders" className="hover:text-amber-400 transition-colors">Track Active Orders</Link></li>
              <li><a href="#how-it-works" className="hover:text-amber-400 transition-colors">How It Works</a></li>
            </ul>
          </div>

          {/* Partner with Us */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Portals</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/cook" className="hover:text-amber-400 transition-colors">Home Cook Registration</Link></li>
              <li><Link to="/delivery" className="hover:text-amber-400 transition-colors">Delivery Partner Portal</Link></li>
              <li><Link to="/admin" className="hover:text-amber-400 transition-colors">Administrator Panel</Link></li>
            </ul>
          </div>

          {/* Trust & Hygiene */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Trust & Quality</h4>
            <div className="flex items-center gap-2 text-xs text-stone-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Kitchens Personally Verified & Inspected</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-300">
              <Award className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Daily Fresh Ingredients & RO Water</span>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 Ghar Ki Rasoi Inc. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Handcrafted with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> for homemade food lovers across campuses.
          </p>
        </div>
      </div>
    </footer>
  );
};
