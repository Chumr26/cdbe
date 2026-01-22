import api from './axios';
import type { User } from './auth.api';
import type { Order } from './orders.api';
import type { Product } from './products.api';
import type { LocalizedText } from '../utils/i18n';

export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  _id: string;
  code: string;
  name?: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscountAmount?: number;
  minSubtotal?: number;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: Product[];
}

export interface DashboardResponse {
  success: boolean;
  data: DashboardStats;
}

export interface AnalyticsTotals {
  totalOrders: number;
  revenue: number;
  newUsers: number;
  completedOrders: number;
  avgOrderValue: number;
}

export interface AnalyticsTimeSeriesPoint {
  date: string; // YYYY-MM-DD
  orders: number;
  revenue: number;
  newUsers: number;
}

export interface AnalyticsDistributionPoint {
  key: string;
  count: number;
}

export interface TopProductAnalytics {
  productId: string;
  titleI18n?: LocalizedText;
  title?: string;
  isbn?: string;
  quantitySold: number;
  revenue: number;
}

export interface AdvancedAnalytics {
  rangeDays: number;
  from: string;
  to: string;
  totals: AnalyticsTotals;
  timeSeries: AnalyticsTimeSeriesPoint[];
  distributions: {
    orderStatus: AnalyticsDistributionPoint[];
    paymentStatus: AnalyticsDistributionPoint[];
  };
  topProducts: TopProductAnalytics[];
}

export interface AdvancedAnalyticsResponse {
  success: boolean;
  data: AdvancedAnalytics;
}

export interface UsersResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: User[];
}

export interface UserResponse {
  success: boolean;
  data: User;
}

export interface OrdersResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Order[];
}

export interface CouponsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Coupon[];
}

export interface CouponResponse {
  success: boolean;
  data: Coupon;
}

export const adminAPI = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  getAdvancedAnalytics: async (days = 30): Promise<AdvancedAnalyticsResponse> => {
    const response = await api.get(`/admin/analytics?days=${days}`);
    return response.data;
  },

  // User Management
  getUsers: async (page = 1, limit = 10): Promise<UsersResponse> => {
    const response = await api.get(`/admin/users?page=${page}&limit=${limit}`);
    return response.data;
  },

  getUser: async (id: string): Promise<UserResponse> => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<UserResponse> => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Order Management
  getOrders: async (page = 1, limit = 10, status?: string): Promise<OrdersResponse> => {
    let url = `/admin/orders?page=${page}&limit=${limit}`;
    if (status) url += `&status=${status}`;
    const response = await api.get(url);
    return response.data;
  },

  updateOrderStatus: async (
    id: string,
    orderStatus: string
  ): Promise<{ success: boolean; data: Order }> => {
    const response = await api.patch(`/admin/orders/${id}/status`, { orderStatus });
    return response.data;
  },

  updateCodPaymentStatus: async (
    id: string,
    paymentStatus: 'pending' | 'completed' | 'failed'
  ): Promise<{ success: boolean; data: Order }> => {
    const response = await api.patch(`/admin/orders/${id}/payment-status`, { paymentStatus });
    return response.data;
  },

  // Coupon Management
  getCoupons: async (page = 1, limit = 20): Promise<CouponsResponse> => {
    const response = await api.get(`/admin/coupons?page=${page}&limit=${limit}`);
    return response.data;
  },

  createCoupon: async (couponData: Partial<Coupon>): Promise<CouponResponse> => {
    const response = await api.post('/admin/coupons', couponData);
    return response.data;
  },

  updateCoupon: async (id: string, couponData: Partial<Coupon>): Promise<CouponResponse> => {
    const response = await api.put(`/admin/coupons/${id}`, couponData);
    return response.data;
  },

  disableCoupon: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/admin/coupons/${id}`);
    return response.data;
  },
};
