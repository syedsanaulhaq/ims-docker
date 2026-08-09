import { supabase } from '@/integrations/supabase/client';
import { ItemMaster, CreateItemMasterRequest } from '@/types/tender';
import { ApiResponse } from './api';

// Get all Item Masters from IMS_DB
async function getItemMasters(): Promise<ApiResponse<ItemMaster[]>> {
  try {

    // Test the connection and check table structure first
    
    const { data: tableData, error: tableError } = await (supabase as any)
      .from('item_masters')
      .select('*')
      .limit(1);

    if (tableError) {
      
    } else {
      
    }

    // Fetch all data without any filters first
    
    const { data, error } = await (supabase as any)
      .from('item_masters')
      .select('*')
      .order('nomenclature');

    if (error) {

      // Check if it's a missing table error
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {

        return {
          data: [],
          success: false,
          message: 'Database table not found. Please run the database schema migration first.'
        };
      }
      return {
        data: [],
        success: false,
        message: `Database error: ${error.message}`
      };
    }

    if (!data || data.length === 0) {
      
      return {
        data: [],
        success: true,
        message: 'No item masters found in database'
      };
    }
    
    // Transform the data to match our ItemMaster interface
    const transformedData: ItemMaster[] = (data || []).map((item: any) => {
      
      return {
        id: item.id,
        itemCode: item.item_code || item.itemCode || '',
        nomenclature: item.nomenclature || '',
        categoryId: item.category_id || item.categoryId || '',
        categoryName: 'General',
        subCategoryId: item.subcategory_id || item.subCategoryId || '',
        subCategoryName: 'General',
        unit: item.unit || 'Each',
        specifications: typeof item.specifications === 'string' 
          ? item.specifications 
          : JSON.stringify(item.specifications || {}),
        description: item.description || '',
        isActive: item.status === 'Active' || item.isActive === true,
        createdAt: item.created_date || item.createdAt || new Date().toISOString(),
        updatedAt: item.updated_date || item.updatedAt || new Date().toISOString(),
      };
    });

    return {
      data: transformedData,
      success: true,
      message: `Found ${transformedData.length} item masters`
    };
    
  } catch (error) {
    
    return {
      data: [],
      success: false,
      message: `Unexpected error: ${(error as Error).message}`
    };
  }
}

// Create new Item Master in IMS_DB
async function createItemMaster(itemData: CreateItemMasterRequest): Promise<ApiResponse<ItemMaster>> {
  try {

    const { data, error } = await (supabase as any)
      .from('item_masters')
      .insert([{
        item_code: itemData.itemCode,
        nomenclature: itemData.nomenclature,
        category_id: itemData.categoryId,
        subcategory_id: itemData.subCategoryId || null,
        description: itemData.description || '',
        unit: itemData.unit,
        specifications: itemData.specifications || '',
        status: 'Active',
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      
      return {
        data: null as any,
        success: false,
        message: `Failed to create item master: ${error.message}`
      };
    }

    const transformedItem: ItemMaster = {
      id: data.id,
      itemCode: data.item_code,
      nomenclature: data.nomenclature,
      categoryId: data.category_id,
      categoryName: 'General',
      subCategoryId: data.subcategory_id || '',
      subCategoryName: 'General',
      unit: data.unit,
      specifications: data.specifications || '',
      description: data.description || '',
      isActive: data.status === 'Active',
      createdAt: data.created_date,
      updatedAt: data.updated_date,
    };
    
    return {
      data: transformedItem,
      success: true,
      message: 'Item master created successfully'
    };
  } catch (error) {
    
    return {
      data: null as any,
      success: false,
      message: `Unexpected error: ${(error as Error).message}`
    };
  }
}

// Update Item Master in IMS_DB
async function updateItemMaster(id: string, itemData: Partial<CreateItemMasterRequest>): Promise<ApiResponse<ItemMaster>> {
  try {

    const updateData: any = {
      updated_date: new Date().toISOString()
    };
    
    if (itemData.itemCode) updateData.item_code = itemData.itemCode;
    if (itemData.nomenclature) updateData.nomenclature = itemData.nomenclature;
    if (itemData.categoryId) updateData.category_id = itemData.categoryId;
    if (itemData.subCategoryId) updateData.subcategory_id = itemData.subCategoryId;
    if (itemData.description !== undefined) updateData.description = itemData.description;
    if (itemData.unit) updateData.unit = itemData.unit;
    if (itemData.specifications !== undefined) updateData.specifications = itemData.specifications;

    const { data, error } = await (supabase as any)
      .from('item_masters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      
      return {
        data: null as any,
        success: false,
        message: `Failed to update item master: ${error.message}`
      };
    }

    const transformedItem: ItemMaster = {
      id: data.id,
      itemCode: data.item_code,
      nomenclature: data.nomenclature,
      categoryId: data.category_id,
      categoryName: 'General',
      subCategoryId: data.subcategory_id || '',
      subCategoryName: 'General',
      unit: data.unit,
      specifications: data.specifications || '',
      description: data.description || '',
      isActive: data.status === 'Active',
      createdAt: data.created_date,
      updatedAt: data.updated_date,
    };
    
    return {
      data: transformedItem,
      success: true,
      message: 'Item master updated successfully'
    };
  } catch (error) {
    
    return {
      data: null as any,
      success: false,
      message: `Unexpected error: ${(error as Error).message}`
    };
  }
}

// Delete Item Master from IMS_DB
async function deleteItemMaster(id: string): Promise<ApiResponse<boolean>> {
  try {

    const { error } = await (supabase as any)
      .from('item_masters')
      .delete()
      .eq('id', id);

    if (error) {
      
      return {
        data: false,
        success: false,
        message: `Failed to delete item master: ${error.message}`
      };
    }

    return {
      data: true,
      success: true,
      message: 'Item master deleted successfully'
    };
  } catch (error) {
    
    return {
      data: false,
      success: false,
      message: `Unexpected error: ${(error as Error).message}`
    };
  }
}

// Export service object
export const itemMasterSupabaseService = {
  getItemMasters,
  createItemMaster,
  updateItemMaster,
  deleteItemMaster
};
