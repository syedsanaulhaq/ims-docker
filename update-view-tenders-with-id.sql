-- Update View_tenders to include the id column
ALTER VIEW View_tenders AS
SELECT dbo.tenders.id, dbo.tenders.title, dbo.tenders.reference_number, dbo.tenders.description, dbo.tenders.estimated_value, dbo.tenders.publish_date, dbo.tenders.publication_date, dbo.tenders.submission_date, dbo.tenders.submission_deadline, 
                  dbo.tenders.opening_date, dbo.tenders.document_path, dbo.tenders.created_at, dbo.tenders.updated_at, dbo.tenders.created_by, dbo.tenders.advertisement_date, dbo.tenders.procedure_adopted, dbo.tenders.procurement_method, 
                  dbo.tenders.publication_daily, dbo.tenders.contract_file_path, dbo.tenders.loi_file_path, dbo.tenders.noting_file_path, dbo.tenders.po_file_path, dbo.tenders.rfp_file_path, dbo.tenders.tender_number, dbo.tenders.tender_type, 
                  dbo.tenders.office_ids, dbo.tenders.wing_ids, dbo.tenders.dec_ids, dbo.tenders.tender_spot_type, dbo.tenders.vendor_id, dbo.tenders.tender_status, dbo.tenders.individual_total, dbo.tenders.actual_price_total, dbo.tenders.is_finalized, 
                  dbo.tenders.finalized_at, dbo.tenders.finalized_by, dbo.tender_items.item_master_id, dbo.tender_items.nomenclature, dbo.tender_items.quantity, dbo.tender_items.estimated_unit_price, dbo.tender_items.total_amount, 
                  dbo.tender_items.specifications, dbo.tender_items.remarks, dbo.item_masters.category_id, dbo.item_masters.sub_category_id, dbo.vendors.vendor_name, dbo.vendors.vendor_code
FROM     dbo.vendors RIGHT OUTER JOIN
                  dbo.tenders ON dbo.vendors.id = dbo.tenders.vendor_id LEFT OUTER JOIN
                  dbo.item_masters RIGHT OUTER JOIN
                  dbo.tender_items ON dbo.item_masters.id = dbo.tender_items.item_master_id ON dbo.tenders.id = dbo.tender_items.tender_id;
