import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, Check, AlertCircle, ChevronDown, ChevronRight, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tender, TenderItem } from '@/types/tender';
import SerialNumberEntryDialog from './SerialNumberEntryDialog';
import { itemMasterApi } from '@/services/itemMasterApi';
import { itemSerialNumbersLocalService } from '@/services/itemSerialNumbersLocalService';
import { tendersLocalService } from '@/services/tendersLocalService';
import { stockTransactionsLocalService } from '@/services/stockTransactionsLocalService';

// Helper function to format date as dd/mm/yyyy
function formatDateDMY(dateStr?: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Define types for visit data
interface VisitDetails {
  visit_number: number;
  received_qty: number;
  actual_price: number;
  tender_qty: number;
  received_by: string;
  received_date: string;
  delivery_notes: string;
}

interface SerialNumberEntry {
  id: string;
  serialNumber: string;
  notes?: string;
}

interface TenderItemsAcquisitionProps {
  tender: Tender;
  onItemsUpdate: (items: TenderItem[]) => void;
  onAcquisitionComplete?: () => void;
}

const TenderItemsAcquisition: React.FC<TenderItemsAcquisitionProps> = ({ tender, onItemsUpdate, onAcquisitionComplete }) => {
  const { toast } = useToast();
  const [updatedItems, setUpdatedItems] = useState<TenderItem[]>(tender.items);
  const [showSerialDialog, setShowSerialDialog] = useState(false);
  const [selectedItemForSerial, setSelectedItemForSerial] = useState<TenderItem | null>(null);
  const [existingSerialNumbers, setExistingSerialNumbers] = useState<SerialNumberEntry[]>([]);
  const [itemDetails, setItemDetails] = useState<{ [key: string]: { 
    categoryName: string; 
    subCategoryName: string;
    specifications?: string;
    description?: string;
    unit?: string;
    itemCode?: string;
  } }>({});

  // New state for expandable rows
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [visitData, setVisitData] = useState<{ [itemId: string]: VisitDetails[] }>({});
  const [actualUnitPrices, setActualUnitPrices] = useState<{ [itemId: string]: number }>({});
  const [editingVisit, setEditingVisit] = useState<{ itemId: string; visitIndex: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [excludedItems, setExcludedItems] = useState<Set<string>>(new Set());

  // Update items when tender prop changes
  useEffect(() => {
    
    setUpdatedItems(tender.items);
    // Reset item details when tender changes
    setItemDetails({});
  }, [tender]);

  // Load visit data for all items on component mount
  useEffect(() => {
    const loadAllVisitData = async () => {
      try {
        const response = await stockTransactionsLocalService.getByTenderId(tender.id);
        
        if (!response.success) {
          return;
        }

        // Filter for 'IN' type transactions and get the data
        const data = response.data.filter(transaction => transaction.type === 'IN');

        // Group data by item_master_id
        const groupedData: { [itemId: string]: VisitDetails[] } = {};
        
        if (data && Array.isArray(data)) {
          data.forEach((row: any) => {
            const itemId = row.item_master_id;
            const visitNum = row.visit_number || 1;
            
            if (!groupedData[itemId]) {
              groupedData[itemId] = [];
            }
            
            const existingVisit = groupedData[itemId].find(v => v.visit_number === visitNum);
            if (!existingVisit) {
              groupedData[itemId].push({
                visit_number: visitNum,
                received_qty: row.received_qty || 0,
                actual_price: row.unit_price || 0,
                tender_qty: row.tender_qty || 0,
                received_by: row.received_by || '',
                received_date: row.received_date || new Date().toISOString().split('T')[0],
                delivery_notes: row.delivery_notes || ''
              });
            }
          });
          
          // Sort visits by visit_number for each item
          Object.keys(groupedData).forEach(itemId => {
            groupedData[itemId].sort((a, b) => a.visit_number - b.visit_number);
          });
        }

        setVisitData(groupedData);
        
        // Extract actual unit prices from visit data, but don't overwrite manual entries
        setActualUnitPrices(prev => {
          const newPrices = { ...prev };
          Object.keys(groupedData).forEach(itemId => {
            // Only set price from database if not manually entered
            if (!newPrices[itemId] && groupedData[itemId].length > 0) {
              newPrices[itemId] = groupedData[itemId][0].actual_price || 0;
            }
          });
          return newPrices;
        });
        
      } catch (error) {
        
      }
    };

    // Load visit data for all items when component mounts or tender changes
    if (tender && tender.items && tender.items.length > 0) {
      loadAllVisitData();
    }
  }, [tender.id]); // Re-run when tender ID changes

  // Load excluded items from database (items marked as not purchased)
  useEffect(() => {
    const loadExcludedItems = async () => {
      try {
        // Get the current tender data with items
        const response = await tendersLocalService.getById(tender.id);
        
        if (!response.success || !response.data) {
          return;
        }

        const tenderData = response.data;
        
        if (tenderData.items) {
          // Find items marked as excluded/not purchased (status 'Cancelled' with 'NOT_PURCHASED' in remarks)
          const excludedSet = new Set<string>();
          tenderData.items.forEach((item: any) => {
            if (item.status === 'Cancelled' && item.remarks && item.remarks.includes('NOT_PURCHASED')) {
              excludedSet.add(item.id);
            }
          });
          setExcludedItems(excludedSet);
        }
      } catch (error) {
        console.error('Error loading excluded items:', error);
      }
    };
    
    if (tender && tender.id) {
      loadExcludedItems();
    }
  }, [tender.id]);

  // Fetch item master details for categories and detailed information
  useEffect(() => {
    const fetchItemDetails = async () => {
      const details: { [key: string]: { 
        categoryName: string; 
        subCategoryName: string;
        specifications?: string;
        description?: string;
        unit?: string;
        itemCode?: string;
      } } = {};
      
      for (const item of tender.items) {
        try {
          
          const itemMaster = await itemMasterApi.getItemMaster(item.itemMasterId);
          
          if (itemMaster) {
            details[item.itemMasterId] = {
              categoryName: itemMaster.categoryName || 'Unknown',
              subCategoryName: itemMaster.subCategoryName || 'Unknown',
              specifications: itemMaster.specifications || '',
              description: itemMaster.description || '',
              unit: itemMaster.unit || 'PCS',
              itemCode: itemMaster.itemCode || ''
            };
          } else {
            
            details[item.itemMasterId] = {
              categoryName: 'Unknown',
              subCategoryName: 'Unknown',
              specifications: '',
              description: '',
              unit: 'PCS',
              itemCode: ''
            };
          }
        } catch (error) {
          
          if (!details[item.itemMasterId]) {
            details[item.itemMasterId] = {
              categoryName: 'Unknown',
              subCategoryName: 'Unknown',
              specifications: '',
              description: '',
              unit: 'PCS',
              itemCode: ''
            };
          }
        }
      }
      
      setItemDetails(details);
    };

    fetchItemDetails();
  }, [tender]);

  // Calculate item status based on total acquired vs tender estimate
  const getItemStatus = (item: TenderItem) => {
    const totalAcquired = visitData[item.id]?.reduce((sum, visit) => sum + (visit.received_qty || 0), 0) || 0;
    const tenderEstimate = item.quantity;
    
    if (totalAcquired === 0) return { status: 'Pending', variant: 'secondary' as const };
    if (totalAcquired < tenderEstimate) return { status: 'Partial', variant: 'destructive' as const };
    if (totalAcquired >= tenderEstimate) return { status: 'Completed', variant: 'default' as const };
  };

  const calculateTotalValue = () => {
    return updatedItems
      .filter(item => !excludedItems.has(item.id)) // Only include non-excluded items
      .reduce((total, item) => {
        // Only count items that have visit data with actual purchases
        if (!visitData[item.id] || visitData[item.id].length === 0) {
          return total; // No visits = no actual value yet
        }
        
        // Get total acquired quantity
        const totalAcquired = visitData[item.id].reduce((sum, visit) => sum + (visit.received_qty || 0), 0);
        
        // Get actual unit price from manual input or stock transactions
        const actualUnitPrice = actualUnitPrices[item.id] || 
          (visitData[item.id][0]?.actual_price || 0);
        
        // Calculate total actual value for this item
        const itemTotalValue = actualUnitPrice * totalAcquired;
        
        return total + itemTotalValue;
      }, 0);
  };

  // Toggle expandable row - only allow one row to be expanded at a time
  const toggleItemExpansion = (itemId: string) => {
    
    const newExpanded = new Set<string>();
    
    if (expandedItems.has(itemId)) {
      // If clicking on already expanded item, close it
      
      // newExpanded remains empty, so all items will be collapsed
    } else {
      // If clicking on collapsed item, expand only this one (close others)
      
      newExpanded.add(itemId);
      // Load visit data when expanding
      
      loadVisitData(itemId);
    }
    
    setExpandedItems(newExpanded);
  };

  // Load visit data for expanded item
  const loadVisitData = async (itemId: string) => {
    try {
      // Get stock transactions for this tender and item
      const response = await stockTransactionsLocalService.getByTenderId(tender.id);
      
      if (!response.success) {
        const errorMsg = 'Failed to load visit data: ' + response.message;
        setSaveError(errorMsg);
        toast({
          title: "Load Error",
          description: errorMsg,
          variant: "destructive",
        });
        return;
      }

      // Filter for this specific item and IN type transactions
      const data = response.data.filter(transaction => 
        transaction.item_master_id === itemId && 
        transaction.type === 'IN'
      );

      // Transform direct query result into visit format
      const groupedData: { [itemId: string]: VisitDetails[] } = {};
      
      if (data && Array.isArray(data)) {
        // Group by visit_number and transform
        const visitMap = new Map<number, VisitDetails>();
        
        data.forEach((row: any) => {
          const visitNum = row.visit_number || 1;
          
          if (!visitMap.has(visitNum)) {
            visitMap.set(visitNum, {
              visit_number: visitNum,
              received_qty: row.received_qty || 0,
              actual_price: row.unit_price || 0,
              tender_qty: row.tender_qty || 0,
              received_by: row.received_by || '',
              received_date: row.received_date || new Date().toISOString().split('T')[0],
              delivery_notes: row.delivery_notes || ''
            });
          }
        });
        
        groupedData[itemId] = Array.from(visitMap.values()).sort((a, b) => a.visit_number - b.visit_number);
      } else {
        // No existing visits, initialize empty array
        groupedData[itemId] = [];
      }
      
      setVisitData(prev => ({ ...prev, ...groupedData }));
      
      // Only update actual unit price if it's not already manually set
      if (groupedData[itemId] && groupedData[itemId].length > 0) {
        setActualUnitPrices(prev => {
          // Don't overwrite if user has manually set a price
          if (prev[itemId] && prev[itemId] > 0) {
            return prev; // Keep existing manual price
          }
          return {
            ...prev,
            [itemId]: groupedData[itemId][0].actual_price || 0
          };
        });
      }
      
    } catch (error) {
      
      const errorMsg = 'Failed to load visit data';
      setSaveError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  // Add new visit
  const addNewVisit = (itemId: string) => {
    const item = updatedItems.find(item => item.id === itemId);
    if (!item) return;
    
    // If no actual unit price is set yet, set it to the estimated unit price
    if (!actualUnitPrices[itemId] && (!visitData[itemId] || visitData[itemId].length === 0)) {
      const estimatedUnitPrice = item.estimatedUnitPrice / item.quantity;
      updateActualUnitPrice(itemId, estimatedUnitPrice);
    }
    
    // Get existing actual unit price from manual input, first visit, or estimated
    const existingActualPrice = actualUnitPrices[itemId] || 
      (visitData[itemId]?.length > 0 && visitData[itemId][0]?.actual_price 
        ? visitData[itemId][0].actual_price
        : item.estimatedUnitPrice / item.quantity);
    
    const newVisit: VisitDetails = {
      visit_number: (visitData[itemId]?.length || 0) + 1,
      received_qty: 0,
      actual_price: existingActualPrice, // Use consistent unit price across all visits
      tender_qty: item.quantity,
      received_by: '',
      received_date: new Date().toISOString().split('T')[0],
      delivery_notes: ''
    };
    
    setVisitData(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), newVisit]
    }));
    
    // Automatically set this visit to editing mode
    setEditingVisit({ itemId, visitIndex: (visitData[itemId]?.length || 0) });
  };

  // Save visit details
  const saveVisitDetails = async (itemId: string, visitIndex: number, visitDetails: VisitDetails) => {
    try {
      setSaving(true);
      setSaveError(null);
      
      // Validate required fields
      if (!visitDetails.received_qty || visitDetails.received_qty <= 0) {
        const errorMsg = 'Please enter a valid received quantity';
        setSaveError(errorMsg);
        toast({
          title: "Validation Error",
          description: errorMsg,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      
      if (!visitDetails.received_by || visitDetails.received_by.trim() === '') {
        const errorMsg = 'Please enter who received the items';
        setSaveError(errorMsg);
        toast({
          title: "Validation Error",
          description: errorMsg,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      const transactionData = {
        item_master_id: itemId,
        office_id: '1', // Default office ID - should be dynamic based on user context
        transaction_type: 'IN' as const,
        quantity: visitDetails.received_qty || 0,
        unit_price: visitDetails.actual_price || 0,
        total_value: (visitDetails.received_qty || 0) * (visitDetails.actual_price || 0),
        reference_type: 'TENDER',
        reference_id: tender.id,
        reference_number: tender.referenceNumber,
        remarks: `Visit ${visitDetails.visit_number || visitIndex + 1}: ${visitDetails.delivery_notes || ''}`,
        transaction_date: visitDetails.received_date || new Date().toISOString().split('T')[0],
        created_by: visitDetails.received_by || 'System'
      };
      
      // Create or update the stock transaction
      const response = await stockTransactionsLocalService.createWithResponse(transactionData);
      
      if (!response.success) {
        const errorMsg = 'Failed to save visit details: ' + response.message;
        setSaveError(errorMsg);
        toast({
          title: "Save Error",
          description: errorMsg,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      
      // Update local state
      setVisitData(prev => {
        const newData = { ...prev };
        if (!newData[itemId]) newData[itemId] = [];
        newData[itemId][visitIndex] = visitDetails;
        return newData;
      });
      
      setEditingVisit(null);
      setSaveError(null);
      
      // Show success message
      toast({
        title: "Success",
        description: `Visit ${visitDetails.visit_number} saved successfully`,
        variant: "default",
      });
      
      // Reload visit data to get fresh data
      await loadVisitData(itemId);
      
    } catch (error) {
      
      const errorMsg = 'Failed to save visit details: ' + (error as Error).message;
      setSaveError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove visit details
  const removeVisitDetails = async (itemId: string, visitIndex: number, visit: VisitDetails) => {
    try {
      // Show confirmation dialog
      const confirmed = window.confirm(
        `Are you sure you want to remove Visit #${visit.visit_number || visitIndex + 1}?\nThis action cannot be undone.`
      );
      
      if (!confirmed) return;
      
      setSaving(true);
      setSaveError(null);
      
      // If this visit was saved to database (has a visit_number), delete it from DB
      if (visit.visit_number) {
        // Find the transaction to delete
        const transactionsResponse = await stockTransactionsLocalService.getByTenderId(tender.id);
        
        if (transactionsResponse.success) {
          const transactionToDelete = transactionsResponse.data.find(t => 
            t.item_master_id === itemId && 
            t.visit_number === visit.visit_number && 
            t.type === 'IN'
          );
          
          if (transactionToDelete) {
            const deleteResponse = await stockTransactionsLocalService.delete(transactionToDelete.id);
            
            if (!deleteResponse.success) {
              toast({
                title: "Error",
                description: "Failed to remove visit from database: " + deleteResponse.message,
                variant: "destructive",
              });
              return;
            }
          }
        }
      }
      
      // Remove from local state
      setVisitData(prev => {
        const newData = { ...prev };
        if (newData[itemId]) {
          newData[itemId] = newData[itemId].filter((_, index) => index !== visitIndex);
          // If no visits left, remove the item key
          if (newData[itemId].length === 0) {
            delete newData[itemId];
          }
        }
        return newData;
      });
      
      // Clear editing state if we were editing this visit
      if (editingVisit?.itemId === itemId && editingVisit?.visitIndex === visitIndex) {
        setEditingVisit(null);
      }
      
      // Show success message
      toast({
        title: "Success",
        description: `Visit #${visit.visit_number || visitIndex + 1} removed successfully`,
        variant: "default",
      });
      
      // Reload visit data to ensure consistency
      await loadVisitData(itemId);
      
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Failed to remove visit: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Remove item from acquisition (soft delete - mark as excluded)
  const removeItemFromAcquisition = async (item: TenderItem) => {
    try {
      // Enhanced confirmation dialog
      const confirmed = window.confirm(
        `⚠️ EXCLUDE ITEM FROM ACQUISITION ⚠️\n\nItem: "${item.nomenclature}"\n\n❌ This will:\n• Mark the item as not purchased\n• Hide it from the acquisition list\n• Preserve all data for potential restoration\n\n✅ Use this when:\n• Item was cancelled by vendor\n• Item not actually purchased\n• Budget constraints prevented purchase\n\n🔄 You can restore this item later if needed.\n\nProceed with exclusion?`
      );
      
      if (!confirmed) return;
      
      setSaving(true);
      
      // Add to excluded items set (soft delete)
      setExcludedItems(prev => new Set(prev).add(item.id));
      
      // Remove from visit data for UI purposes
      setVisitData(prev => {
        const newData = { ...prev };
        delete newData[item.id];
        return newData;
      });
      
      // Clear expanded state
      setExpandedItems(prev => {
        const newExpanded = new Set(prev);
        newExpanded.delete(item.id);
        return newExpanded;
      });
      
      // Mark in database as excluded - update the tender item status
      try {
        // Get current tender data
        const tenderResponse = await tendersLocalService.getById(tender.id);
        
        if (!tenderResponse.success) {
          throw new Error('Failed to get tender data');
        }

        // This would typically require a specific tender item update endpoint
        // For now, we'll just update the local state and show a warning
        toast({
          title: "Item Excluded",
          description: `"${item.nomenclature}" has been excluded from acquisition locally. Note: Database update requires tender item management endpoint.`,
          variant: "default",
        });
        
      } catch (error) {
        // Revert the exclusion on error
        setExcludedItems(prev => {
          const updated = new Set(prev);
          updated.delete(item.id);
          return updated;
        });
        toast({
          title: "Error",
          description: "Failed to exclude item: " + (error as Error).message,
          variant: "destructive",
        });
        return;
      }
      
    } catch (error) {
      
      // Revert the exclusion on error
      setExcludedItems(prev => {
        const updated = new Set(prev);
        updated.delete(item.id);
        return updated;
      });
      toast({
        title: "Error",
        description: "Failed to exclude item: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Restore excluded item (undo soft delete)
  const restoreItem = async (itemId: string) => {
    try {
      setSaving(true);
      
      // Find the item details
      const item = tender.items.find(i => i.id === itemId);
      if (!item) return;
      
      // Remove from excluded items set
      setExcludedItems(prev => {
        const updated = new Set(prev);
        updated.delete(itemId);
        return updated;
      });
      
      // Remove the exclusion mark from database
      try {
        // This would typically require a specific tender item update endpoint
        // For now, we'll just update the local state and show a message
        toast({
          title: "Item Restored",
          description: `"${item.nomenclature}" has been restored to the acquisition locally. Note: Database update requires tender item management endpoint.`,
          variant: "default",
        });
        
      } catch (error) {
        // Revert the restoration on error
        setExcludedItems(prev => new Set(prev).add(itemId));
        toast({
          title: "Error",
          description: "Failed to restore item: " + (error as Error).message,
          variant: "destructive",
        });
        return;
      }
      
    } catch (error) {
      
      // Revert the restoration on error
      setExcludedItems(prev => new Set(prev).add(itemId));
      toast({
        title: "Error",
        description: "Failed to restore item: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Update visit field
  const updateVisitField = (itemId: string, visitIndex: number, field: keyof VisitDetails, value: string | number) => {
    setVisitData(prev => {
      const newData = { ...prev };
      if (!newData[itemId]) newData[itemId] = [];
      if (!newData[itemId][visitIndex]) {
        newData[itemId][visitIndex] = {
          visit_number: visitIndex + 1,
          received_qty: 0,
          actual_price: 0,
          tender_qty: 0,
          received_by: '',
          received_date: new Date().toISOString().split('T')[0],
          delivery_notes: ''
        };
      }
      newData[itemId][visitIndex] = { ...newData[itemId][visitIndex], [field]: value };
      return newData;
    });
  };

  // Update actual unit price for an item (applies to all visits)
  const updateActualUnitPrice = (itemId: string, newUnitPrice: number) => {
    // Update the separate state for actual unit prices
    setActualUnitPrices(prev => ({
      ...prev,
      [itemId]: newUnitPrice
    }));
    
    // Also update existing visit data if any
    setVisitData(prev => {
      const newData = { ...prev };
      if (newData[itemId]) {
        // Update actual_price for all visits of this item
        newData[itemId] = newData[itemId].map(visit => ({
          ...visit,
          actual_price: newUnitPrice
        }));
      }
      return newData;
    });
  };

  const handleAddSerialNumbers = async (item: TenderItem) => {
    try {
      const existingSerials = await itemSerialNumbersLocalService.getByTenderItemId(item.id);

      // Convert ItemSerialNumber[] to SerialNumberEntry[]
      const convertedSerials: SerialNumberEntry[] = (existingSerials || []).map(serial => ({
        id: serial.id,
        serialNumber: serial.serial_number,
        notes: serial.remarks || ''
      }));
      
      setExistingSerialNumbers(convertedSerials);
    } catch (error) {
      console.error('Error loading serial numbers:', error);
      setExistingSerialNumbers([]);
    }
    
    setSelectedItemForSerial(item);
    setShowSerialDialog(true);
  };

  const handleSerialNumbersSaved = async (serialNumbers: SerialNumberEntry[]) => {
    if (!selectedItemForSerial) return;
    
    try {
      // Convert SerialNumberEntry[] to the format expected by the service
      const serialsToSave = serialNumbers.map(sn => ({
        tender_item_id: selectedItemForSerial.id,
        serial_number: sn.serialNumber,
        remarks: sn.notes || ''
      }));
      
      await itemSerialNumbersLocalService.createMany(serialsToSave);

      toast({
        title: "Success",
        description: "Serial numbers saved successfully",
        variant: "default",
      });
    } catch (error) {
      console.error('Error saving serial numbers:', error);
      const errorMsg = 'Failed to save serial numbers: ' + (error as Error).message;
      setSaveError(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const handleCompleteAcquisition = async () => {
    setSaving(true);
    setSaveError(null);
    
    try {
      // Here you could add any final processing

      if (onAcquisitionComplete) {
        onAcquisitionComplete();
      }
    } catch (error) {
      
      setSaveError('Failed to complete acquisition');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TooltipProvider>
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>Tender Items Acquisition</span>
        </CardTitle>
        <CardDescription>
          Record received quantities and actual prices for tender: {tender.tenderNumber}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {saveError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-700 text-sm">{saveError}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSaveError(null)}
              className="ml-auto h-6 w-6 p-0 text-red-600 hover:text-red-800"
            >
              ×
            </Button>
          </div>
        )}
        
        {/* Excluded items management section */}
        {excludedItems.size > 0 && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-orange-700 text-sm font-medium">
                {excludedItems.size} item(s) excluded from acquisition
              </span>
            </div>
            <div className="text-orange-600 text-xs mb-2">
              These items are marked as not purchased but data is preserved.
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from(excludedItems).map(itemId => {
                const item = tender.items.find(i => i.id === itemId);
                if (!item) return null;
                return (
                  <div key={itemId} className="flex items-center space-x-2 bg-white rounded px-2 py-1 border border-orange-200">
                    <span className="text-xs text-gray-700">{item.nomenclature}</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => restoreItem(itemId)}
                      className="h-5 w-5 p-0 text-green-600 hover:text-green-800"
                      disabled={saving}
                      title="Restore this item to acquisition"
                    >
                      🔄
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Items</p>
              <p className="text-2xl font-bold text-blue-600">{tender.items.length - excludedItems.size}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Estimated Value</p>
              <p className="text-2xl font-bold text-gray-600">{new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR'
              }).format(tender.estimatedValue)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Actual Value</p>
              <p className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('en-PK', {
                style: 'currency',
                currency: 'PKR'
              }).format(calculateTotalValue())}</p>
            </div>
          </div>

          {/* Table container */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader className="bg-white">
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tender Estimate</TableHead>
                  <TableHead>Total Acquired</TableHead>
                  <TableHead>Est. Unit Price</TableHead>
                  <TableHead>Actual Unit Price</TableHead>
                  <TableHead>Actual Total Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead>Visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {updatedItems.filter(item => !excludedItems.has(item.id)).flatMap((item) => {
                  const { status, variant } = getItemStatus(item);
                  const itemDetail = itemDetails[item.itemMasterId] || { 
                    categoryName: 'Loading...', 
                    subCategoryName: 'Loading...',
                    specifications: '',
                    description: '',
                    unit: 'PCS',
                    itemCode: ''
                  };
                  
                  const totalAcquired = visitData[item.id]?.reduce((sum, visit) => sum + (visit.received_qty || 0), 0) || 0;
                  
                  // Calculate actual unit price from stock transactions or manual input
                  const actualUnitPrice = actualUnitPrices[item.id] || 
                    (visitData[item.id]?.length > 0 && visitData[item.id][0]?.actual_price 
                      ? visitData[item.id][0].actual_price // Use the unit_price from stock_transactions table
                      : 0);
                  
                  // Calculate total actual value (actual unit price × total acquired quantity)
                  const totalActualValue = actualUnitPrice * totalAcquired;
                  
                  // Estimated unit price from tender item
                  const estimatedUnitPrice = item.estimatedUnitPrice / item.quantity;
                  
                  const rows = [
                    <TableRow key={`main-${item.id}`} className="border-b">
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="font-medium cursor-help hover:text-blue-600 transition-colors">
                              {item.nomenclature}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs">
                              <div className="space-y-1">
                                <p><strong>Code:</strong> {itemDetail.itemCode}</p>
                                <p><strong>Unit:</strong> {itemDetail.unit}</p>
                                {itemDetail.specifications && (
                                  <p><strong>Specs:</strong> {itemDetail.specifications}</p>
                                )}
                                {itemDetail.description && (
                                  <p><strong>Description:</strong> {itemDetail.description}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{itemDetail.categoryName}</div>
                            <div className="text-gray-500">{itemDetail.subCategoryName}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-blue-600">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          {totalAcquired}
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat('en-PK', {
                            style: 'currency',
                            currency: 'PKR'
                          }).format(estimatedUnitPrice)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Enter actual unit price"
                              value={actualUnitPrice > 0 ? actualUnitPrice : ''}
                              className="h-8 w-32"
                              onChange={(e) => {
                                const newPrice = parseFloat(e.target.value) || 0;
                                if (newPrice >= 0) { // Allow 0 to clear the field
                                  updateActualUnitPrice(item.id, newPrice);
                                }
                              }}
                            />
                            {actualUnitPrice > 0 && (
                              <div className="text-xs text-green-600">
                                {new Intl.NumberFormat('en-PK', {
                                  style: 'currency',
                                  currency: 'PKR'
                                }).format(actualUnitPrice)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {totalActualValue > 0 
                            ? new Intl.NumberFormat('en-PK', {
                                style: 'currency',
                                currency: 'PKR'
                              }).format(totalActualValue)
                            : new Intl.NumberFormat('en-PK', {
                                style: 'currency',
                                currency: 'PKR'
                              }).format(0)
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant}>{status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {visitData[item.id] && visitData[item.id].length > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddSerialNumbers(item)}
                                disabled={!visitData[item.id]?.some(v => v.received_qty > 0)}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Serial #
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeItemFromAcquisition(item)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={saving}
                              title="Remove item from acquisition (item not purchased)"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleItemExpansion(item.id)}
                            aria-label={expandedItems.has(item.id) ? 'Collapse' : 'Expand'}
                          >
                            {expandedItems.has(item.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>,
                      
                      // Expandable Row for Visit Details (conditional)
                      ...(expandedItems.has(item.id) ? [
                        <TableRow key={`expanded-${item.id}`}>
                          <TableCell colSpan={10} className="p-0">
                            <div className="bg-gray-50 p-4 border-t">
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium text-gray-900">
                                    Visit Details for {item.nomenclature}
                                  </h4>
                                  <Button
                                    size="sm"
                                    onClick={() => addNewVisit(item.id)}
                                    className="bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Visit
                                  </Button>
                                </div>
                                
                                {/* Item-level pricing info */}
                                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-sm font-medium text-blue-800">
                                        Item Unit Price: 
                                      </span>
                                      <span className="text-sm font-bold text-blue-900 ml-2">
                                        {new Intl.NumberFormat('en-PK', {
                                          style: 'currency',
                                          currency: 'PKR'
                                        }).format(actualUnitPrice)}
                                      </span>
                                    </div>
                                    <div className="text-xs text-blue-600">
                                      Applied to all visits • Set at item level
                                    </div>
                                  </div>
                                </div>
                                
                                {visitData[item.id] && visitData[item.id].length > 0 ? (
                                  <div className="space-y-2">
                                    {visitData[item.id].map((visit: VisitDetails, index: number) => {
                                      const isEditing = editingVisit?.itemId === item.id && editingVisit?.visitIndex === index;
                                      
                                      return (
                                        <div key={index} className="bg-white p-3 rounded border shadow-sm">
                                          <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-medium text-blue-600 text-sm">
                                              Visit #{visit.visit_number || index + 1}
                                            </h5>
                                            <div className="flex space-x-2">
                                              {!isEditing ? (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingVisit({ itemId: item.id, visitIndex: index })}
                                                  >
                                                    Edit
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => removeVisitDetails(item.id, index, visit)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    disabled={saving}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </>
                                              ) : (
                                                <>
                                                  <Button
                                                    size="sm"
                                                    onClick={() => saveVisitDetails(item.id, index, visit)}
                                                    className="bg-green-600 hover:bg-green-700"
                                                    disabled={saving}
                                                  >
                                                    Save
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingVisit(null)}
                                                  >
                                                    Cancel
                                                  </Button>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                          
                                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Visit Qty
                                              </label>
                                              {isEditing ? (
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  value={visit.received_qty || 0}
                                                  onChange={(e) => updateVisitField(item.id, index, 'received_qty', parseInt(e.target.value) || 0)}
                                                  className="h-8"
                                                  placeholder="Qty for this visit"
                                                />
                                              ) : (
                                                <div className="font-medium text-blue-600">
                                                  {visit.received_qty || 0}
                                                </div>
                                              )}
                                            </div>
                                            
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Received By
                                              </label>
                                              {isEditing ? (
                                                <Input
                                                  value={visit.received_by || ''}
                                                  onChange={(e) => updateVisitField(item.id, index, 'received_by', e.target.value)}
                                                  placeholder="Person name"
                                                  className="h-8"
                                                />
                                              ) : (
                                                <div>{visit.received_by || 'Not specified'}</div>
                                              )}
                                            </div>
                                            
                                            <div>
                                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Received Date
                                              </label>
                                              {isEditing ? (
                                                <Input
                                                  type="date"
                                                  value={visit.received_date ? visit.received_date.split('T')[0] : ''}
                                                  onChange={(e) => updateVisitField(item.id, index, 'received_date', e.target.value)}
                                                  className="h-8"
                                                />
                                              ) : (
                                                <div>
                                                  {visit.received_date ? formatDateDMY(visit.received_date) : 'Not specified'}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Visit Value Calculation */}
                                          {!isEditing && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded">
                                              <span className="text-xs text-gray-600 font-medium">Visit Value: </span>
                                              <span className="text-sm font-bold text-green-600">
                                                {new Intl.NumberFormat('en-PK', {
                                                  style: 'currency',
                                                  currency: 'PKR'
                                                }).format((visit.received_qty || 0) * actualUnitPrice)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-gray-500">
                                    No visits recorded yet. Click "Add Visit" to start.
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ] : [])
                    ];
                    
                    return rows;
                  })}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" disabled={saving}>
              Save Draft
            </Button>
            <Button onClick={handleCompleteAcquisition} disabled={saving}>
              <Check className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Complete Acquisition'}
            </Button>
          </div>
          {saveError && <div className="text-red-600 text-sm mt-2">{saveError}</div>}
        </div>

        {/* Serial Number Dialog */}
        {selectedItemForSerial && (
          <SerialNumberEntryDialog
            open={showSerialDialog}
            onClose={() => setShowSerialDialog(false)}
            itemName={selectedItemForSerial.nomenclature}
            requiredQuantity={selectedItemForSerial.quantityReceived || 0}
            onSave={handleSerialNumbersSaved}
            existingSerialNumbers={existingSerialNumbers}
          />
        )}
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default TenderItemsAcquisition;
export { TenderItemsAcquisition };
