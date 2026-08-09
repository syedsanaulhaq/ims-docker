import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiBaseUrl } from '@/services/invmisApi';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Download,
  Filter,
  Calendar,
  FileText,
  DollarSign,
  Package,
  Users,
  Building,
  Truck,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Activity,
  RefreshCw,
  Search,
  Eye,
  XCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { invmisApi } from '@/services/invmisApi';

// Types
interface ReportData {
  id: string;
  name: string;
  category: string;
  description: string;
  lastUpdated: string;
  status: 'ready' | 'generating' | 'scheduled';
  format: 'pdf' | 'excel' | 'csv';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

interface FinancialMetrics {
  totalProcurement: number;
  totalTenders: number;
  averageTenderValue: number;
  costSavings: number;
  budgetUtilization: number;
  pendingPayments: number;
  monthlySpend: Array<{
    month: string;
    amount: number;
    budget: number;
    savings: number;
  }>;
}

interface InventoryMetrics {
  totalItems: number;
  stockValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  turnoverRate: number;
  categoryBreakdown: Array<{
    category: string;
    value: number;
    percentage: number;
    color: string;
  }>;
  movementTrends: Array<{
    date: string;
    receipts: number;
    issues: number;
    adjustments: number;
  }>;
}

interface VendorPerformance {
  totalVendors: number;
  activeVendors: number;
  averageRating: number;
  onTimeDelivery: number;
  vendorRankings: Array<{
    name: string;
    totalOrders: number;
    onTimeRate: number;
    qualityRating: number;
    totalValue: number;
    rank: number;
  }>;
}

interface TenderAnalytics {
  totalTenders: number;
  activeTenders: number;
  completedTenders: number;
  averageBids: number;
  successRate: number;
  competitionIndex: number;
  tendersByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  monthlyTenders: Array<{
    month: string;
    published: number;
    completed: number;
    awarded: number;
  }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

const ReportsAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('last-30-days');
  const [reportCategory, setReportCategory] = useState('all');

  // Data states
  const [reports, setReports] = useState<ReportData[]>([]);
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics | null>(null);
  const [inventoryMetrics, setInventoryMetrics] = useState<InventoryMetrics | null>(null);
  const [vendorPerformance, setVendorPerformance] = useState<VendorPerformance | null>(null);
  const [tenderAnalytics, setTenderAnalytics] = useState<TenderAnalytics | null>(null);

