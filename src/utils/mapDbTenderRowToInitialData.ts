// Utility to map a DB tender row (from CSV/DB) to the initialData shape expected by ContractTenderForm
// Usage: mapDbTenderRowToInitialData(dbRow, vendorName)

export function mapDbTenderRowToInitialData(dbRow: any, vendorName: string = ""): any {
  
  const initialData = {
    tender_id: dbRow.id,
    tender_spot_type: dbRow.tender_spot_type || dbRow.tender_type,
    title: dbRow.title,
    referenceNumber: dbRow.reference_number,
    description: dbRow.description,
    estimatedValue: Number(dbRow.estimated_value),
    publishDate: dbRow.publish_date ? new Date(dbRow.publish_date) : undefined,
    submissionDate: dbRow.submission_date ? new Date(dbRow.submission_date) : undefined,
    openingDate: dbRow.opening_date ? new Date(dbRow.opening_date) : undefined,
    eligibilityCriteria: dbRow.eligibility_criteria || '',
    officeIds: dbRow.office_ids ? JSON.parse(dbRow.office_ids) : [],
    wingIds: dbRow.wing_ids ? JSON.parse(dbRow.wing_ids) : [],
    decIds: dbRow.dec_ids ? JSON.parse(dbRow.dec_ids) : [],
    advertisementDate: dbRow.advertisement_date ? new Date(dbRow.advertisement_date) : undefined,
    publicationDailies: dbRow.publication_daily || '',
    procurementMethod: dbRow.procurement_method || '',
    biddingProcedure: dbRow.procedure_adopted || '',
    // Add tender_status, default to 'Open' if not present
    tender_status: dbRow.tender_status || 'Open',
    // Add more mappings as needed for your form
  };
  
  return initialData;
}
