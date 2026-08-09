import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, 
  Download, 
  Printer, 
  ArrowLeft, 
  Calendar, 
  Building, 
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Hash,
  Package,
  Tag
} from "lucide-react";
import { invmisApi } from '@/services/invmisApi';

interface TenderData {
  id: string;
  title: string;
  reference_number: string;
  description?: string;
  type: string;
  status: string;
  tender_status: string;
  is_finalized: boolean;
  estimated_value: number;
  publish_date?: string;
  submission_deadline?: string;
  opening_date?: string;
  created_at: string;
  updated_at?: string;
  office_name?: string;
  wing_name?: string;
  office_id?: string;
  wing_id?: string;
  dec_id?: string;
  tender_spot_type?: string;
}

const TenderReport: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenderData, setTenderData] = useState<TenderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenderData = async () => {
      if (!id) {
        setError('No tender ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await invmisApi.tenders.getById(id);
        
        if (!response.success) {
          throw new Error('Failed to fetch tender data');
        }
        
        setTenderData(response.tender);
      } catch (err) {
        console.error('Error fetching tender data:', err);
        setError('Failed to load tender data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenderData();
  }, [id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized) {
      return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Finalized</Badge>;
    }
    
    switch (status?.toLowerCase()) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Published</Badge>;
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!tenderData) return;
    
    // Create CSV content
    const csvContent = [
      ['Tender Report'],
      ['Generated on:', new Date().toLocaleDateString('en-GB')],
      [''],
      ['Tender Information'],
      ['Title:', tenderData.title],
      ['Reference Number:', tenderData.reference_number],
      ['Type:', tenderData.type],
      ['Status:', tenderData.tender_status],
      ['Estimated Value:', formatCurrency(tenderData.estimated_value)],
      ['Office:', tenderData.office_name || 'N/A'],
      ['Wing:', tenderData.wing_name || 'N/A'],
      [''],
      ['Dates'],
      ['Created:', formatDate(tenderData.created_at)],
      ['Published:', formatDate(tenderData.publish_date)],
      ['Submission Deadline:', formatDate(tenderData.submission_deadline)],
      ['Opening Date:', formatDate(tenderData.opening_date)],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tender-report-${tenderData.reference_number || tenderData.id}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tender report...</p>
        </div>
      </div>
    );
  }

  if (error || !tenderData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Tender not found'}</p>
          <Button 
            onClick={() => navigate('/contract-tender')} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tenders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-6xl mx-auto p-6 print:p-4">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 print:hidden">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              Tender Report
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive tender information and details
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button onClick={() => navigate('/contract-tender')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tenders
            </Button>
            <Button onClick={handleExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">Tender Report</h1>
            <p className="text-gray-600">Generated on {new Date().toLocaleDateString('en-GB')}</p>
          </div>
        </div>

        {/* Tender Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tender Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Reference Number</label>
                  <p className="text-lg font-semibold">{tenderData.reference_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(tenderData.tender_status, tenderData.is_finalized)}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Title</label>
                <p className="text-lg">{tenderData.title}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="font-medium">{tenderData.type || tenderData.tender_spot_type || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estimated Value</label>
                  <p className="font-medium text-green-600">{formatCurrency(tenderData.estimated_value)}</p>
                </div>
              </div>
              
              {tenderData.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="text-gray-700">{tenderData.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Organizational Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Organizational Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Office</label>
                <p className="text-lg">{tenderData.office_name || 'N/A'}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Wing</label>
                <p className="text-lg">{tenderData.wing_name || 'N/A'}</p>
              </div>
              
              {tenderData.office_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Office ID</label>
                  <p className="font-mono text-sm">{tenderData.office_id}</p>
                </div>
              )}
              
              {tenderData.wing_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Wing ID</label>
                  <p className="font-mono text-sm">{tenderData.wing_id}</p>
                </div>
              )}
              
              {tenderData.dec_id && (
                <div>
                  <label className="text-sm font-medium text-gray-500">DEC ID</label>
                  <p className="font-mono text-sm">{tenderData.dec_id}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline & Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Created Date</label>
                <p className="text-lg font-semibold">{formatDate(tenderData.created_at)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Published Date</label>
                <p className="text-lg font-semibold">{formatDate(tenderData.publish_date)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Submission Deadline</label>
                <p className="text-lg font-semibold">{formatDate(tenderData.submission_deadline)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Opening Date</label>
                <p className="text-lg font-semibold">{formatDate(tenderData.opening_date)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Technical Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">Tender ID</label>
                <p className="font-mono text-sm">{tenderData.id}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm">{formatDate(tenderData.updated_at)}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">System Status</label>
                <p className="text-sm">{tenderData.status || 'Active'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 print:block">
          <p>Report generated on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}</p>
          <p className="mt-1">Inventory Management System - Tender Report</p>
        </div>
      </div>
    </div>
  );
};

export default TenderReport;
