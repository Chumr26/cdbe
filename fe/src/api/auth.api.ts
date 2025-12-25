import api from './axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin';
  phoneNumber?: string;
  addresses?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  data: User;
}

export const authAPI = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    return {
        success: response.data.success,
        token: response.data.token,
        data: response.data.user
    };
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return {
        success: response.data.success,
        token: response.data.token,
        data: response.data.user
    };
  },

  getProfile: async (): Promise<{ success: boolean; data: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ success: boolean; data: User }> => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string): Promise<AuthResponse> => {
    const response = await api.put(`/auth/reset-password/${token}`, { password });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<AuthResponse> => {
    const response = await api.put('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
};
