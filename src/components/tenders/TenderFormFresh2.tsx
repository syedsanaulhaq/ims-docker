import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import { useToast } from "@/hooks/use-toast";
import { officeApi } from "@/services/officeApiClean";
import { cn } from "@/lib/utils";
import { Building2, Users, MapPin } from "lucide-react";

const API_BASE_URL = "";

// Schema exactly matching your SQL Server tenders table with multi-select arrays
const tenderSchema = z.object({
  // Basic Information
  reference_number: z.string().min(1, "Reference number is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  
  // Financial (removed individual_total and actual_price_total)
  estimated_value: z.coerce.number().min(0, "Estimated value must be positive").optional(),
  
  // Dates (including advertisement_date)
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
  
  // Procurement (procurement_method as combobox)
  procurement_method: z.string().optional(),
  procedure_adopted: z.string().optional(),
  publication_daily: z.string().optional(),
  
  // Organizational IDs (multi-select arrays)
  officeIds: z.array(z.string()).min(1, "At least one office is required"),
  wingIds: z.array(z.string()).min(1, "At least one wing is required"),
  decIds: z.array(z.string()).optional(),
  
  // Vendor
  vendor_id: z.string().optional(),
  
  // File paths
  document_path: z.string().optional(),
  contract_file_path: z.string().optional(),
  loi_file_path: z.string().optional(),
  noting_file_path: z.string().optional(),
  po_file_path: z.string().optional(),
  rfp_file_path: z.string().optional(),
});

type TenderFormData = z.infer<typeof tenderSchema>;

// Procurement method options
const procurementMethods = [
  { value: "Open Competitive Bidding", label: "Open Competitive Bidding" },
  { value: "MoU", label: "MoU" },
  { value: "Direct Contracting", label: "Direct Contracting" },
  { value: "Limited Tendering", label: "Limited Tendering" },
  { value: "Single Source", label: "Single Source" },
];

const TenderFormFresh2: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);
  
  // State for office hierarchy data from real database tables
  const [offices, setOffices] = useState<any[]>([]);
  const [wings, setWings] = useState<any[]>([]);
  const [decs, setDecs] = useState<any[]>([]);
  const [hierarchyLoading, setHierarchyLoading] = useState(true);

  const form = useForm<TenderFormData>({
    resolver: zodResolver(tenderSchema),
    defaultValues: {
      reference_number: "",
      title: "",
      description: "",
      estimated_value: 0,
      publish_date: new Date(),
      publication_date: new Date(),
      submission_date: new Date(),
      submission_deadline: new Date(),
      opening_date: new Date(),
      advertisement_date: new Date(),
      status: "Draft",
      tender_status: "Open",
      tender_spot_type: "Contract/Tender",
      tender_type: "",
      tender_number: "",
      procurement_method: "",
      procedure_adopted: "",
      publication_daily: "",
      officeIds: [],
      wingIds: [],
      decIds: [],
      vendor_id: "",
      document_path: "",
      contract_file_path: "",
      loi_file_path: "",
      noting_file_path: "",
      po_file_path: "",
      rfp_file_path: "",
    },
  });

  // Watch office selection for wing filtering
  const selectedOfficeIds = form.watch("officeIds");
  const selectedWingIds = form.watch("wingIds");

  // Filter wings based on selected offices (using correct property names from WingsInformation)
  const filteredWings = wings.filter(wing => 
    selectedOfficeIds.length === 0 || selectedOfficeIds.includes(wing.OfficeID?.toString() || "")
  );

  // Filter DECs based on selected wings (using correct property names from DEC_MST)
  const filteredDecs = decs.filter(dec => 
    selectedWingIds.length === 0 || selectedWingIds.includes(dec.WingID?.toString() || "")
  );

  // Load office hierarchy data from real database tables
  useEffect(() => {
    const loadHierarchyData = async () => {
      try {
        setHierarchyLoading(true);
        const [officesData, wingsData, decsData] = await Promise.all([
          officeApi.getOffices(),    // From tblOffices
          officeApi.getWings(),      // From WingsInformation
          officeApi.getDecs()        // From DEC_MST
        ]);
        
        setOffices(officesData);
        setWings(wingsData);
        setDecs(decsData);
        
      } catch (error) {
        console.error('❌ Error loading office hierarchy:', error);
        toast({
          title: "Warning",
          description: "Could not load office hierarchy data from database",
          variant: "destructive",
        });
      } finally {
        setHierarchyLoading(false);
      }
    };

    loadHierarchyData();
  }, []);

  // Fetch tender data if editing
  useEffect(() => {
    if (isEditing && id) {
      fetchTenderData(id);
    }
  }, [isEditing, id]);

  const fetchTenderData = async (tenderId: string) => {
    try {
      setFetchLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenders/${tenderId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tender: ${response.statusText}`);
      }
      
      const tender = await response.json();
      
      // Map the fetched data to form values with multi-select arrays
      const formData = {
        reference_number: tender.reference_number || "",
        title: tender.title || "",
        description: tender.description || "",
        estimated_value: tender.estimated_value || 0,
        // Convert date strings to Date objects
        publish_date: tender.publish_date ? new Date(tender.publish_date) : undefined,
        publication_date: tender.publication_date ? new Date(tender.publication_date) : undefined,
        submission_date: tender.submission_date ? new Date(tender.submission_date) : undefined,
        submission_deadline: tender.submission_deadline ? new Date(tender.submission_deadline) : undefined,
        opening_date: tender.opening_date ? new Date(tender.opening_date) : undefined,
        advertisement_date: tender.advertisement_date ? new Date(tender.advertisement_date) : undefined,
        status: tender.status || "Draft",
        tender_status: tender.tender_status || "Open",
        tender_spot_type: tender.tender_spot_type || "",
        tender_type: tender.tender_type || "",
        tender_number: tender.tender_number || "",
        procurement_method: tender.procurement_method || "",
        procedure_adopted: tender.procedure_adopted || "",
        publication_daily: tender.publication_daily || "",
        // Convert comma-separated strings to arrays for multi-select
        officeIds: tender.office_ids ? tender.office_ids.split(',').filter(Boolean) : [],
        wingIds: tender.wing_ids ? tender.wing_ids.split(',').filter(Boolean) : [],
        decIds: tender.dec_ids ? tender.dec_ids.split(',').filter(Boolean) : [],
        vendor_id: tender.vendor_id || "",
        document_path: tender.document_path || "",
        contract_file_path: tender.contract_file_path || "",
        loi_file_path: tender.loi_file_path || "",
        noting_file_path: tender.noting_file_path || "",
        po_file_path: tender.po_file_path || "",
        rfp_file_path: tender.rfp_file_path || "",
      };
      
      form.reset(formData);
    } catch (error) {
      console.error("Error fetching tender:", error);
      toast({
        title: "Error",
        description: "Failed to load tender data",
        variant: "destructive",
      });
    } finally {
      setFetchLoading(false);
    }
  };

  const onSubmit = async (data: TenderFormData) => {
    try {
      setLoading(true);
      
      // Prepare the payload exactly as your database expects
      const payload = {
        reference_number: data.reference_number,
        title: data.title,
        description: data.description || null,
        estimated_value: data.estimated_value || null,
        publish_date: data.publish_date ? format(data.publish_date, 'yyyy-MM-dd') : null,
        publication_date: data.publication_date ? format(data.publication_date, 'yyyy-MM-dd') : null,
        submission_date: data.submission_date ? format(data.submission_date, 'yyyy-MM-dd') : null,
        submission_deadline: data.submission_deadline ? format(data.submission_deadline, 'yyyy-MM-dd') : null,
        opening_date: data.opening_date ? format(data.opening_date, 'yyyy-MM-dd') : null,
        advertisement_date: data.advertisement_date ? format(data.advertisement_date, 'yyyy-MM-dd') : null,
        status: data.status,
        tender_status: data.tender_status,
        tender_spot_type: data.tender_spot_type,
        tender_type: data.tender_type,
        tender_number: data.tender_number,
        procurement_method: data.procurement_method,
        procedure_adopted: data.procedure_adopted,
        publication_daily: data.publication_daily,
        // Convert arrays to comma-separated strings for database
        office_ids: data.officeIds.join(','),
        wing_ids: data.wingIds.join(','),
        dec_ids: data.decIds.join(','),
        vendor_id: data.vendor_id || null,
        document_path: data.document_path,
        contract_file_path: data.contract_file_path,
        loi_file_path: data.loi_file_path,
        noting_file_path: data.noting_file_path,
        po_file_path: data.po_file_path,
        rfp_file_path: data.rfp_file_path,
      };

      const url = isEditing 
        ? `${API_BASE_URL}/api/tenders/${id}`
        : `${API_BASE_URL}/api/tenders`;
        
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} tender: ${errorData}`);
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: `Tender ${isEditing ? 'updated' : 'created'} successfully!`,
      });

      navigate('/tenders');
    } catch (error) {
      console.error("❌ Error saving tender:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} tender`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading tender data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tenders')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Tenders</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditing ? "Edit Tender" : "Create New Tender"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update tender information" : "Fill in the details below to create a new tender"}
            </p>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential details about the tender
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter reference number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
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
                        rows={3}
                        {...field} 
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
                        placeholder="Enter estimated value"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tender_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tender Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tender number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Procurement Information */}
          <Card>
            <CardHeader>
              <CardTitle>Procurement Information</CardTitle>
              <CardDescription>
                Procurement method and procedure details
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="procurement_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procurement Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select procurement method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {procurementMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
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
                name="procedure_adopted"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Procedure Adopted</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter procedure adopted" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="publication_daily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publication Daily</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter publication daily" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Office Hierarchy Multi-Select */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Office Hierarchy</span>
              </CardTitle>
              <CardDescription>
                Select the offices, wings, and DECs for this tender
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Offices Multi-Select */}
              <FormField
                control={form.control}
                name="officeIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>Offices *</span>
                    </FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={offices.map(office => ({
                          value: office.intOfficeID?.toString() || "",
                          label: office.strOfficeName || "",
                        }))}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="Select offices"
                        variant="inverted"
                        animation={2}
                        maxCount={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Wings Multi-Select */}
              <FormField
                control={form.control}
                name="wingIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Wings *</span>
                    </FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={filteredWings.map(wing => ({
                          value: wing.Id?.toString() || "",
                          label: wing.Name || "",
                        }))}
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        placeholder="Select wings"
                        variant="inverted"
                        animation={2}
                        maxCount={3}
                        disabled={selectedOfficeIds.length === 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* DECs Multi-Select */}
              <FormField
                control={form.control}
                name="decIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4" />
                      <span>DECs</span>
                    </FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={filteredDecs.map(dec => ({
                          value: dec.intAutoID?.toString() || "",
                          label: dec.DECName || "",
                        }))}
                        onValueChange={field.onChange}
                        defaultValue={field.value || []}
                        placeholder="Select DECs"
                        variant="inverted"
                        animation={2}
                        maxCount={3}
                        disabled={selectedWingIds.length === 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
              <CardDescription>
                Set the key dates for the tender process
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                name="publish_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Publish Date</FormLabel>
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
                name="submission_deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Submission Deadline</FormLabel>
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
            </CardContent>
          </Card>

          {/* Status Information */}
          <Card>
            <CardHeader>
              <CardTitle>Status Information</CardTitle>
              <CardDescription>
                Current status and type information
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter status" {...field} />
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
                    <FormLabel>Tender Status</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tender status" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tender_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tender Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tender type" {...field} />
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
                    <FormLabel>Tender Spot Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tender spot type" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/tenders')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Update Tender" : "Create Tender"}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default TenderFormFresh2;

