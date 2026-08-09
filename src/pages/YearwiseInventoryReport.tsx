import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Calendar, Package, TrendingUp, TrendingDown, RefreshCw, Download } from 'lucide-react';
import { getApiBaseUrl } from '@/services/invmisApi';

interface YearInventoryItem {
  item_master_id: string;
  item_code: string;
  nomenclature: string;
  unit: string;
  category_name: string;
  opening_balance: number;
  quantity_received: number;
  quantity_issued: number;
  closing_balance: number;
  avg_unit_cost: number;
}

interface YearInventory {
  year_code: string;
  year_label: string;
  is_current: boolean;
  items: YearInventoryItem[];
  totals: {
    opening: number;
    received: number;
    issued: number;
    closing: number;
  };
}

interface FinancialYear {
  year_code: string;
  year_label: string;
  is_current: boolean;
  is_closed: boolean;
  item_count: number;
  total_received: number;
  total_issued: number;
}

export default function YearwiseInventoryReport() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [yearwiseInventory, setYearwiseInventory] = useState<YearInventory[]>([]);

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  useEffect(() => {
    fetchYearwiseInventory();
  }, [selectedYear]);

  const fetchFinancialYears = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/stock-acquisitions/financial-years`);
      if (response.ok) {
        const data = await response.json();
        setFinancialYears(data.financial_years || []);
        // Set default to current year
        const currentYear = data.current_year;
        if (currentYear) {
          setSelectedYear(currentYear);
        }
      }
    } catch (err) {
      console.error('Error fetching financial years:', err);
    }
  };

  const fetchYearwiseInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedYear && selectedYear !== 'all'
        ? `${getApiBaseUrl()}/stock-acquisitions/yearwise-inventory?financial_year=${selectedYear}`
        : `${getApiBaseUrl()}/stock-acquisitions/yearwise-inventory`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setYearwiseInventory(data.yearwise_inventory || []);
      } else {
        throw new Error('Failed to fetch inventory data');
      }
    } catch (err: any) {
      console.error('Error fetching yearwise inventory:', err);
      setError(err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num || 0);
  };

  const exportToCSV = (yearData: YearInventory) => {
    const headers = ['Item Code', 'Nomenclature', 'Category', 'Unit', 'Opening', 'Received', 'Issued', 'Closing', 'Avg Cost'];
    const rows = yearData.items.map(item => [
      item.item_code,
      item.nomenclature,
      item.category_name || '',
      item.unit || 'Nos',
      item.opening_balance,
      item.quantity_received,
      item.quantity_issued,
      item.closing_balance,
      item.avg_unit_cost || 0
    ]);
    
    // Add totals row
    rows.push([
      '', 'TOTALS', '', '',
      yearData.totals.opening,
      yearData.totals.received,
      yearData.totals.issued,
      yearData.totals.closing,
      ''
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-${yearData.year_code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Year-Wise Inventory Report</h1>
            <p className="text-gray-600">View inventory summary by financial year</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchYearwiseInventory} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Year Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <label className="text-sm font-medium">Select Financial Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-64 mt-1">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {financialYears.map((fy) => (
                    <SelectItem key={fy.year_code} value={fy.year_code}>
                      {fy.year_label} {fy.is_current && '(Current)'} 
                      {fy.item_count > 0 && ` - ${fy.item_count} items`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading inventory data...</span>
        </div>
      )}

      {/* Year-wise Inventory Tables */}
      {!loading && yearwiseInventory.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">No Inventory Data</h3>
            <p className="text-gray-500">
              {selectedYear !== 'all' 
                ? `No opening balance entries found for ${selectedYear}`
                : 'No opening balance entries found. Add entries to see year-wise inventory.'}
            </p>
            <Button 
              className="mt-4"
              onClick={() => navigate('/dashboard/opening-balance-entry')}
            >
              Add Opening Balance
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && yearwiseInventory.map((yearData) => (
        <Card key={yearData.year_code} className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle className="text-xl">
                    {yearData.year_label || yearData.year_code}
                    {yearData.is_current && (
                      <Badge className="ml-3 bg-green-100 text-green-800">Current Year</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {yearData.items.length} items tracked
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(yearData)}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 border-b">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">
                  {formatNumber(yearData.totals.opening)}
                </div>
                <div className="text-xs text-gray-500">Opening Balance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                  <TrendingUp className="h-5 w-5" />
                  {formatNumber(yearData.totals.received)}
                </div>
                <div className="text-xs text-gray-500">Received</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                  <TrendingDown className="h-5 w-5" />
                  {formatNumber(yearData.totals.issued)}
                </div>
                <div className="text-xs text-gray-500">Issued</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(yearData.totals.closing)}
                </div>
                <div className="text-xs text-gray-500">Closing Balance</div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">Item Code</TableHead>
                    <TableHead className="font-semibold">Nomenclature</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="text-right font-semibold">Opening</TableHead>
                    <TableHead className="text-right font-semibold text-green-700">+ Received</TableHead>
                    <TableHead className="text-right font-semibold text-red-700">- Issued</TableHead>
                    <TableHead className="text-right font-semibold text-blue-700">= Closing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearData.items.map((item) => (
                    <TableRow key={item.item_master_id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                      <TableCell className="font-medium">{item.nomenclature}</TableCell>
                      <TableCell className="text-gray-600">{item.category_name || '-'}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.opening_balance)}</TableCell>
                      <TableCell className="text-right text-green-600 font-medium">
                        {formatNumber(item.quantity_received)}
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">
                        {formatNumber(item.quantity_issued)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-bold">
                        {formatNumber(item.closing_balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="bg-gray-100 font-bold border-t-2">
                    <TableCell colSpan={3} className="text-right">TOTALS:</TableCell>
                    <TableCell className="text-right">{formatNumber(yearData.totals.opening)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatNumber(yearData.totals.received)}</TableCell>
                    <TableCell className="text-right text-red-600">{formatNumber(yearData.totals.issued)}</TableCell>
                    <TableCell className="text-right text-blue-600">{formatNumber(yearData.totals.closing)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
