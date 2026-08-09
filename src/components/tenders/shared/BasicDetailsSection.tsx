import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { useOfficeHierarchy } from '@/hooks/useOfficeHierarchy';
import MultiSelectOfficeHierarchySection from './MultiSelectOfficeHierarchySection';

interface BasicDetailsSectionProps {
  form: any;
  isLoading?: boolean;
  initialData?: any;
  isSpotPurchase?: boolean;
  showOfficeHierarchy?: boolean;
  showDepartment?: boolean;
  showCategory?: boolean;
  isReadOnly?: boolean;
}

const BasicDetailsSection: React.FC<BasicDetailsSectionProps> = ({ 
  form, 
  isLoading, 
  initialData, 
  isSpotPurchase = false,
  showOfficeHierarchy = true,
  isReadOnly = false
}) => {
  const { offices, wings, decs, isLoading: isLoadingHierarchy } = useOfficeHierarchy();

  // Handle date updates with proper form validation trigger
  const handleDateChange = (field: string, date: Date | undefined) => {
    if (date) {
      form.setValue(field, date, { shouldValidate: true, shouldDirty: true });
    }
  };

  // For Petty Purchase, use just 'Related Wings/DEC'.
  const wingsDecLabel = isSpotPurchase ? 'Related Wings/DEC' : 'Tender Related Wings/DEC';
  const wingsDecHeading = isSpotPurchase
    ? 'Related Wings/DEC\nSelect offices and wings (both required), and optionally select DECs for this Petty Purchase.'
    : 'Tender Related Wings/DEC\nSelect offices and wings (both required), and optionally select DECs for this tender.';
  const descriptionLabel = isSpotPurchase ? 'Enter the basic information for the Petty Purchase.' : 'Enter the basic information for the tender.';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic</CardTitle>
        <CardDescription>{descriptionLabel}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div data-field="title">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" name="title" placeholder={isSpotPurchase ? 'Petty Purchase Title' : 'Tender Title'} {...form.register("title")} disabled={isLoading || isReadOnly} />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div data-field="referenceNumber">
            <Label htmlFor="referenceNumber">Reference Number *</Label>
            <Input id="referenceNumber" name="referenceNumber" placeholder="Reference Number" {...form.register("referenceNumber")} disabled={isLoading || isReadOnly} />
            {form.formState.errors.referenceNumber && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.referenceNumber.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder={isSpotPurchase ? 'Petty Purchase Description' : 'Tender Description'} {...form.register("description")} disabled={isLoading || isReadOnly} />
          {form.formState.errors.description && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
          )}
        </div>

        {showOfficeHierarchy && (
          <MultiSelectOfficeHierarchySection
            form={form}
            isLoading={isLoading}
            wingsDecLabel={wingsDecLabel}
            wingsDecHeading={wingsDecHeading}
            isReadOnly={isReadOnly}
          />
        )}

        <div data-field="estimatedValue">
          <Label htmlFor="estimatedValue">Estimated Value *</Label>
          <Input
            id="estimatedValue"
            name="estimatedValue"
            type="number"
            placeholder="Estimated Value"
            {...form.register("estimatedValue", { valueAsNumber: true })}
            disabled={isLoading || isReadOnly}
          />
          {form.formState.errors.estimatedValue && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.estimatedValue.message}</p>
          )}
        </div>

        {isSpotPurchase ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="orderingDate">Ordering Date *</Label>
              <DatePicker
                id="orderingDate"
                onSelect={(date) => handleDateChange("orderingDate", date)}
                defaultDate={form.watch("orderingDate") || new Date()}
                disabled={isLoading}
              />
              {form.formState.errors.orderingDate && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.orderingDate.message}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div data-field="publishDate">
              <Label htmlFor="publishDate">Publish Date *</Label>
              <DatePicker
                id="publishDate"
                onSelect={(date) => handleDateChange("publishDate", date)}
                defaultDate={form.watch("publishDate") || new Date()}
                disabled={isLoading || isReadOnly}
              />
              {form.formState.errors.publishDate && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.publishDate.message}</p>
              )}
            </div>
            <div data-field="submissionDate">
              <Label htmlFor="submissionDate">Submission Date *</Label>
              <DatePicker
                id="submissionDate"
                onSelect={(date) => handleDateChange("submissionDate", date)}
                defaultDate={form.watch("submissionDate") || new Date()}
                disabled={isLoading || isReadOnly}
              />
              {form.formState.errors.submissionDate && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.submissionDate.message}</p>
              )}
            </div>
            <div data-field="openingDate">
              <Label htmlFor="openingDate">Opening Date *</Label>
              <DatePicker
                id="openingDate"
                onSelect={(date) => handleDateChange("openingDate", date)}
                defaultDate={form.watch("openingDate") || new Date()}
                disabled={isLoading || isReadOnly}
              />
              {form.formState.errors.openingDate && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.openingDate.message}</p>
              )}
            </div>
          </div>
        )}

        {!isSpotPurchase && (
          <div>
            <Label htmlFor="eligibilityCriteria">Eligibility Criteria</Label>
            <Textarea 
              id="eligibilityCriteria" 
              placeholder="Enter eligibility criteria for this tender" 
              {...form.register("eligibilityCriteria")} 
              disabled={isLoading || isReadOnly} 
            />
            {form.formState.errors.eligibilityCriteria && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.eligibilityCriteria.message}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BasicDetailsSection;
