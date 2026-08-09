import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Calendar, CalendarIcon, ChevronDown, Trash2, Plus, Edit, Save, X, Package, Truck, TrendingUp, FileText, Hash, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenderData } from '@/hooks/useTenderData';
import { Tender, TenderItem } from '@/types/tender';
import { stockTransactionsLocalService } from '@/services/stockTransactionsLocalService';
import { DeliveryLocalService } from '@/services/deliveryLocalService';
import SerialNumberEntryDialog from './SerialNumberEntryDialog';
import { deliveryItemSerialNumbersService } from '@/services/deliveryItemSerialNumbersService';
import { tendersLocalService } from '@/services/tendersLocalService';
import { stockTransactionsCleanLocalService } from '@/services/stockTransactionsCleanLocalService';

// Local interface for stock transaction items (matching API response)
interface StockTransactionItem {
  id?: string;
  tender_id: string;
  item_master_id: string;
  estimated_unit_price?: number;
  actual_unit_price?: number;
  pricing_confirmed?: boolean;
  quantity?: number;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  nomenclature?: string;
  specifications?: string;
}

// Helper function to format currency (same as original)
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Helper function to format date to dd/mm/yyyy
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Delivery interfaces (matching original)
interface DeliveryItem {
  id?: string;
  item_master_id: string;
  item_name: string;
  delivery_qty: number;
  unit_price?: number;
}

interface DeliveryRecord {
  id: string;
  delivery_number: number;
  tender_id: string;
  delivery_items: DeliveryItem[];
  delivery_personnel: string;
  delivery_date: string;
  delivery_notes?: string;
  delivery_chalan?: string;
  chalan_file_path?: string;
  total_amount?: number;
  created_at: string;
  updated_at: string;
}

