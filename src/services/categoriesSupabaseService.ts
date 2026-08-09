
import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './api';
import { Category, SubCategory, CategoriesResponse } from '@/hooks/useCategoriesData';

export const categoriesSupabaseService = {
  // Get all categories and subcategories from Supabase
  getCategories: async (): Promise<ApiResponse<CategoriesResponse>> => {
    try {

      // Fetch categories - using correct column names
      const { data: categoriesData, error: categoriesError } = await (supabase as any)
        .from('categories')
        .select('*')
        .order('category_name');

      if (categoriesError) {
        
        throw new Error(`Failed to fetch categories: ${categoriesError.message}`);
      }

      // Transform categories data - using correct column names
      const categories: Category[] = (categoriesData || []).map((cat: any) => ({
        id: cat.id,
        name: cat.category_name || 'Unnamed Category',
        description: cat.description || '',
        status: cat.status === 'Active' ? 'Active' : 'Inactive',
        createdDate: cat.created_at || new Date().toISOString(),
        updatedDate: cat.updated_at || new Date().toISOString(),
      }));

      // Fetch subcategories
      const { data: subCategoriesData, error: subCategoriesError } = await (supabase as any)
        .from('sub_categories')
        .select('*')
        .order('sub_category_name');

      let subCategories: SubCategory[] = [];
      
      if (subCategoriesError) {
        
        // Don't throw error for subcategories - they might not exist yet
      } else {

        // Transform subcategories data - handle correct column names for sub_categories
        subCategories = (subCategoriesData || []).map((sub: any) => ({
          id: sub.id,
          categoryId: sub.category_id,
          name: sub.sub_category_name,
          description: sub.description || '',
          status: sub.status === 'Active' ? 'Active' : 'Inactive',
          createdDate: sub.created_at || new Date().toISOString(),
          updatedDate: sub.updated_at || new Date().toISOString(),
        }));
      }

      return {
        data: {
          categories,
          subCategories
        },
        success: true,
        message: `Loaded ${categories.length} categories and ${subCategories.length} subcategories`
      };

    } catch (error) {
      
      return {
        data: {
          categories: [],
          subCategories: []
        },
        success: false,
        message: `Error loading categories: ${(error as Error).message}`
      };
    }
  },

  // Create category (placeholder - not implemented yet)
  createCategory: async (category: Omit<Category, 'id' | 'createdDate' | 'status'>): Promise<ApiResponse<Category>> => {
    
    throw new Error('Create category not implemented yet');
  },

  // Update category (placeholder - not implemented yet)
  updateCategory: async (category: Category): Promise<ApiResponse<Category>> => {
    
    throw new Error('Update category not implemented yet');
  },

  // Create subcategory (placeholder - not implemented yet)
  createSubCategory: async (subCategory: Omit<SubCategory, 'id' | 'createdDate' | 'status'>): Promise<ApiResponse<SubCategory>> => {
    try {
      // Insert into sub_categories table using correct snake_case fields
      const { data, error } = await supabase
        .from('sub_categories')
        .insert({
          category_id: subCategory.categoryId,
          sub_category_name: subCategory.name,
          description: subCategory.description || '',
          status: 'Active',
        })
        .select()
        .single();

      if (error) {
        
        return {
          data: null as any,
          success: false,
          message: error.message,
        };
      }

      // Transform to SubCategory type
      const created: SubCategory = {
        id: data.id,
        categoryId: data.category_id,
        name: data.sub_category_name,
        description: data.description || '',
        status: data.status === 'Active' ? 'Active' : 'Inactive',
        createdDate: data.created_at || new Date().toISOString(),
        updatedDate: data.updated_at || new Date().toISOString(),
      };

      return {
        data: created,
        success: true,
        message: 'Sub-category created successfully',
      };
    } catch (err: any) {
      
      return {
        data: null as any,
        success: false,
        message: err.message || 'Unexpected error creating subcategory',
      };
    }
  },

  // Update subcategory (placeholder - not implemented yet)
  updateSubCategory: async (subCategory: SubCategory): Promise<ApiResponse<SubCategory>> => {
    
    throw new Error('Update subcategory not implemented yet');
  },

  // Delete category
  deleteCategory: async (categoryId: string): Promise<ApiResponse<null>> => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      if (error) {
        return { data: null, success: false, message: error.message };
      }
      return { data: null, success: true, message: 'Category deleted successfully' };
    } catch (err: any) {
      return { data: null, success: false, message: err.message || 'Unexpected error deleting category' };
    }
  },

  // Delete subcategory
  deleteSubCategory: async (subCategoryId: string): Promise<ApiResponse<null>> => {
    try {
      const { error } = await supabase
        .from('sub_categories')
        .delete()
        .eq('id', subCategoryId);
      if (error) {
        return { data: null, success: false, message: error.message };
      }
      return { data: null, success: true, message: 'Sub-category deleted successfully' };
    } catch (err: any) {
      return { data: null, success: false, message: err.message || 'Unexpected error deleting subcategory' };
    }
  }
};
