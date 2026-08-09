
import { ApiResponse } from './api';
import { invmisApi } from './invmisApi';
import { Category, SubCategory, CategoriesResponse } from '@/hooks/useCategoriesData';

// Categories now use InvMISDB API for all operations
export const categoriesApi = {
  // Get all categories and subcategories - Use InvMIS API
  getCategories: async (): Promise<ApiResponse<CategoriesResponse>> => {
    try {
      const [categoriesRes, subCategoriesRes] = await Promise.all([
        invmisApi.categories.getAll(),
        invmisApi.subcategories.getAll()
      ]);

      // Transform InvMIS API response to match expected format
      const categories: Category[] = categoriesRes.success 
        ? categoriesRes.categories.map(cat => ({
            id: cat.id,
            name: cat.category_name,
            description: cat.description || '',
            status: (cat.status === 'Active' ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
            createdDate: cat.created_at,
          }))
        : [];

      const subCategories: SubCategory[] = subCategoriesRes.success
        ? subCategoriesRes.subcategories.map(sub => ({
            id: sub.subcategory_id,
            categoryId: sub.category_id,
            name: sub.sub_category_name,
            description: sub.description || '',
            status: (sub.status === 'Active' ? 'Active' : 'Inactive') as 'Active' | 'Inactive',
            createdDate: new Date().toISOString(), // InvMIS SubCategory doesn't have created_at
          }))
        : [];

      return {
        data: { categories, subCategories },
        success: true,
      };
    } catch (error) {
      console.error('Error fetching categories:', error);
      return {
        data: { categories: [], subCategories: [] },
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch categories'
      };
    }
  },

  // Create category - Use InvMIS API (placeholder - will need backend implementation)
  createCategory: async (category: Omit<Category, 'id' | 'createdDate' | 'status'>): Promise<ApiResponse<Category>> => {
    // TODO: Implement in InvMIS API backend
    return { data: {} as Category, success: false, message: 'Not yet implemented' };
  },

  // Update category - Use InvMIS API (placeholder - will need backend implementation)
  updateCategory: async (category: Category): Promise<ApiResponse<Category>> => {
    // TODO: Implement in InvMIS API backend
    return { data: category, success: false, message: 'Not yet implemented' };
  },

  // Create subcategory - Use InvMIS API (placeholder - will need backend implementation)
  createSubCategory: async (subCategory: Omit<SubCategory, 'id' | 'createdDate' | 'status'>): Promise<ApiResponse<SubCategory>> => {
    // TODO: Implement in InvMIS API backend
    return { data: {} as SubCategory, success: false, message: 'Not yet implemented' };
  },

  // Update subcategory - Use InvMIS API (placeholder - will need backend implementation)
  updateSubCategory: async (subCategory: SubCategory): Promise<ApiResponse<SubCategory>> => {
    // TODO: Implement in InvMIS API backend
    return { data: subCategory, success: false, message: 'Not yet implemented' };
  },

  // Delete category - Use InvMIS API (placeholder - will need backend implementation)
  deleteCategory: async (categoryId: string): Promise<ApiResponse<null>> => {
    // TODO: Implement in InvMIS API backend
    return { data: null, success: false, message: 'Not yet implemented' };
  },

  // Delete subcategory - Use InvMIS API (placeholder - will need backend implementation)
  deleteSubCategory: async (subCategoryId: string): Promise<ApiResponse<null>> => {
    // TODO: Implement in InvMIS API backend
    return { data: null, success: false, message: 'Not yet implemented' };
  },
};
