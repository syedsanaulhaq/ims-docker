import { ApiResponse } from './api';

const API_BASE_URL = 'http://localhost:3001';

export interface Category {
  id: string;
  category_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface SubCategory {
  id: string;
  category_id: string;
  sub_category_name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface CreateCategoryRequest {
  category_name: string;
  description?: string;
}

export interface CreateSubCategoryRequest {
  category_id: string;
  sub_category_name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  category_name?: string;
  description?: string;
}

export interface UpdateSubCategoryRequest {
  category_id?: string;
  sub_category_name?: string;
  description?: string;
}

// Local SQL Server categories service
export const categoriesLocalService = {
  // === CATEGORIES ===
  
  // Get all categories
  getCategories: async (): Promise<ApiResponse<Category[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Categories fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch categories'
      };
    }
  },

  // Get single category by ID
  getCategory: async (id: string): Promise<ApiResponse<Category>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Category fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching category:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to fetch category'
      };
    }
  },

  // Create category
  createCategory: async (categoryData: CreateCategoryRequest): Promise<ApiResponse<Category>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Category created successfully'
      };
    } catch (error: any) {
      console.error('Error creating category:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to create category'
      };
    }
  },

  // Update category
  updateCategory: async (id: string, categoryData: UpdateCategoryRequest): Promise<ApiResponse<Category>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Category updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating category:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update category'
      };
    }
  },

  // Delete category
  deleteCategory: async (id: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/categories/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: true,
        message: 'Category deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting category:', error);
      return {
        success: false,
        data: false,
        message: error.message || 'Failed to delete category'
      };
    }
  },

  // === SUB-CATEGORIES ===
  
  // Get all sub-categories
  getSubCategories: async (): Promise<ApiResponse<SubCategory[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sub-categories`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Sub-categories fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching sub-categories:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch sub-categories'
      };
    }
  },

  // Get sub-categories by category ID
  getSubCategoriesByCategory: async (categoryId: string): Promise<ApiResponse<SubCategory[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sub-categories?category_id=${categoryId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Sub-categories fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching sub-categories for category:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch sub-categories'
      };
    }
  },

  // Get single sub-category by ID
  getSubCategory: async (id: string): Promise<ApiResponse<SubCategory>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sub-categories/${id}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Sub-category fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching sub-category:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to fetch sub-category'
      };
    }
  },

  // Create sub-category
  createSubCategory: async (subCategoryData: CreateSubCategoryRequest): Promise<ApiResponse<SubCategory>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sub-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subCategoryData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Sub-category created successfully'
      };
    } catch (error: any) {
      console.error('Error creating sub-category:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to create sub-category'
      };
    }
  },

  // Update sub-category
  updateSubCategory: async (id: string, subCategoryData: UpdateSubCategoryRequest): Promise<ApiResponse<SubCategory>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sub-categories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subCategoryData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Sub-category updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating sub-category:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update sub-category'
      };
    }
  },

  // Delete sub-category
  deleteSubCategory: async (id: string): Promise<ApiResponse<boolean>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sub-categories/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: true,
        message: 'Sub-category deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting sub-category:', error);
      return {
        success: false,
        data: false,
        message: error.message || 'Failed to delete sub-category'
      };
    }
  },

  // === HELPER FUNCTIONS ===
  
  // Get categories with their sub-categories
  getCategoriesWithSubCategories: async (): Promise<ApiResponse<(Category & { subCategories: SubCategory[] })[]>> => {
    try {
      const [categoriesResult, subCategoriesResult] = await Promise.all([
        categoriesLocalService.getCategories(),
        categoriesLocalService.getSubCategories()
      ]);
      
      if (!categoriesResult.success || !subCategoriesResult.success) {
        throw new Error('Failed to fetch categories or sub-categories');
      }
      
      const categoriesWithSubs = categoriesResult.data.map(category => ({
        ...category,
        subCategories: subCategoriesResult.data.filter(sub => sub.category_id === category.id)
      }));
      
      return {
        success: true,
        data: categoriesWithSubs,
        message: 'Categories with sub-categories fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching categories with sub-categories:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch categories with sub-categories'
      };
    }
  }
};

export default categoriesLocalService;
