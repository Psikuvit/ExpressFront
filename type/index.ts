// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  type: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface AppLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface LocationResponse {
  location: AppLocation;
  message: string;
}

// ─── Products ────────────────────────────────────────────────────────────────

export type ProductSize = 'SMALL' | 'MEDIUM' | 'BIG';

export interface Product {
  id: number;
  name: string;
  size: ProductSize;
  price: number;
  emoji: string;
}

export interface CartItem {
  productId: number;
  quantity: number;
}

export type Cart = Record<number, number>; // productId → quantity

// ─── Delivery Guys ───────────────────────────────────────────────────────────

export interface DeliveryGuy {
  id: number;
  name: string;
  age: number;
  car: string;
  whatsappNumber: string;
  nearestLocation: AppLocation;
  available: boolean;
  distanceFromUser: number;
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export interface CheckoutRequest {
  products: CartItem[];
  deliveryLocation: AppLocation;
}

export interface CalcRequest {
  products: CartItem[];
  userLocation: Pick<AppLocation, 'latitude' | 'longitude'>;
}

export interface CalcResponse {
  basePrice: number;
  sizeFee: number;
  distanceFee: number;
  totalPrice: number;
  distance: number;
  breakdown: string;
}

export interface OrderItem {
  productId: number;
  productName: string;
  size: ProductSize;
  quantity: number;
  basePrice: number;
  available: boolean;
}

export interface OrderResponse {
  orderId: number;
  message: string;
  items: OrderItem[];
  totalPrice: number;
  distance: number;
  assignedDeliveryGuy: DeliveryGuy | null;
}

// ─── Delivery Registration ───────────────────────────────────────────────────

export interface DeliveryRegistrationRequest {
  age: number;
  car: string;
  whatsappNumber: string;
}

export interface DeliveryProfile {
  id: number | null;
  name: string;
  age: number | null;
  car: string | null;
  whatsappNumber: string | null;
  location: AppLocation | null;
  available: boolean | null;
  registered: boolean;
}

export interface DeliveryOrderItem {
  productName: string;
  size: string;
  quantity: number;
  price: number;
}

export interface DeliveryOrder {
  orderId: number;
  customerName: string;
  items: DeliveryOrderItem[];
  totalPrice: number;
  distance: number;
  deliveryLocation: AppLocation;
  status: string;
  createdAt: string;
}
