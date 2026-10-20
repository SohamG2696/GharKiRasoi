// client/src/components/Navbar.tsx - Responsive Navigation with Role & Demo Switcher
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingBag,
  UserCheck,
  Bike,
  ShieldCheck,
  ChefHat,
  CalendarCheck,
  Menu,
  X,
  Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import type { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, role, switchDemoRole } = useAuth();
  const { itemCount, totalAmount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const roleLabels: Record<UserRole, { label: string; icon: React.ReactNode; color: string }> = {
    CUSTOMER: { label: 'Customer', icon: <UserCheck className="w-4 h-4" />, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    COOK: { label: 'Home Cook', icon: <ChefHat className="w-4 h-4" />, color: 'bg-orange-100 text-orange-800 border-orange-300' },
    DELIVERY_PARTNER: { label: 'Delivery Rider', icon: <Bike className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    ADMIN: { label: 'Admin Portal', icon: <ShieldCheck className="w-4 h-4" />, color: 'bg-purple-100 text-purple-800 border-purple-300' }
  };

  const handleRoleSelect = (targetRole: UserRole) => {
    switchDemoRole(targetRole);
    setRoleDropdownOpen(false);
    if (targetRole === 'COOK') navigate('/cook');
    else if (targetRole === 'DELIVERY_PARTNER') navigate('/delivery');
    else if (targetRole === 'ADMIN') navigate('/admin');
    else navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-stone-900 group-hover:text-amber-600 transition-colors">
                Ghar Ki Rasoi
              </span>
              <span className="block text-[11px] font-medium text-amber-700 tracking-wider uppercase -mt-1">
                Homemade • Maa Ke Haath Ka
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7">
            <Link
              to="/"
              className="text-sm font-medium text-stone-700 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
            >
              <Compass className="w-4 h-4 text-orange-500" />
              Explore Kitchens
            </Link>
            <Link
              to="/subscriptions"
              className="text-sm font-medium text-stone-700 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
            >
              <CalendarCheck className="w-4 h-4 text-orange-500" />
              Tiffin Subscriptions
            </Link>
            <Link
              to="/orders"
              className="text-sm font-medium text-stone-700 hover:text-orange-600 transition-colors"
            >
              My Orders
            </Link>

            {/* Role Dedicated Dashboards */}
            {role === 'COOK' && (
              <Link
                to="/cook"
                className="text-sm font-semibold text-orange-700 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
              >
                👨‍🍳 Kitchen Console
              </Link>
            )}
            {role === 'DELIVERY_PARTNER' && (
              <Link
                to="/delivery"
                className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                🚴 Rider Console
              </Link>
            )}
            {role === 'ADMIN' && (
              <Link
                to="/admin"
                className="text-sm font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors"
              >
                🛡️ Admin Console
              </Link>
            )}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-4">
            {/* Demo Role Switcher Badge */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-xs hover:shadow-sm transition-all ${roleLabels[role]?.color || 'bg-stone-100 text-stone-800'}`}
                title="Click to switch demo role instantly"
              >
                {roleLabels[role]?.icon}
                <span>Role: {roleLabels[role]?.label}</span>
                <span className="text-[10px] bg-white/80 px-1.5 py-0.5 rounded-full font-bold ml-1">Demo ▼</span>
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-stone-100 text-xs font-bold text-stone-500 uppercase tracking-wider">
                    ⚡ Instant Demo Role Switcher
                  </div>
                  <button
                    onClick={() => handleRoleSelect('CUSTOMER')}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-amber-50 text-stone-800 hover:text-amber-800 transition-colors"
                  >
                    <UserCheck className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-semibold">Customer View</div>
                      <div className="text-xs text-stone-500">Aarav Sharma (Browse & Order)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('COOK')}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-orange-50 text-stone-800 hover:text-orange-800 transition-colors"
                  >
                    <ChefHat className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="font-semibold">Home Cook View</div>
                      <div className="text-xs text-stone-500">Shanti Devi (Manage Menu & Orders)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('DELIVERY_PARTNER')}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-emerald-50 text-stone-800 hover:text-emerald-800 transition-colors"
                  >
                    <Bike className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-semibold">Delivery Partner View</div>
                      <div className="text-xs text-stone-500">Vikram Singh (Claim & Deliver)</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleRoleSelect('ADMIN')}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-purple-50 text-stone-800 hover:text-purple-800 transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold">Platform Admin</div>
                      <div className="text-xs text-stone-500">Monitor Metrics & Verification</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Cart Button */}
            <Link
              to="/checkout"
              className="relative flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {itemCount} • ₹{totalAmount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-700 hover:text-orange-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 flex flex-col gap-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-stone-800 hover:bg-stone-100"
            >
              Explore Kitchens
            </Link>
            <Link
              to="/subscriptions"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-stone-800 hover:bg-stone-100"
            >
              Tiffin Subscriptions
            </Link>
            <Link
              to="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-stone-800 hover:bg-stone-100"
            >
              My Orders
            </Link>
            <Link
              to="/cook"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-orange-700 bg-orange-50"
            >
              👨‍🍳 Home Cook Dashboard
            </Link>
            <Link
              to="/delivery"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-emerald-700 bg-emerald-50"
            >
              🚴 Delivery Partner Dashboard
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-purple-700 bg-purple-50"
            >
              🛡️ Admin Dashboard
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};
