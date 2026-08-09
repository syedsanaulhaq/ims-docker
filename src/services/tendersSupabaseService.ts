// Supabase service for tenders management
import { supabase } from '@/integrations/supabase/client';
import { ApiResponse } from './api';
import { Tender, CreateTenderRequest, CreateTenderItemRequest, TenderStats, TenderItem } from '@/types/tender';

export interface TenderSupabaseRow {
  id: string;
  tender_number: string;
  reference_number: string;
  title: string;
  description?: string;
  tender_spot_type: 'Contract/Tender' | 'Petty Purchase';
  department_id?: string;
  estimated_value: number;
  publish_date: string;
  publication_date: string;
  submission_date: string;
  submission_deadline: string;
  opening_date: string;
  status: 'Draft' | 'Published' | 'Closed' | 'Awarded' | 'Cancelled';
  document_path?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  office_ids?: number[];
  wing_ids?: number[];
  dec_ids?: number[];
}

// Transform database rows to TenderItem interface
const transformTenderItemsData = (data: any[]): TenderItem[] => {
  return data.map((item: any): TenderItem => ({
    id: item.id,
    tenderId: item.tender_id,
    itemMasterId: item.item_master_id,
    nomenclature: item.nomenclature,
    quantity: item.quantity,
    quantityReceived: item.quantity_received,
    estimatedUnitPrice: item.estimated_unit_price,
    actualUnitPrice: item.actual_unit_price,
    totalAmount: item.total_amount,
    specifications: item.specifications,
    remarks: item.remarks,
    status: item.status
  }));
};

// Helper function to fetch tender items for a tender
const fetchTenderItems = async (tenderId: string): Promise<TenderItem[]> => {
  try {

    // Use any type casting to bypass TypeScript issues until types are regenerated
    const { data, error } = await supabase
      .from('tender_items' as any)
      .select('*')
      .eq('tender_id', tenderId)
      .order('created_at', { ascending: true });

    if (error) {
      
      // If table doesn't exist yet, return empty array
      if (error.code === 'PGRST116' || error.message.includes('relation "tender_items" does not exist')) {
        
        return [];
      }
      throw error;
    }

    const transformedItems = transformTenderItemsData(data || []);
    
    return transformedItems;
    
  } catch (error) {
    
    return [];
  }
};

// Helper function to create tender items
const createTenderItems = async (tenderId: string, items: CreateTenderItemRequest[]): Promise<void> => {
  try {
    if (!items || items.length === 0) {
      
      return;
    }

    // Transform items to database format
    const tenderItems = items.map(item => ({
      tender_id: tenderId,
      item_master_id: item.itemMasterId,
      nomenclature: item.nomenclature,
      quantity: item.quantity,
      estimated_unit_price: item.estimatedUnitPrice,
      specifications: item.specifications || null,
      remarks: item.remarks || null,
      status: 'Pending'
    }));

    const { error } = await supabase
      .from('tender_items' as any)
      .insert(tenderItems);

    if (error) {
      
      throw new Error(`Failed to create tender items: ${error.message}`);
    }

  } catch (error) {
    
    throw error;
  }
};

// Helper function to update tender items
const updateTenderItems = async (tenderId: string, items: CreateTenderItemRequest[]): Promise<void> => {
  try {

    // First, delete existing tender items for this tender
    const { error: deleteError } = await supabase
      .from('tender_items' as any)
      .delete()
      .eq('tender_id', tenderId);

    if (deleteError) {
      
      throw new Error(`Failed to delete existing tender items: ${deleteError.message}`);
    }

    // If no items provided, just return after deletion
    if (!items || items.length === 0) {
      
      return;
    }

    // Create new tender items
    await createTenderItems(tenderId, items);
    
  } catch (error) {
    
    throw error;
  }
};