const TransactionManager: React.FC = () => {
  const { toast } = useToast();
  const { tenders, isLoading } = useTenderData();
  const navigate = useNavigate();
  const { tenderId } = useParams<{ tenderId: string }>();
  
  // State management (matching original)
  const [selectedTenderId, setSelectedTenderId] = useState<string>(tenderId || '');
  const [selectedTenderWithItems, setSelectedTenderWithItems] = useState<Tender | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [actualPrices, setActualPrices] = useState<Record<string, number>>({});
  const [showDeliveryManager, setShowDeliveryManager] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Pricing mode state
  const [pricingMode, setPricingMode] = useState<'Individual' | 'Total'>('Individual');
  const [totalActualPrice, setTotalActualPrice] = useState<number>(0);
  
  // Stock transaction management
  const [stockTransactionItems, setStockTransactionItems] = useState<StockTransactionItem[]>([]);
  const [isStockTransactionInitialized, setIsStockTransactionInitialized] = useState(false);
  
  // Track deleted items for this transaction
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set());
  
  // Serial number management
  const [showSerialNumberDialog, setShowSerialNumberDialog] = useState(false);
  const [selectedDeliveryItem, setSelectedDeliveryItem] = useState<{
    deliveryId: string;
    deliveryItemId: string;
    itemMasterId: string;
    itemName: string;
    deliveredQty: number;
    existingSerialNumbers?: Array<{
      id: string;
      serialNumber: string;
      notes?: string;
    }>;
  } | null>(null);
  
  // Delivery form state
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState<DeliveryRecord | null>(null);
  const [showRemovedItems, setShowRemovedItems] = useState(false);
  const [newDelivery, setNewDelivery] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    delivery_personnel: '',
    delivery_notes: '',
    delivery_chalan: '',
    chalan_file_path: '',
    total_amount: '',
    items: {} as Record<string, number>, // item_master_id -> quantity
    itemPrices: {} as Record<string, number>, // item_master_id -> unit_price
    serialNumbers: {} as Record<string, Array<{ id: string; serialNumber: string; notes?: string }>> // item_master_id -> serial numbers
  });

  // Use selectedTenderWithItems if available (has full data including items), otherwise fallback to basic tender info
  const selectedTender = selectedTenderWithItems || tenders?.find(t => t.id === selectedTenderId);

  // Initialize tender ID from URL parameter
  useEffect(() => {
    if (tenderId && tenderId !== selectedTenderId) {
      // Load full tender data when tender ID is provided via URL
      handleTenderSelection(tenderId);
    }
  }, [tenderId]);

  // Load deliveries from database only
  const loadDeliveries = async () => {
    if (!selectedTender) return;
    
    try {
      setLoading(true);
      const databaseDeliveries = await DeliveryLocalService.getByTenderId(selectedTender.id);
      setDeliveries(databaseDeliveries);
    } catch (error) {
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  // Load actual prices from localStorage (same as original)
  const loadActualPrices = async () => {
    if (!selectedTender) return;
    
    try {
      const stored = localStorage.getItem(`actual_prices_${selectedTender.id}`);
      if (stored) {
        const parsedPrices = JSON.parse(stored);
        setActualPrices(parsedPrices || {});
      }
    } catch (error) {
      
    }
  };

  // Handle tender selection with finalization check
  const handleTenderSelection = async (tenderId: string) => {
    const selectedTenderData = tenders?.find(t => t.id === tenderId);
    
    if (selectedTenderData?.is_finalized) {
      toast({
        title: "Tender Already Finalized",
        description: `Tender ${selectedTenderData.tenderNumber} is finalized. Redirecting to report view.`,
        variant: "default",
      });
      navigate(`/dashboard/tenders/${tenderId}/stock-acquisition`);
      return;
    }
    
    // Load full tender with items
    try {
      setLoading(true);
      const response = await tendersLocalService.getById(tenderId);
      if (response.success && response.data) {
        setSelectedTenderWithItems(response.data);
        setSelectedTenderId(tenderId);
        } else {
        throw new Error('Failed to load tender details');
      }
    } catch (error) {
      console.error('Failed to load tender with items:', error);
      toast({
        title: "Error Loading Tender",
        description: "Failed to load tender details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTender) {
      // If tender is finalized, redirect to stock acquisition report instead of allowing editing
      if (selectedTender.is_finalized) {
        toast({
          title: "Tender Already Finalized",
          description: `Tender ${selectedTender.tenderNumber} is finalized. Redirecting to report view.`,
          variant: "default",
        });
        navigate(`/dashboard/tenders/${selectedTender.id}/stock-acquisition`);
        return;
      }
      
      loadHybridData();
      loadDeliveries();
      loadTenderPricingMode(selectedTender.id); // Load pricing mode data
      // Reset deleted items when switching tenders
      setDeletedItems(new Set());
      setIsStockTransactionInitialized(false);
    } else {
      setDeliveries([]);
    }
  }, [selectedTender?.id, navigate]);

  // Load data with hybrid approach using local service
  const loadHybridData = async () => {
    if (!selectedTender) return;
    
    setLoading(true);
    try {
      // Always ensure all tender items have stock transactions
      if (!selectedTender.items || selectedTender.items.length === 0) {
        setStockTransactionItems([]);
        setIsStockTransactionInitialized(false);
        return;
      }
      
      // Initialize/ensure stock transactions for all tender items
      const initResults = await stockTransactionsCleanLocalService.initializeFromTender(selectedTender.id, selectedTender.items);
      // Load all stock transactions
      let stockTransactions = await stockTransactionsCleanLocalService.getByTenderId(selectedTender.id);
      
      // Always ensure we have complete stock transactions for all tender items
      if (!selectedTender.items || selectedTender.items.length === 0) {
        toast({
          title: "No Items Found",
          description: "This tender has no items to process.",
          variant: "destructive",
        });
        return;
      }
      
      // Check if we have stock transactions for all tender items
      const missingItems = selectedTender.items.filter(tenderItem => 
        !stockTransactions.some(st => st.item_master_id === tenderItem.itemMasterId)
      );
      
      if (missingItems.length > 0 || stockTransactions.length !== selectedTender.items.length) {
        // Initialize or complete the stock transactions
        const initResults = await stockTransactionsCleanLocalService.initializeFromTender(
          selectedTender.id, 
          selectedTender.items
        );
        
        // Re-load after initialization to get complete data
        stockTransactions = await stockTransactionsCleanLocalService.getByTenderId(selectedTender.id);
        
        }
      
      // Convert the data to match the interface with proper quantity mapping
      const convertedItems = stockTransactions.map(item => {
        const matchingTenderItem = selectedTender.items.find(tItem => tItem.itemMasterId === item.item_master_id);
        
        return {
          id: item.id,
          tender_id: item.tender_id,
          item_master_id: item.item_master_id,
          estimated_unit_price: item.estimated_unit_price,
          actual_unit_price: item.actual_unit_price,
          pricing_confirmed: item.pricing_confirmed,
          quantity: matchingTenderItem?.quantity || item.total_quantity_received || 0,
          is_deleted: item.is_deleted,
          created_at: item.created_at,
          updated_at: item.updated_at,
          nomenclature: matchingTenderItem?.nomenclature || item.nomenclature || 'Unknown Item',
          specifications: matchingTenderItem?.specifications || item.specifications || ''
        };
      });
      
      setStockTransactionItems(convertedItems);
      setIsStockTransactionInitialized(true);
      
      // Load actual prices from stock transactions
      const prices: Record<string, number> = {};
      stockTransactions.forEach(item => {
        if (item.actual_unit_price) {
          prices[item.item_master_id] = item.actual_unit_price;
        }
      });
      setActualPrices(prices);
      
    } catch (error) {
      console.error('Error loading stock transactions:', error);
      toast({
        title: "Database Error",
        description: "Failed to load stock transactions. Using fallback method.",
        variant: "destructive",
      });
      
      // Fallback to original method
      loadActualPrices();
      setIsStockTransactionInitialized(false);
    }
    
    setLoading(false);
  };

  // Get current items (hybrid approach)
  const currentItems = React.useMemo(() => {
    if (isStockTransactionInitialized && stockTransactionItems.length > 0) {
      // Use stock transaction items (with database persistence)
      const items = stockTransactionItems
        .filter(item => !item.is_deleted)
        .map(item => ({
          itemMasterId: item.item_master_id,
          nomenclature: item.nomenclature || 'Unknown Item',
          specifications: item.specifications || '',
          quantity: item.quantity || 0,
          actualUnitPrice: item.actual_unit_price || 0,
          id: item.id || item.item_master_id,
          tenderId: selectedTender?.id || ''
        }));
      return items;
    } else {
      // Fallback to tender items (original approach)
      const items = selectedTender?.items || [];
      return items;
    }
  }, [isStockTransactionInitialized, stockTransactionItems, selectedTender?.items]);

  // Calculate delivery quantities per item (moved up to use in sorting)
  const deliveryQuantities = React.useMemo(() => {
    const quantities: Record<string, number> = {};
    
    deliveries.forEach(delivery => {
      if (delivery.delivery_items && Array.isArray(delivery.delivery_items)) {
        delivery.delivery_items.forEach(item => {
          if (!quantities[item.item_master_id]) {
            quantities[item.item_master_id] = 0;
          }
          quantities[item.item_master_id] += item.delivery_qty;
        });
      }
    });
    
    return quantities;
  }, [deliveries]);

  // Apply local deletions to current items and sort by priority
  const filteredItems = React.useMemo(() => {
    const items = currentItems.filter(item => !deletedItems.has(item.itemMasterId));
    // Sort items by priority: pending status + empty price first
    return items.sort((a, b) => {
      const aDelivered = deliveryQuantities[a.itemMasterId] || 0;
      const bDelivered = deliveryQuantities[b.itemMasterId] || 0;
      const aPrice = actualPrices[a.itemMasterId] || 0;
      const bPrice = actualPrices[b.itemMasterId] || 0;
      
      // Priority 1: Pending status (no delivery) + empty price
      const aPendingNoPrice = aDelivered === 0 && aPrice === 0;
      const bPendingNoPrice = bDelivered === 0 && bPrice === 0;
      
      if (aPendingNoPrice && !bPendingNoPrice) return -1;
      if (!aPendingNoPrice && bPendingNoPrice) return 1;
      
      // Priority 2: Missing price (delivered but no price)
      const aMissingPrice = aDelivered >= a.quantity && aPrice === 0;
      const bMissingPrice = bDelivered >= b.quantity && bPrice === 0;
      
      if (aMissingPrice && !bMissingPrice) return -1;
      if (!aMissingPrice && bMissingPrice) return 1;
      
      // Priority 3: Partially delivered
      const aPartial = aDelivered > 0 && aDelivered < a.quantity;
      const bPartial = bDelivered > 0 && bDelivered < b.quantity;
      
      if (aPartial && !bPartial) return -1;
      if (!aPartial && bPartial) return 1;
      
      // Default: maintain original order
      return 0;
    });
  }, [currentItems, deletedItems, deliveryQuantities, actualPrices]);
  
  // Get removed items
  const removedItems = currentItems.filter(item => deletedItems.has(item.itemMasterId));

  // Handle actual price changes using clean service
  const handleActualPriceChange = async (itemId: string, value: string) => {
    // Prevent changes when in Total pricing mode
    if (pricingMode === 'Total') {
      toast({
        title: "Action Not Allowed",
        description: "Individual prices cannot be changed in Total pricing mode",
        variant: "destructive",
      });
      return;
    }
    
    const numericValue = parseFloat(value) || 0;
    
    if (isStockTransactionInitialized) {
      // Update in database using clean service
      try {
        await stockTransactionsCleanLocalService.updateActualPrice(selectedTender!.id, itemId, numericValue);
        
        // Update local state to reflect database change
        setStockTransactionItems(prev => 
          prev.map(item => 
            item.item_master_id === itemId 
              ? { ...item, actual_unit_price: numericValue, pricing_confirmed: true }
              : item
          )
        );
        
        // Also update the actualPrices state for UI consistency
        setActualPrices(prev => ({
          ...prev,
          [itemId]: numericValue
        }));
        
        toast({
          title: "Price Updated",
          description: "Actual unit price has been saved to database",
        });
      } catch (error) {
        console.error('Error updating price:', error);
        toast({
          title: "Error",
          description: "Failed to update price in database",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to localStorage (original approach)
      const updatedPrices = { ...actualPrices, [itemId]: numericValue };
      setActualPrices(updatedPrices);
      
      // Save to localStorage
      if (selectedTender) {
        localStorage.setItem(`actual_prices_${selectedTender.id}`, JSON.stringify(updatedPrices));
      }
      
      toast({
        title: "Price Updated",
        description: "Actual unit price has been saved",
      });
    }
  };

  // Load tender pricing mode data (using local service)
  const loadTenderPricingMode = async (tenderId: string) => {
    try {
      const response = await tendersLocalService.getById(tenderId);

      if (!response.success || !response.data) {
        // If tender not found or fields don't exist, use defaults
        setPricingMode('Individual');
        setTotalActualPrice(0);
        return;
      }

      const tender = response.data;
      setPricingMode(tender.individual_total || 'Individual');
      setTotalActualPrice(tender.actual_price_total || 0);
    } catch (error) {
      // Default values if anything fails
      setPricingMode('Individual');
      setTotalActualPrice(0);
    }
  };

  // Update tender pricing mode in database (using local service)
  const updateTenderPricingMode = async (mode: 'Individual' | 'Total', totalPrice: number = 0) => {
    if (!selectedTender) return false;
    
    try {
      const response = await tendersLocalService.updatePricingMode(
        selectedTender.id, 
        mode, 
        totalPrice
      );

      return response.success;
    } catch (error) {
      console.error('Error updating tender pricing mode:', error);
      return false;
    }
  };

  // Handle pricing mode change
  const handlePricingModeChange = async (mode: 'Individual' | 'Total') => {
    if (!selectedTender) return;
    
    const success = await updateTenderPricingMode(mode, totalActualPrice);
    
    if (success) {
      setPricingMode(mode);
      
      toast({
        title: "Pricing Mode Updated",
        description: `Switched to ${mode} pricing mode. ${mode === 'Total' ? 'Individual prices are preserved but disabled.' : 'Individual prices are now active.'}`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update pricing mode",
        variant: "destructive",
      });
    }
  };

  // Handle total actual price change
  const handleTotalActualPriceChange = async (value: number) => {
    if (!selectedTender || pricingMode !== 'Total') return;
    
    const success = await updateTenderPricingMode('Total', value);
    
    if (success) {
      setTotalActualPrice(value);
      
      toast({
        title: "Total Price Updated",
        description: "Total actual price has been saved",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update total price",
        variant: "destructive",
      });
    }
  };

  // Delete item from transaction using clean service
  const handleDeleteItem = async (itemId: string) => {
    if (window.confirm('Are you sure you want to remove this item from the transaction?')) {
      if (isStockTransactionInitialized) {
        // Mark as deleted in database using clean service
        try {
          await stockTransactionsCleanLocalService.softDelete(selectedTender!.id, itemId);
          
          // Update local state
          setStockTransactionItems(prev => 
            prev.map(item => 
              item.item_master_id === itemId 
                ? { ...item, is_deleted: true }
                : item
            )
          );
          
          toast({
            title: "Item Removed",
            description: "Item has been removed from the database",
          });
        } catch (error) {
          console.error('Error removing item:', error);
          toast({
            title: "Error",
            description: "Failed to remove item from database",
            variant: "destructive",
          });
        }
      } else {
        // Fallback to local deletion
        setDeletedItems(prev => new Set([...prev, itemId]));
        toast({
          title: "Item Removed",
          description: "Item has been removed from the transaction",
        });
      }
    }
  };

  // Add item back to transaction using clean service
  const handleAddItem = async (itemId: string) => {
    if (isStockTransactionInitialized) {
      // Restore in database using clean service
      try {
        await stockTransactionsCleanLocalService.restore(selectedTender!.id, itemId);
        
        // Update local state
        setStockTransactionItems(prev => 
          prev.map(item => 
            item.item_master_id === itemId 
              ? { ...item, is_deleted: false }
              : item
          )
        );
        
        toast({
          title: "Item Restored",
          description: "Item has been restored in the database",
        });
      } catch (error) {
        console.error('Error restoring item:', error);
        toast({
          title: "Error",
          description: "Failed to restore item in database",
          variant: "destructive",
        });
      }
    } else {
      // Fallback to local restoration
      const newDeletedItems = new Set(deletedItems);
      newDeletedItems.delete(itemId);
      setDeletedItems(newDeletedItems);
      
      toast({
        title: "Item Restored",
        description: "Item has been added back to the transaction",
      });
    }
  };

  // Finalize tender and lock stock transactions
  const handleFinalizeTender = async () => {
    if (!selectedTender) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to finalize tender "${selectedTender.tenderNumber}"?\n\n` +
      `This will lock all stock transactions and prevent further modifications.\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      
      // Call the finalize API
      const response = await tendersLocalService.finalize(selectedTender.id, 'System User');
      
      if (response.success) {
        toast({
          title: "Tender Finalized",
          description: `Tender ${selectedTender.tenderNumber} has been finalized and locked successfully.`,
        });
        
        // Redirect to the stock acquisition report instead of reloading
        navigate(`/dashboard/tenders/${selectedTender.id}/stock-acquisition`);
      } else {
        throw new Error('Failed to finalize tender');
      }
    } catch (error: any) {
      console.error('Error finalizing tender:', error);
      toast({
        title: "Finalization Failed",
        description: error.message || "Failed to finalize tender. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load deliveries from localStorage (same as original)

  // Create new delivery
  const handleCreateDelivery = async () => {
    if (!selectedTender || !newDelivery.delivery_personnel.trim()) {
      toast({
        title: "Error",
        description: "Please fill in delivery personnel name",
        variant: "destructive"
      });
      return;
    }

    const deliveryItems = Object.entries(newDelivery.items)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => {
        const item = filteredItems.find(i => i.itemMasterId === itemId);
        
        return {
          item_master_id: itemId,
          item_name: item?.nomenclature || 'Unknown Item',
          delivery_qty: qty
        };
      });

    if (deliveryItems.length === 0) {
      toast({
        title: "Error", 
        description: "Please enter quantities for at least one item",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      if (editingDelivery) {
        // For editing, we'll use a fallback approach since we don't have an update function yet
        const delivery: DeliveryRecord = {
          ...editingDelivery,
          delivery_items: deliveryItems,
          delivery_personnel: newDelivery.delivery_personnel,
          delivery_date: newDelivery.delivery_date,
          delivery_notes: newDelivery.delivery_notes,
          delivery_chalan: newDelivery.delivery_chalan,
          chalan_file_path: newDelivery.chalan_file_path,
          updated_at: new Date().toISOString()
        };
        
        const updatedDeliveries = deliveries.map(d => d.id === editingDelivery.id ? delivery : d);
        setDeliveries(updatedDeliveries);
        
        // Save to localStorage as fallback for updates
        localStorage.setItem(`deliveries_${selectedTender.id}`, JSON.stringify(updatedDeliveries));
        
        toast({
          title: "Delivery Updated",
          description: `Delivery #${delivery.delivery_number} updated with ${deliveryItems.length} items`,
        });
      } else {
        // Create new delivery using database service
        const newDeliveryRecord = await DeliveryLocalService.create({
          delivery_number: 0, // Will be generated by backend
          tender_id: selectedTender.id,
          delivery_personnel: newDelivery.delivery_personnel,
          delivery_date: newDelivery.delivery_date,
          delivery_notes: newDelivery.delivery_notes,
          delivery_chalan: newDelivery.delivery_chalan,
          chalan_file_path: newDelivery.chalan_file_path,
          delivery_items: deliveryItems
        });

        // Save serial numbers if any were entered
        for (const [itemMasterId, serialNumbers] of Object.entries(newDelivery.serialNumbers)) {
          if (serialNumbers.length > 0) {
            const serialsToSave = serialNumbers.map(sn => ({
              delivery_id: newDeliveryRecord.id,
              delivery_item_id: `${newDeliveryRecord.id}-${itemMasterId}`,
              item_master_id: itemMasterId,
              serial_number: sn.serialNumber,
              notes: sn.notes
            }));
            
            try {
              await deliveryItemSerialNumbersService.createMany(serialsToSave);
            } catch (serialError) {
              // Don't fail the whole delivery creation for serial number errors
              toast({
                title: "Warning",
                description: `Delivery created but some serial numbers couldn't be saved`,
                variant: "destructive",
              });
            }
          }
        }

        // Refresh deliveries from database
        await loadDeliveries();
        
        toast({
          title: "Delivery Created",
          description: `Delivery #${newDeliveryRecord.delivery_number} created with ${deliveryItems.length} items`,
        });
      }

      // Reset form
      setNewDelivery({
        delivery_date: new Date().toISOString().split('T')[0],
        delivery_personnel: '',
        delivery_notes: '',
        delivery_chalan: '',
        chalan_file_path: '',
        total_amount: '',
        items: {},
        itemPrices: {},
        serialNumbers: {}
      });
      setShowDeliveryForm(false);
      setEditingDelivery(null);

    } catch (error) {
      
      toast({
        title: "Database Error",
        description: "Failed to save delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Edit delivery
  const handleEditDelivery = (delivery: DeliveryRecord) => {
    setEditingDelivery(delivery);
    setNewDelivery({
      delivery_date: delivery.delivery_date,
      delivery_personnel: delivery.delivery_personnel,
      delivery_notes: delivery.delivery_notes || '',
      delivery_chalan: delivery.delivery_chalan || '',
      chalan_file_path: delivery.chalan_file_path || '',
      total_amount: delivery.total_amount?.toString() || '',
      items: delivery.delivery_items.reduce((acc, item) => {
        acc[item.item_master_id] = item.delivery_qty;
        return acc;
      }, {} as Record<string, number>),
      itemPrices: delivery.delivery_items.reduce((acc, item) => {
        if (item.unit_price) {
          acc[item.item_master_id] = item.unit_price;
        }
        return acc;
      }, {} as Record<string, number>),
      serialNumbers: {} // For now, empty - could load existing serial numbers if needed for editing
    });
    setShowDeliveryForm(true);
  };

  // Delete delivery
  const handleDeleteDelivery = async (deliveryId: string) => {
    if (!selectedTender) return;
    
    if (window.confirm('Are you sure you want to delete this delivery record?')) {
      try {
        setLoading(true);
        
        // For now, use localStorage approach since we don't have a delete database function
        // In a production system, this would call DeliveryService.deleteDelivery(deliveryId)
        const updatedDeliveries = deliveries.filter(d => d.id !== deliveryId);
        setDeliveries(updatedDeliveries);
        
        // Save to localStorage as fallback
        localStorage.setItem(`deliveries_${selectedTender.id}`, JSON.stringify(updatedDeliveries));
        
        toast({
          title: "Delivery Deleted",
          description: "Delivery record has been removed",
        });
      } catch (error) {
        
        toast({
          title: "Error",
          description: "Failed to delete delivery. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingDelivery(null);
    setShowDeliveryForm(false);
    setNewDelivery({
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_personnel: '',
      delivery_notes: '',
      delivery_chalan: '',
      chalan_file_path: '',
      total_amount: '',
      items: {},
      itemPrices: {},
      serialNumbers: {}
    });
  };

  // Update delivery item quantity
  const updateDeliveryItemQty = (itemId: string, qty: number) => {
    setNewDelivery(prev => ({
      ...prev,
      items: {
        ...prev.items,
        [itemId]: qty
      }
    }));
  };

  // Remove item from delivery form
  const removeItemFromDelivery = (itemId: string) => {
    setNewDelivery(prev => {
      const newItems = { ...prev.items };
      const newItemPrices = { ...prev.itemPrices };
      const newSerialNumbers = { ...prev.serialNumbers };
      delete newItems[itemId];
      delete newItemPrices[itemId];
      delete newSerialNumbers[itemId];
      return {
        ...prev,
        items: newItems,
        itemPrices: newItemPrices,
        serialNumbers: newSerialNumbers
      };
    });
  };

  // Serial number management functions
  const handleOpenSerialNumbers = async (
    deliveryId: string, 
    deliveryItemId: string, 
    itemMasterId: string, 
    itemName: string, 
    deliveredQty: number
  ) => {
    try {
      // Load existing serial numbers for this delivery item
      const existingSerialNumbers = await deliveryItemSerialNumbersService.getByDeliveryItemId(deliveryItemId);
      
      setSelectedDeliveryItem({
        deliveryId,
        deliveryItemId,
        itemMasterId,
        itemName,
        deliveredQty,
        existingSerialNumbers: existingSerialNumbers.map(sn => ({
          id: sn.id,
          serialNumber: sn.serial_number,
          notes: sn.notes
        }))
      });
      setShowSerialNumberDialog(true);
    } catch (error) {
      // Still open dialog even if loading fails
      setSelectedDeliveryItem({
        deliveryId,
        deliveryItemId,
        itemMasterId,
        itemName,
        deliveredQty
      });
      setShowSerialNumberDialog(true);
    }
  };

  const handleCloseSerialNumbers = () => {
    setShowSerialNumberDialog(false);
    setSelectedDeliveryItem(null);
  };

  // Calculate summary statistics - Updated to require both delivery and actual price for completion
  const summary = React.useMemo(() => {
    if (!selectedTender) return {
      totalActualValue: 0,
      completedItems: 0,
      partialItems: 0,
      pendingItems: 0,
      missingPriceItems: 0,
      totalDeliveries: 0
    };

    let totalActualValue = 0;
    let completedItems = 0;
    let partialItems = 0;
    let pendingItems = 0;
    let missingPriceItems = 0;

    filteredItems.forEach(item => {
      const actualUnitPrice = actualPrices[item.itemMasterId] || 0;
      const delivered = deliveryQuantities[item.itemMasterId] || 0;
      const hasActualPrice = actualUnitPrice > 0;
      
      totalActualValue += actualUnitPrice * item.quantity;
      
      if (delivered === 0) {
        pendingItems++;
      } else if (delivered < item.quantity) {
        partialItems++;
      } else if (delivered >= item.quantity && !hasActualPrice) {
        missingPriceItems++; // Delivered but missing actual price
      } else if (delivered >= item.quantity && hasActualPrice) {
        completedItems++; // Fully completed: delivered + priced
      }
    });

    return {
      totalActualValue,
      completedItems,
      partialItems,
      pendingItems,
      missingPriceItems,
      totalDeliveries: deliveries.length
    };
  }, [selectedTender?.items, actualPrices, deliveryQuantities, deliveries]);

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-full overflow-hidden">
        {/* Header & Tender Selection - Same style as original */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-6 w-6 text-blue-600" />
                  <span>Stock Acquisition</span>
                </CardTitle>
                <CardDescription>
                  Select a tender and manage items with delivery tracking
                </CardDescription>
              </div>
              {selectedTenderId && (
                <Button
                  onClick={() => navigate(`/delivery-report/${selectedTenderId}`)}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>View Report</span>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Back to Dashboard Button and Tender Info */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  onClick={() => navigate('/dashboard/stock-acquisition-dashboard')}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
                
                {selectedTender && (
                  <div className="flex-1 ml-6">
                    <h2 className="text-xl font-semibold text-gray-900">{selectedTender.tenderNumber}</h2>
                    <p className="text-gray-600">{selectedTender.title}</p>
                  </div>
                )}
              </div>
              
              {selectedTender && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">{selectedTender.tenderNumber}</h3>
                      <p className="text-blue-800 font-medium leading-relaxed">{selectedTender.title}</p>
                      {selectedTender.description && (
                        <p className="text-blue-700 text-sm mt-2 leading-relaxed">{selectedTender.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Show tender selector if no tender ID provided */}
              {!selectedTenderId && (
                <Card className="max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Package className="h-6 w-6 text-blue-600" />
                      Select Tender for Stock Acquisition
                    </CardTitle>
                    <CardDescription>
                      Choose a tender to create and manage stock transactions for.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="tender-select">Select Tender</Label>
                      <Select onValueChange={handleTenderSelection}>
                        <SelectTrigger id="tender-select">
                          <SelectValue placeholder="Choose a tender..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tenders?.filter(tender => !tender.is_finalized).map((tender) => (
                            <SelectItem key={tender.id} value={tender.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{tender.tenderNumber}</span>
                                <span className="text-sm text-gray-500">{tender.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {tenders && tenders.filter(tender => !tender.is_finalized).length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-gray-500 mb-4">
                          {tenders.length === 0 
                            ? "No tenders available. Create a tender first." 
                            : "All available tenders are finalized. Create a new tender for stock acquisition."
                          }
                        </p>
                        <Button
                          onClick={() => navigate('/contract-tender')}
                          className="flex items-center space-x-2"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Create New Tender</span>
                        </Button>
                      </div>
                    )}
                    
                    <div className="flex justify-center pt-4">
                      <Button
                        onClick={() => navigate('/dashboard/stock-acquisition-dashboard')}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>Back to Dashboard</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {selectedTender && (
                <div className="flex gap-3">
                  {/* Delivery Management Button */}
                  <Button
                    onClick={() => setShowDeliveryManager(!showDeliveryManager)}
                    className={`${showDeliveryManager ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'} hover:bg-blue-700 hover:text-white`}
                    variant={showDeliveryManager ? 'default' : 'outline'}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {showDeliveryManager ? 'Hide' : 'Manage'} Deliveries
                  </Button>
                  
                  {/* Finalize Button */}
                  {!selectedTender.is_finalized && (
                    <Button
                      onClick={handleFinalizeTender}
                      disabled={loading}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      {loading ? 'Finalizing...' : 'Finalize & Lock'}
                    </Button>
                  )}
                  
                  {/* Show finalized status */}
                  {selectedTender.is_finalized && (
                    <div className="flex items-center px-3 py-2 bg-gray-100 rounded-md border">
                      <Lock className="h-4 w-4 mr-2 text-gray-600" />
                      <span className="text-sm text-gray-600 font-medium">Finalized</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Management Section */}
        {showDeliveryManager && selectedTender && (
          <Card className="border-green-200 bg-green-50">
            <CardHeader className="bg-green-100 border-b border-green-200">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg font-semibold text-green-800 flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Multi-Item Delivery Management
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Create deliveries with multiple items and track quantities received
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowDeliveryForm(!showDeliveryForm)}
                  variant={showDeliveryForm ? "secondary" : "default"}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showDeliveryForm ? 'Cancel' : 'New Delivery'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              {/* Delivery Creation Form */}
              {showDeliveryForm && (
                <Card className="border border-green-300 bg-white max-w-full overflow-hidden">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="text-green-800">
                      {editingDelivery ? `Edit Delivery #${editingDelivery.delivery_number}` : 'Create New Delivery'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4 max-w-full overflow-hidden">
                    {/* Delivery Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delivery-date" className="text-sm font-medium">
                          Delivery Date
                        </Label>
                        <Input
                          id="delivery-date"
                          type="date"
                          value={newDelivery.delivery_date}
                          onChange={(e) => setNewDelivery(prev => ({
                            ...prev,
                            delivery_date: e.target.value
                          }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="delivery-personnel" className="text-sm font-medium">
                          Delivery Personnel *
                        </Label>
                        <Input
                          id="delivery-personnel"
                          placeholder="Enter person name"
                          value={newDelivery.delivery_personnel}
                          onChange={(e) => setNewDelivery(prev => ({
                            ...prev,
                            delivery_personnel: e.target.value
                          }))}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="delivery-notes" className="text-sm font-medium">
                        Delivery Notes (Optional)
                      </Label>
                      <Input
                        id="delivery-notes"
                        placeholder="Any additional notes..."
                        value={newDelivery.delivery_notes}
                        onChange={(e) => setNewDelivery(prev => ({
                          ...prev,
                          delivery_notes: e.target.value
                        }))}
                        className="mt-1"
                      />
                    </div>

                    {/* New Chalan Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delivery-chalan" className="text-sm font-medium">
                          Delivery Chalan
                        </Label>
                        <Input
                          id="delivery-chalan"
                          placeholder="Enter chalan number"
                          value={newDelivery.delivery_chalan}
                          onChange={(e) => setNewDelivery(prev => ({
                            ...prev,
                            delivery_chalan: e.target.value
                          }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="chalan-file" className="text-sm font-medium">
                          Upload Chalan File
                        </Label>
                        <Input
                          id="chalan-file"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setNewDelivery(prev => ({
                                ...prev,
                                chalan_file_path: file.name
                              }));
                            }
                          }}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Items Selection */}
                    <div>
                      <Label className="text-sm font-medium mb-3 block">
                        Items Delivered (Enter quantities received)
                      </Label>
                      <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded p-3 overflow-x-hidden">
                        {filteredItems.length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            No items available for this tender
                          </div>
                        )}
                        {filteredItems.map((item) => {
                          return (
                          <div key={item.itemMasterId || item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border min-w-0">
                            <div className="flex-1 min-w-0 pr-4">
                              <div className="font-medium text-sm break-words">{item.nomenclature || 'Unnamed Item'}</div>
                              <div className="text-xs text-gray-600 break-words">
                                Available: {(item.quantity || 0) - (deliveryQuantities[item.itemMasterId || item.id] || 0)} 
                                / Total: {item.quantity || 0}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Label className="text-xs text-gray-600">Qty:</Label>
                              <Input
                                type="number"
                                min="0"
                                max={(item.quantity || 0) - (deliveryQuantities[item.itemMasterId || item.id] || 0)}
                                value={newDelivery.items[item.itemMasterId || item.id] || ''}
                                onChange={(e) => updateDeliveryItemQty(
                                  item.itemMasterId || item.id, 
                                  parseInt(e.target.value) || 0
                                )}
                                placeholder="0"
                                className="w-20 h-8 text-center"
                              />
                              
                              {/* Note about serial numbers - only show if quantity > 0 */}
                              {(newDelivery.items[item.itemMasterId || item.id] || 0) > 0 && (
                                <div className="text-xs text-gray-500 italic">
                                  Save delivery first to add serial numbers
                                </div>
                              )}
                              
                              {/* Remove quantity and clear pricing */}
                              {(newDelivery.items[item.itemMasterId || item.id] || 0) > 0 && (
                                <Button
                                  onClick={() => removeItemFromDelivery(item.itemMasterId || item.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button 
                        onClick={handleCreateDelivery}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        {editingDelivery ? 'Update Delivery' : 'Create Delivery'}
                      </Button>
                      <Button 
                        onClick={editingDelivery ? handleCancelEdit : () => setShowDeliveryForm(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Delivery Records Display - Simplified */}
              <div className="mb-4">
                <h4 className="font-medium text-green-800">Delivery Records</h4>
              </div>

              {deliveries.length > 0 ? (
                <div className="space-y-3">
                  {deliveries.slice().reverse().map((delivery) => (
                    <div key={delivery.id} className="border-l-4 border-l-green-500 p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Delivery #{delivery.delivery_number}
                          </Badge>
                          <span className="text-sm font-medium">{delivery.delivery_personnel}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(delivery.delivery_date)}
                        </span>
                      </div>
                      
                      {delivery.delivery_notes && (
                        <p className="text-sm text-gray-600 mb-3 italic">"{delivery.delivery_notes}"</p>
                      )}
                      
                      {/* Chalan Information */}
                      {(delivery.delivery_chalan || delivery.chalan_file_path) && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-3 border border-blue-200">
                          <div className="text-sm font-medium text-blue-800 mb-2">Delivery Chalan Information:</div>
                          <div className="space-y-1">
                            {delivery.delivery_chalan && (
                              <div className="text-sm text-blue-700">
                                <span className="font-medium">Chalan No:</span> {delivery.delivery_chalan}
                              </div>
                            )}
                            {delivery.chalan_file_path && (
                              <div className="text-sm text-blue-700">
                                <span className="font-medium">Attached File:</span> {delivery.chalan_file_path}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Pricing Information */}
                      <div className="bg-yellow-50 p-3 rounded-lg mb-3 border border-yellow-200">

                      </div>
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-700">Items Delivered:</div>
                        <div className="grid grid-cols-1 gap-2">
                          {delivery.delivery_items && delivery.delivery_items.length > 0 ? (
                            delivery.delivery_items.map((deliveryItem, idx) => (
                              <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                                <span className="truncate flex-1">{deliveryItem.item_name}</span>
                                <div className="flex items-center gap-3 text-right">
                                  <span className="font-medium text-green-600">
                                    Qty: {deliveryItem.delivery_qty}
                                  </span>
                                  <Button
                                    onClick={() => handleOpenSerialNumbers(
                                      delivery.id,
                                      deliveryItem.id || `${delivery.id}-${deliveryItem.item_master_id}`, // Use real ID or fallback
                                      deliveryItem.item_master_id,
                                      deliveryItem.item_name,
                                      deliveryItem.delivery_qty
                                    )}
                                    variant="outline"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                  >
                                    <Hash className="h-3 w-3 mr-1" />
                                    Serial #
                                  </Button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-gray-500 italic">No items in this delivery</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-green-700">
                  <Truck className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <h3 className="text-lg font-medium mb-2">No Deliveries Yet</h3>
                  <p className="text-sm mb-4">Create your first delivery with multiple items</p>
                  <Button
                    onClick={() => setShowDeliveryForm(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Delivery
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Delivery-Focused Summary Cards */}
        {selectedTender && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Hash className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Qty</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {filteredItems.reduce((sum, item) => sum + item.quantity, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Truck className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {deliveries.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Items Delivered</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Object.keys(deliveryQuantities).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Package className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Items Pending</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {filteredItems.filter(item => {
                        const delivered = deliveryQuantities[item.itemMasterId] || 0;
                        return delivered === 0 || delivered < item.quantity;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Items Progress Overview - Same style as original */}
        {selectedTender && (
          <Card>
            <CardHeader>
              <CardTitle>Items Overview</CardTitle>
              <CardDescription>
                Progress summary: {summary.completedItems} completed, {summary.partialItems} in progress, {summary.pendingItems} pending
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{summary.completedItems}</div>
                  <div className="text-sm text-green-700">Completed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{summary.partialItems}</div>
                  <div className="text-sm text-blue-700">In Progress</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{summary.pendingItems}</div>
                  <div className="text-sm text-gray-700">Pending</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Table - Same style and functionality as original */}
        {selectedTender && (
          <Card>
            <CardHeader>
              <CardTitle>Items Details</CardTitle>
              <CardDescription>
                Detailed view of all tender items with delivery progress and pricing. 
                <span className="text-orange-600 font-medium">Items require both delivery completion AND actual price entry to be marked as complete.</span>
              </CardDescription>
              
              {/* Pricing Mode Controls */}
              <div className="flex flex-col gap-4 mt-4 p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-6">
                  <Label className="text-sm font-medium">Pricing Mode:</Label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pricingMode"
                        value="Individual"
                        checked={pricingMode === 'Individual'}
                        onChange={() => handlePricingModeChange('Individual')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">Individual</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pricingMode"
                        value="Total"
                        checked={pricingMode === 'Total'}
                        onChange={() => handlePricingModeChange('Total')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">Total</span>
                    </label>
                  </div>
                </div>
                
                {pricingMode === 'Total' && (
                  <div className="flex items-center gap-4">
                    <Label htmlFor="totalActualPrice" className="text-sm font-medium min-w-fit">
                      Total Actual Price:
                    </Label>
                    <Input
                      id="totalActualPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={totalActualPrice || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setTotalActualPrice(value);
                      }}
                      onBlur={() => handleTotalActualPriceChange(totalActualPrice)}
                      className="w-48"
                      placeholder="Enter total actual price"
                    />
                    <span className="text-sm text-gray-500">PKR</span>
                    <div className="text-sm text-blue-600 font-medium">
                      This replaces all individual item prices
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-lg">Loading acquisition data...</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Tender Qty</TableHead>
                        <TableHead>Delivered</TableHead>
                        <TableHead>Remaining</TableHead>
                        {pricingMode === 'Individual' && <TableHead>Actual Unit Price</TableHead>}
                        {pricingMode === 'Individual' && <TableHead>Total Value</TableHead>}
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const delivered = deliveryQuantities[item.itemMasterId] || 0;
                        const remaining = item.quantity - delivered;
                        const actualUnitPrice = actualPrices[item.itemMasterId] || 0;
                        const totalValue = actualUnitPrice * item.quantity;

                        return (
                          <TableRow key={item.itemMasterId}>
                            <TableCell className="font-medium">
                              <div className="max-w-xs">
                                <div className="font-semibold">{item.nomenclature}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-base px-3 py-1">
                                {item.quantity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="default" 
                                className={`font-mono text-base px-3 py-1 ${delivered > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                              >
                                {delivered}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`font-mono text-base px-3 py-1 ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}
                              >
                                {remaining}
                              </Badge>
                            </TableCell>
                            {pricingMode === 'Individual' && (
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={actualUnitPrice || ''}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value) || 0;
                                    setActualPrices(prev => ({
                                      ...prev,
                                      [item.itemMasterId]: value
                                    }));
                                  }}
                                  onBlur={(e) => {
                                    handleActualPriceChange(item.itemMasterId, e.target.value);
                                  }}
                                  placeholder="Enter price"
                                  className={`w-32 ${
                                    delivered >= item.quantity && (!actualUnitPrice || actualUnitPrice === 0)
                                      ? 'border-orange-300 bg-orange-50 placeholder-orange-400 focus:border-orange-500 focus:ring-orange-500' 
                                      : ''
                                  }`}
                                />
                                {delivered >= item.quantity && (!actualUnitPrice || actualUnitPrice === 0) && (
                                  <div className="text-xs text-orange-600 mt-1">Price required</div>
                                )}
                              </TableCell>
                            )}
                            {pricingMode === 'Individual' && (
                              <TableCell className="font-semibold">
                                {formatCurrency(totalValue)}
                              </TableCell>
                            )}
                            <TableCell>
                              <Button
                                onClick={() => handleDeleteItem(item.itemMasterId)}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50 hover:border-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableBody>
                      <TableRow className="bg-gray-50 font-semibold border-t-2 border-gray-200">
                        <TableCell className="font-bold">TOTALS</TableCell>
                        <TableCell className="font-bold text-purple-600">
                          {filteredItems.reduce((sum, item) => sum + item.quantity, 0)}
                        </TableCell>
                        <TableCell className="font-bold text-blue-600">
                          {filteredItems.reduce((sum, item) => sum + (deliveryQuantities[item.itemMasterId] || 0), 0)}
                        </TableCell>
                        <TableCell className="font-bold text-red-600">
                          {filteredItems.reduce((sum, item) => {
                            const delivered = deliveryQuantities[item.itemMasterId] || 0;
                            const remaining = item.quantity - delivered;
                            return sum + Math.max(0, remaining);
                          }, 0)}
                        </TableCell>
                        {pricingMode === 'Individual' && <TableCell></TableCell>}
                        {pricingMode === 'Individual' && (
                          <TableCell className="font-bold text-green-600">
                            {formatCurrency(
                              filteredItems.reduce((sum, item) => {
                                const actualUnitPrice = actualPrices[item.itemMasterId] || 0;
                                return sum + (actualUnitPrice * item.quantity);
                              }, 0)
                            )}
                          </TableCell>
                        )}
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Removed Items Section */}
        {selectedTender && removedItems.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-orange-800">Removed Items</CardTitle>
                  <CardDescription className="text-orange-700">
                    Items removed from transaction - can be added back
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowRemovedItems(!showRemovedItems)}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  {showRemovedItems ? 'Hide' : 'Show'} Removed Items ({removedItems.length})
                </Button>
              </div>
            </CardHeader>
            {showRemovedItems && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {removedItems.map((item) => (
                    <Card key={item.id} className="border-orange-200 bg-white">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{item.nomenclature}</h4>
                            {item.specifications && (
                              <p className="text-xs text-gray-500 mt-1">{item.specifications}</p>
                            )}
                          </div>
                          <Button
                            onClick={() => handleAddItem(item.itemMasterId)}
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:bg-green-50 border-green-300"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Back
                          </Button>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1">
                          <div>Quantity: {item.quantity}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Recent Deliveries - Same style as original */}
        {selectedTender && deliveries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Deliveries</CardTitle>
              <CardDescription>
                Latest delivery records for this tender
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-full">
                {deliveries.slice(-6).reverse().map((delivery) => (
                  <Card key={delivery.id} className="border-l-4 border-l-blue-500 min-w-0 overflow-hidden">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <Badge variant="outline" className="flex-shrink-0">
                          Delivery #{delivery.delivery_number}
                        </Badge>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {formatDate(delivery.delivery_date)}
                        </span>
                      </div>
                      <div className="space-y-2 min-w-0">
                        <div className="flex items-start space-x-2 min-w-0">
                          <span className="text-sm font-medium flex-shrink-0">Personnel:</span>
                          <span className="text-sm break-words min-w-0 flex-1">{delivery.delivery_personnel}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>{delivery.delivery_items?.length || 0}</strong> item types delivered
                        </div>
                        {delivery.delivery_notes && (
                          <div className="text-xs text-gray-500 italic break-words">
                            "{delivery.delivery_notes}"
                          </div>
                        )}
                        {delivery.delivery_chalan && (
                          <div className="text-xs text-blue-600 break-words">
                            <strong>Chalan:</strong> {delivery.delivery_chalan}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Serial Number Entry Dialog */}
      {showSerialNumberDialog && selectedDeliveryItem && (
        <SerialNumberEntryDialog
          open={showSerialNumberDialog}
          onClose={handleCloseSerialNumbers}
          onSave={async (serialNumbers) => {
            try {
              // Only handle existing delivery - save to database
              const serialsToSave = serialNumbers.map(sn => ({
                delivery_id: selectedDeliveryItem.deliveryId,
                delivery_item_id: selectedDeliveryItem.deliveryItemId,
                item_master_id: selectedDeliveryItem.itemMasterId,
                serial_number: sn.serialNumber,
                notes: sn.notes
              }));
              
              await deliveryItemSerialNumbersService.createMany(serialsToSave);
              
              toast({
                title: "Serial Numbers Saved",
                description: `${serialNumbers.length} serial numbers saved successfully`,
              });
              
              handleCloseSerialNumbers();
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to save serial numbers",
                variant: "destructive",
              });
            }
          }}
          itemName={selectedDeliveryItem.itemName}
          requiredQuantity={selectedDeliveryItem.deliveredQty}
          existingSerialNumbers={selectedDeliveryItem.existingSerialNumbers}
        />
      )}
    </TooltipProvider>
  );
};

export default TransactionManager;
