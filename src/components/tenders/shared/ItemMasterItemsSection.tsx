import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFieldArray, Controller } from "react-hook-form";
import { ItemMaster, CreateItemMasterRequest } from '@/types/tender';
import ItemMasterForm from '@/components/itemmaster/ItemMasterForm';
import { useCategoriesData } from '@/hooks/useCategoriesData';
import { useToast } from '@/hooks/use-toast';
import { useItemMasterData } from '@/hooks/useItemMasterData';
import { formatCurrency } from '@/utils/currency';

interface ItemMasterItemsSectionProps {
  form: any;
  isLoading?: boolean;
  isSpotPurchase?: boolean;
  isReadOnly?: boolean;
}

const ItemMasterItemsSection: React.FC<ItemMasterItemsSectionProps> = ({ form, isLoading, isSpotPurchase, isReadOnly = false }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { categories, subCategories } = useCategoriesData();
  const { toast } = useToast();
  const { itemMasters: currentItems, refreshData, createItemMaster } = useItemMasterData();
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleAddItem = () => {
    append({
      itemMasterId: '',
      nomenclature: '',
      quantity: 1,
      estimatedUnitPrice: 0,
      specifications: '',
      remarks: '',
    });
  };

  // Group items by category for better organization
  const groupedItems = React.useMemo(() => {
    const groups: { [key: string]: ItemMaster[] } = {};
    
    currentItems.forEach(item => {
      const categoryName = item.categoryName || 'Uncategorized';
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });
    
    return groups;
  }, [currentItems]);

  const getItemById = (itemId: string) => {
    return currentItems.find(item => item.id === itemId);
  };

  const handleItemSelection = (index: number, itemId: string) => {
    const selectedItem = getItemById(itemId);
    if (selectedItem) {
      form.setValue(`items.${index}.itemMasterId`, itemId);
      form.setValue(`items.${index}.nomenclature`, selectedItem.nomenclature);
    }
  };

  const handleAddNewItemMaster = async (values: CreateItemMasterRequest) => {
    try {

      // Call the mutation function directly
      createItemMaster(values);
      
      // Close dialog immediately - the success/error handling is done in the hook
      setIsDialogOpen(false);
      
    } catch (error) {

      // Show error toast
      toast({
        title: "Error",
        description: "Failed to create item master. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate total amount for all items
  const calculateTotalAmount = () => {
    const items = form.watch('items') || [];
    return items.reduce((total: number, item: any) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.estimatedUnitPrice) || 0;
      return total + (quantity * unitPrice);
    }, 0);
  };

  const totalAmount = calculateTotalAmount();
  const itemsTitle = isSpotPurchase ? 'Petty Purchase Items' : 'Tender Items';
  const itemsDesc = isSpotPurchase ? 'Add items from the Item Master for this Petty Purchase.' : 'Add items from the Item Master for this tender.';
  return (
    <Card data-testid="items-section" data-field="items">
      <CardHeader>
        <div>
          <CardTitle>{itemsTitle}</CardTitle>
          <CardDescription>{itemsDesc}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label className="text-base font-semibold">Items & Specifications</Label>
          {form.formState.errors.items?.root && (
            <p className="text-sm text-red-600">{form.formState.errors.items.root.message}</p>
          )}
          
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4 item-row" data-testid={`item-${index}`}>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                {/* Item Selection */}
                <div className="md:col-span-2">
                  <Label htmlFor={`items.${index}.itemMasterId`} className="block mb-2">
                    Select Item *
                  </Label>
                  <Controller
                    name={`items.${index}.itemMasterId`}
                    control={form.control}
                    render={({ field: { onChange, value } }) => (
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(itemId) => {
                            if (itemId === "ADD_NEW_ITEM") {
                              setIsDialogOpen(true);
                            } else {
                              onChange(itemId);
                              handleItemSelection(index, itemId);
                            }
                          }}
                          value={value}
                          disabled={isLoading || isReadOnly}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {/* Add New Item Option */}
                            <SelectItem value="ADD_NEW_ITEM" className="text-blue-600 font-medium border-b">
                              <div className="flex items-center">
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Item Master
                              </div>
                            </SelectItem>
                            {/* Existing Items */}
                            {Object.entries(groupedItems).map(([categoryName, items]) => (
                              <div key={categoryName}>
                                <div className="px-2 py-1 text-sm font-bold text-blue-700 bg-blue-50 border-b">
                                  {categoryName}
                                </div>
                                {items.map((item) => (
                                  <SelectItem key={item.id} value={item.id} className="pl-4">
                                    <div className="flex flex-col">
                                      <span className="font-medium">{item.nomenclature}</span>
                                      <span className="text-xs text-gray-500">
                                        Code: {item.itemCode} | Sub: {item.subCategoryName} | Unit: {item.unit}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                        {/* Plus button next to combobox */}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="ml-1"
                          aria-label="Add New Item Master"
                          onClick={() => setIsDialogOpen(true)}
                          tabIndex={-1}
                          data-testid={`add-item-master-combobox-${index}`}
                        >
                          <Plus className="h-4 w-4 text-blue-600" />
                        </Button>
                        
                        {/* Eye icon with tooltip for item details */}
                        {form.watch(`items.${index}.itemMasterId`) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-800"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="p-3">
                                {(() => {
                                  const selectedItem = getItemById(form.watch(`items.${index}.itemMasterId`));
                                  return selectedItem ? (
                                    <div className="space-y-1 text-sm">
                                      <div><strong>Item:</strong> {selectedItem.nomenclature}</div>
                                      <div><strong>Category:</strong> {selectedItem.categoryName}</div>
                                      <div><strong>Sub-Category:</strong> {selectedItem.subCategoryName}</div>
                                      <div><strong>Code:</strong> {selectedItem.itemCode}</div>
                                      <div><strong>Unit:</strong> {selectedItem.unit}</div>
                                    </div>
                                  ) : null;
                                })()}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    )}
                  />
                  {form.formState.errors.items?.[index]?.itemMasterId && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.items[index]?.itemMasterId?.message}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                  <Input
                    id={`items.${index}.quantity`}
                    type="number"
                    placeholder="Qty"
                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    disabled={isLoading || isReadOnly}
                  />
                  {form.formState.errors.items?.[index]?.quantity && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.items[index]?.quantity?.message}
                    </p>
                  )}
                </div>

                {/* Unit Price */}
                <div>
                  <Label htmlFor={`items.${index}.estimatedUnitPrice`}>Unit Price *</Label>
                  <Input
                    id={`items.${index}.estimatedUnitPrice`}
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    {...form.register(`items.${index}.estimatedUnitPrice`, { valueAsNumber: true })}
                    disabled={isLoading || isReadOnly}
                  />
                  {form.formState.errors.items?.[index]?.estimatedUnitPrice && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.items[index]?.estimatedUnitPrice?.message}
                    </p>
                  )}
                </div>

                {/* Specifications */}
                <div className="md:col-span-2">
                  <Label htmlFor={`items.${index}.specifications`}>Specifications</Label>
                  <Textarea
                    id={`items.${index}.specifications`}
                    placeholder="Enter detailed specifications..."
                    rows={4}
                    className="min-h-[80px]"
                    {...form.register(`items.${index}.specifications`)}
                    disabled={isLoading || isReadOnly}
                  />
                </div>

                {/* Remove Button */}
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => remove(index)}
                    disabled={isLoading || isReadOnly}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Total Amount Display */}
          {fields.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Items:</span> {fields.length}
                </div>
                <div className="text-lg font-semibold text-blue-600">
                  <span className="text-sm text-gray-600 mr-2">Total Amount:</span>
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            disabled={isLoading || isReadOnly}
            data-testid="add-item"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardContent>

      {/* Add New Item Master Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Item Master</DialogTitle>
          </DialogHeader>
          <ItemMasterForm
            onSubmit={async (values) => {
              await handleAddNewItemMaster(values);
              // Refresh item master data after adding
              refreshData();
            }}
            onCancel={() => setIsDialogOpen(false)}
            isLoading={false}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ItemMasterItemsSection;
