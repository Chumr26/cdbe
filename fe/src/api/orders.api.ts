import api from './axios';

export interface ShippingAddress {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  isbn?: string;
  quantity: number;
  price: number;
}

export interface Order {
  _id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod?: 'payos' | 'cod';
  paymentStatus: 'pending' | 'completed' | 'failed';
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  success: boolean;
  count: number;
  data: Order[];
}

export interface OrderResponse {
  success: boolean;
  data: Order;
}

export const ordersAPI = {
  createOrder: async (
    shippingAddress: ShippingAddress,
    paymentMethod?: 'payos' | 'cod'
  ): Promise<OrderResponse> => {
    const response = await api.post('/orders', { shippingAddress, paymentMethod });
    return response.data;
  },

  getOrders: async (): Promise<OrdersResponse> => {
    const response = await api.get('/orders');
    return response.data;
  },

  getOrder: async (id: string): Promise<OrderResponse> => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  cancelOrder: async (id: string): Promise<OrderResponse> => {
    const response = await api.patch(`/orders/${id}/cancel`);
    return response.data;
  },
};
