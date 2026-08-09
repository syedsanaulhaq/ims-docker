
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemCombobox } from "@/components/ui/item-combobox";
import { useItemsCombobox } from "@/hooks/useItemsCombobox";
import { useCategoriesData } from "@/hooks/useCategoriesData";
import { CreateItemMasterRequest } from '@/types/tender';
import { InventoryItem } from '@/hooks/useInventoryData';
import LoadingSpinner from "@/components/common/LoadingSpinner";

const itemMasterFormSchema = z.object({
  itemCode: z.string().min(1, "Item code is required"),
  nomenclature: z.string().min(1, "Nomenclature is required"),
  categoryId: z.string().min(1, "Category is required"),
  subCategoryId: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  specifications: z.string().optional(),
  description: z.string().optional(),
});

type ItemMasterFormValues = z.infer<typeof itemMasterFormSchema>;

interface ItemMasterFormProps {
  onSubmit: (values: CreateItemMasterRequest) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: Partial<CreateItemMasterRequest>;
}

// Common units as InventoryItem structure
const commonUnits: InventoryItem[] = [
  { id: 'PCS', name: 'PCS', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'PCS', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'KG', name: 'KG', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'KG', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'LTR', name: 'LTR', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'LTR', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'METER', name: 'METER', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'METER', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'BOX', name: 'BOX', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'BOX', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'PACK', name: 'PACK', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'PACK', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'REAM', name: 'REAM', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'REAM', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'SET', name: 'SET', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'SET', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'PAIR', name: 'PAIR', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'PAIR', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'ROLL', name: 'ROLL', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'ROLL', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'BOTTLE', name: 'BOTTLE', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'BOTTLE', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
  { id: 'BAG', name: 'BAG', category: 'Unit', currentStock: 0, minimumStock: 0, unit: 'BAG', location: '', status: 'Active', itemType: 'Unit', unitPrice: 0, vendorId: '' },
];

const ItemMasterForm: React.FC<ItemMasterFormProps> = ({
  onSubmit,
  onCancel,
  isLoading,
  initialData
}) => {
  const { allItems: allUnits, addCustomItem: addCustomUnit } = useItemsCombobox(commonUnits);
  const { categories, subCategories, isLoading: categoriesLoading } = useCategoriesData();

  const form = useForm<ItemMasterFormValues>({
    resolver: zodResolver(itemMasterFormSchema),
    defaultValues: {
      itemCode: initialData?.itemCode || '',
      nomenclature: initialData?.nomenclature || '',
      categoryId: initialData?.categoryId || '',
      subCategoryId: initialData?.subCategoryId || '',
      unit: initialData?.unit || '',
      specifications: initialData?.specifications || '',
      description: initialData?.description || '',
    },
  });

  const selectedCategoryId = form.watch('categoryId');
  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);
  const availableSubCategories = subCategories.filter(sub => sub.categoryId === selectedCategoryId);

  const handleSubmit = (values: ItemMasterFormValues) => {

    const itemMasterRequest: CreateItemMasterRequest = {
      itemCode: values.itemCode,
      nomenclature: values.nomenclature,
      categoryId: values.categoryId,
      subCategoryId: values.subCategoryId,
      unit: values.unit,
      specifications: values.specifications,
      description: values.description,
    };

    onSubmit(itemMasterRequest);
  };

  const handleUnitChange = (unitId: string) => {
    const selectedUnit = allUnits.find(unit => unit.id === unitId);
    if (selectedUnit) {
      form.setValue('unit', selectedUnit.name);
    }
  };

  const handleAddCustomUnit = (unitName: string) => {
    const newUnit = addCustomUnit(unitName);
    form.setValue('unit', newUnit.name);
    return newUnit;
  };

  if (categoriesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" className="mr-2" />
          <span>Loading categories...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Item Master</CardTitle>
        <CardDescription>Add or edit item master details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="itemCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Code *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter item code" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit *</FormLabel>
                    <FormControl>
                      <ItemCombobox
                        items={allUnits}
                        value={allUnits.find(unit => unit.name === field.value)?.id || ''}
                        onValueChange={handleUnitChange}
                        onAddItem={handleAddCustomUnit}
                        placeholder="Select or add unit..."
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('subCategoryId', '');
                      }}
                      value={field.value}
                      disabled={isLoading || categoriesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subCategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading || categoriesLoading || !selectedCategory}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Sub-Category (Optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableSubCategories.map((subCategory) => (
                          <SelectItem key={subCategory.id} value={subCategory.id}>
                            {subCategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="nomenclature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomenclature *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter item nomenclature" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specifications</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter item specifications" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter item description" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isLoading || categoriesLoading}>
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Item'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ItemMasterForm;
