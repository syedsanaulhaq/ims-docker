import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Save, ArrowLeft, Trash2, CalendarIcon } from 'lucide-react';

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const API_BASE_URL = 'http://localhost:3001';

// Form schema matching the EXACT database tenders table structure
const tenderSchema = z.object({
  // Basic Information
  reference_number: z.string().min(1, "Reference number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  
  // Financial
  estimated_value: z.coerce.number().min(0, "Estimated value must be positive").optional(),
  individual_total: z.string().optional(),
  actual_price_total: z.coerce.number().optional(),
  
  // Dates
  publish_date: z.date().optional(),
  publication_date: z.date().optional(),
  submission_date: z.date().optional(),
  submission_deadline: z.date().optional(),
  opening_date: z.date().optional(),
  advertisement_date: z.date().optional(),
  
  // Status and Type
  status: z.string().optional(),
  tender_status: z.string().optional(),
  tender_spot_type: z.string().optional(),
  tender_type: z.string().optional(),
  tender_number: z.string().optional(),
  
  // Procurement
  procurement_method: z.string().optional(),
  procedure_adopted: z.string().optional(),
  publication_daily: z.string().optional(),
  
  // Organizational IDs (stored as nvarchar(max) in DB)
  office_ids: z.string().optional(),
  wing_ids: z.string().optional(), 
  dec_ids: z.string().optional(),
  
  // Vendor
  vendor_id: z.string().optional(),
  
  // File paths
  document_path: z.string().optional(),
  contract_file_path: z.string().optional(),
  loi_file_path: z.string().optional(),
  noting_file_path: z.string().optional(),
  po_file_path: z.string().optional(),
  rfp_file_path: z.string().optional(),
  
  // Items
  items: z.array(z.object({
    item_master_id: z.string().min(1, "Item is required"),
    nomenclature: z.string().min(1, "Nomenclature is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    estimated_unit_price: z.coerce.number().min(0, "Unit price must be positive"),
    specifications: z.string().optional(),
    remarks: z.string().optional(),
  })).min(1, "At least one item is required"),
});

type TenderFormData = z.infer<typeof tenderSchema>;

const ContractTenderForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<TenderFormData>({
    resolver: zodResolver(tenderSchema),
    defaultValues: {
      reference_number: '',
      title: '',
      description: '',
      estimated_value: 0,
      individual_total: '',
      actual_price_total: 0,
      publish_date: undefined,
      publication_date: undefined,
      submission_date: undefined,
      submission_deadline: undefined,
      opening_date: undefined,
      advertisement_date: undefined,
      status: 'Draft',
      tender_status: 'Draft',
      tender_spot_type: 'Contract/Tender',
      tender_type: '',
      tender_number: '',
      procurement_method: '',
      procedure_adopted: '',
      publication_daily: '',
      office_ids: '',
      wing_ids: '',
      dec_ids: '',
      vendor_id: '',
      document_path: '',
      contract_file_path: '',
      loi_file_path: '',
      noting_file_path: '',
      po_file_path: '',
      rfp_file_path: '',
      items: [{
        item_master_id: '',
        nomenclature: '',
        quantity: 1,
        estimated_unit_price: 0,
        specifications: '',
        remarks: '',
      }],
    },
  });

  // Handle form submission
  const onSubmit = async (data: TenderFormData) => {
    try {
      setSaving(true);
      
      // Prepare payload for backend
      const payload = {
        ...data,
        publish_date: data.publish_date ? format(data.publish_date, 'yyyy-MM-dd') : null,
        publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
        submission_date: data.submission_date ? format(data.submission_date, 'yyyy-MM-dd') : null,
        submission_deadline: data.submission_deadline ? format(data.submission_deadline, 'yyyy-MM-dd') : null,
        opening_date: data.opening_date ? format(data.opening_date, 'yyyy-MM-dd') : null,
        advertisement_date: data.advertisement_date ? format(data.advertisement_date, 'yyyy-MM-dd') : null,
        created_by: 'system',
      };

      const url = isEditMode 
        ? `${API_BASE_URL}/api/tenders/${id}`
        : `${API_BASE_URL}/api/tenders`;
        
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditMode ? 'update' : 'create'} tender`);
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: `Tender ${isEditMode ? 'updated' : 'created'} successfully`,
      });

      // Navigate back to tenders list
      navigate('/dashboard/tenders');

    } catch (error) {
      console.error('Error submitting tender:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save tender",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/dashboard/tenders')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? 'Edit Tender (Database Schema Fixed)' : 'Create New Tender (Database Schema Fixed)'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update tender information - All database fields matched' : 'Fill in the tender details - All database fields matched'}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <FormField
                  control={form.control}
                  name="tender_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tender number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tender_spot_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tender Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tender type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Contract/Tender">Contract/Tender</SelectItem>
                          <SelectItem value="Petty Purchase">Petty Purchase</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter tender title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter tender description" 
                          {...field} 
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimated_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Value</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tender_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Published">Published</SelectItem>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Awarded">Awarded</SelectItem>
                          <SelectItem value="Cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>

          {/* Date Information */}
          <Card>
            <CardHeader>
              <CardTitle>Date Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <FormField
                  control={form.control}
                  name="publication_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Publication Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="submission_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Submission Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="opening_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Opening Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="advertisement_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Advertisement Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/tenders')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="flex items-center space-x-2">
              {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : (isEditMode ? 'Update Tender' : 'Create Tender')}</span>
            </Button>
          </div>

        </form>
      </Form>
    </div>
  );
};

export default ContractTenderForm;