// Helper function to transform Supabase row to Tender interface
const transformSupabaseRowToTender = (row: any): Tender => {
  return {
    id: row.id,
    tenderNumber: row.tender_number || `TN-${new Date(row.created_at).getFullYear()}-${row.id.slice(-3)}`,
    referenceNumber: row.reference_number || '',
    title: row.title || '',
    description: row.description || '',
    estimatedValue: row.estimated_value || 0,
    publishDate: row.publish_date,
    publicationDate: row.publication_date,
    submissionDate: row.submission_date,
    submissionDeadline: row.submission_deadline,
    openingDate: row.opening_date,
    // Use status field directly for dashboard and everywhere
    status: row.status || 'Open',
    tender_status: row.tender_status || undefined,
    vendor_id: row.vendor_id,
    type: (row.tender_spot_type as 'Contract/Tender' | 'Petty Purchase') || 'Contract/Tender',
    documentPath: row.document_path,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    officeIds: row.office_ids ? row.office_ids.map(String) : [],
    wingIds: row.wing_ids ? row.wing_ids.map(String) : [],
    decIds: row.dec_ids ? row.dec_ids.map(String) : [],
    procurementMethod: row.procurement_method || '',
    biddingProcedure: row.procedure_adopted || '',
    advertisementDate: row.advertisement_date || '',
    publicationDailies: row.publication_daily || '',
    // File path fields for uploaded documents
    rfp_file_path: row.rfp_file_path || undefined,
    contract_file_path: row.contract_file_path || undefined,
    loi_file_path: row.loi_file_path || undefined,
    po_file_path: row.po_file_path || undefined,
    noting_file_path: row.noting_file_path || undefined,
    items: [], // Will be populated separately
  };
};

// Helper function to transform CreateTenderRequest to Supabase insert format
const transformTenderRequestToSupabaseInsert = async (tender: CreateTenderRequest) => {
  const tenderNumber = generateTenderNumber(tender.type);
  
  // Convert office/wing/dec IDs to arrays of numbers
  const officeIds = tender.officeIds && tender.officeIds.length > 0 ? tender.officeIds.map(Number) : [];
  const wingIds = tender.wingIds && tender.wingIds.length > 0 ? tender.wingIds.map(Number) : [];
  const decIds = tender.decIds && tender.decIds.length > 0 ? tender.decIds.map(Number) : [];

  const insertData: any = {
    tender_number: tenderNumber,
    reference_number: tender.referenceNumber,
    title: tender.title,
    description: tender.description || null,
    tender_spot_type: tender.tender_spot_type || tender.type,
    office_ids: officeIds, // Always pass array, even if empty
    wing_ids: wingIds,     // Always pass array, even if empty       
    dec_ids: decIds,       // Always pass array, even if empty          
    estimated_value: tender.estimatedValue,
    publish_date: tender.publishDate,
    publication_date: tender.publicationDate,
    submission_date: tender.submissionDate,
    submission_deadline: tender.submissionDeadline,
    opening_date: tender.openingDate,
    status: tender.status || 'Draft',
    tender_status: tender.tender_status || 'Open',
    vendor_id: (tender.vendor && tender.vendor.vendorId) || tender.vendor_id || null,
    document_path: null,
    created_by: 'system',
    procurement_method: tender.procurementMethod || null,
    procedure_adopted: tender.biddingProcedure || null,
    advertisement_date: tender.advertisementDate || null,
    publication_daily: tender.publicationDailies || null,
    // File path fields for uploaded documents
    rfp_file_path: tender.rfp_file_path || null,
    contract_file_path: tender.contract_file_path || null,
    loi_file_path: tender.loi_file_path || null,
    po_file_path: tender.po_file_path || null,
    noting_file_path: tender.noting_file_path || null,
  };
  // Add tender_id if present (for update/edit)
  if (tender.tender_id) insertData.tender_id = tender.tender_id;

  return insertData;
};

// Helper function to generate tender number
const generateTenderNumber = (type: 'Contract/Tender' | 'Petty Purchase'): string => {
  const prefix = type === 'Petty Purchase' ? 'SP' : 'TN';
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-3);
  return `${prefix}-${year}-${timestamp}`;
};

