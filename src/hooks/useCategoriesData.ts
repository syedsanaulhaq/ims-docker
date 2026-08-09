
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invmisApi } from '@/services/invmisApi';

export interface Category {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  updatedDate?: string;
}

export interface SubCategory {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  updatedDate?: string;
}

export interface CategoriesResponse {
  categories: Category[];
  subCategories: SubCategory[];
}

export const useCategoriesData = () => {
  const queryClient = useQueryClient();

  const {
    data: categoriesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      
      const response = await invmisApi.categories.getAll();

      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Improved data extraction logic - properly handle ApiResponse<CategoriesResponse> structure
  let categories: Category[] = [];
  let subCategories: SubCategory[] = [];

  // Type guard for CategoriesResponse
  function isCategoriesResponse(obj: any): obj is CategoriesResponse {
    return (
      obj &&
      Array.isArray(obj.categories) &&
      Array.isArray(obj.subCategories)
    );
  }

  // Try to extract from InvMIS API response
  if (categoriesData?.success) {
    // Map API categories to local interface
    categories = (categoriesData.categories || []).map(cat => ({
      id: cat.id,
      name: cat.category_name,
      description: cat.description,
      status: cat.status as 'Active' | 'Inactive',
      createdDate: cat.created_at,
      updatedDate: cat.created_at
    }));
    
    // Map API subcategories to local interface
    subCategories = (categoriesData.subCategories || []).map(subCat => ({
      id: subCat.subcategory_id,
      categoryId: subCat.category_id,
      name: subCat.sub_category_name,
      description: subCat.description,
      status: subCat.status as 'Active' | 'Inactive',
      createdDate: new Date().toISOString(),
      updatedDate: new Date().toISOString()
    }));
  }

  const createCategoryMutation = useMutation({
    mutationFn: invmisApi.categories.create,
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => invmisApi.categories.update(id, data),
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      
    },
  });

  const createSubCategoryMutation = useMutation({
    mutationFn: invmisApi.categories.createSubCategory,
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      
    },
  });

  const updateSubCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => invmisApi.categories.updateSubCategory(id, data),
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: invmisApi.categories.delete,
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      
    },
  });

  const deleteSubCategoryMutation = useMutation({
    mutationFn: invmisApi.categories.deleteSubCategory,
    onSuccess: (response) => {
      
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error) => {
      
    },
  });

  return {
    categories,
    subCategories,
    isLoading,
    error,
    refetch,
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    createSubCategory: createSubCategoryMutation.mutate,
    updateSubCategory: updateSubCategoryMutation.mutate,
    deleteSubCategory: deleteSubCategoryMutation.mutate,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isCreatingSubCategory: createSubCategoryMutation.isPending,
    isUpdatingSubCategory: updateSubCategoryMutation.isPending,
    isDeletingSubCategory: deleteSubCategoryMutation.isPending,
  };
};
