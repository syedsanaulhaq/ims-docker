import { ApiResponse } from './api';
import { tendersLocalService } from './tendersLocalService';
import { Tender, CreateTenderRequest, TenderStats } from '@/types/tender';

// Tender API service using local SQL Server backend

export const tenderApi = {
  // Get all tenders
  getTenders: async (): Promise<ApiResponse<Tender[]>> => {
    
    return await tendersLocalService.getAll();
  },

  // Get single tender
  getTender: async (id: string): Promise<ApiResponse<Tender>> => {
    
    return await tendersLocalService.getById(id);
  },

  // Create tender
  createTender: async (tender: CreateTenderRequest): Promise<ApiResponse<Tender>> => {
    
    return await tendersLocalService.create(tender);
  },

  // Update tender
  updateTender: async (id: string, tender: Partial<CreateTenderRequest>): Promise<ApiResponse<Tender>> => {
    
    return await tendersLocalService.update(id, tender);
  },

  // Delete tender
  deleteTender: async (id: string): Promise<ApiResponse<void>> => {
    
    return await tendersLocalService.delete(id);
  },

  // Update tender status
  updateTenderStatus: async (id: string, status: Tender['status']): Promise<ApiResponse<Tender>> => {
    
    return await tendersLocalService.updateStatus(id, status);
  },

  // Get tender statistics
  getTenderStats: async (): Promise<ApiResponse<TenderStats>> => {
    
    return await tendersLocalService.getStats();
  },

  // Get active tenders
  getActiveTenders: async (): Promise<ApiResponse<Tender[]>> => {
    
    // Filter active tenders from all tenders
    const response = await tendersLocalService.getAll();
    if (response.success && response.data) {
      const activeTenders = response.data.filter(tender => tender.tender_status === 'Published');
      return { ...response, data: activeTenders };
    }
    return response;
  },

  // Publish tender
  publishTender: async (id: string): Promise<ApiResponse<Tender>> => {
    
    return await tendersLocalService.updateStatus(id, 'Published');
  },

  // Close tender
  closeTender: async (id: string): Promise<ApiResponse<Tender>> => {
    
    return await tendersLocalService.updateStatus(id, 'Closed');
  },
};
