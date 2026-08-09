/**
 * ENHANCED APPROVAL SERVICE
 * 
 * Service for managing stock issuance request approvals with advanced inventory matching
 * and allocation capabilities using SQL Server backend
 */

import { getApiBaseUrl } from './invmisApi';

export interface ApprovalRequest {
  id: string;
  request_number: string;
  request_type: string;
  request_status: string;
  urgency_level: string;
  purpose: string;
  submitted_at: string;
  expected_return_date: string;
  is_returnable: boolean;
  requester_name: string;
  requester_email: string;
  requester_department: string;
  items: ApprovalItem[];
  total_items: number;
  total_quantity: number;
  total_value: number;
  has_custom_items?: boolean;
  inventory_items?: ApprovalItem[];
  custom_items?: ApprovalItem[];
  requester: {
    user_id: string;
    full_name: string;
    role: string;
    email: string;
    username: string;
  };
  office: {
    office_id: number;
    name: string;
    office_code: string;
  };
  wing: {
    wing_id: number;
    name: string;
    short_name: string;
    wing_code: string;
  };
  branch: {
    branch_id: string;
    dec_name: string;
  };
}

export interface ApprovalItem {
  id: string;
  item_master_id?: string;
  nomenclature: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_price: number;
  item_type: string;
  custom_item_name?: string;
  item_status: string;
  rejection_reason?: string;
}

export interface InventoryMatch {
  inventory_id: string;
  item_master_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  nomenclature: string;
  description: string;
  specifications: string;
  unit_of_measurement: string;
  category: string;
  subcategory: string;
  item_code: string;
  available_quantity: number;
  match_score: number;
}

export interface ItemWithMatches {
  requested_item_id: string;
  requested_nomenclature: string;
  requested_quantity: number;
  custom_item_name?: string;
  item_type: string;
  inventory_matches: InventoryMatch[];
  match_count: number;
  can_fulfill: boolean;
  total_available: number;
}

export interface InventoryMatchResponse {
  success: boolean;
  request_id: string;
  items_with_matches: ItemWithMatches[];
  summary: {
    total_requested_items: number;
    fully_fulfillable: number;
    partially_fulfillable: number;
    needs_procurement: number;
    fulfillment_rate: number;
  };
}

export interface AllocationDecision {
  requested_item_id: string;
  inventory_item_id?: string;
  allocated_quantity: number;
  decision_type: 'APPROVE_FROM_STOCK' | 'APPROVE_FOR_PROCUREMENT' | 'REJECT';
  rejection_reason?: string;
  procurement_required_quantity?: number;
}

export interface ApprovalAction {
  request_id: string;
  approver_name: string;
  approver_designation: string;
  approval_comments: string;
  item_allocations: AllocationDecision[];
}

export interface ApprovalItemOld {
  id: string;
  nomenclature: string;
  requested_quantity: number;
  approved_quantity?: number;
  unit_price: number;
  item_status: string;
  rejection_reason?: string;
  item_type: string;
  custom_item_name?: string;
  current_stock?: number;
  inventory_info?: any;
  stock_status?: 'sufficient' | 'insufficient' | 'out_of_stock' | 'unknown';
}

export interface ApprovalActionOld {
  request_id: string;
  action: 'approve' | 'reject';
  approver_name: string;
  approver_designation: string;
  approval_comments?: string;
  item_approvals?: ItemApproval[];
}

export interface ItemApproval {
  item_id: string;
  approved_quantity: number;
  rejection_reason?: string;
}

class ApprovalService {
  private baseUrl = `${getApiBaseUrl()}/stock-issuance`;

