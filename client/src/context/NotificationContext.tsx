// client/src/context/NotificationContext.tsx - Real-time SSE Push Notification Manager
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Bell, CheckCircle2, Bike, ChefHat, Package, AlertCircle, X } from 'lucide-react';
import { useAuth } from './AuthContext';

export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  orderId?: string;
  read: boolean;
}

interface NotificationContextType {
  notifications: RealtimeNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [activeToast, setActiveToast] = useState<RealtimeNotification | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    function connectSSE() {
      const url = `/api/realtime/stream?role=${user?.role || 'GUEST'}&userId=${user?.id || ''}`;
      eventSource = new EventSource(url);

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'CONNECTED') return;

          const newNotif: RealtimeNotification = {
            id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: data.type || 'ORDER_UPDATE',
            title: data.title || 'Order Update',
            message: data.message || 'An update occurred on your order.',
            timestamp: data.timestamp || new Date().toISOString(),
            orderId: data.orderId,
            read: false
          };

          setNotifications(prev => [newNotif, ...prev.slice(0, 19)]);
          setActiveToast(newNotif);

          // Dispatch window event so dashboards can immediately refresh
          window.dispatchEvent(new CustomEvent('gkr_order_update', { detail: data }));
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };
    }

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user?.role, user?.id]);

  // Auto-dismiss active toast
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAll = () => {
    setNotifications([]);
    setActiveToast(null);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER_PLACED':
        return <Package className="w-5 h-5 text-amber-600" />;
      case 'RIDER_ASSIGNED':
      case 'OUT_FOR_DELIVERY':
        return <Bike className="w-5 h-5 text-blue-600" />;
      case 'ORDER_DELIVERED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      default:
        return <ChefHat className="w-5 h-5 text-orange-600" />;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        clearAll
      }}
    >
      {children}

      {/* FLOATING REAL-TIME TOAST NOTIFICATION */}
      {activeToast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-bounce-in transition-all">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-stone-200 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-stone-100 shrink-0">
              {getIcon(activeToast.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-stone-900 truncate">
                  {activeToast.title}
                </span>
                <span className="text-[10px] text-stone-400 shrink-0">Just now</span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5 line-clamp-2">
                {activeToast.message}
              </p>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-stone-400 hover:text-stone-600 p-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
