// client/src/pages/AuthPage.tsx - Modern Authentication Portal with Google Sign-In & Role Isolation
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  UserCheck,
  ChefHat,
  Bike,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  Store,
  MapPin,
  UtensilsCrossed,
  Sparkles,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface AuthPageProps {
  initialRole?: UserRole;
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialRole, initialMode = 'login' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  // Determine active role from prop or URL
  const getRoleFromPath = (): UserRole => {
    if (initialRole) return initialRole;
    if (location.pathname.includes('/cook')) return 'COOK';
    if (location.pathname.includes('/driver')) return 'DELIVERY_PARTNER';
    if (location.pathname.includes('/admin')) return 'ADMIN';
    return 'CUSTOMER';
  };

  const [activeRole, setActiveRole] = useState<UserRole>(getRoleFromPath());
  const [isSignUp, setIsSignUp] = useState<boolean>(initialMode === 'signup' || location.pathname.includes('/signup'));
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form inputs
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  // Cook-specific
  const [kitchenName, setKitchenName] = useState<string>('');
  const [kitchenAddress, setKitchenAddress] = useState<string>('');
  const [cuisineType, setCuisineType] = useState<string>('Home Style Thali');
  // Driver-specific
  const [vehicleType, setVehicleType] = useState<string>('Motorcycle');

  // Google Account Chooser Modal
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState<string>('');
  const [customGoogleName, setCustomGoogleName] = useState<string>('');

  const roleConfig = {
    CUSTOMER: {
      title: 'Customer Portal',
      subtitle: 'Order authentic ghar ka khana from neighborhood home cooks',
      icon: <UserCheck className="w-5 h-5 text-orange-600" />,
      accentColor: 'from-orange-600 to-amber-600',
      tagColor: 'bg-orange-100 text-orange-800 border-orange-200',
      redirectPath: '/'
    },
    COOK: {
      title: 'Home Cook & Kitchen Portal',
      subtitle: 'Manage your kitchen, cooking queue, recipes, and daily earnings',
      icon: <ChefHat className="w-5 h-5 text-amber-600" />,
      accentColor: 'from-amber-600 to-orange-700',
      tagColor: 'bg-amber-100 text-amber-800 border-amber-200',
      redirectPath: '/cook'
    },
    DELIVERY_PARTNER: {
      title: 'Delivery Hero Portal',
      subtitle: 'Deliver hot, fresh meals, verify customer OTPs, and earn per drop',
      icon: <Bike className="w-5 h-5 text-emerald-600" />,
      accentColor: 'from-emerald-600 to-teal-700',
      tagColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      redirectPath: '/driver'
    },
    ADMIN: {
      title: 'Platform Administrator',
      subtitle: 'Oversee community food safety, cook verification, and system analytics',
      icon: <ShieldCheck className="w-5 h-5 text-purple-600" />,
      accentColor: 'from-purple-600 to-indigo-700',
      tagColor: 'bg-purple-100 text-purple-800 border-purple-200',
      redirectPath: '/admin'
    }
  };

  // If already authenticated, redirect straight to user's dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'COOK') navigate('/cook', { replace: true });
      else if (user.role === 'DELIVERY_PARTNER') navigate('/driver', { replace: true });
      else if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Update role if route changes
  useEffect(() => {
    setActiveRole(getRoleFromPath());
    setIsSignUp(initialMode === 'signup' || location.pathname.includes('/signup'));
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [location.pathname, initialRole, initialMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSignUp) {
        // Individual registration
        const payload: Record<string, any> = {
          email,
          password,
          fullName,
          phone,
          role: activeRole
        };

        if (activeRole === 'COOK') {
          payload.kitchenName = kitchenName || `${fullName}'s Rasoi`;
          payload.kitchenAddress = kitchenAddress || 'Local Kitchen';
          payload.cuisineType = cuisineType;
        } else if (activeRole === 'DELIVERY_PARTNER') {
          payload.vehicleType = vehicleType;
        }

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Registration failed');
        }

        setSuccessMsg('Account created successfully! Logging you in...');
        const loginOk = await login(email, password);
        if (loginOk) {
          navigate(roleConfig[activeRole].redirectPath);
        } else {
          setIsSignUp(false);
        }
      } else {
        // Login with individual password
        const ok = await login(email, password);
        if (ok) {
          setSuccessMsg('Welcome back! Redirecting to your dashboard...');
          navigate(roleConfig[activeRole].redirectPath);
        } else {
          setErrorMsg('Invalid email or password for this account. Please verify your credentials.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // One-Click Google Sign In Handler
  const handleGoogleLogin = async (googleEmail: string, googleName: string) => {
    setLoading(true);
    setErrorMsg(null);
    setShowGoogleModal(false);

    try {
      const payload: Record<string, any> = {
        email: googleEmail,
        fullName: googleName,
        role: activeRole,
        kitchenName: activeRole === 'COOK' ? `${googleName}'s Homemade Rasoi` : undefined
      };

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      // Store token and user
      if (data.token && data.user) {
        localStorage.setItem('gkr_token', data.token);
        localStorage.setItem('gkr_user_id', data.user.id);
        window.location.href = roleConfig[activeRole].redirectPath;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-md">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-stone-900 tracking-tight">Ghar Ki Rasoi</span>
          </Link>
          <p className="text-xs text-stone-500">Authentic Homemade Food Community Platform</p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="bg-stone-200/70 p-1 rounded-2xl flex items-center justify-between gap-1 mb-6 shadow-inner">
          {(['CUSTOMER', 'COOK', 'DELIVERY_PARTNER', 'ADMIN'] as UserRole[]).map((r) => {
            const isSelected = activeRole === r;
            const labels: Record<UserRole, string> = {
              CUSTOMER: 'Customer',
              COOK: 'Kitchen',
              DELIVERY_PARTNER: 'Delivery',
              ADMIN: 'Admin'
            };
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setActiveRole(r);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-white text-stone-900 shadow-sm'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {labels[r]}
              </button>
            );
          })}
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${roleConfig[activeRole].tagColor}`}>
                {roleConfig[activeRole].title}
              </span>
            </div>
            <h2 className="text-xl font-black text-stone-900 tracking-tight">
              {isSignUp ? `Create ${roleConfig[activeRole].title} Account` : 'Sign In to Your Account'}
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              {roleConfig[activeRole].subtitle}
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-xs text-emerald-700 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google One-Click Sign-in */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              className="w-full py-2.5 px-4 border border-stone-300 hover:border-stone-400 bg-white hover:bg-stone-50 rounded-xl text-xs font-bold text-stone-700 shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold">
                <span className="bg-white px-2 text-stone-400">Or use email & password</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name for Sign Up */}
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cook Registration Extras */}
            {isSignUp && activeRole === 'COOK' && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <div className="text-[11px] font-extrabold text-amber-900 uppercase flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  Your Kitchen Setup
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Kitchen / Rasoi Name</label>
                  <input
                    type="text"
                    required
                    value={kitchenName}
                    onChange={(e) => setKitchenName(e.target.value)}
                    placeholder="e.g. Annapurna Ghar Ka Khana"
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase mb-1">Specialty Cuisine</label>
                  <select
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg text-xs"
                  >
                    <option value="Home Style Thali">Home Style Thali</option>
                    <option value="North Indian Daily">North Indian Daily</option>
                    <option value="South Indian Tiffin">South Indian Tiffin</option>
                    <option value="Gujarati & Rajasthani">Gujarati & Rajasthani</option>
                    <option value="Healthy Diet & Millet">Healthy Diet & Millet</option>
                  </select>
                </div>
              </div>
            )}

            {/* Driver Registration Extras */}
            {isSignUp && activeRole === 'DELIVERY_PARTNER' && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                <div className="text-[11px] font-extrabold text-emerald-900 uppercase flex items-center gap-1.5">
                  <Bike className="w-3.5 h-3.5 text-emerald-600" />
                  Vehicle Details
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs"
                  >
                    <option value="Motorcycle">Motorcycle / Bike</option>
                    <option value="Scooter">Scooter / Scooty</option>
                    <option value="Electric Bike">Electric Bike (EV)</option>
                    <option value="Bicycle">Bicycle</option>
                  </select>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 bg-gradient-to-r ${roleConfig[activeRole].accentColor}`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create Role Account' : 'Sign In with Password'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Login / SignUp */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>

      {/* Google Account Chooser Modal (Simulating Device's Google Accounts) */}
      {showGoogleModal && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <h3 className="text-sm font-bold text-stone-900">Sign in with Google</h3>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Choose a Google account present on your device to continue to Ghar Ki Rasoi:
            </p>

            {/* List of Device Google Accounts */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => handleGoogleLogin('aarav.sharma@gmail.com', 'Aarav Sharma')}
                className="w-full p-3 rounded-2xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50/50 flex items-center gap-3 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold text-xs flex items-center justify-center">
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900">Aarav Sharma</div>
                  <div className="text-[11px] text-stone-500 truncate">aarav.sharma@gmail.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleLogin('shanti.cook@gmail.com', 'Shanti Devi')}
                className="w-full p-3 rounded-2xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/50 flex items-center gap-3 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center">
                  S
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900">Shanti Devi (Home Cook)</div>
                  <div className="text-[11px] text-stone-500 truncate">shanti.cook@gmail.com</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGoogleLogin('vikram.delivery@gmail.com', 'Vikram Singh')}
                className="w-full p-3 rounded-2xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex items-center gap-3 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                  V
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-stone-900">Vikram Singh (Delivery Partner)</div>
                  <div className="text-[11px] text-stone-500 truncate">vikram.delivery@gmail.com</div>
                </div>
              </button>
            </div>

            {/* Custom Google account entry */}
            <div className="pt-3 border-t border-stone-100">
              <div className="text-[11px] font-bold text-stone-700 mb-2">Or use another Google account:</div>
              <div className="space-y-2 mb-3">
                <input
                  type="text"
                  placeholder="Your Name (e.g. Ramesh Kumar)"
                  value={customGoogleName}
                  onChange={(e) => setCustomGoogleName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
                <input
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={customGoogleEmail}
                  onChange={(e) => setCustomGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>
              <button
                type="button"
                disabled={!customGoogleEmail || !customGoogleName}
                onClick={() => handleGoogleLogin(customGoogleEmail, customGoogleName)}
                className="w-full py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
              >
                Continue with this Google Account
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGoogleModal(false)}
              className="mt-4 w-full py-2 text-stone-500 hover:text-stone-800 text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