  async getPendingRequests(): Promise<ApprovalRequest[]> {
    try {
      const response = await fetch(`${this.baseUrl}/requests?status=Submitted`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Transform the data to match the expected interface
      const transformedRequests = (result.data || []).map((request: any) => {
        const items = request.items || [];
        
        return {
          id: request.id,
          request_number: request.request_number,
          request_type: request.request_type,
          request_status: request.request_status,
          urgency_level: request.urgency_level,
          purpose: request.purpose,
          submitted_at: request.submitted_at,
          expected_return_date: request.expected_return_date,
          is_returnable: request.is_returnable,
          requester_name: request.request_type === 'Individual' 
            ? request.requester?.full_name || 'Unknown User'
            : request.wing?.name || 'Unknown Wing',
          requester_email: request.requester?.email || '',
          requester_department: request.wing?.name || 'N/A',
          items: items.map((item: any) => ({
            id: item.id,
            nomenclature: item.nomenclature,
            requested_quantity: item.requested_quantity,
            approved_quantity: item.approved_quantity || 0,
            unit_price: item.unit_price || 0,
            item_status: item.item_status || 'Pending',
            rejection_reason: item.rejection_reason || '',
            item_type: item.item_type,
            custom_item_name: item.custom_item_name,
            current_stock: null, // Will be populated by inventory check
            inventory_info: null,
            stock_status: 'unknown' as const
          })),
          total_items: items.length || 0,
          total_quantity: items.reduce((sum: number, item: any) => sum + item.requested_quantity, 0) || 0,
          total_value: items.reduce((sum: number, item: any) => sum + (item.requested_quantity * (item.unit_price || 0)), 0) || 0,
          has_custom_items: items.some((item: any) => item.item_type === 'custom'),
          inventory_items: items.filter((item: any) => item.item_type === 'inventory'),
          custom_items: items.filter((item: any) => item.item_type === 'custom'),
          requester: request.requester || {
            user_id: '',
            full_name: 'Unknown User',
            role: 'User',
            email: '',
            username: ''
          },
          office: request.office || {
            office_id: 0,
            name: 'Unknown Office',
            office_code: 'N/A'
          },
          wing: request.wing || {
            wing_id: 0,
            name: 'Unknown Wing',
            short_name: 'N/A',
            wing_code: 'N/A'
          },
          branch: request.branch || {
            branch_id: '',
            dec_name: 'Unknown Branch'
          }
        };
      });

      return transformedRequests;
    } catch (error) {
      console.error('❌ Error fetching pending requests:', error);
      throw error;
    }
  }

  async getUnderReviewRequests(): Promise<ApprovalRequest[]> {
    try {
      const response = await fetch(`${this.baseUrl}/requests?status=Under Review`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      // Use same transformation logic as pending requests
      return this.transformRequestsData(result.data || []);
    } catch (error) {
      console.error('❌ Error fetching under review requests:', error);
      throw error;
    }
  }

  async approveRequest(approvalAction: ApprovalAction): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/${approvalAction.request_id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalAction),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || 'Request approved successfully'
      };
    } catch (error) {
      console.error('❌ Error approving request:', error);
      throw error;
    }
  }

  async rejectRequest(approvalAction: ApprovalAction): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/${approvalAction.request_id}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalAction),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        message: result.message || 'Request rejected successfully'
      };
    } catch (error) {
      console.error('❌ Error rejecting request:', error);
      throw error;
    }
  }

  private transformRequestsData(data: any[]): ApprovalRequest[] {
    return data.map((request: any) => {
      const items = request.items || [];
      
      return {
        id: request.id,
        request_number: request.request_number,
        request_type: request.request_type,
        request_status: request.request_status,
        urgency_level: request.urgency_level,
        purpose: request.purpose,
        submitted_at: request.submitted_at,
        expected_return_date: request.expected_return_date,
        is_returnable: request.is_returnable,
        requester_name: request.request_type === 'Individual' 
          ? request.requester?.full_name || 'Unknown User'
          : request.wing?.name || 'Unknown Wing',
        requester_email: request.requester?.email || '',
        requester_department: request.wing?.name || 'N/A',
        items: items.map((item: any) => ({
          id: item.id,
          nomenclature: item.nomenclature,
          requested_quantity: item.requested_quantity,
          approved_quantity: item.approved_quantity || 0,
          unit_price: item.unit_price || 0,
          item_status: item.item_status || 'Pending',
          rejection_reason: item.rejection_reason || '',
          item_type: item.item_type,
          custom_item_name: item.custom_item_name,
          current_stock: null,
          inventory_info: null,
          stock_status: 'unknown' as const
        })),
        total_items: items.length || 0,
        total_quantity: items.reduce((sum: number, item: any) => sum + item.requested_quantity, 0) || 0,
        total_value: items.reduce((sum: number, item: any) => sum + (item.requested_quantity * (item.unit_price || 0)), 0) || 0,
        has_custom_items: items.some((item: any) => item.item_type === 'custom'),
        inventory_items: items.filter((item: any) => item.item_type === 'inventory'),
        custom_items: items.filter((item: any) => item.item_type === 'custom'),
        requester: request.requester || {
          user_id: '',
          full_name: 'Unknown User',
          role: 'User',
          email: '',
          username: ''
        },
        office: request.office || {
          office_id: 0,
          name: 'Unknown Office',
          office_code: 'N/A'
        },
        wing: request.wing || {
          wing_id: 0,
          name: 'Unknown Wing',
          short_name: 'N/A',
          wing_code: 'N/A'
        },
        branch: request.branch || {
          branch_id: '',
          dec_name: 'Unknown Branch'
        }
      };
    });
  }

  // =============================================================================
  // ENHANCED APPROVAL METHODS
  // =============================================================================

  /**
   * Get inventory matches for a specific request
   */
  async getInventoryMatches(requestId: string): Promise<InventoryMatchResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/${requestId}/inventory-matches`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error fetching inventory matches:', error);
      throw error;
    }
  }

  /**
   * Approve request with specific inventory allocations
   */
  async approveWithAllocation(requestId: string, approvalAction: ApprovalAction): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/requests/${requestId}/approve-with-allocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalAction),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error approving with allocations:', error);
      throw error;
    }
  }
}

export default new ApprovalService();
export const approvalService = new ApprovalService();
