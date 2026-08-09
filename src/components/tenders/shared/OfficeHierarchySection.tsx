
/**
 * @deprecated This component has been replaced by MultiSelectOfficeHierarchySection
 * Use MultiSelectOfficeHierarchySection for new implementations
 * This component is kept for backward compatibility only
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from 'react-hook-form';
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';

interface OfficeHierarchySectionProps {
  form: UseFormReturn<any>;
  isLoading?: boolean;
}

const OfficeHierarchySection: React.FC<OfficeHierarchySectionProps> = ({ 
  form, 
  isLoading 
}) => {
  const { offices, wings, decs, isLoading: isLoadingHierarchy } = useOfficeHierarchy();

  const selectedOfficeId = form.watch('officeId');
  const selectedWingId = form.watch('wingId');

  // Filter wings based on selected office
  const filteredWings = wings.filter(wing => 
    !selectedOfficeId || wing.OfficeID === parseInt(selectedOfficeId)
  );

  // Filter DECs based on selected wing
  const filteredDecs = decs.filter(dec => 
    !selectedWingId || dec.WingID === selectedWingId
  );

  const handleOfficeChange = (value: string) => {
    form.setValue('officeId', value);
    // Reset dependent fields
    form.setValue('wingId', undefined);
    form.setValue('decId', undefined);
  };

  const handleWingChange = (value: string) => {
    const wingId = parseInt(value);
    form.setValue('wingId', wingId);
    // Reset dependent fields
    form.setValue('decId', undefined);
  };

  const handleDecChange = (value: string) => {
    const decId = parseInt(value);
    form.setValue('decId', decId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Office Hierarchy</CardTitle>
        <CardDescription>Select the office hierarchy for this tender.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Office Selection */}
        <FormField
          control={form.control}
          name="officeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Office *</FormLabel>
              <Select 
                onValueChange={handleOfficeChange} 
                value={field.value || ''}
                disabled={isLoading || isLoadingHierarchy}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an office" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {offices.length === 0 ? (
                    <SelectItem value="no-offices" disabled>
                      No offices available
                    </SelectItem>
                  ) : (
                    offices.map((office) => (
                      <SelectItem 
                        key={office.Id} 
                        value={office.Id.toString()}
                      >
                        {office.Name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Wing Selection */}
        <FormField
          control={form.control}
          name="wingId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wing (Optional)</FormLabel>
              <Select 
                onValueChange={handleWingChange}
                value={field.value ? field.value.toString() : ''}
                disabled={isLoading || isLoadingHierarchy || !selectedOfficeId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a wing" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredWings.length === 0 ? (
                    <SelectItem value="no-wings" disabled>
                      {selectedOfficeId ? 'No wings available for selected office' : 'Select an office first'}
                    </SelectItem>
                  ) : (
                    filteredWings.map((wing) => (
                      <SelectItem 
                        key={wing.Id} 
                        value={wing.Id.toString()}
                      >
                        {wing.Name} ({wing.ShortName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* DEC Selection */}
        <FormField
          control={form.control}
          name="decId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DEC (Optional)</FormLabel>
              <Select 
                onValueChange={handleDecChange}
                value={field.value ? field.value.toString() : ''}
                disabled={isLoading || isLoadingHierarchy || !selectedWingId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a DEC" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredDecs.length === 0 ? (
                    <SelectItem value="no-decs" disabled>
                      {selectedWingId ? 'No DECs available for selected wing' : 'Select a wing first'}
                    </SelectItem>
                  ) : (
                    filteredDecs.map((dec) => (
                      <SelectItem 
                        key={dec.Id} 
                        value={dec.Id.toString()}
                      >
                        {dec.Name} ({dec.ShortName})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default OfficeHierarchySection;
