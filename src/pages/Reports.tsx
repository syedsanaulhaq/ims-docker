
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Calendar, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { useApiInventoryData } from "@/hooks/useApiInventoryData";
import ItemsDetailDialog from "@/components/dashboard/ItemsDetailDialog";
import LowStockDetailDialog from "@/components/dashboard/LowStockDetailDialog";
import VendorsDetailDialog from "@/components/dashboard/VendorsDetailDialog";
import TransactionsDetailDialog from "@/components/dashboard/TransactionsDetailDialog";

const Reports = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('last30days');
  const [reportType, setReportType] = useState('inventory');

  // Dialog states
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [lowStockDialogOpen, setLowStockDialogOpen] = useState(false);
  const [vendorsDialogOpen, setVendorsDialogOpen] = useState(false);
  const [transactionsDialogOpen, setTransactionsDialogOpen] = useState(false);

  // Get actual data from useApiInventoryData hook
  const { 
    inventoryItems, 
    stats, 
    getLowStockItems, 
    getThisMonthPurchases,
    getActiveVendors,
    transactions 
  } = useApiInventoryData();

  // Get the active tab from URL hash, default to 'overview'
  const getActiveTabFromHash = () => {
    const hash = location.hash.replace('#', '');
    return ['overview', 'inventory', 'transactions', 'analytics'].includes(hash) ? hash : 'overview';
  };

  const [activeTab, setActiveTab] = useState(getActiveTabFromHash());

  // Update active tab when URL hash changes
  useEffect(() => {
    setActiveTab(getActiveTabFromHash());
  }, [location.hash]);

  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/reports#${value}`, { replace: true });
  };

  // Process inventory data for charts
  const inventoryData = React.useMemo(() => {
    const categories = inventoryItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { name: item.category, value: 0, low: 0 };
      }
      acc[item.category].value += item.currentStock;
      if (item.currentStock <= item.minimumStock) {
        acc[item.category].low += 1;
      }
      return acc;
    }, {} as Record<string, { name: string; value: number; low: number }>);
    
    return Object.values(categories);
  }, [inventoryItems]);

  const monthlyTransactions = [
    { month: 'Jan', purchases: 12, issuances: 28 },
    { month: 'Feb', purchases: 15, issuances: 32 },
    { month: 'Mar', purchases: 8, issuances: 25 },
    { month: 'Apr', purchases: 18, issuances: 35 },
    { month: 'May', purchases: stats.thisMonthPurchases, issuances: 42 },
  ];

  // Get top issued items from transactions
  const topItems = React.useMemo(() => {
    const issuedItems = transactions
      .filter(t => t.type === 'Issuance' && t.item && t.quantity)
      .reduce((acc, transaction) => {
        if (!acc[transaction.item!]) {
          acc[transaction.item!] = 0;
        }
        acc[transaction.item!] += transaction.quantity!;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(issuedItems)
      .map(([item, issued]) => ({ item, issued }))
      .sort((a, b) => b.issued - a.issued)
      .slice(0, 4);
  }, [transactions]);

  const lowStockItems = getLowStockItems().slice(0, 3).map(item => ({
    item: item.name,
    current: item.currentStock,
    minimum: item.minimumStock,
    location: item.location
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive inventory insights and reports</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export PDF</span>
          </Button>
          <Button variant="outline" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reportType">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inventory">Inventory Summary</SelectItem>
                  <SelectItem value="transactions">Transaction History</SelectItem>
                  <SelectItem value="issuances">Issuance Report</SelectItem>
                  <SelectItem value="vendors">Vendor Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dateRange">Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="last3months">Last 3 Months</SelectItem>
                  <SelectItem value="last6months">Last 6 Months</SelectItem>
                  <SelectItem value="lastyear">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="office">Office/Location</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All Offices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  <SelectItem value="head">ECP Secretariat</SelectItem>
                  <SelectItem value="hr">Human Resource (HR)</SelectItem>
                  <SelectItem value="dlcp">DL & CP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Report</TabsTrigger>
          <TabsTrigger value="transactions">Transaction Report</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics - Now Clickable */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setItemsDialogOpen(true)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 hover:text-blue-800">{stats.totalItems}</div>
                <p className="text-xs text-muted-foreground">Click to view details</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setLowStockDialogOpen(true)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600 hover:text-red-800">{stats.lowStockItems}</div>
                <p className="text-xs text-muted-foreground">Click to view details</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setTransactionsDialogOpen(true)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month Purchases</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600 hover:text-purple-800">{stats.thisMonthPurchases}</div>
                <p className="text-xs text-muted-foreground">Click to view details</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setVendorsDialogOpen(true)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 hover:text-green-800">{stats.totalVendors}</div>
                <p className="text-xs text-muted-foreground">Click to view details</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTransactions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="purchases" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="issuances" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={inventoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {inventoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Items</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                {lowStockItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Minimum</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell className="text-red-600">{item.current}</TableCell>
                          <TableCell>{item.minimum}</TableCell>
                          <TableCell>{item.location}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No low stock items found.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Issued Items</CardTitle>
                <CardDescription>Items frequently distributed to staff</CardDescription>
              </CardHeader>
              <CardContent>
                {topItems.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qty Issued</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.item}</TableCell>
                          <TableCell>{item.issued}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No issuance data available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Inventory Summary by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={inventoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" name="Total Items" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchase vs Issuance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyTransactions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="purchases" fill="#8884d8" name="Purchases" />
                  <Bar dataKey="issuances" fill="#82ca9d" name="Issuances" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-blue-600">{stats.thisMonthPurchases}</div>
                  <div className="text-sm text-muted-foreground">Purchases This Month</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">
                    {transactions.filter(t => t.type === 'Issuance').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Issuances</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-orange-600">{transactions.length}</div>
                  <div className="text-sm text-muted-foreground">Total Transactions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Turnover</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={inventoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Stock Status Overview</CardTitle>
                <CardDescription>Current inventory health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Items in Stock</span>
                    <span className="font-bold">{stats.totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Low Stock Items</span>
                    <span className="font-bold text-red-600">{stats.lowStockItems}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Active Vendors</span>
                    <span className="font-bold text-green-600">{stats.totalVendors}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between items-center font-bold">
                      <span>Stock Health</span>
                      <span className={stats.lowStockItems === 0 ? "text-green-600" : "text-orange-600"}>
                        {stats.lowStockItems === 0 ? "Good" : "Needs Attention"}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Efficiency Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Stock Utilization Rate</h4>
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(((stats.totalItems - stats.lowStockItems) / stats.totalItems) * 100)}%
                  </div>
                  <p className="text-sm text-muted-foreground">Items with adequate stock</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Inventory Categories</h4>
                  <div className="text-3xl font-bold text-blue-600">{inventoryData.length}</div>
                  <p className="text-sm text-muted-foreground">Active item categories</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialogs */}
      <ItemsDetailDialog 
        open={itemsDialogOpen} 
        onOpenChange={setItemsDialogOpen} 
        items={inventoryItems} 
      />
      
      <LowStockDetailDialog 
        open={lowStockDialogOpen} 
        onOpenChange={setLowStockDialogOpen} 
        items={getLowStockItems()} 
      />
      
      <VendorsDetailDialog 
        open={vendorsDialogOpen} 
        onOpenChange={setVendorsDialogOpen} 
        vendors={getActiveVendors()} 
      />
      
      <TransactionsDetailDialog 
        open={transactionsDialogOpen} 
        onOpenChange={setTransactionsDialogOpen} 
        transactions={getThisMonthPurchases()} 
      />
    </div>
  );
};

export default Reports;
