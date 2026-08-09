import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Package, 
  Building2,
  User,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  File,
  Printer,
  FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TenderVendorManagement from '@/components/tenders/TenderVendorManagement';

interface TenderItem {
  id: string;
  tender_id: string;
  item_master_id: string;
  nomenclature: string;
  quantity: number;
  quantity_received?: number;
  estimated_unit_price?: number;
  actual_unit_price?: number;
  total_amount?: number;
  specifications?: string;
  remarks?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  vendor_ids?: string | string[];
  vendor_id?: string;
  vendor_name?: string;
  category_name?: string;
  category_description?: string;
}

interface Tender {
  id: string;
  title: string;
  description?: string;
  reference_number: string;
  tender_number?: string;
  tender_type: string;
  tender_spot_type?: string;
  submission_deadline: string;
  estimated_value: number;
  status: string;
  is_finalized: boolean;
  finalized_at?: string;
  finalized_by?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  publish_date?: string;
  publication_date?: string;
  submission_date?: string;
  opening_date?: string;
  advertisement_date?: string;
  procedure_adopted?: string;
  procurement_method?: string;
  publication_daily?: string;
  contract_file_path?: string;
  loi_file_path?: string;
  noting_file_path?: string;
  po_file_path?: string;
  rfp_file_path?: string;
  document_path?: string;
  office_ids?: string;
  wing_ids?: string;
  dec_ids?: string;
  vendor_id?: string;
  vendor_name?: string;
  individual_total?: number;
  actual_price_total?: number;
  items?: TenderItem[];
}

