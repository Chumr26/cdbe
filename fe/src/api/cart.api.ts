import api from './axios';
import type { Product } from './products.api';

export interface CartItem {
  productId: Product;
  quantity: number;
  price: number;
}

export interface Cart {
  _id: string;
  userId: string;
  items: CartItem[];
  subtotal?: number;
  discountTotal?: number;
  coupon?: {
    couponId?: string;
    code?: string;
    type?: 'percent' | 'fixed';
    value?: number;
  } | null;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartResponse {
  success: boolean;
  data: Cart;
}

export const cartAPI = {
  getCart: async (): Promise<CartResponse> => {
    const response = await api.get('/cart');
    return response.data;
  },

  addToCart: async (productId: string, quantity: number): Promise<CartResponse> => {
    const response = await api.post('/cart/items', { productId, quantity });
    return response.data;
  },

  updateCartItem: async (productId: string, quantity: number): Promise<CartResponse> => {
    const response = await api.put(`/cart/items/${productId}`, { quantity });
    return response.data;
  },

  removeFromCart: async (productId: string): Promise<CartResponse> => {
    const response = await api.delete(`/cart/items/${productId}`);
    return response.data;
  },

  clearCart: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete('/cart');
    return response.data;
  },

  applyCoupon: async (code: string): Promise<CartResponse> => {
    const response = await api.post('/cart/coupon', { code });
    return response.data;
  },

  removeCoupon: async (): Promise<CartResponse> => {
    const response = await api.delete('/cart/coupon');
    return response.data;
  },
};
