import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import {
  Barcode,
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  Building,
  User,
  Calendar,
  DollarSign,
  FileText,
  Printer,
  History,
  Tag,
  Clock,
  ShieldCheck,
  MapPin,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportDocumentHeader } from '@/components/common/BarcodeQRVisual';

const API = () => getApiBaseUrl();

interface LookupResult {
  serial_id: string;
  serial_number: string;
  barcode_data: string;
  status: string;
  notes?: string;
  created_at?: string;
  item: {
    item_master_id: string;
    nomenclature: string;
    item_code?: string;
    group_number?: string;
    unit?: string;
    manufacturer?: string;
    specifications?: string;
    category_name?: string;
    subcategory_name?: string;
  };
  procurement: {
    delivery_id?: string;
    delivery_number?: string;
    delivery_date?: string;
    unit_price?: number;
    po_number?: string;
    po_date?: string;
    vendor_name?: string;
    vendor_contact_person?: string;
    vendor_phone?: string;
    vendor_email?: string;
  };
  assignment?: {
    issued_to_user_id?: string;
    recipient_name?: string;
    recipient_username?: string;
    recipient_role?: string;
    recipient_designation?: string;
    wing_name?: string;
    office_name?: string;
    branch_name?: string;
    issued_at?: string;
    issuance_request_id?: string;
    request_number?: string;
    issuance_purpose?: string;
    urgency_level?: string;
    is_returnable?: boolean;
    expected_return_date?: string;
  } | null;
  timeline: Array<{
    id: string;
    serial_number: string;
    action_type: string;
    actor_name?: string;
    recipient_name?: string;
    reference_id?: string;
    notes?: string;
    created_at?: string;
  }>;
}

const BarcodeTrackerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('query') || '';

  const [searchInput, setSearchInput] = useState(queryParam);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<LookupResult | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const scannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (queryParam) {
      handleLookup(queryParam);
    }
  }, [queryParam]);

  useEffect(() => {
    // Focus scanner on mount
    setTimeout(() => scannerRef.current?.focus(), 250);
  }, []);

  const handleLookup = async (code: string) => {
    const term = code.trim();
    if (!term) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const res = await fetch(`${API()}/barcode/lookup?query=${encodeURIComponent(term)}`, {
        credentials: 'include'
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        const errDetail = json.details ? ` (${json.details})` : '';
        throw new Error((json.error || 'Physical asset not found') + errDetail);
      }

      setData(json.data);
      setSearchParams({ query: term });

      // Save to recent searches
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== term.toLowerCase());
        return [term, ...filtered].slice(0, 5);
      });
    } catch (err: any) {
      setError(err.message || 'Asset lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(searchInput);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    const st = (status || '').toUpperCase();
    if (st === 'ISSUED') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-semibold px-3 py-1 text-sm">
          <UserCheck className="h-4 w-4 mr-1.5" /> ISSUED TO CLIENT / WING
        </Badge>
      );
    }
    if (st === 'IN_STOCK') {
      return (
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold px-3 py-1 text-sm">
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> AVAILABLE IN STORE
        </Badge>
      );
    }
    if (st === 'RETURNED') {
      return (
        <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-semibold px-3 py-1 text-sm">
          <History className="h-4 w-4 mr-1.5" /> RETURNED TO STORE
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 border-gray-300 font-semibold px-3 py-1 text-sm">
        {st}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6 print:p-0 print:bg-white">
      {/* Header (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
              <Barcode className="h-7 w-7" />
            </div>
            Physical Asset Barcode & QR Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Scan physical item tags to generate complete procurement, client issuance, & lifetime audit reports
          </p>
        </div>

        {data && (
          <Button onClick={handlePrint} variant="outline" className="bg-white border-slate-300 shadow-sm gap-2">
            <Printer className="h-4 w-4" /> Print Asset Report
          </Button>
        )}
      </div>

      {/* Barcode Scanner Input Form (Hidden on Print) */}
      <Card className="border-blue-100 shadow-xl shadow-blue-500/5 bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/40 print:hidden">
        <CardContent className="p-6">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
              <QrCode className="h-4 w-4 text-blue-600" />
              Scan Barcode / QR Tag OR Enter Serial Number
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  ref={scannerRef}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Scan item barcode with scanner OR type serial number (e.g. SN-LAPTOP-1001)..."
                  className="pl-12 py-6 text-base font-mono bg-white border-slate-300 shadow-inner rounded-xl focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="py-6 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-600/25 gap-2"
              >
                {loading ? <LoadingSpinner size="sm" /> : <Barcode className="h-5 w-5" />}
                Scan Asset
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="font-semibold text-slate-700">Quick Test Barcodes:</span>
              {[
                { code: 'DELL-LAT-2026-98401', label: 'DELL-LAT-2026-98401 (Issued to Asif Ali Yasin)' },
                { code: 'DELL-LAT-2026-98402', label: 'DELL-LAT-2026-98402 (Issued)' },
                { code: 'DELL-LAT-2026-98403', label: 'DELL-LAT-2026-98403 (In Store)' },
                { code: 'HP-PRINTER-2026-33104', label: 'HP-PRINTER-2026-33104 (Issued)' }
              ].map((sample) => (
                <button
                  key={sample.code}
                  type="button"
                  onClick={() => {
                    setSearchInput(sample.code);
                    handleLookup(sample.code);
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100 hover:border-blue-300 border border-slate-200 rounded-lg font-mono text-xs text-blue-700 transition-colors shadow-2xs"
                >
                  {sample.code}
                </button>
              ))}
            </div>

            {recentSearches.length > 0 && (
              <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Recent Scans:
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSearchInput(s);
                      handleLookup(s);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-md font-mono text-slate-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50/60 p-6 rounded-2xl text-red-900 print:hidden">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-base">{error}</p>
              <p className="text-sm text-red-700 mt-0.5">
                Verify that the barcode label or serial number was entered correctly during receiving.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Asset Full Report Card */}
      {data && (
        <div className="space-y-6">
          {/* Printable Header with Barcode & QR Code */}
          <div className="hidden print:block mb-6">
            <ReportDocumentHeader
              title="PHYSICAL ASSET LIFETIME AUDIT REPORT"
              docNumber={data.serial_number}
              poNumber={data.procurement?.po_number}
              badgeText="VERIFIED PHYSICAL ASSET REPORT"
            />
          </div>

          {/* Asset Main Banner */}
          <Card className="border-slate-200 shadow-md bg-white rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-mono text-xs">
                      {data.item.category_name || 'Physical Equipment'}
                    </Badge>
                    {data.item.subcategory_name && (
                      <Badge variant="outline" className="bg-white/10 text-blue-200 border-white/20 font-mono text-xs">
                        {data.item.subcategory_name}
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{data.item.nomenclature}</h2>
                  <p className="text-blue-200 text-sm flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Code: <span className="font-mono text-white">{data.item.item_code || 'N/A'}</span>
                    {data.item.manufacturer && <span>• Brand: <strong>{data.item.manufacturer}</strong></span>}
                  </p>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="text-left md:text-right">
                    <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider block">SERIAL NUMBER / BARCODE</span>
                    <span className="text-2xl font-extrabold font-mono text-emerald-300 tracking-wider">
                      {data.serial_number}
                    </span>
                  </div>
                  <div>{getStatusBadge(data.status)}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* 3 Main Information Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Item Specifications Card */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
              <CardHeader className="bg-slate-50/70 border-b py-4 px-5">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Item Master Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Nomenclature</span>
                  <span className="font-semibold text-slate-800">{data.item.nomenclature}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Item Code</span>
                  <span className="font-mono font-semibold text-slate-800">{data.item.item_code || '-'}</span>
                </div>
                {data.item.group_number && (
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Group Number</span>
                    <span className="font-semibold text-slate-800">{data.item.group_number}</span>
                  </div>
                )}
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Unit of Measure</span>
                  <span className="font-semibold text-slate-800">{data.item.unit || 'No(s)'}</span>
                </div>
                {data.item.specifications && (
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Technical Specs</span>
                    <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1 whitespace-pre-wrap">
                      {data.item.specifications}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Procurement & Vendor Info Card */}
            <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
              <CardHeader className="bg-slate-50/70 border-b py-4 px-5">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building className="h-5 w-5 text-indigo-600" />
                  Procurement & Vendor Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Vendor / Supplier</span>
                  <span className="font-semibold text-slate-800 text-base">{data.procurement.vendor_name || 'Vendor N/A'}</span>
                  {data.procurement.vendor_contact_person && (
                    <span className="text-xs text-slate-500 block">{data.procurement.vendor_contact_person}</span>
                  )}
                </div>

                {data.procurement.vendor_phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> {data.procurement.vendor_phone}
                  </div>
                )}

                {data.procurement.po_number && (
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Purchase Order Number</span>
                    <span className="font-mono font-semibold text-indigo-700">{data.procurement.po_number}</span>
                  </div>
                )}

                {data.procurement.delivery_number && (
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Delivery Receipt #</span>
                    <span className="font-mono font-semibold text-slate-800">{data.procurement.delivery_number}</span>
                  </div>
                )}

                {data.procurement.delivery_date && (
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Delivery Date</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(data.procurement.delivery_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}

                {data.procurement.unit_price && (
                  <div>
                    <span className="text-xs text-slate-400 font-medium block">Unit Acquisition Price</span>
                    <span className="font-semibold text-emerald-700">PKR {Number(data.procurement.unit_price).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3. Current Client Assignment Card */}
            <Card className={`border-slate-200 shadow-sm rounded-2xl ${data.assignment ? 'bg-blue-50/40 border-blue-200' : 'bg-white'}`}>
              <CardHeader className="bg-slate-50/70 border-b py-4 px-5">
                <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Current Assignment / Recipient
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3 text-sm">
                {data.assignment ? (
                  <>
                    <div>
                      <span className="text-xs text-blue-700 font-medium block">Issued To (Client / Staff)</span>
                      <span className="font-bold text-slate-900 text-base block">{data.assignment.recipient_name}</span>
                      <span className="text-xs text-slate-500 block">Designation: <strong>{data.assignment.recipient_designation || '-'}</strong></span>
                    </div>

                    {data.assignment.wing_name && (
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Wing / Branch / Office</span>
                        <span className="font-semibold text-slate-800">
                          {data.assignment.wing_name}
                          {data.assignment.office_name ? ` / ${data.assignment.office_name}` : ''}
                        </span>
                      </div>
                    )}

                    {data.assignment.request_number && (
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Issuance Request Number</span>
                        <span className="font-mono font-semibold text-blue-700">{data.assignment.request_number}</span>
                      </div>
                    )}

                    {data.assignment.issued_at && (
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Date Issued</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(data.assignment.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {data.assignment.issuance_purpose && (
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Purpose / Justification</span>
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-blue-100 mt-1 whitespace-pre-wrap">
                          {data.assignment.issuance_purpose}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-slate-500 space-y-2">
                    <ShieldCheck className="h-10 w-10 mx-auto text-emerald-500" />
                    <p className="font-bold text-slate-800">Item Currently in Store</p>
                    <p className="text-xs text-slate-500">This physical asset has not been issued to any client/employee yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interactive Lifetime Timeline */}
          <Card className="border-slate-200 shadow-sm bg-white rounded-2xl">
            <CardHeader className="bg-slate-50/70 border-b py-4 px-5">
              <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                Physical Item Lifetime Movement History Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {data.timeline.map((event, idx) => {
                  const isAcquired = event.action_type === 'ACQUIRED';
                  const isIssued = event.action_type === 'ISSUED';
                  const isReturned = event.action_type === 'RETURNED';

                  return (
                    <div key={event.id || idx} className="flex gap-4 relative items-start">
                      <div
                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center bg-white z-10 font-bold text-xs ${
                          isAcquired
                            ? 'border-emerald-500 text-emerald-600'
                            : isIssued
                            ? 'border-blue-500 text-blue-600'
                            : 'border-purple-500 text-purple-600'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="flex-1 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {event.action_type}
                            {event.reference_id && (
                              <span className="font-mono text-xs font-semibold text-blue-600">({event.reference_id})</span>
                            )}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {event.created_at ? new Date(event.created_at).toLocaleString() : 'N/A'}
                          </span>
                        </div>

                        {event.actor_name && (
                          <p className="text-xs text-slate-600">
                            Processed by: <strong className="text-slate-800">{event.actor_name}</strong>
                          </p>
                        )}

                        {event.recipient_name && (
                          <p className="text-xs text-blue-800 font-medium">
                            Issued to: <strong>{event.recipient_name}</strong>
                          </p>
                        )}

                        {event.notes && (
                          <p className="text-xs text-slate-500 pt-1 italic">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BarcodeTrackerPage;