const TenderReportEnhanced: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tender, setTender] = useState<Tender | null>(null);
  const [bidders, setBidders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [officeNames, setOfficeNames] = useState<string[]>([]);
  const [wingNames, setWingNames] = useState<string[]>([]);
  const [decNames, setDecNames] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      fetchTenderDetails();
    }
  }, [id]);

  useEffect(() => {
    if (tender) {
      fetchOrganizationalNames();
    }
  }, [tender]);

  const fetchOrganizationalNames = async () => {
    try {
      // Fetch all offices, wings, and decs
      const [officesRes, wingsRes, decsRes] = await Promise.all([
        fetch('http://localhost:3001/api/offices'),
        fetch('http://localhost:3001/api/wings'),
        fetch('http://localhost:3001/api/decs').catch(() => ({ ok: false, json: async () => [] }))
      ]);

      const offices = officesRes.ok ? await officesRes.json() : [];
      const wings = wingsRes.ok ? await wingsRes.json() : [];
      const decs = decsRes.ok ? await decsRes.json() : [];

      // Parse the IDs from the tender
      if (tender?.office_ids && typeof tender.office_ids === 'string') {
        const officeIds = tender.office_ids.split(',').map(id => id.trim());
        const names = officeIds
          .map(id => {
            const office = offices.find((o: any) => 
              o.intOfficeID?.toString() === id || 
              o.id?.toString() === id ||
              o.Id?.toString() === id
            );
            return office?.strOfficeName || office?.name || office?.Name || `Office ID: ${id}`;
          })
          .filter(Boolean);
        setOfficeNames(names);
      }

      if (tender?.wing_ids && typeof tender.wing_ids === 'string') {
        const wingIds = tender.wing_ids.split(',').map(id => id.trim());
        const names = wingIds
          .map(id => {
            const wing = wings.find((w: any) => 
              w.Id?.toString() === id || 
              w.id?.toString() === id ||
              w.intWingID?.toString() === id
            );
            return wing?.Name || wing?.name || wing?.strWingName || `Wing ID: ${id}`;
          })
          .filter(Boolean);
        setWingNames(names);
      }

      if (tender?.dec_ids && typeof tender.dec_ids === 'string') {
        const decIds = tender.dec_ids.split(',').map(id => id.trim());
        const names = decIds
          .map(id => {
            const dec = decs.find((d: any) => 
              d.intAutoID?.toString() === id || 
              d.id?.toString() === id ||
              d.Id?.toString() === id ||
              d.intDecID?.toString() === id
            );
            return dec?.DECName || dec?.name || dec?.Name || dec?.strDecName || `DEC ID: ${id}`;
          })
          .filter(Boolean);
        setDecNames(names);
      }
    } catch (error) {
      console.error('Error fetching organizational names:', error);
    }
  };

  const fetchTenderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3001/api/tenders/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tender details');
      }
      
      const data = await response.json();
      setTender(data);
      
      // Fetch bidders for this tender
      try {
        const biddersResponse = await fetch(`http://localhost:3001/api/tenders/${id}/vendors`);
        if (biddersResponse.ok) {
          const biddersData = await biddersResponse.json();
          setBidders(biddersData);
        }
      } catch (err) {
        console.error('⚠️ Error fetching bidders:', err);
      }
    } catch (error) {
      console.error('❌ Error fetching tender details:', error);
      alert('Failed to load tender details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const getVendorName = (vendorId: string): string => {
    const bidder = bidders.find(b => b.vendor_id === vendorId);
    return bidder ? bidder.vendor_name : vendorId;
  };

  const formatDateTime = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string, isFinalized: boolean) => {
    if (isFinalized) {
      return <Badge className="bg-green-600">✓ Finalized</Badge>;
    }
    
    switch (status?.toLowerCase()) {
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      case 'published':
        return <Badge className="bg-blue-600">Published</Badge>;
      case 'closed':
        return <Badge className="bg-gray-600">Closed</Badge>;
      case 'awarded':
        return <Badge className="bg-purple-600">Awarded</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleDownload = (filePath: string, fileName: string) => {
    const url = `http://localhost:3001/uploads/tender-files/${filePath}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    if (!tender) return;

    // Prepare data for export
    const csvContent = [
      ['Tender Details Report'],
      [],
      ['Title', tender.title],
      ['Reference Number', tender.reference_number],
      ['Tender Type', tender.tender_type],
      ['Status', tender.status],
      ['Publish Date', formatDate(tender.publish_date)],
      ['Submission Deadline', formatDate(tender.submission_deadline)],
      ['Opening Date', formatDate(tender.opening_date)],
      ['Description', tender.description || ''],
      ['Created By', tender.created_by || ''],
      ['Created Date', formatDateTime(tender.created_at)],
      [],
      ['Tender Items'],
      ['Item', 'Quantity', 'Unit Price', 'Total Amount', 'Specifications', 'Remarks'],
      ...(tender.items?.map((item) => [
        item.nomenclature,
        item.quantity,
        item.estimated_unit_price || 0,
        item.total_amount || 0,
        item.specifications || '',
        item.remarks || ''
      ]) || [])
    ];

    const csvString = csvContent.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Create blob and download
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${tender.reference_number || 'tender'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading tender details...</p>
        </div>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Tender not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    {tender.title}
                  </h1>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600">Reference:</span>
                    <span className="text-sm font-semibold text-gray-900">{tender.reference_number}</span>
                  </div>
                  {tender.tender_number && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-600">Tender #:</span>
                      <span className="text-sm font-semibold text-gray-900">{tender.tender_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {getStatusBadge(tender.status, tender.is_finalized)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <Button onClick={handlePrint} variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button onClick={handleExport} variant="outline" size="sm">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finalized Alert */}
      {tender.is_finalized && (
        <Alert className="bg-green-50 border-green-200">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Finalized:</strong> This tender was finalized on {formatDateTime(tender.finalized_at)} 
            by {tender.finalized_by || 'Unknown'} and has been added to the stock acquisition system.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-blue-600" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</label>
              <p className="text-base font-medium text-gray-900">{tender.title}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference Number</label>
              <p className="text-base font-medium text-gray-900">{tender.reference_number}</p>
            </div>
            {tender.tender_number && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tender Number</label>
                <p className="text-base font-medium text-gray-900">{tender.tender_number}</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tender Type</label>
              <p className="text-base font-medium text-gray-900">
                {tender.tender_type === 'spot-purchase' ? 'Petty Purchase' : tender.tender_type === 'annual-tender' ? 'Annual Tender' : 'Contract/Tender'}
              </p>
            </div>
            {tender.tender_spot_type && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Spot Type</label>
                <p className="text-base font-medium text-gray-900 capitalize">{tender.tender_spot_type.replace('_', ' ')}</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
              <div className="mt-1">
                {getStatusBadge(tender.status, tender.is_finalized)}
              </div>
            </div>

            {tender.procurement_method && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Procurement Method</label>
                <p className="text-base font-medium text-gray-900 capitalize">{tender.procurement_method.replace('_', ' ')}</p>
              </div>
            )}
            {tender.procedure_adopted && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Procedure Adopted</label>
                <p className="text-base font-medium text-gray-900">{tender.procedure_adopted}</p>
              </div>
            )}
            {tender.individual_total !== null && tender.individual_total !== undefined && tender.tender_type !== 'annual-tender' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Individual Total</label>
                <p className="text-lg font-bold text-blue-600">
                  {formatCurrency(tender.individual_total)}
                </p>
              </div>
            )}
            {tender.actual_price_total !== null && tender.actual_price_total !== undefined && tender.tender_type !== 'annual-tender' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Actual Price Total</label>
                <p className="text-lg font-bold text-purple-600">
                  {formatCurrency(tender.actual_price_total)}
                </p>
              </div>
            )}
          </div>

          {tender.description && (
            <div className="mt-6 pt-6 border-t">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Description</label>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border">
                {tender.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card>
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-5 h-5 text-blue-600" />
            Important Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tender.publish_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Publish Date</label>
                <p className="text-base font-medium text-gray-900">{formatDate(tender.publish_date)}</p>
              </div>
            )}
            {tender.publication_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Publication Date</label>
                <p className="text-base font-medium text-gray-900">{formatDate(tender.publication_date)}</p>
              </div>
            )}
            {tender.advertisement_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Advertisement Date</label>
                <p className="text-base font-medium text-gray-900">{formatDate(tender.advertisement_date)}</p>
              </div>
            )}
            {tender.submission_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submission Date</label>
                <p className="text-base font-medium text-gray-900">{formatDate(tender.submission_date)}</p>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Submission Deadline</label>
              <p className="text-base font-bold text-red-600">
                {formatDate(tender.submission_deadline)}
              </p>
            </div>
            {tender.opening_date && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Opening Date</label>
                <p className="text-base font-medium text-gray-900">{formatDate(tender.opening_date)}</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created At</label>
              <p className="text-sm text-gray-700">{formatDateTime(tender.created_at)}</p>
            </div>
            {tender.updated_at && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</label>
                <p className="text-sm text-gray-700">{formatDateTime(tender.updated_at)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Procurement Details */}
      {(tender.procedure_adopted || tender.procurement_method || tender.publication_daily || tender.vendor_name || tender.created_by || officeNames.length > 0 || wingNames.length > 0 || decNames.length > 0) && (
        <Card>
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
              Procurement &amp; Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tender.procedure_adopted && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Procedure Adopted</label>
                  <p className="text-base font-medium text-gray-900">{tender.procedure_adopted}</p>
                </div>
              )}
              {tender.procurement_method && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Procurement Method</label>
                  <p className="text-base font-medium text-gray-900 capitalize">{tender.procurement_method.replace('_', ' ')}</p>
                </div>
              )}
              {tender.publication_daily && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Publication Daily</label>
                  <p className="text-base font-medium text-gray-900">{tender.publication_daily}</p>
                </div>
              )}
              {tender.vendor_name && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendor</label>
                  <p className="text-base font-medium text-gray-900">{tender.vendor_name}</p>
                </div>
              )}
              {tender.created_by && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created By</label>
                  <p className="text-base font-medium text-gray-900">{tender.created_by}</p>
                </div>
              )}
            </div>

            {/* Organizational Names */}
            {(officeNames.length > 0 || wingNames.length > 0 || decNames.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t">
                {officeNames.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Offices</label>
                    <ul className="space-y-2">
                      {officeNames.map((name, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm bg-blue-50 px-3 py-2 rounded border border-blue-200">
                          <span className="text-blue-600 font-bold">•</span>
                          <span className="text-gray-700">{name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {wingNames.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">Wings</label>
                    <ul className="space-y-2">
                      {wingNames.map((name, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm bg-green-50 px-3 py-2 rounded border border-green-200">
                          <span className="text-green-600 font-bold">•</span>
                          <span className="text-gray-700">{name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {decNames.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block">DECs</label>
                    <ul className="space-y-2">
                      {decNames.map((name, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm bg-purple-50 px-3 py-2 rounded border border-purple-200">
                          <span className="text-purple-600 font-bold">•</span>
                          <span className="text-gray-700">{name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Attachments */}
      {(tender.contract_file_path || tender.loi_file_path || tender.noting_file_path || 
        tender.po_file_path || tender.rfp_file_path || tender.document_path) && (
        <Card>
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <File className="w-5 h-5 text-blue-600" />
              Document Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tender.contract_file_path && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Contract File</p>
                      <p className="text-xs text-gray-600 truncate max-w-xs">{tender.contract_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-white hover:bg-blue-50"
                    onClick={() => handleDownload(tender.contract_file_path!, 'Contract')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.loi_file_path && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">LOI File</p>
                      <p className="text-xs text-gray-600 truncate max-w-xs">{tender.loi_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-white hover:bg-green-50"
                    onClick={() => handleDownload(tender.loi_file_path!, 'LOI')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.noting_file_path && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Noting File</p>
                      <p className="text-xs text-gray-600 truncate max-w-xs">{tender.noting_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-white hover:bg-purple-50"
                    onClick={() => handleDownload(tender.noting_file_path!, 'Noting')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.po_file_path && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">PO File</p>
                      <p className="text-xs text-gray-600 truncate max-w-xs">{tender.po_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-white hover:bg-orange-50"
                    onClick={() => handleDownload(tender.po_file_path!, 'PO')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.rfp_file_path && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">RFP File</p>
                      <p className="text-xs text-gray-600 truncate max-w-xs">{tender.rfp_file_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-white hover:bg-red-50"
                    onClick={() => handleDownload(tender.rfp_file_path!, 'RFP')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
              {tender.document_path && (
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <FileText className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Document</p>
                      <p className="text-xs text-gray-600 truncate max-w-xs">{tender.document_path}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="bg-white hover:bg-gray-50"
                    onClick={() => handleDownload(tender.document_path!, 'Document')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Participating Bidders Section */}
      <TenderVendorManagement
        tenderId={tender.id}
        readOnly={true}
        vendors={bidders}
      />

      {/* Tender Items */}
      {tender.items && tender.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {tender.tender_type === 'spot-purchase' ? 'Petty Purchase Items' : tender.tender_type === 'annual-tender' ? 'Annual Tender Items' : 'Tender Items'} ({tender.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {tender.tender_type === 'annual-tender' ? (
                      <>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Name of the Article</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Specifications</TableHead>
                        <TableHead>Remarks</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead>Specifications</TableHead>
                        <TableHead>Remarks</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(tender.tender_type === 'annual-tender' 
                    ? [...tender.items].sort((a, b) => {
                        const categoryA = a.category_description && a.category_name 
                          ? `${a.category_description} - ${a.category_name}`
                          : a.category_name || '';
                        const categoryB = b.category_description && b.category_name 
                          ? `${b.category_description} - ${b.category_name}`
                          : b.category_name || '';
                        return categoryA.localeCompare(categoryB);
                      })
                    : tender.items
                  ).map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                      {tender.tender_type === 'annual-tender' ? (
                        <>
                          <TableCell>
                            <p className="font-medium">
                              {item.category_description && item.category_name 
                                ? `${item.category_description} - ${item.category_name}`
                                : item.category_name || 'N/A'
                              }
                            </p>
                          </TableCell>
                          <TableCell className="font-semibold">{item.nomenclature}</TableCell>
                          <TableCell>
                            {item.vendor_ids || item.vendor_id || item.vendor_name ? (
                              <div className="flex flex-wrap gap-1">
                                {(() => {
                                  if (item.vendor_name) {
                                    return (
                                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {item.vendor_name}
                                      </span>
                                    );
                                  }
                                  const vendorIds = item.vendor_ids 
                                    ? (Array.isArray(item.vendor_ids) 
                                        ? item.vendor_ids 
                                        : String(item.vendor_ids).split(',').map(id => id.trim()).filter(id => id))
                                    : (item.vendor_id ? [item.vendor_id] : []);
                                  
                                  return vendorIds.length > 0 ? (
                                    vendorIds.map(vendorId => (
                                      <span key={vendorId} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                        {getVendorName(vendorId)}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No vendor</span>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">No vendor</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            {formatCurrency(item.estimated_unit_price || 0)}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm" title={item.specifications || ''}>
                              {item.specifications || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm" title={item.remarks || ''}>
                              {item.remarks || '-'}
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="font-semibold">{item.nomenclature}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="font-medium text-blue-600">
                            {formatCurrency(item.estimated_unit_price || 0)}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            {formatCurrency(item.total_amount || 0)}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm" title={item.specifications || ''}>
                              {item.specifications || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="text-sm" title={item.remarks || ''}>
                              {item.remarks || '-'}
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Items Summary */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className={`grid gap-6 ${tender.tender_type === 'annual-tender' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-4'}`}>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Items</p>
                  <p className="text-3xl font-bold text-blue-600">{tender.items.length}</p>
                </div>
                {tender.tender_type !== 'annual-tender' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Quantity</p>
                      <p className="text-3xl font-bold text-green-600">
                        {tender.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Average Unit Price</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {formatCurrency(
                          tender.items.length > 0
                            ? tender.items.reduce((sum, item) => sum + (item.estimated_unit_price || 0), 0) / tender.items.length
                            : 0
                        )}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {formatCurrency(tender.items.reduce((sum, item) => sum + (item.total_amount || 0), 0))}
                      </p>
                    </div>
                  </>
                )}
                {tender.tender_type === 'annual-tender' && (
                  <>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Total Value</p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(tender.items.reduce((sum, item) => sum + (item.estimated_unit_price || 0), 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-600 mb-1">Average Price</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {formatCurrency(
                          tender.items.length > 0
                            ? tender.items.reduce((sum, item) => sum + (item.estimated_unit_price || 0), 0) / tender.items.length
                            : 0
                        )}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenderReportEnhanced;
