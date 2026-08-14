import { ApiResponse } from './api';
import { Tender, CreateTenderRequest, TenderStats } from '@/types/tender';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}`;

// Local SQL Server tender service
export const tendersLocalService = {
  // Get all tenders
  getAll: async (): Promise<ApiResponse<Tender[]>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const rawData = await response.json();
      
      // Transform the data to match frontend expectations
      const transformedData = await Promise.all(rawData.map(async (tender: any) => {
        // Get item count for each tender (lightweight operation)
        let itemCount = 0;
        try {
          const itemsResponse = await fetch(`${API_BASE_URL}/api/tenders/${tender.id}/items`);
          if (itemsResponse.ok) {
            const items = await itemsResponse.json();
            itemCount = items.length;
          }
        } catch (error) {
          // Continue with 0 count if items fetch fails
        }
        
        return {
          ...tender,
          // Map database fields to frontend fields
          type: tender.tender_spot_type || 'Contract/Tender', // Use tender_spot_type as the type
          tenderNumber: tender.tender_number,
          referenceNumber: tender.reference_number,
          estimatedValue: tender.estimated_value,
          publishDate: tender.publish_date,
          publicationDate: tender.publication_date,
          submissionDate: tender.submission_date,
          submissionDeadline: tender.submission_deadline,
          openingDate: tender.opening_date,
          createdAt: tender.created_at,
          updatedAt: tender.updated_at,
          documentPath: tender.document_path,
          officeIds: tender.office_ids ? tender.office_ids.split(',').filter(Boolean) : [],
          wingIds: tender.wing_ids ? tender.wing_ids.split(',').filter(Boolean) : [],
          decIds: tender.dec_ids ? tender.dec_ids.split(',').filter(Boolean) : [],
          officeName: tender.office_name,
          wingName: tender.wing_name,
          // Vendor information
          vendor_id: tender.vendor_id,
          vendor: tender.vendor_name ? {
            vendorId: tender.vendor_id,
            vendorName: tender.vendor_name,
            contactPerson: tender.vendor_contact_person || '',
            email: tender.vendor_email || '',
            phone: tender.vendor_phone || '',
            address: tender.vendor_address || ''
          } : undefined,
          items: [], // Empty for list view - will be populated in getById
          itemCount: itemCount, // Add item count for display in lists
          // Finalization fields
          is_finalized: tender.is_finalized,
          finalized_at: tender.finalized_at,
          finalized_by: tender.finalized_by
        };
      }));
      
      return {
        success: true,
        data: transformedData,
        message: 'Tenders fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching tenders:', error);
      return {
        success: false,
        data: [],
        message: error.message || 'Failed to fetch tenders'
      };
    }
  },

  // Get single tender by ID
  getById: async (id: string): Promise<ApiResponse<Tender>> => {
    try {
      // Fetch tender basic data
      const tenderResponse = await fetch(`${API_BASE_URL}/api/tenders/${id}`);
      
      if (!tenderResponse.ok) {
        throw new Error(`HTTP error! status: ${tenderResponse.status}`);
      }
      
      const rawData = await tenderResponse.json();
      
      // Fetch tender items
      let items = [];
      try {
        const itemsResponse = await fetch(`${API_BASE_URL}/api/tenders/${id}/items`);
        if (itemsResponse.ok) {
          const rawItems = await itemsResponse.json();
          // Transform tender items to match frontend expectations
          items = rawItems.map((item: any) => ({
            id: item.id,
            tenderId: item.tender_id,
            itemMasterId: item.item_master_id,
            nomenclature: item.nomenclature || item.item_name, // Use nomenclature field or fallback to item_name
            quantity: item.quantity || 0,
            quantityReceived: item.quantity_received,
            estimatedUnitPrice: item.estimated_unit_price || item.unit_price || 0,
            actualUnitPrice: item.actual_unit_price,
            totalAmount: item.total_amount,
            specifications: item.specifications,
            remarks: item.remarks,
            status: item.status
          }));
        }
      } catch (error) {
        // Continue with empty items array
      }
      
      // Transform the data to match frontend expectations
      const transformedData = {
        ...rawData,
        // Map database fields to frontend fields
        type: rawData.tender_spot_type || 'Contract/Tender',
        tenderNumber: rawData.tender_number,
        referenceNumber: rawData.reference_number,
        estimatedValue: rawData.estimated_value,
        publishDate: rawData.publish_date,
        publicationDate: rawData.publication_date,
        submissionDate: rawData.submission_date,
        submissionDeadline: rawData.submission_deadline,
        openingDate: rawData.opening_date,
        createdAt: rawData.created_at,
        updatedAt: rawData.updated_at,
        documentPath: rawData.document_path,
        officeIds: rawData.office_ids ? rawData.office_ids.split(',').filter(Boolean) : [],
        wingIds: rawData.wing_ids ? rawData.wing_ids.split(',').filter(Boolean) : [],
        decIds: rawData.dec_ids ? rawData.dec_ids.split(',').filter(Boolean) : [],
        officeName: rawData.office_name,
        wingName: rawData.wing_name,
        // Vendor information
        vendor_id: rawData.vendor_id,
        vendor: rawData.vendor_name ? {
          vendorId: rawData.vendor_id,
          vendorName: rawData.vendor_name,
          contactPerson: rawData.vendor_contact_person || '',
          email: rawData.vendor_email || '',
          phone: rawData.vendor_phone || '',
          address: rawData.vendor_address || ''
        } : undefined,
        items: items || [], // Now populated with actual tender items
        // Finalization fields
        is_finalized: rawData.is_finalized,
        finalized_at: rawData.finalized_at,
        finalized_by: rawData.finalized_by
      };
      
      return {
        success: true,
        data: transformedData,
        message: 'Tender fetched successfully'
      };
    } catch (error: any) {
      console.error('Error fetching tender:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to fetch tender'
      };
    }
  },

  // Create new tender
  create: async (tender: CreateTenderRequest): Promise<ApiResponse<Tender>> => {
    try {
      // Map frontend data to backend expected format
      const payload = {
        reference_number: tender.referenceNumber,
        title: tender.title,
        description: tender.description || '',
        tender_type: tender.tender_spot_type || tender.type, // Use tender_spot_type as tender_type
        estimated_value: tender.estimatedValue,
        submission_deadline: tender.submissionDate,
        status: 'Draft', // Always set to Draft for new tenders (workflow status)
        tender_status: tender.tender_status, // From form's Tender Status combobox (business status)
        created_by: 'system-user', // TODO: Get from auth context
        office_id: tender.officeIds?.[0] || null, // Take first office ID
        wing_id: tender.wingIds?.[0] || null, // Take first wing ID
        dec_id: tender.decIds?.[0] || null, // Take first DEC ID
        tender_spot_type: tender.tender_spot_type || tender.type,
        procurement_method: tender.procurementMethod || '',
        publication_daily: tender.publicationDailies || '',
        // Include vendor_id if provided
        vendor_id: tender.vendor_id || null,
        // Include vendor object if provided (for new vendor creation)
        vendor: tender.vendor || null,
        // Add items to payload - map frontend format to backend format
        items: tender.items ? tender.items.map(item => ({
          item_master_id: item.itemMasterId,
          nomenclature: item.nomenclature,
          quantity: item.quantity,
          estimated_unit_price: item.estimatedUnitPrice,
          actual_unit_price: 0, // Default to 0 for new items
          total_amount: item.quantity * item.estimatedUnitPrice, // Calculate total
          specifications: item.specifications || '',
          remarks: item.remarks || '',
          status: 'Active'
        })) : []
      };

      const response = await fetch(`${API_BASE_URL}/api/tenders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: `Tender created successfully with ${data.items_count || 0} items`
      };
    } catch (error: any) {
      console.error('Error creating tender:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to create tender'
      };
    }
  },

  // Update tender
  update: async (id: string, tender: Partial<CreateTenderRequest>): Promise<ApiResponse<Tender>> => {
    try {
      // Map frontend data to backend expected format
      const payload = {
        reference_number: tender.referenceNumber,
        title: tender.title,
        description: tender.description || '',
        tender_type: tender.tender_spot_type || tender.type,
        estimated_value: tender.estimatedValue,
        submission_deadline: tender.submissionDate,
        status: tender.status, // Workflow status (Draft, Published, etc.)
        tender_status: tender.tender_status, // Business status from form combobox
        office_id: tender.officeIds?.[0] || null,
        wing_id: tender.wingIds?.[0] || null,
        dec_id: tender.decIds?.[0] || null,
        tender_spot_type: tender.tender_spot_type || tender.type,
        procurement_method: tender.procurementMethod || '',
        publication_daily: tender.publicationDailies || '',
        // Include vendor_id if provided
        vendor_id: tender.vendor_id || null,
        // Include vendor object if provided (for new vendor creation)
        vendor: tender.vendor || null
      };

      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Tender updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating tender:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update tender'
      };
    }
  },

  // Delete tender
  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      return {
        success: true,
        data: undefined,
        message: 'Tender deleted successfully'
      };
    } catch (error: any) {
      console.error('Error deleting tender:', error);
      return {
        success: false,
        data: undefined,
        message: error.message || 'Failed to delete tender'
      };
    }
  },

  // Update tender status
  updateStatus: async (id: string, status: Tender['status']): Promise<ApiResponse<Tender>> => {
    try {
      // First fetch the current tender data
      const getCurrentResponse = await fetch(`${API_BASE_URL}/api/tenders/${id}`);
      if (!getCurrentResponse.ok) {
        throw new Error(`Failed to fetch current tender data: ${getCurrentResponse.status}`);
      }
      
      const currentTender = await getCurrentResponse.json();
      
      // Merge current data with new status
      const updateData = {
        reference_number: currentTender.reference_number,
        title: currentTender.title,
        description: currentTender.description,
        tender_type: currentTender.tender_type,
        estimated_value: currentTender.estimated_value,
        submission_deadline: currentTender.submission_deadline,
        status: status, // Only update the workflow status
        tender_status: currentTender.tender_status, // Preserve business status
        office_id: currentTender.office_id,
        wing_id: currentTender.wing_id,
        dec_id: currentTender.dec_id,
        tender_spot_type: currentTender.tender_spot_type,
        procurement_method: currentTender.procurement_method,
        publication_daily: currentTender.publication_daily,
        individual_total: currentTender.individual_total,
        actual_price_total: currentTender.actual_price_total
      };
      
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Tender status updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating tender status:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update tender status'
      };
    }
  },

  // Get tender statistics
  getStats: async (): Promise<ApiResponse<TenderStats>> => {
    try {
      const tendersResponse = await tendersLocalService.getAll();
      
      if (!tendersResponse.success || !tendersResponse.data) {
        throw new Error('Failed to fetch tenders for stats');
      }
      
      const tenders = tendersResponse.data;
      
      const stats: TenderStats = {
        totalTenders: tenders.length,
        activeTenders: tenders.filter(t => t.tender_status === 'Published').length,
        draftTenders: tenders.filter(t => t.status === 'Draft').length,
        closedTenders: tenders.filter(t => t.status === 'Closed').length,
        totalEstimatedValue: tenders.reduce((sum, t) => sum + t.estimatedValue, 0),
        contractTenders: tenders.filter(t => t.type === 'Contract/Tender').length,
        spotPurchases: tenders.filter(t => t.type === 'Petty Purchase').length,
      };
      
      return {
        success: true,
        data: stats,
        message: 'Tender stats calculated successfully'
      };
    } catch (error: any) {
      console.error('Error calculating tender stats:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to calculate tender stats'
      };
    }
  },

  // Update tender pricing mode
  updatePricingMode: async (id: string, pricingMode: 'Individual' | 'Total', totalPrice?: number): Promise<ApiResponse<Tender>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          individual_total: pricingMode,
          actual_price_total: pricingMode === 'Total' ? (totalPrice || 0) : null,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Tender pricing mode updated successfully'
      };
    } catch (error: any) {
      console.error('Error updating tender pricing mode:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to update tender pricing mode'
      };
    }
  },

  // Finalize tender
  finalize: async (id: string, finalizedBy: string): Promise<ApiResponse<Tender>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tenders/${id}/finalize`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalized_by: finalizedBy,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data,
        message: 'Tender finalized successfully'
      };
    } catch (error: any) {
      console.error('Error finalizing tender:', error);
      return {
        success: false,
        data: null as any,
        message: error.message || 'Failed to finalize tender'
      };
    }
  }
};
