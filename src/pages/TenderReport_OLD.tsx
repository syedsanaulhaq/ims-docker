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
  office_names?: string;
  wing_names?: string;
  dec_names?: string;
  items?: TenderItem[];
}

interface TenderItem {
  id?: string;
  item_master_id?: string;
  nomenclature: string;
  quantity: number;
  estimated_unit_price: number;
  total_amount: number;
  specifications?: string;
  remarks?: string;
  category_id?: string;
  sub_category_id?: string;
  category_name?: string;
  sub_category_name?: string;
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
        const response = await fetch(`http://localhost:3001/api/view-tenders/${id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setTenderData(data);
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
              {(tenderData as any).office_names && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Offices</label>
                  <p className="text-lg text-gray-700">{(tenderData as any).office_names}</p>
                </div>
              )}
              
              {(tenderData as any).wing_names && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Wings</label>
                  <p className="text-lg text-gray-700">{(tenderData as any).wing_names}</p>
                </div>
              )}
              
              {(tenderData as any).dec_names && (
                <div>
                  <label className="text-sm font-medium text-gray-500">DECs</label>
                  <p className="text-lg text-gray-700">{(tenderData as any).dec_names}</p>
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

        {/* Tender Items */}
        {tenderData.items && tenderData.items.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Tender Items ({tenderData.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-700">#</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Nomenclature</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Category</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Quantity</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Unit Price</th>
                      <th className="text-right p-3 font-semibold text-gray-700">Total Amount</th>
                      <th className="text-left p-3 font-semibold text-gray-700">Specifications</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenderData.items.map((item: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-sm">{index + 1}</td>
                        <td className="p-3">
                          <div className="font-medium">{item.nomenclature}</div>
                          {item.remarks && (
                            <div className="text-sm text-gray-500 mt-1">{item.remarks}</div>
                          )}
                        </td>
                        <td className="p-3 text-sm">
                          {item.category_name && (
                            <div>
                              <div className="font-medium">{item.category_name}</div>
                              {item.sub_category_name && (
                                <div className="text-xs text-gray-500">{item.sub_category_name}</div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right text-sm font-medium">
                          {item.quantity?.toLocaleString() || 'N/A'}
                        </td>
                        <td className="p-3 text-right text-sm">
                          {item.estimated_unit_price ? formatCurrency(item.estimated_unit_price) : 'N/A'}
                        </td>
                        <td className="p-3 text-right text-sm font-medium">
                          {item.total_amount ? formatCurrency(item.total_amount) : 'N/A'}
                        </td>
                        <td className="p-3 text-sm text-gray-600">
                          {item.specifications || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td colSpan={5} className="p-3 text-right font-semibold">Total Estimated Value:</td>
                      <td className="p-3 text-right font-bold text-lg">
                        {formatCurrency(tenderData.estimated_value)}
                      </td>
                      <td className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

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
