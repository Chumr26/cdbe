import api from './axios';

export type CouponType = 'percent' | 'fixed';

export interface AvailableCoupon {
  _id: string;
  code: string;
  name?: string;
  description?: string;
  type: CouponType;
  value: number;
  maxDiscountAmount?: number;
  minSubtotal?: number;
}

export interface AvailableCouponsResponse {
  success: boolean;
  count: number;
  data: AvailableCoupon[];
}

export const couponsAPI = {
  getAvailableCoupons: async (): Promise<AvailableCouponsResponse> => {
    const response = await api.get('/coupons/available');
    return response.data;
  },
};
