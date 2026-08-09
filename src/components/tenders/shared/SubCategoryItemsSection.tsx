
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useFieldArray, Controller } from "react-hook-form";
import { useItemMasterData } from '@/hooks/useItemMasterData';

interface SubCategoryItemsSectionProps {
  form: any;
  isLoading?: boolean;
}

const SubCategoryItemsSection: React.FC<SubCategoryItemsSectionProps> = ({ form, isLoading }) => {
  const { itemMasters, isLoading: isLoadingItemMasters } = useItemMasterData();
  
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

  // Group item masters by category and subcategory
  const groupedItems = React.useMemo(() => {
    const groups: { [key: string]: { [key: string]: any[] } } = {};
    
    itemMasters.forEach(item => {
      const categoryName = item.categoryName || 'Uncategorized';
      const subCategoryName = item.subCategoryName || 'Uncategorized';
      
      if (!groups[categoryName]) {
        groups[categoryName] = {};
      }
      if (!groups[categoryName][subCategoryName]) {
        groups[categoryName][subCategoryName] = [];
      }
      groups[categoryName][subCategoryName].push(item);
    });
    
    return groups;
  }, [itemMasters]);

  const getItemById = (itemId: string) => {
    return itemMasters.find(item => item.id === itemId);
  };

  const handleItemSelection = (itemId: string, index: number) => {
    const selectedItem = getItemById(itemId);
    if (selectedItem) {
      form.setValue(`items.${index}.itemMasterId`, itemId);
      form.setValue(`items.${index}.nomenclature`, selectedItem.nomenclature);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tender Items</CardTitle>
        <CardDescription>Add items by selecting from Category → SubCategory → Items hierarchy.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label className="text-base font-semibold">Items & Specifications</Label>
          {form.formState.errors.items?.root && (
            <p className="text-sm text-red-600">{form.formState.errors.items.root.message}</p>
          )}
          
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
                {/* Item Selection - Category → SubCategory → Item */}
                <div className="md:col-span-2">
                  <Label htmlFor={`items.${index}.itemMasterId`} className="block mb-2">
                    Select Item (Category → SubCategory → Item) *
                  </Label>
                  <div className="flex items-center gap-2">
                    <Controller
                      name={`items.${index}.itemMasterId`}
                      control={form.control}
                      render={({ field: { onChange, value } }) => (
                        <Select
                          onValueChange={(itemId) => {
                            onChange(itemId);
                            handleItemSelection(itemId, index);
                          }}
                          value={value}
                          disabled={isLoading || isLoadingItemMasters}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select item..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {Object.entries(groupedItems).map(([categoryName, subCategories]) => (
                              <div key={categoryName}>
                                <div className="px-2 py-1 text-sm font-bold text-blue-700 bg-blue-50 border-b">
                                  {categoryName}
                                </div>
                                {Object.entries(subCategories).map(([subCategoryName, items]) => (
                                  <div key={`${categoryName}-${subCategoryName}`}>
                                    <div className="px-4 py-1 text-xs font-semibold text-green-700 bg-green-50">
                                      └ {subCategoryName}
                                    </div>
                                    {items.map((item) => (
                                      <SelectItem key={item.id} value={item.id} className="pl-8">
                                        <div className="flex flex-col">
                                          <span className="font-medium">{item.nomenclature}</span>
                                          <span className="text-xs text-gray-500">
                                            Code: {item.itemCode} | Unit: {item.unit}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    
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
                  {form.formState.errors.items?.[index]?.itemMasterId && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.items[index]?.itemMasterId?.message}
                    </p>
                  )}
                </div>

                {/* Nomenclature (auto-filled) */}
                <div>
                  <Label htmlFor={`items.${index}.nomenclature`}>Nomenclature *</Label>
                  <Input
                    id={`items.${index}.nomenclature`}
                    placeholder="Auto-filled"
                    {...form.register(`items.${index}.nomenclature`)}
                    disabled={isLoading}
                    readOnly
                  />
                  {form.formState.errors.items?.[index]?.nomenclature && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.items[index]?.nomenclature?.message}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                  {form.formState.errors.items?.[index]?.estimatedUnitPrice && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.items[index]?.estimatedUnitPrice?.message}
                    </p>
                  )}
                </div>

                {/* Specifications */}
                <div>
                  <Label htmlFor={`items.${index}.specifications`}>Specifications</Label>
                  <Input
                    id={`items.${index}.specifications`}
                    placeholder="Specs"
                    {...form.register(`items.${index}.specifications`)}
                    disabled={isLoading}
                  />
                </div>

                {/* Remarks */}
                <div>
                  <Label htmlFor={`items.${index}.remarks`}>Remarks</Label>
                  <Input
                    id={`items.${index}.remarks`}
                    placeholder="Remarks"
                    {...form.register(`items.${index}.remarks`)}
                    disabled={isLoading}
                  />
                </div>

                {/* Remove Button */}
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => remove(index)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubCategoryItemsSection;