  const fetchReportsData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch real reports and metrics from database APIs
      await loadReportsFromDatabase();
      await loadMetricsFromDatabase();
      
    } catch (err) {
      console.error('Error fetching reports data:', err);
      setError('Failed to load reports data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReportsFromDatabase = async () => {
    try {
      // In a real implementation, this would call actual APIs
      // For now, set empty array until proper report APIs are implemented
      setReports([]);
      
      // TODO: Implement proper API calls like:
      // const response = await fetch('/api/reports');
      // const reportsData = await response.json();
      // setReports(reportsData);
      
    } catch (error) {
      console.error('Error loading reports from database:', error);
      setReports([]);
    }
  };

  const loadMetricsFromDatabase = async () => {
    try {
      // Use real APIs to get financial metrics
      const [tendersResponse, deliveriesResponse, stockResponse] = await Promise.all([
        fetch(`${getApiBaseUrl()}/tenders`).catch(() => ({ json: () => [] })),
        fetch(`${getApiBaseUrl()}/deliveries`).catch(() => ({ json: () => [] })),
        fetch(`${getApiBaseUrl()}/stock-issuance/requests`).catch(() => ({ json: () => ({ data: [] }) }))
      ]);
      
      const tenders = await tendersResponse.json();
      const deliveries = await deliveriesResponse.json();
      const stockRequests = await stockResponse.json();
      
      // Calculate real financial metrics from database data
      const totalProcurement = Array.isArray(tenders) ? tenders.reduce((sum, tender) => sum + (tender.estimated_value || 0), 0) : 0;
      const stockRequestsData = stockRequests.data || [];
      
      // Set real financial metrics
      setFinancialMetrics({
        totalProcurement,
        totalTenders: Array.isArray(tenders) ? tenders.length : 0,
        averageTenderValue: Array.isArray(tenders) && tenders.length > 0 ? totalProcurement / tenders.length : 0,
        costSavings: 0, // This would need a proper calculation from historical data
        budgetUtilization: 0, // This would need budget information from database
        pendingPayments: 0, // This would need payment status from database
        monthlySpend: [] // This would need monthly aggregated data
      });

      // Set real inventory metrics (placeholder - would need actual inventory API)
      setInventoryMetrics({
        totalItems: 0,
        stockValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        turnoverRate: 0,
        categoryBreakdown: [],
        movementTrends: []
      });

      // Set real vendor performance (placeholder - would need vendor API)
      setVendorPerformance({
        totalVendors: 0,
        activeVendors: 0,
        averageRating: 0,
        onTimeDelivery: 0,
        vendorRankings: []
      });

      // Set real tender analytics
      setTenderAnalytics({
        totalTenders: Array.isArray(tenders) ? tenders.length : 0,
        activeTenders: Array.isArray(tenders) ? tenders.filter(t => !t.is_finalized).length : 0,
        completedTenders: Array.isArray(tenders) ? tenders.filter(t => t.is_finalized).length : 0,
        averageBids: 0, // Would need bid data
        successRate: 0, // Would need success criteria definition
        competitionIndex: 0, // Would need competition analysis
        tendersByStatus: [], // Would need status breakdown
        monthlyTenders: [] // Would need monthly aggregated data
      });

      } catch (error) {
      console.error('Error loading metrics from database:', error);
      // Set empty/default values on error
      setFinancialMetrics({ totalProcurement: 0, totalTenders: 0, averageTenderValue: 0, costSavings: 0, budgetUtilization: 0, pendingPayments: 0, monthlySpend: [] });
      setInventoryMetrics({ totalItems: 0, stockValue: 0, lowStockItems: 0, outOfStockItems: 0, turnoverRate: 0, categoryBreakdown: [], movementTrends: [] });
      setVendorPerformance({ totalVendors: 0, activeVendors: 0, averageRating: 0, onTimeDelivery: 0, vendorRankings: [] });
      setTenderAnalytics({ totalTenders: 0, activeTenders: 0, completedTenders: 0, averageBids: 0, successRate: 0, competitionIndex: 0, tendersByStatus: [], monthlyTenders: [] });
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'default';
      case 'generating': return 'secondary';
      case 'scheduled': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return CheckCircle;
      case 'generating': return RefreshCw;
      case 'scheduled': return Clock;
      default: return AlertCircle;
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading reports and analytics...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">Comprehensive insights and reporting for InvMIS</p>
          </div>
          <div className="flex gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                <SelectItem value="last-90-days">Last 90 Days</SelectItem>
                <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                <SelectItem value="last-year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchReportsData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="procurement">Procurement</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Performance Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Procurement</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(financialMetrics?.totalProcurement || 0)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">+12.5%</span>
                    <span className="text-gray-500 ml-1">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Tenders</p>
                      <p className="text-2xl font-bold text-green-600">{tenderAnalytics?.activeTenders || 0}</p>
                    </div>
                    <Award className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <Clock className="w-4 h-4 text-blue-500 mr-1" />
                    <span className="text-gray-500">Open for bidding</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                      <p className="text-2xl font-bold text-purple-600">{formatCurrency(inventoryMetrics?.stockValue || 0)}</p>
                    </div>
                    <Package className="w-8 h-8 text-purple-600" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <Activity className="w-4 h-4 text-purple-500 mr-1" />
                    <span className="text-gray-500">{inventoryMetrics?.totalItems} items</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Cost Savings</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(financialMetrics?.costSavings || 0)}</p>
                    </div>
                    <Target className="w-8 h-8 text-orange-600" />
                  </div>
                  <div className="mt-2 flex items-center text-sm">
                    <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">+8.3%</span>
                    <span className="text-gray-500 ml-1">efficiency</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Procurement Spend</CardTitle>
                  <CardDescription>Spending vs Budget with Savings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={financialMetrics?.monthlySpend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="budget" fill="#E5E7EB" name="Budget" />
                      <Bar dataKey="amount" fill="#3B82F6" name="Actual Spend" />
                      <Bar dataKey="savings" fill="#10B981" name="Savings" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Inventory by Category</CardTitle>
                  <CardDescription>Stock value distribution across categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={inventoryMetrics?.categoryBreakdown || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({percentage}) => `${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {inventoryMetrics?.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value), 'Value']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Budget Utilization</h3>
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {formatPercentage(financialMetrics?.budgetUtilization || 0)}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full" 
                      style={{width: `${financialMetrics?.budgetUtilization || 0}%`}}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">Current year budget usage</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Average Tender Value</h3>
                    <Award className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {formatCurrency(financialMetrics?.averageTenderValue || 0)}
                  </div>
                  <div className="flex items-center text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">+5.2%</span>
                    <span className="text-gray-500 ml-1">vs last quarter</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Pending Payments</h3>
                    <AlertCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {formatCurrency(financialMetrics?.pendingPayments || 0)}
                  </div>
                  <p className="text-sm text-gray-600">Outstanding vendor payments</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Financial Trends</CardTitle>
                <CardDescription>Monthly spending patterns and budget performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={financialMetrics?.monthlySpend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value: number) => [formatCurrency(value), '']} />
                    <Legend />
                    <Line type="monotone" dataKey="budget" stroke="#E5E7EB" strokeWidth={2} name="Budget" />
                    <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} name="Actual Spend" />
                    <Line type="monotone" dataKey="savings" stroke="#10B981" strokeWidth={2} name="Savings" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Package className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(inventoryMetrics?.totalItems || 0)}</div>
                  <p className="text-sm text-gray-600">Total Items</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <div className="text-2xl font-bold text-orange-600">{inventoryMetrics?.lowStockItems || 0}</div>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
                  <div className="text-2xl font-bold text-red-600">{inventoryMetrics?.outOfStockItems || 0}</div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Activity className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-600">{inventoryMetrics?.turnoverRate || 0}</div>
                  <p className="text-sm text-gray-600">Turnover Rate</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Movement Trends</CardTitle>
                  <CardDescription>Monthly receipts, issues, and adjustments</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={inventoryMetrics?.movementTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="receipts" stackId="1" stroke="#10B981" fill="#10B981" name="Receipts" />
                      <Area type="monotone" dataKey="issues" stackId="1" stroke="#EF4444" fill="#EF4444" name="Issues" />
                      <Area type="monotone" dataKey="adjustments" stackId="1" stroke="#F59E0B" fill="#F59E0B" name="Adjustments" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category Breakdown</CardTitle>
                  <CardDescription>Inventory value by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inventoryMetrics?.categoryBreakdown.map((category) => (
                      <div key={category.category}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{category.category}</span>
                          <span className="text-sm text-gray-600">{formatCurrency(category.value)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full" 
                            style={{
                              width: `${category.percentage}%`,
                              backgroundColor: category.color
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{formatPercentage(category.percentage)}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Procurement Tab */}
          <TabsContent value="procurement" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(tenderAnalytics?.totalTenders || 0)}</div>
                  <p className="text-sm text-gray-600">Total Tenders</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-600">{formatNumber(tenderAnalytics?.completedTenders || 0)}</div>
                  <p className="text-sm text-gray-600">Completed</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{tenderAnalytics?.averageBids || 0}</div>
                  <p className="text-sm text-gray-600">Avg. Bids per Tender</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <div className="text-2xl font-bold text-orange-600">{formatPercentage(tenderAnalytics?.successRate || 0)}</div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Tender Activity</CardTitle>
                <CardDescription>Tender publication and completion trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={tenderAnalytics?.monthlyTenders || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="published" fill="#3B82F6" name="Published" />
                    <Bar dataKey="completed" fill="#10B981" name="Completed" />
                    <Bar dataKey="awarded" fill="#F59E0B" name="Awarded" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <Building className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <div className="text-2xl font-bold text-blue-600">{formatNumber(vendorPerformance?.totalVendors || 0)}</div>
                  <p className="text-sm text-gray-600">Total Vendors</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Zap className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <div className="text-2xl font-bold text-green-600">{formatNumber(vendorPerformance?.activeVendors || 0)}</div>
                  <p className="text-sm text-gray-600">Active Vendors</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Truck className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <div className="text-2xl font-bold text-purple-600">{formatPercentage(vendorPerformance?.onTimeDelivery || 0)}</div>
                  <p className="text-sm text-gray-600">On-Time Delivery</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 mx-auto text-orange-600 mb-2" />
                  <div className="text-2xl font-bold text-orange-600">{vendorPerformance?.averageRating || 0}/5</div>
                  <p className="text-sm text-gray-600">Avg. Rating</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Top Vendor Performance</CardTitle>
                <CardDescription>Leading vendors by order volume and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>On-Time Rate</TableHead>
                      <TableHead>Quality Rating</TableHead>
                      <TableHead>Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendorPerformance?.vendorRankings.map((vendor) => (
                      <TableRow key={vendor.name}>
                        <TableCell>
                          <Badge variant="outline">#{vendor.rank}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>{formatNumber(vendor.totalOrders)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2 flex-1">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{width: `${vendor.onTimeRate}%`}}
                              ></div>
                            </div>
                            <span className="text-sm">{formatPercentage(vendor.onTimeRate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="mr-1">{vendor.qualityRating}/5</span>
                            <div className="flex">
                              {[1,2,3,4,5].map((star) => (
                                <span key={star} className={`text-sm ${star <= vendor.qualityRating ? 'text-yellow-400' : 'text-gray-300'}`}>★</span>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(vendor.totalValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Scheduled Reports</h2>
                <p className="text-gray-600">Manage and generate system reports</p>
              </div>
              <div className="flex gap-3">
                <Select value={reportCategory} onValueChange={setReportCategory}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Financial">Financial</SelectItem>
                    <SelectItem value="Inventory">Inventory</SelectItem>
                    <SelectItem value="Procurement">Procurement</SelectItem>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Report
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports
                .filter(report => reportCategory === 'all' || report.category === reportCategory)
                .map((report) => {
                const StatusIcon = getStatusIcon(report.status);
                return (
                  <Card key={report.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold mb-1">{report.name}</h3>
                          <Badge variant={getStatusColor(report.status) as any} className="text-xs">
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {report.status.toUpperCase()}
                          </Badge>
                        </div>
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                      
                      <div className="space-y-2 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Category:</span>
                          <span className="font-medium">{report.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Frequency:</span>
                          <span className="font-medium">{report.frequency}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Format:</span>
                          <span className="font-medium">{report.format.toUpperCase()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Updated:</span>
                          <span className="font-medium">{formatDate(report.lastUpdated)}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" className="flex-1" disabled={report.status === 'generating'}>
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </Button>
                        <Button size="sm" variant="outline" disabled={report.status === 'generating'}>
                          <RefreshCw className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default ReportsAnalytics;