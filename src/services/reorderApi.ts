
import { apiClient, ApiResponse } from './api';
import { ReorderRequest } from '@/hooks/useReorderRequests';

export interface CreateReorderRequestRequest {
  itemId: string;
  itemName: string;
  currentStock: number;
  minimumStock: number;
}

export const reorderApi = {
  getReorderRequests: (): Promise<ApiResponse<ReorderRequest[]>> =>
    apiClient.get('/reorder-requests'),

  createReorderRequest: (request: CreateReorderRequestRequest): Promise<ApiResponse<ReorderRequest>> =>
    apiClient.post('/reorder-requests', request),

  updateReorderRequestStatus: (id: string, status: ReorderRequest['status']): Promise<ApiResponse<ReorderRequest>> =>
    apiClient.put(`/reorder-requests/${id}/status`, { status }),

  deleteReorderRequest: (id: string): Promise<ApiResponse<void>> =>
    apiClient.delete(`/reorder-requests/${id}`),

  getPendingRequests: (): Promise<ApiResponse<ReorderRequest[]>> =>
    apiClient.get('/reorder-requests/pending'),

  getRequestForItem: (itemId: string): Promise<ApiResponse<ReorderRequest | null>> =>
    apiClient.get(`/reorder-requests/item/${itemId}`),
};
