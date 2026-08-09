import { useState, useEffect } from 'react';
import { z } from 'zod';
import { CreateTenderRequest } from '@/types/tender';

// Updated base form schema to match database structure
export const baseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  referenceNumber: z.string().min(1, "Reference number is required"),
  description: z.string().optional(),
  estimatedValue: z.number().min(0, "Estimated value must be positive"),
  publishDate: z.date(),
  submissionDate: z.date(),
  openingDate: z.date(),
  officeId: z.number().min(1, "Office is required"),
  wingId: z.number().optional(),
  decId: z.number().optional(),
  items: z.array(z.object({
    itemMasterId: z.string().min(1, "Item is required"),
    nomenclature: z.string().min(1, "Nomenclature is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    estimatedUnitPrice: z.number().min(0, "Unit price must be positive"),
    specifications: z.string().optional(),
    remarks: z.string().optional(),
  })).min(1, "At least one item is required"),
  selectedVendorId: z.string().optional(),
  vendor: z.object({
    vendorId: z.string().optional(),
    vendorName: z.string().optional(),
    contactPerson: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    contractValue: z.number().optional(),
    contractDate: z.date().optional(),
    remarks: z.string().optional(),
  }).optional(),
  // File upload fields
  rfpFile: z.any().optional(),
  contractCopyFile: z.any().optional(),
});

// Contract/Tender specific schema
export const contractTenderFormSchema = baseFormSchema.extend({
  publicationDate: z.date(),
  submissionDeadline: z.date(),
  eligibilityCriteria: z.string().optional(),
});

// Mock vendors data
export const mockVendors = [
  { 
    id: '1', 
    vendorName: 'ABC Electronics Ltd', 
    vendorCode: 'ABC001',
    contactPerson: 'John Doe', 
    email: 'john@abc.com',
    status: 'Active'
  },
  { 
    id: '2', 
    vendorName: 'XYZ Supplies Co', 
    vendorCode: 'XYZ002',
    contactPerson: 'Jane Smith', 
    email: 'jane@xyz.com',
    status: 'Active'
  },
  { 
    id: '3', 
    vendorName: 'Tech Solutions Inc', 
    vendorCode: 'TECH003',
    contactPerson: 'Mike Johnson', 
    email: 'mike@tech.com',
    status: 'Active'
  },
];

export const useVendorManagement = () => {
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');

  const handleVendorSelection = (vendorId: string, form: any, vendors?: any[]) => {

    setSelectedVendorId(vendorId);
    form.setValue('selectedVendorId', vendorId);
    
    if (vendorId === 'add-new') {
      setShowVendorForm(true);
      // Clear form for new vendor
      form.setValue('vendor', {
        vendorId: '',
        vendorName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        contractValue: 0,
        contractDate: new Date(),
        remarks: '',
      });
    } else if (vendorId === 'none' || !vendorId) {
      setShowVendorForm(false);
      // Clear form when no vendor selected
      form.setValue('vendor', {
        vendorId: '',
        vendorName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        contractValue: 0,
        contractDate: new Date(),
        remarks: '',
      });
    } else {
      setShowVendorForm(false);
      // Find and populate vendor data
      if (vendors && vendors.length > 0) {
        const selectedVendor = vendors.find(v => v.id.toString() === vendorId);
        if (selectedVendor) {

          const vendorData = {
            vendorId: selectedVendor.id,
            vendorName: selectedVendor.vendorName || '',
            contactPerson: selectedVendor.contactPerson || '',
            email: selectedVendor.email || '',
            phone: selectedVendor.phone || '',
            address: selectedVendor.address || '',
            contractValue: 0,
            contractDate: new Date(),
            remarks: '',
          };

          // Force form to trigger re-render by setting each field individually
          form.setValue('vendor.vendorId', vendorData.vendorId, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.vendorName', vendorData.vendorName, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.contactPerson', vendorData.contactPerson, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.email', vendorData.email, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.phone', vendorData.phone, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.address', vendorData.address, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.contractValue', vendorData.contractValue, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.contractDate', vendorData.contractDate, { shouldDirty: true, shouldTouch: true });
          form.setValue('vendor.remarks', vendorData.remarks, { shouldDirty: true, shouldTouch: true });
          
          // Also set the entire vendor object
          form.setValue('vendor', vendorData, { shouldDirty: true, shouldTouch: true });

        }
      }
    }
  };

  return {
    showVendorForm,
    selectedVendorId,
    handleVendorSelection,
  };
};

export const useFileUpload = () => {
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fieldName: string, form: any) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PDF, DOC, DOCX, JPG, and PNG files are allowed');
        return;
      }
      
      form.setValue(fieldName, file);
    }
  };

  return {
    handleFileUpload,
  };
};

export const convertFormToTenderRequest = (values: any, type: 'Contract/Tender' | 'Petty Purchase'): CreateTenderRequest => {
  // For Petty Purchase, use orderingDate for all date fields
  const publishDate = type === 'Petty Purchase' ? values.orderingDate : values.publishDate;
  const submissionDate = type === 'Petty Purchase' ? values.orderingDate : values.submissionDate;
  const openingDate = type === 'Petty Purchase' ? values.orderingDate : values.openingDate;

  return {
    tender_spot_type: type,
    type,
    title: values.title,
    referenceNumber: values.referenceNumber,
    description: values.description || '',
    estimatedValue: values.estimatedValue,
    publicationDate: publishDate.toISOString(),
    publishDate: publishDate.toISOString(),
    submissionDeadline: submissionDate.toISOString(),
    submissionDate: submissionDate.toISOString(),
    openingDate: openingDate.toISOString(),
    officeIds: values.officeIds || [],
    wingIds: values.wingIds || [],
    decIds: values.decIds || [],
    items: values.items.map((item: any) => ({
      itemMasterId: item.itemMasterId,
      nomenclature: item.nomenclature,
      quantity: item.quantity,
      estimatedUnitPrice: item.estimatedUnitPrice,
      specifications: item.specifications || '',
      remarks: item.remarks || '',
    })),
    vendor: values.selectedVendorId && values.selectedVendorId !== 'none' ? {
      vendorId: values.vendor?.vendorId || '',
      vendorName: values.vendor?.vendorName || '',
      contactPerson: values.vendor?.contactPerson || '',
      email: values.vendor?.email || '',
      phone: values.vendor?.phone || '',
      address: values.vendor?.address || '',
      contractValue: values.vendor?.contractValue || 0,
      contractDate: values.vendor?.contractDate?.toISOString() || new Date().toISOString(),
      remarks: values.vendor?.remarks || '',
    } : undefined,
  };
};
