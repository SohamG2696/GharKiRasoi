// client/src/context/CartContext.tsx - Cart State & Server-Aligned Calculation
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MenuItem, Kitchen } from '../types';

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  kitchen: Kitchen | null;
  addItem: (item: MenuItem, kitchen: Kitchen) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  itemCount: number;
  specialInstructions: string;
  setSpecialInstructions: (val: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('gkr_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [kitchen, setKitchen] = useState<Kitchen | null>(() => {
    try {
      const saved = localStorage.getItem('gkr_cart_kitchen');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('gkr_cart', JSON.stringify(items));
    localStorage.setItem('gkr_cart_kitchen', JSON.stringify(kitchen));
  }, [items, kitchen]);

  const addItem = (item: MenuItem, targetKitchen: Kitchen) => {
    // Single-kitchen enforcement
    if (kitchen && kitchen.id !== targetKitchen.id && items.length > 0) {
      const confirmed = window.confirm(
        `Your cart contains items from "${kitchen.name}". Would you like to clear your cart and order from "${targetKitchen.name}" instead?`
      );
      if (!confirmed) return;
      setItems([{ item, quantity: 1 }]);
      setKitchen(targetKitchen);
      return;
    }

    setKitchen(targetKitchen);
    setItems(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.item.id !== itemId);
      if (updated.length === 0) setKitchen(null);
      return updated;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems(prev =>
      prev.map(i => (i.item.id === itemId ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setKitchen(null);
    setSpecialInstructions('');
  };

  const subtotal = items.reduce((sum, i) => sum + i.item.price * i.quantity, 0);
  const deliveryFee = items.length > 0 ? 30.00 : 0;
  const platformFee = items.length > 0 ? 10.00 : 0;
  const tax = 0.00;
  const totalAmount = subtotal > 0 ? subtotal + deliveryFee + platformFee + tax : 0;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        kitchen,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal,
        deliveryFee,
        platformFee,
        tax,
        totalAmount,
        itemCount,
        specialInstructions,
        setSpecialInstructions
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
