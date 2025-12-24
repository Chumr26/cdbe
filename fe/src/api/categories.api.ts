import api from './axios';

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parent?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategoriesResponse {
  success: boolean;
  count: number;
  data: Category[];
}

export interface CategoryResponse {
  success: boolean;
  data: Category;
}

export const categoriesAPI = {
  getCategories: async (): Promise<CategoriesResponse> => {
    const response = await api.get('/categories');
    return response.data;
  },

  getCategory: async (id: string): Promise<CategoryResponse> => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (categoryData: Partial<Category>): Promise<CategoryResponse> => {
    const response = await api.post('/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id: string, categoryData: Partial<Category>): Promise<CategoryResponse> => {
    const response = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },
};
