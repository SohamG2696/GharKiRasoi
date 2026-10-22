// client/src/App.tsx - Optimized Routing with Role Redirection & Guarded Portals
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import type { UserRole } from './types';

// Code-Split Lazy Loaded Pages for Instant Performance
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const KitchenDetailPage = lazy(() => import('./pages/KitchenDetailPage').then(m => ({ default: m.KitchenDetailPage })));
const CartCheckoutPage = lazy(() => import('./pages/CartCheckoutPage').then(m => ({ default: m.CartCheckoutPage })));
const OrderTrackingPage = lazy(() => import('./pages/OrderTrackingPage').then(m => ({ default: m.OrderTrackingPage })));
const OrdersListPage = lazy(() => import('./pages/OrdersListPage').then(m => ({ default: m.OrdersListPage })));
const CookDashboardPage = lazy(() => import('./pages/CookDashboardPage').then(m => ({ default: m.CookDashboardPage })));
const DeliveryDashboardPage = lazy(() => import('./pages/DeliveryDashboardPage').then(m => ({ default: m.DeliveryDashboardPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage').then(m => ({ default: m.SubscriptionsPage })));
const CookRegisterPage = lazy(() => import('./pages/CookRegisterPage').then(m => ({ default: m.CookRegisterPage })));
const AuthPage = lazy(() => import('./pages/AuthPage').then(m => ({ default: m.AuthPage })));

// Lightweight Loading Spinner during chunk retrieval
const PageLoadingFallback: React.FC = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center">
    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-3" />
    <span className="text-xs font-bold text-stone-500 tracking-wide">Loading Ghar Ki Rasoi...</span>
  </div>
);

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: UserRole }> = ({ children, allowedRole }) => {
  const { user, role, isLoading } = useAuth();
  if (isLoading) return <PageLoadingFallback />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && role !== allowedRole) {
    if (role === 'COOK') return <Navigate to="/cook" replace />;
    if (role === 'DELIVERY_PARTNER') return <Navigate to="/driver" replace />;
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Root Redirector: First page must be Login if not authenticated; otherwise redirects to role's dashboard
const RootRedirector: React.FC = () => {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoadingFallback />;
  }

  // Not logged in -> Immediately open Login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in -> Direct to particular dashboard/view
  if (role === 'COOK') {
    return <Navigate to="/cook" replace />;
  }
  if (role === 'DELIVERY_PARTNER') {
    return <Navigate to="/driver" replace />;
  }
  if (role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  // Customer stays on Food Marketplace / Explore Landing Page
  return <LandingPage />;
};

export function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <CartProvider>
          <Router>
            <div className="flex flex-col min-h-screen bg-[#faf8f5]">
              <Navbar />
              <main className="flex-1">
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                    {/* Root Entry Point: Opens Login First if not authenticated */}
                    <Route path="/" element={<RootRedirector />} />

                    {/* Customer Food Experience */}
                    <Route path="/explore" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
                    <Route path="/kitchen/:id" element={<ProtectedRoute><KitchenDetailPage /></ProtectedRoute>} />
                    <Route path="/cart" element={<ProtectedRoute><CartCheckoutPage /></ProtectedRoute>} />
                    <Route path="/checkout" element={<ProtectedRoute><CartCheckoutPage /></ProtectedRoute>} />
                    <Route path="/order/:id" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
                    <Route path="/order-tracking/:id" element={<ProtectedRoute><OrderTrackingPage /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><OrdersListPage /></ProtectedRoute>} />
                    <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />

                    {/* Dedicated Role Auth Portals */}
                    <Route path="/login" element={<AuthPage initialMode="login" />} />
                    <Route path="/signup" element={<AuthPage initialMode="signup" />} />
                    <Route path="/cook/login" element={<AuthPage initialRole="COOK" initialMode="login" />} />
                    <Route path="/cook/signup" element={<AuthPage initialRole="COOK" initialMode="signup" />} />
                    <Route path="/driver/login" element={<AuthPage initialRole="DELIVERY_PARTNER" initialMode="login" />} />
                    <Route path="/driver/signup" element={<AuthPage initialRole="DELIVERY_PARTNER" initialMode="signup" />} />
                    <Route path="/admin/login" element={<AuthPage initialRole="ADMIN" initialMode="login" />} />

                    {/* Partner Dashboards */}
                    <Route path="/cook" element={<ProtectedRoute allowedRole="COOK"><CookDashboardPage /></ProtectedRoute>} />
                    <Route path="/cook/register" element={<ProtectedRoute allowedRole="COOK"><CookRegisterPage /></ProtectedRoute>} />
                    <Route path="/driver" element={<ProtectedRoute allowedRole="DELIVERY_PARTNER"><DeliveryDashboardPage /></ProtectedRoute>} />
                    <Route path="/delivery" element={<ProtectedRoute allowedRole="DELIVERY_PARTNER"><DeliveryDashboardPage /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute allowedRole="ADMIN"><AdminDashboardPage /></ProtectedRoute>} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </main>
              <Footer />
            </div>
          </Router>
        </CartProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
