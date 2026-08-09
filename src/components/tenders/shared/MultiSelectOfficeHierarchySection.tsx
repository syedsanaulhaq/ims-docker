import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from 'react-hook-form';
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';
import { MultiSelect } from '@/components/ui/multi-select';
import { Building2, Users, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MultiSelectOfficeHierarchySectionProps {
  form: UseFormReturn<any>;
  isLoading?: boolean;
  wingsDecLabel?: string;
  wingsDecHeading?: string;
  isReadOnly?: boolean;
}

const MultiSelectOfficeHierarchySection: React.FC<MultiSelectOfficeHierarchySectionProps> = ({ 
  form, 
  isLoading, 
  wingsDecLabel, 
  wingsDecHeading,
  isReadOnly = false
}) => {
  const { offices, wings, decs, isLoading: isLoadingHierarchy } = useOfficeHierarchy();

  const selectedOfficeIds = form.watch('officeIds') || [];
  const selectedWingIds = form.watch('wingIds') || [];

  // Convert offices to multi-select format
  const officeOptions = offices.map(office => ({
    label: office.Name || 'Unnamed Office',
    value: office.Id.toString(),
    icon: Building2
  }));

  // Filter wings based on selected offices
  const filteredWings = wings.filter(wing => 
    selectedOfficeIds.length === 0 || selectedOfficeIds.includes(wing.OfficeID?.toString())
  );

  const wingOptions = filteredWings.map(wing => ({
    label: `${wing.Name} (${wing.ShortName})`,
    value: wing.Id.toString(),
    icon: Users
  }));

  // Filter DECs based on selected wings
  const filteredDecs = decs.filter(dec => 
    selectedWingIds.length === 0 || selectedWingIds.includes(dec.WingID?.toString())
  );

  const decOptions = filteredDecs.map(dec => ({
    label: `${dec.Name} (${dec.ShortName})`,
    value: dec.Id.toString(),
    icon: MapPin
  }));

  const handleOfficeChange = (values: string[]) => {
    form.setValue('officeIds', values);
    // Reset dependent fields if no offices selected or different offices selected
    if (values.length === 0) {
      form.setValue('wingIds', []);
      form.setValue('decIds', []);
    } else {
      // Keep only wings that belong to selected offices
      const currentWingIds = form.getValues('wingIds') || [];
      const validWingIds = currentWingIds.filter((wingId: string) => {
        const wing = wings.find(w => w.Id.toString() === wingId);
        return wing && values.includes(wing.OfficeID?.toString());
      });
      form.setValue('wingIds', validWingIds);
    }
  };

  const handleWingChange = (values: string[]) => {
    form.setValue('wingIds', values);
    // Reset dependent fields if no wings selected or different wings selected
    if (values.length === 0) {
      form.setValue('decIds', []);
    } else {
      // Keep only DECs that belong to selected wings
      const currentDecIds = form.getValues('decIds') || [];
      const validDecIds = currentDecIds.filter((decId: string) => {
        const dec = decs.find(d => d.Id.toString() === decId);
        return dec && values.includes(dec.WingID?.toString());
      });
      form.setValue('decIds', validDecIds);
    }
  };

  const handleDecChange = (values: string[]) => {
    form.setValue('decIds', values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{wingsDecHeading ? wingsDecHeading.split('\n')[0] : 'Tender Related Wings/DEC'}</CardTitle>
        <CardDescription>{wingsDecHeading ? wingsDecHeading.split('\n')[1] : 'Select offices and wings (both required), and optionally select DECs for this tender.'}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Office Multi-Selection */}
        <FormField
          control={form.control}
          name="officeIds"
          render={({ field }) => (
            <FormItem data-field="officeIds">
              <FormLabel>Offices *</FormLabel>
              <FormControl>
                <MultiSelect
                  data-testid="office-multiselect"
                  options={officeOptions}
                  onValueChange={handleOfficeChange}
                  defaultValue={field.value || []}
                  placeholder="Select offices..."
                  variant="secondary"
                  animation={0.1}
                  maxCount={2}
                  disabled={isLoading || isLoadingHierarchy || isReadOnly}
                  className={isLoading || isLoadingHierarchy || isReadOnly ? "opacity-50 cursor-not-allowed" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Wing Multi-Selection */}
        <FormField
          control={form.control}
          name="wingIds"
          render={({ field }) => (
            <FormItem data-field="wingIds">
              <FormLabel>{
                wingsDecLabel && wingsDecLabel !== 'Tender Related Wings/DEC'
                  ? wingsDecLabel.includes('/')
                    ? wingsDecLabel.split('/')[0].replace('Related ', '').trim()
                    : wingsDecLabel
                  : 'Wings *'
              }</FormLabel>
              <FormControl>
                <MultiSelect
                  data-testid="wing-multiselect"
                  options={wingOptions}
                  onValueChange={handleWingChange}
                  defaultValue={field.value || []}
                  placeholder={selectedOfficeIds.length === 0 ? "Select offices first..." : "Select wings..."}
                  variant="secondary"
                  animation={0.1}
                  maxCount={2}
                  disabled={isLoading || isLoadingHierarchy || selectedOfficeIds.length === 0 || isReadOnly}
                  className={cn(
                    isLoading || isLoadingHierarchy || selectedOfficeIds.length === 0 || isReadOnly
                      ? "opacity-50 cursor-not-allowed" 
                      : ""
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* DEC Multi-Selection */}
        <FormField
          control={form.control}
          name="decIds"
          render={({ field }) => (
            <FormItem data-field="decIds">
              <FormLabel>{
                wingsDecLabel && wingsDecLabel !== 'Tender Related Wings/DEC'
                  ? wingsDecLabel.includes('/')
                    ? wingsDecLabel.split('/')[1].replace('Related ', '').trim()
                    : wingsDecLabel
                  : 'DECs'
              }</FormLabel>
              <FormControl>
                <MultiSelect
                  data-testid="dec-multiselect"
                  options={decOptions}
                  onValueChange={handleDecChange}
                  defaultValue={field.value || []}
                  placeholder={selectedWingIds.length === 0 ? "Select wings first..." : "Select DECs..."}
                  variant="secondary"
                  animation={0.1}
                  maxCount={2}
                  disabled={isLoading || isLoadingHierarchy || selectedWingIds.length === 0 || isReadOnly}
                  className={cn(
                    isLoading || isLoadingHierarchy || selectedWingIds.length === 0 || isReadOnly
                      ? "opacity-50 cursor-not-allowed" 
                      : ""
                  )}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

      </CardContent>
    </Card>
  );
};

export default MultiSelectOfficeHierarchySection;
