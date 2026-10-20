// client/src/App.tsx - Routing & Layout Architecture
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { KitchenDetailPage } from './pages/KitchenDetailPage';
import { CartCheckoutPage } from './pages/CartCheckoutPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { OrdersListPage } from './pages/OrdersListPage';
import { CookDashboardPage } from './pages/CookDashboardPage';
import { DeliveryDashboardPage } from './pages/DeliveryDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';

export function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-[#faf8f5]">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/kitchen/:id" element={<KitchenDetailPage />} />
                <Route path="/checkout" element={<CartCheckoutPage />} />
                <Route path="/order/:id" element={<OrderTrackingPage />} />
                <Route path="/orders" element={<OrdersListPage />} />
                <Route path="/cook" element={<CookDashboardPage />} />
                <Route path="/delivery" element={<DeliveryDashboardPage />} />
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
