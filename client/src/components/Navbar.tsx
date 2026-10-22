// client/src/components/Navbar.tsx - Responsive Navigation with Multi-Role Auth, Google Login & Email Drawer
import React, { useState, useEffect } from 'react';
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
  Compass,
  Bell,
  LogIn,
  LogOut,
  Mail,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import type { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { user, role, logout } = useAuth();
  const { itemCount, totalAmount } = useCart();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [emailDrawerOpen, setEmailDrawerOpen] = useState(false);
  const [sentEmails, setSentEmails] = useState<any[]>([]);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // Load sent emails for live mailbox inspection
  const fetchSentEmails = async () => {
    try {
      const res = await fetch('/api/notifications/emails');
      if (res.ok) {
        const emails = await res.json();
        setSentEmails(emails);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchSentEmails();
    const interval = setInterval(fetchSentEmails, 4000);
    const handlePush = () => fetchSentEmails();
    window.addEventListener('gkr_order_update', handlePush);
    return () => {
      clearInterval(interval);
      window.removeEventListener('gkr_order_update', handlePush);
    };
  }, []);

  const roleLabels: Record<UserRole, { label: string; icon: React.ReactNode; path: string }> = {
    CUSTOMER: {
      label: 'Customer',
      icon: <UserCheck className="w-4 h-4" />,
      path: '/orders'
    },
    COOK: {
      label: 'Home Cook',
      icon: <ChefHat className="w-4 h-4" />,
      path: '/cook'
    },
    DELIVERY_PARTNER: {
      label: 'Delivery Hero',
      icon: <Bike className="w-4 h-4" />,
      path: '/driver'
    },
    ADMIN: {
      label: 'Admin Portal',
      icon: <ShieldCheck className="w-4 h-4" />,
      path: '/admin'
    }
  };

  const handleSignOut = () => {
    setProfileDropdownOpen(false);
    logout();
    navigate('/login');
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
          <nav className="hidden md:flex items-center gap-6">
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
            {user && role === 'COOK' && (
              <Link
                to="/cook"
                className="text-xs font-bold text-orange-800 bg-orange-100/80 px-3 py-1.5 rounded-xl border border-orange-200 hover:bg-orange-200/80 transition-all flex items-center gap-1.5"
              >
                <ChefHat className="w-3.5 h-3.5 text-orange-600" />
                Kitchen Dashboard
              </Link>
            )}
            {user && role === 'DELIVERY_PARTNER' && (
              <Link
                to="/driver"
                className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-200/80 transition-all flex items-center gap-1.5"
              >
                <Bike className="w-3.5 h-3.5 text-emerald-600" />
                Driver Portal
              </Link>
            )}
            {user && role === 'ADMIN' && (
              <Link
                to="/admin"
                className="text-xs font-bold text-purple-800 bg-purple-100/80 px-3 py-1.5 rounded-xl border border-purple-200 hover:bg-purple-200/80 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                Admin Console
              </Link>
            )}
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Live Mailbox / Email Notifications Viewer */}
            <div className="relative">
              <button
                onClick={() => setEmailDrawerOpen(!emailDrawerOpen)}
                className="relative p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-all cursor-pointer"
                title="View sent order confirmation & kitchen alert emails"
              >
                <Mail className="w-4 h-4" />
                {sentEmails.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {sentEmails.length}
                  </span>
                )}
              </button>

              {/* Email Dropdown */}
              {emailDrawerOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-orange-600" />
                      <h4 className="text-xs font-extrabold text-stone-900 uppercase">Live Email Dispatches</h4>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Automated Mailer
                    </span>
                  </div>

                  {sentEmails.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-400">
                      No emails dispatched yet. Place an order or advance delivery to trigger email notifications!
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {sentEmails.map((mail, idx) => (
                        <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                          <div className="flex items-center justify-between text-[11px] font-bold text-stone-800 mb-1">
                            <span className="truncate max-w-[180px]">To: {mail.to}</span>
                            <span className="text-[10px] text-stone-400">{new Date(mail.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="font-semibold text-orange-700 text-[11px] mb-1">{mail.subject}</div>
                          <div className="text-[11px] text-stone-600 line-clamp-2">{mail.preview}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Real-time Order Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-all cursor-pointer"
                title="Live Push Updates"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 p-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                    <h4 className="text-xs font-extrabold text-stone-900 uppercase">Live Updates</h4>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-[11px] text-stone-400 hover:text-stone-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-stone-400">No new notifications</div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            n.read ? 'bg-stone-50 border-stone-200 text-stone-500' : 'bg-orange-50/60 border-orange-200 text-stone-800 font-medium'
                          }`}
                        >
                          <div className="font-bold text-stone-900">{n.title}</div>
                          <div className="text-[11px] mt-0.5">{n.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Cart Button */}
            <Link
              to="/cart"
              className="relative flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              <ShoppingBag className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">₹{totalAmount}</span>
              {itemCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Profile / Auth State */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-stone-200 hover:border-stone-300 bg-stone-50 hover:bg-stone-100 transition-all text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-600 text-white font-black text-xs flex items-center justify-center">
                    {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:block">
                    <div className="text-xs font-bold text-stone-900 truncate max-w-[100px]">
                      {user.fullName?.split(' ')[0] || 'User'}
                    </div>
                    <div className="text-[10px] text-stone-500 leading-none">{roleLabels[role]?.label || role}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 p-2">
                    <div className="px-3 py-2 border-b border-stone-100 mb-1">
                      <div className="text-xs font-bold text-stone-900 truncate">{user.fullName || user.email}</div>
                      <div className="text-[11px] text-stone-400 truncate">{user.email}</div>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                        {roleLabels[role]?.label || role}
                      </span>
                    </div>

                    <Link
                      to={roleLabels[role]?.path || '/'}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <span>Dashboard & Tasks</span>
                    </Link>

                    <Link
                      to="/orders"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <span>My Orders</span>
                    </Link>

                    <div className="border-t border-stone-100 my-1" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-stone-700 hover:text-orange-600"
          >
            Explore Kitchens
          </Link>
          <Link
            to="/subscriptions"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-stone-700 hover:text-orange-600"
          >
            Tiffin Subscriptions
          </Link>
          <Link
            to="/orders"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm font-semibold text-stone-700 hover:text-orange-600"
          >
            My Orders
          </Link>

          {user && role === 'COOK' && (
            <Link
              to="/cook"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-orange-600"
            >
              👩‍🍳 Kitchen Dashboard
            </Link>
          )}
          {user && role === 'DELIVERY_PARTNER' && (
            <Link
              to="/driver"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-emerald-600"
            >
              🛵 Driver Portal
            </Link>
          )}
          {user && role === 'ADMIN' && (
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm font-bold text-purple-600"
            >
              🛡️ Admin Console
            </Link>
          )}

          {!user && (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 bg-orange-600 text-white rounded-xl text-xs font-bold block"
            >
              Sign In to Your Account
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
