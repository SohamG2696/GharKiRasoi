// client/src/types.ts - Core TypeScript Data Models

export type UserRole = 'CUSTOMER' | 'COOK' | 'DELIVERY_PARTNER' | 'ADMIN';

export interface UserAddress {
  id: string;
  label: string;
  addressLine: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  addresses?: UserAddress[];
  vehicleType?: string;
  vehicleNumber?: string;
  isOnline?: boolean;
  earnings?: number;
  totalDeliveries?: number;
}

export interface Kitchen {
  id: string;
  ownerId: string;
  name: string;
  cookName: string;
  phone: string;
  description: string;
  addressText: string;
  latitude: number;
  longitude: number;
  cuisineTypes: string[];
  bannerUrl: string;
  avatarUrl: string;
  isVegOnly: boolean;
  isOpen: boolean;
  isVerified: boolean;
  prepTimeMinutes: number;
  startingPrice: number;
  rating: number;
  totalRatings: number;
  distanceKm?: number;
  estimatedDeliveryTimeMin?: number;
}

export interface MenuItem {
  id: string;
  kitchenId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isVeg: boolean;
  isAvailable: boolean;
  dailyQuantity: number;
  soldQuantity?: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export type OrderStatus =
  | 'PLACED'
  | 'AWAITING_KITCHEN'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'PACKED'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'ARRIVED_AT_CUSTOMER'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED';

export interface OrderEvent {
  id: string;
  status: OrderStatus;
  note: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  kitchenId: string;
  kitchenName: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    totalPrice: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  tax: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  specialInstructions?: string;
  deliveryOtp?: string;
  riderId?: string | null;
  riderName?: string | null;
  paymentStatus: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
}

export interface Subscription {
  id: string;
  customerId: string;
  customerName: string;
  kitchenId: string;
  kitchenName: string;
  planType: 'WEEKLY' | 'MONTHLY';
  mealSlot: 'LUNCH' | 'DINNER' | 'BOTH';
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'CANCELLED';
  totalAmount: number;
  dietaryNotes?: string;
  createdAt: string;
}
