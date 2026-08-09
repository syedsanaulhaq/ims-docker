import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Calendar, DollarSign, CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const API_BASE_URL = "http://localhost:3001";

interface TenderFormData {
  reference_number: string;
  title: string;
  description: string;
  estimated_value: number;
  status: string;
  tender_status: string;
  tender_spot_type: string;
  procurement_method: string;
  publication_date: string;
  submission_date: string;
  opening_date: string;
  vendor_name: string;
  vendor_contact: string;
  vendor_email: string;
  delivery_location: string;
  payment_terms: string;
  evaluation_criteria: string;
  bid_security_required: boolean;
  bid_security_amount: number;
  performance_guarantee_required: boolean;
  performance_guarantee_percentage: number;
  contract_duration_months: number;
  special_conditions: string;
  technical_specifications: string;
  eligibility_criteria: string;
}

const TenderForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEditing);
  
  const [formData, setFormData] = useState<TenderFormData>({
    reference_number: "",
    title: "",
    description: "",
    estimated_value: 0,
    status: "draft",
    tender_status: "open",
    tender_spot_type: "goods",
    procurement_method: "open_tender",
    publication_date: "",
    submission_date: "",
    opening_date: "",
    vendor_name: "",
    vendor_contact: "",
    vendor_email: "",
    delivery_location: "",
    payment_terms: "",
    evaluation_criteria: "",
    bid_security_required: false,
    bid_security_amount: 0,
    performance_guarantee_required: false,
    performance_guarantee_percentage: 0,
    contract_duration_months: 0,
    special_conditions: "",
    technical_specifications: "",
    eligibility_criteria: "",
  });

  // Fetch tender data if editing
  useEffect(() => {
    if (isEditing && id) {
      fetchTender(id);
    }
  }, [id, isEditing]);

  const fetchTender = async (tenderId: string) => {
    try {
      setFetchLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/tenders/${tenderId}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch tender");
      }
      
      const tender = await response.json();
      
      // Convert dates to input format (YYYY-MM-DD) and ensure no null values
      const cleanedTender = {
        reference_number: tender.reference_number || "",
        title: tender.title || "",
        description: tender.description || "",
        estimated_value: tender.estimated_value || 0,
        status: tender.status || "draft",
        tender_status: tender.tender_status || "open",
        tender_spot_type: tender.tender_spot_type || "goods",
        procurement_method: tender.procurement_method || "open_tender",
        vendor_name: tender.vendor_name || "",
        vendor_contact: tender.vendor_contact || "",
        vendor_email: tender.vendor_email || "",
        delivery_location: tender.delivery_location || "",
        payment_terms: tender.payment_terms || "",
        evaluation_criteria: tender.evaluation_criteria || "",
        bid_security_required: tender.bid_security_required || false,
        bid_security_amount: tender.bid_security_amount || 0,
        performance_guarantee_required: tender.performance_guarantee_required || false,
        performance_guarantee_percentage: tender.performance_guarantee_percentage || 0,
        contract_duration_months: tender.contract_duration_months || 0,
        special_conditions: tender.special_conditions || "",
        technical_specifications: tender.technical_specifications || "",
        eligibility_criteria: tender.eligibility_criteria || "",
        publication_date: tender.publication_date ? 
          new Date(tender.publication_date).toISOString().split('T')[0] : "",
        submission_date: tender.submission_date ? 
          new Date(tender.submission_date).toISOString().split('T')[0] : "",
        opening_date: tender.opening_date ? 
          new Date(tender.opening_date).toISOString().split('T')[0] : "",
      };
      
      setFormData(cleanedTender);
      
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

  const handleInputChange = (field: keyof TenderFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const url = isEditing 
        ? `${API_BASE_URL}/api/tenders/${id}`
        : `${API_BASE_URL}/api/tenders`;
      
      const method = isEditing ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEditing ? 'update' : 'create'} tender`);
      }

      toast({
        title: "Success",
        description: `Tender ${isEditing ? 'updated' : 'created'} successfully`,
      });

      navigate("/dashboard/tenders");
      
    } catch (error) {
      console.error("Error saving tender:", error);
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
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard/tenders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? "Edit Tender" : "Create New Tender"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update tender information" : "Fill in the details to create a new tender"}
            </p>
          </div>
        </div>
        {isEditing && formData.status && (
          <Badge variant={formData.status === "finalized" ? "destructive" : "default"}>
            {formData.status}
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference_number">Reference Number</Label>
                <Input
                  id="reference_number"
                  value={formData.reference_number || ""}
                  onChange={(e) => handleInputChange("reference_number", e.target.value)}
                  placeholder="Enter reference number"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title || ""}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter tender title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Enter tender description"
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tender Details */}
        <Card>
          <CardHeader>
            <CardTitle>Tender Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tender_spot_type">Tender Type</Label>
                <Select 
                  value={formData.tender_spot_type} 
                  onValueChange={(value) => handleInputChange("tender_spot_type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="goods">Goods</SelectItem>
                    <SelectItem value="services">Services</SelectItem>
                    <SelectItem value="works">Works</SelectItem>
                    <SelectItem value="consultancy">Consultancy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="procurement_method">Procurement Method</Label>
                <Select 
                  value={formData.procurement_method} 
                  onValueChange={(value) => handleInputChange("procurement_method", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open_tender">Open Tender</SelectItem>
                    <SelectItem value="restricted_tender">Restricted Tender</SelectItem>
                    <SelectItem value="competitive_negotiation">Competitive Negotiation</SelectItem>
                    <SelectItem value="direct_procurement">Direct Procurement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tender_status">Tender Status</Label>
                <Select 
                  value={formData.tender_status} 
                  onValueChange={(value) => handleInputChange("tender_status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="awarded">Awarded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="estimated_value"
                    type="number"
                    value={formData.estimated_value || 0}
                    onChange={(e) => handleInputChange("estimated_value", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="pl-10"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Important Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Important Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publication_date">Publication Date</Label>
                <Input
                  id="publication_date"
                  type="date"
                  value={formData.publication_date || ""}
                  onChange={(e) => handleInputChange("publication_date", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submission_date">Submission Deadline</Label>
                <Input
                  id="submission_date"
                  type="date"
                  value={formData.submission_date || ""}
                  onChange={(e) => handleInputChange("submission_date", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="opening_date">Opening Date</Label>
                <Input
                  id="opening_date"
                  type="date"
                  value={formData.opening_date || ""}
                  onChange={(e) => handleInputChange("opening_date", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vendor Information */}
        <Card>
          <CardHeader>
            <CardTitle>Vendor Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_name">Vendor Name</Label>
                <Input
                  id="vendor_name"
                  value={formData.vendor_name || ""}
                  onChange={(e) => handleInputChange("vendor_name", e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_contact">Vendor Contact</Label>
                <Input
                  id="vendor_contact"
                  value={formData.vendor_contact || ""}
                  onChange={(e) => handleInputChange("vendor_contact", e.target.value)}
                  placeholder="Enter contact number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor_email">Vendor Email</Label>
                <Input
                  id="vendor_email"
                  type="email"
                  value={formData.vendor_email || ""}
                  onChange={(e) => handleInputChange("vendor_email", e.target.value)}
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery_location">Delivery Location</Label>
                <Input
                  id="delivery_location"
                  value={formData.delivery_location || ""}
                  onChange={(e) => handleInputChange("delivery_location", e.target.value)}
                  placeholder="Enter delivery location"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Terms */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contract_duration_months">Contract Duration (Months)</Label>
                <Input
                  id="contract_duration_months"
                  type="number"
                  value={formData.contract_duration_months || 0}
                  onChange={(e) => handleInputChange("contract_duration_months", parseInt(e.target.value) || 0)}
                  placeholder="Enter duration in months"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms</Label>
                <Input
                  id="payment_terms"
                  value={formData.payment_terms || ""}
                  onChange={(e) => handleInputChange("payment_terms", e.target.value)}
                  placeholder="Enter payment terms"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evaluation_criteria">Evaluation Criteria</Label>
              <Textarea
                id="evaluation_criteria"
                value={formData.evaluation_criteria || ""}
                onChange={(e) => handleInputChange("evaluation_criteria", e.target.value)}
                placeholder="Enter evaluation criteria"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="technical_specifications">Technical Specifications</Label>
              <Textarea
                id="technical_specifications"
                value={formData.technical_specifications || ""}
                onChange={(e) => handleInputChange("technical_specifications", e.target.value)}
                placeholder="Enter technical specifications"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="special_conditions">Special Conditions</Label>
              <Textarea
                id="special_conditions"
                value={formData.special_conditions || ""}
                onChange={(e) => handleInputChange("special_conditions", e.target.value)}
                placeholder="Enter any special conditions"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eligibility_criteria">Eligibility Criteria</Label>
              <Textarea
                id="eligibility_criteria"
                value={formData.eligibility_criteria || ""}
                onChange={(e) => handleInputChange("eligibility_criteria", e.target.value)}
                placeholder="Enter eligibility criteria"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security & Guarantees */}
        <Card>
          <CardHeader>
            <CardTitle>Security & Guarantees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="bid_security_required"
                    checked={formData.bid_security_required}
                    onChange={(e) => handleInputChange("bid_security_required", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="bid_security_required">Bid Security Required</Label>
                </div>
                
                {formData.bid_security_required && (
                  <div className="space-y-2">
                    <Label htmlFor="bid_security_amount">Bid Security Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="bid_security_amount"
                        type="number"
                        value={formData.bid_security_amount || 0}
                        onChange={(e) => handleInputChange("bid_security_amount", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="pl-10"
                        step="0.01"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="performance_guarantee_required"
                    checked={formData.performance_guarantee_required}
                    onChange={(e) => handleInputChange("performance_guarantee_required", e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="performance_guarantee_required">Performance Guarantee Required</Label>
                </div>
                
                {formData.performance_guarantee_required && (
                  <div className="space-y-2">
                    <Label htmlFor="performance_guarantee_percentage">Performance Guarantee (%)</Label>
                    <Input
                      id="performance_guarantee_percentage"
                      type="number"
                      value={formData.performance_guarantee_percentage || 0}
                      onChange={(e) => handleInputChange("performance_guarantee_percentage", parseFloat(e.target.value) || 0)}
                      placeholder="Enter percentage"
                      step="0.1"
                      max="100"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/dashboard/tenders")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
    </div>
  );
};

export default TenderForm;