export const tendersSupabaseService = {
  // Get all tenders
  getAll: async (): Promise<ApiResponse<Tender[]>> => {
    try {

      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        
        throw new Error(`Failed to fetch tenders: ${error.message}`);
      }

      const tenders = (data || []).map(transformSupabaseRowToTender);

      // Fetch items for each tender
      
      for (const tender of tenders) {
        tender.items = await fetchTenderItems(tender.id);
      }

      return {
        data: tenders,
        success: true,
        message: 'Tenders fetched successfully'
      };
    } catch (error: any) {
      
      return {
        data: [],
        success: false,
        message: error.message || 'Failed to fetch tenders'
      };
    }
  },

  // Get single tender
  getById: async (id: string): Promise<ApiResponse<Tender>> => {
    try {

      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        
        throw new Error(`Failed to fetch tender: ${error.message}`);
      }

      if (!data) {
        throw new Error('Tender not found');
      }

      const tender = transformSupabaseRowToTender(data);

      // Fetch and set tender items
      
      tender.items = await fetchTenderItems(tender.id);

      return {
        data: tender,
        success: true,
        message: 'Tender fetched successfully'
      };
    } catch (error: any) {
      
      throw error;
    }
  },

  // Create tender
  create: async (tender: CreateTenderRequest): Promise<ApiResponse<Tender>> => {
    try {

      const insertData = await transformTenderRequestToSupabaseInsert(tender);

      const { data, error } = await supabase
        .from('tenders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        
        throw new Error(`Failed to create tender: ${error.message}`);
      }

      const createdTender = transformSupabaseRowToTender(data);

      // Create tender items if any
      if (tender.items && tender.items.length > 0) {

        await createTenderItems(createdTender.id, tender.items);
        
      } else {
        
      }

      // No tender_vendor_info logic; vendor_id is saved directly in the tender row if present

      // Fetch the tender items that were just created
      let createdItems: TenderItem[] = [];
      if (tender.items && tender.items.length > 0) {
        
        createdItems = await fetchTenderItems(createdTender.id);
        
      }

      // Add the items to the tender object
      const tenderWithItems = {
        ...createdTender,
        items: createdItems
      };

      return {
        data: tenderWithItems,
        success: true,
        message: 'Tender created successfully'
      };
    } catch (error: any) {
      
      throw error;
    }
  },

  // Update tender
  update: async (id: string, tender: Partial<CreateTenderRequest>): Promise<ApiResponse<Tender>> => {
    try {

      const updateData: Partial<any> = {};
      
      if (tender.title) updateData.title = tender.title;
      if (tender.referenceNumber) updateData.reference_number = tender.referenceNumber;
      if (tender.description !== undefined) updateData.description = tender.description || null;
      if (tender.estimatedValue !== undefined) updateData.estimated_value = tender.estimatedValue;
      if (tender.publishDate) updateData.publish_date = tender.publishDate;
      if (tender.publicationDate) updateData.publication_date = tender.publicationDate;
      if (tender.submissionDate) updateData.submission_date = tender.submissionDate;
      if (tender.submissionDeadline) updateData.submission_deadline = tender.submissionDeadline;
      if (tender.openingDate) updateData.opening_date = tender.openingDate;

      // Tender process details
      if (tender.procurementMethod !== undefined) updateData.procurement_method = tender.procurementMethod;
      if (tender.biddingProcedure !== undefined) updateData.procedure_adopted = tender.biddingProcedure;
      if (tender.advertisementDate !== undefined) updateData.advertisement_date = tender.advertisementDate;
      if (tender.publicationDailies !== undefined) updateData.publication_daily = tender.publicationDailies;

      // Handle array fields - always update if provided, even if empty
      if (tender.officeIds !== undefined) updateData.office_ids = tender.officeIds.map(Number);
      if (tender.wingIds !== undefined) updateData.wing_ids = tender.wingIds.map(Number);
      if (tender.decIds !== undefined) updateData.dec_ids = tender.decIds.map(Number);

      // Add tender_id if present (for update/edit)
      if (tender.tender_id) updateData.tender_id = tender.tender_id;
      // Map tender_status to status and tender_status
      if (tender.tender_status) {
        updateData.status = tender.tender_status;
        updateData.tender_status = tender.tender_status;
      }

      // File path fields for uploaded documents
      if (tender.rfp_file_path !== undefined) updateData.rfp_file_path = tender.rfp_file_path;
      if (tender.contract_file_path !== undefined) updateData.contract_file_path = tender.contract_file_path;
      if (tender.loi_file_path !== undefined) updateData.loi_file_path = tender.loi_file_path;
      if (tender.po_file_path !== undefined) updateData.po_file_path = tender.po_file_path;
      if (tender.noting_file_path !== undefined) updateData.noting_file_path = tender.noting_file_path;
      // Map vendor_id if present
      if (tender.vendor && tender.vendor.vendorId) updateData.vendor_id = tender.vendor.vendorId;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('tenders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        
        throw new Error(`Failed to update tender: ${error.message}`);
      }

      const updatedTender = transformSupabaseRowToTender(data);

      // Update tender items if provided
      if (tender.items !== undefined) {
        try {
          await updateTenderItems(updatedTender.id, tender.items);
        } catch (error) {
          
        }
      }

      // No tender_vendor_info logic; vendor_id is saved directly in the tender row if present
      
      return {
        data: updatedTender,
        success: true,
        message: 'Tender updated successfully'
      };
    } catch (error: any) {
      
      throw error;
    }
  },

  // Delete tender
  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {

      const { error } = await supabase
        .from('tenders')
        .delete()
        .eq('id', id);

      if (error) {
        
        throw new Error(`Failed to delete tender: ${error.message}`);
      }

      return {
        data: undefined,
        success: true,
        message: 'Tender deleted successfully'
      };
    } catch (error: any) {
      
      throw error;
    }
  },

  // Update tender status
  updateStatus: async (id: string, status: Tender['status']): Promise<ApiResponse<Tender>> => {
    try {

      const { data, error } = await supabase
        .from('tenders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        
        throw new Error(`Failed to update tender status: ${error.message}`);
      }

      const updatedTender = transformSupabaseRowToTender(data);

      return {
        data: updatedTender,
        success: true,
        message: 'Tender status updated successfully'
      };
    } catch (error: any) {
      
      throw error;
    }
  },

  // Get tender statistics
  getStats: async (): Promise<ApiResponse<TenderStats>> => {
    try {

      const { data, error } = await supabase
        .from('tenders')
        .select('status, tender_type, estimated_value');

      if (error) {
        
        throw new Error(`Failed to fetch tender stats: ${error.message}`);
      }

      const tenders = data || [];
      
      const stats: TenderStats = {
        totalTenders: tenders.length,
        activeTenders: tenders.filter(t => t.status === 'Published').length,
        draftTenders: tenders.filter(t => t.status === 'Draft').length,
        closedTenders: tenders.filter(t => t.status === 'Closed').length,
        totalEstimatedValue: tenders.reduce((sum, t) => sum + (t.estimated_value || 0), 0),
        contractTenders: tenders.filter(t => t.tender_type === 'Contract/Tender').length,
        spotPurchases: tenders.filter(t => t.tender_type === 'Petty Purchase').length,
      };

      return {
        data: stats,
        success: true,
        message: 'Tender statistics fetched successfully'
      };
    } catch (error: any) {
      
      return {
        data: {
          totalTenders: 0,
          activeTenders: 0,
          draftTenders: 0,
          closedTenders: 0,
          totalEstimatedValue: 0,
          contractTenders: 0,
          spotPurchases: 0,
        },
        success: false,
        message: error.message || 'Failed to fetch tender statistics'
      };
    }
  },

  // Helper function to delete tender items
  deleteTenderItems: async (tenderId: string): Promise<void> => {
    try {

      const { error } = await supabase
        .from('tender_items' as any)
        .delete()
        .eq('tender_id', tenderId);

      if (error) {
        
        throw new Error(`Failed to delete tender items: ${error.message}`);
      }

    } catch (error) {
      
      throw error;
    }
  },

  // Helper function to get tender items with item master details
  getTenderItemsWithDetails: async (tenderId: string): Promise<TenderItem[]> => {
    try {

      // Now use the RPC function since it's created
      try {
        const { data, error } = await (supabase as any)
          .rpc('get_tender_items_with_details', { tender_id: tenderId });

        if (error) {
          
          return await fetchTenderItems(tenderId);
        }

        return transformTenderItemsData(data || []);
      } catch (rpcError) {
        
        return await fetchTenderItems(tenderId);
      }
      
    } catch (error) {
      
      return await fetchTenderItems(tenderId);
    }
  },
};
