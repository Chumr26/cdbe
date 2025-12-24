import api from './axios';
import type { User } from './auth.api';
import type { Order } from './orders.api';
import type { Product } from './products.api';

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

export const adminAPI = {
  getDashboard: async (): Promise<DashboardResponse> => {
    const response = await api.get('/admin/dashboard');
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
};
