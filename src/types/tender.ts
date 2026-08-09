
export interface Tender {
  procurementMethod?: string;
  biddingProcedure?: string;
  advertisementDate?: string;
  publicationDailies?: string;
  id: string;
  tenderNumber: string;
  referenceNumber: string;
  title: string;
  description?: string;
  estimatedValue: number;
  publishDate: string;
  publicationDate: string;
  submissionDate: string;
  submissionDeadline: string;
  openingDate: string;
  status: 'Draft' | 'Published' | 'Closed' | 'Awarded' | 'Cancelled';
  tender_status?: 'Draft' | 'Published' | 'Closed' | 'Awarded' | 'Cancelled';
  vendor_id?: string;
  eligibilityCriteria?: string;
  rfp?: string;
  contract?: string;
  documentPath?: string;
  uploadedDocs?: TenderDocument[];
  createdAt: string;
  updatedAt: string;
  items: TenderItem[];
  itemCount?: number; // Count of items for list display
  type: 'Contract/Tender' | 'Petty Purchase';
  vendor?: VendorInfo;
  // Pricing mode fields
  individual_total?: 'Individual' | 'Total';
  actual_price_total?: number;
  // Finalization fields
  is_finalized?: boolean;
  finalized_at?: string;
  finalized_by?: string;
  // Multi-select hierarchy fields
  officeIds?: string[];
  wingIds?: string[];
  decIds?: string[];
  // Hierarchy fields for display
  officeName?: string;
  wingName?: string;
  decName?: string;
  hierarchyPath?: string;
  // File path fields for uploaded documents
  rfp_file_path?: string;
  contract_file_path?: string;
  loi_file_path?: string;
  po_file_path?: string;
  noting_file_path?: string;
}

export interface VendorInfo {
  vendorId?: string;
  vendorName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  contractValue?: number;
  contractDate?: string;
  remarks?: string;
}

export interface TenderDocument {
  id: string;
  name: string;
  type: 'RFP' | 'Letter of Intent' | 'Purchase Order' | 'Contract Copy' | 'Minutes of Meeting';
  url: string;
  uploadedAt: string;
}

// Updated TenderItem to use ItemMaster reference
export interface TenderItem {
  id: string;
  tenderId: string;
  itemMasterId: string;
  nomenclature: string;
  quantity: number;
  quantityReceived?: number;
  estimatedUnitPrice: number;
  actualUnitPrice?: number;
  totalAmount?: number;
  specifications?: string;
  remarks?: string;
  status?: string;
  stockTransactions?: StockTransaction[];
}

export interface StockTransaction {
  id: string;
  date: string;
  type: 'IN' | 'OUT';
  item: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  vendor?: string;
  department?: string;
  tender_ref?: string;
  remarks?: string;
}

export interface CreateTenderRequest {
  // File path fields for uploaded documents
  rfp_file_path?: string;
  contract_file_path?: string;
  loi_file_path?: string;
  po_file_path?: string;
  noting_file_path?: string;
  tender_id?: string; // For update/edit
  tender_status?: string; // For DB field
  created_by?: string; // User who created the tender
  is_finalized?: boolean; // Status indicating if tender is finalized
  procurementMethod?: string;
  biddingProcedure?: string;
  advertisementDate?: string;
  publicationDailies?: string;
  status?: string; // Added for backend compatibility
  tender_spot_type: 'Contract/Tender' | 'Petty Purchase';
  tenderNumber?: string;
  referenceNumber: string;
  title: string;
  description?: string;
  estimatedValue: number;
  publishDate: string;
  publicationDate: string;
  submissionDate: string;
  submissionDeadline: string;
  /**
   * The vendor ID associated with the tender. Optional for draft creation, required for award/finalization.
   */
  vendor_id?: string;
  openingDate: string;
  eligibilityCriteria?: string;
  rfp?: string;
  contract?: string;
  type?: 'Contract/Tender' | 'Petty Purchase';
  items: CreateTenderItemRequest[];
  vendor?: VendorInfo;
  // Multi-select hierarchy fields
  officeIds?: string[];
  wingIds?: string[];
  decIds?: string[];
}

// Updated to use ItemMaster reference
export interface CreateTenderItemRequest {
  itemMasterId: string;
  nomenclature: string;
  quantity: number;
  estimatedUnitPrice: number;
  specifications?: string;
  remarks?: string;
}

export interface TenderStats {
  totalTenders: number;
  activeTenders: number;
  draftTenders: number;
  closedTenders: number;
  totalEstimatedValue: number;
  contractTenders: number;
  spotPurchases: number;
}

// Add ItemMaster interface
export interface ItemMaster {
  id: string;
  itemCode: string;
  nomenclature: string;
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
  unit: string;
  specifications?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemMasterRequest {
  itemCode: string;
  nomenclature: string;
  categoryId: string;
  subCategoryId: string;
  unit: string;
  specifications?: string;
  description?: string;
}

// Add interfaces for Office/Wing/DEC hierarchy
export interface Wing {
  id: number;
  name: string;
  shortName: string;
  focalPerson?: string;
  contactNo?: string;
  officeId?: number;
  isActive: boolean;
  hodId?: string;
  hodName?: string;
  wingCode?: number;
}

export interface DecMaster {
  intAutoId: number;
  wingId?: number;
  decName?: string;
  decAcronym?: string;
  decAddress?: string;
  location?: string;
  isActive: boolean;
  dateAdded?: string;
  decCode?: number;
  hodId?: string;
  hodName?: string;
}

export interface Office {
  officeId: string;
  officeName?: string;
  brDec?: string;
  hod?: string;
  wingRec?: string;
  hodId?: string;
  wingId?: number;
}
