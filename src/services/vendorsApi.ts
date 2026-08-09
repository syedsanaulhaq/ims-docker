
// API wrapper for vendor CRUD - Now using local SQL Server backend
import { vendorsLocalService } from './vendorsLocalService';
import { Vendor, CreateVendorRequest, UpdateVendorRequest } from '../types/vendor';

export const vendorsApi = {
  getVendors: vendorsLocalService.getVendors,
  createVendor: vendorsLocalService.createVendor,
  updateVendor: vendorsLocalService.updateVendor,
  deleteVendor: vendorsLocalService.deleteVendor,
  restoreVendor: vendorsLocalService.restoreVendor,
};
