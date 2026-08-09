
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, Controller } from "react-hook-form";
import { ItemCombobox } from '@/components/ui/item-combobox';
import { useItemsCombobox } from '@/hooks/useItemsCombobox';
import { InventoryItem } from '@/hooks/useInventoryData';

interface ItemsSectionProps {
  form: any;
  isLoading?: boolean;
  inventoryItems: InventoryItem[];
}

const ItemsSection: React.FC<ItemsSectionProps> = ({ form, isLoading, inventoryItems }) => {
  const { allItems, addCustomItem } = useItemsCombobox(inventoryItems);
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleAddItem = () => {
    append({
      inventoryItemId: '',
      quantity: 1,
      estimatedUnitPrice: 0,
      nomenclature: '',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Items</CardTitle>
        <CardDescription>Add items for the tender.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Label className="text-base font-semibold">Items & Nomenclature</Label>
          {form.formState.errors.items?.root && (
            <p className="text-sm text-red-600">{form.formState.errors.items.root.message}</p>
          )}
          
          {fields.map((field, index) => (
            <Card key={field.id} className="p-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor={`items.${index}.inventoryItemId`} className="block mb-2">
                    Select Item *
                  </Label>
                  <Controller
                    name={`items.${index}.inventoryItemId`}
                    control={form.control}
                    render={({ field: { onChange, value } }) => (
                      <ItemCombobox
                        items={allItems}
                        value={value}
                        onValueChange={onChange}
                        onAddItem={addCustomItem}
                        placeholder="Select or add new item..."
                        className="w-full"
                      />
                    )}
                  />
                  {form.formState.errors.items?.[index]?.inventoryItemId && (
                    <p className="text-sm text-red-600 mt-1">
                      {form.formState.errors.items[index]?.inventoryItemId?.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                    <Input
                      id={`items.${index}.quantity`}
                      type="number"
                      placeholder="Quantity"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                    {form.formState.errors.items?.[index]?.quantity && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`items.${index}.estimatedUnitPrice`}>Estimated Unit Price *</Label>
                    <Input
                      id={`items.${index}.estimatedUnitPrice`}
                      type="number"
                      placeholder="Estimated Unit Price"
                      {...form.register(`items.${index}.estimatedUnitPrice`, { valueAsNumber: true })}
                      disabled={isLoading}
                    />
                    {form.formState.errors.items?.[index]?.estimatedUnitPrice && (
                      <p className="text-sm text-red-600 mt-1">
                        {form.formState.errors.items[index]?.estimatedUnitPrice?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor={`items.${index}.nomenclature`}>Nomenclature</Label>
                    <Input
                      id={`items.${index}.nomenclature`}
                      placeholder="Nomenclature"
                      {...form.register(`items.${index}.nomenclature`)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => remove(index)}
                disabled={isLoading}
                className="mt-4"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
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

export default ItemsSection;
