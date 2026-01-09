import api from './axios';

export interface Product {
  _id: string;
  title: string;
  isbn?: string;
  author: string;
  description?: string;
  category: string;
  price: number;
  stock: number;
  images?: string[];
  coverImage?: {
    source: 'api' | 'upload' | 'placeholder';
    url: string | null;
  };
  publisher?: string;
  publicationYear?: number;
  pageCount?: number;
  language?: string;
  rating: number;
  numReviews: number;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Product[];
}

export interface ProductResponse {
  success: boolean;
  data: Product;
}

export interface ReviewUser {
  _id: string;
  firstName: string;
  lastName: string;
}

export interface Review {
  _id: string;
  productId: string;
  userId: string | ReviewUser;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewsResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  pages: number;
  data: Review[];
}

export interface ReviewResponse {
  success: boolean;
  data: Review;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ReviewPayload {
  rating: number;
  comment?: string;
}

export const productsAPI = {
  getProducts: async (filters?: ProductFilters): Promise<ProductsResponse> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }
    const response = await api.get(`/products?${params.toString()}`);
    return response.data;
  },

  getProduct: async (id: string): Promise<ProductResponse> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  getFeaturedProducts: async (): Promise<ProductsResponse> => {
    const response = await api.get('/products/featured');
    return response.data;
  },

  createProduct: async (productData: Partial<Product> | FormData): Promise<ProductResponse> => {
    const response = await api.post('/products', productData, {
      headers: productData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },

  updateProduct: async (id: string, productData: Partial<Product> | FormData): Promise<ProductResponse> => {
    const response = await api.put(`/products/${id}`, productData, {
      headers: productData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
  },

  deleteProduct: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  getProductReviews: async (productId: string, page: number = 1, limit: number = 10): Promise<ReviewsResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    const response = await api.get(`/products/${productId}/reviews?${params.toString()}`);
    return response.data;
  },

  createProductReview: async (productId: string, payload: ReviewPayload): Promise<ReviewResponse> => {
    const response = await api.post(`/products/${productId}/reviews`, payload);
    return response.data;
  },

  updateMyProductReview: async (productId: string, payload: Partial<ReviewPayload>): Promise<ReviewResponse> => {
    const response = await api.put(`/products/${productId}/reviews/me`, payload);
    return response.data;
  },

  deleteMyProductReview: async (productId: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/products/${productId}/reviews/me`);
    return response.data;
  },
};
