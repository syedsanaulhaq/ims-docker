import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Download, 
  BarChart3, 
  TrendingUp, 
  Package, 
  Truck, 
  Users, 
  Gavel 
} from "lucide-react";
import { invmisApi } from '@/services/invmisApi';

interface ReportsModuleProps {
  tab?: string;
}

const ReportsModule: React.FC<ReportsModuleProps> = ({ tab = 'overview' }) => {
  const [activeTab, setActiveTab] = useState(tab);

  const reportCategories = [
    {
      id: 'inventory',
      title: 'Inventory Reports',
      description: 'Stock levels, item movements, and inventory analytics',
      icon: Package,
      reports: [
        { name: 'Current Stock Levels', endpoint: '/reports/current-stock' },
        { name: 'Low Stock Alerts', endpoint: '/reports/low-stock' },
        { name: 'Stock Movement History', endpoint: '/reports/stock-movements' },
        { name: 'Item Master Report', endpoint: '/reports/item-master' },
      ]
    },
    {
      id: 'tenders',
      title: 'Tender Reports',
      description: 'Procurement tenders, awards, and bidding analytics',
      icon: Gavel,
      reports: [
        { name: 'Active Tenders', endpoint: '/reports/active-tenders' },
        { name: 'Tender Awards', endpoint: '/reports/tender-awards' },
        { name: 'Procurement History', endpoint: '/reports/procurement-history' },
        { name: 'Vendor Performance', endpoint: '/reports/vendor-performance' },
      ]
    },
    {
      id: 'deliveries',
      title: 'Delivery Reports',
      description: 'Delivery tracking, performance, and logistics analytics',
      icon: Truck,
      reports: [
        { name: 'Pending Deliveries', endpoint: '/reports/pending-deliveries' },
        { name: 'Delivery Performance', endpoint: '/reports/delivery-performance' },
        { name: 'Delivery History', endpoint: '/reports/delivery-history' },
        { name: 'Shipping Analytics', endpoint: '/reports/shipping-analytics' },
      ]
    },
    {
      id: 'vendors',
      title: 'Vendor Reports',
      description: 'Supplier performance, ratings, and relationship analytics',
      icon: Users,
      reports: [
        { name: 'Active Vendors', endpoint: '/reports/active-vendors' },
        { name: 'Vendor Ratings', endpoint: '/reports/vendor-ratings' },
        { name: 'Purchase/Supply Orders by Vendor', endpoint: '/reports/po-by-vendor' },
        { name: 'Payment History', endpoint: '/reports/payment-history' },
      ]
    }
  ];

  const handleDownloadReport = async (endpoint: string, reportName: string) => {
    try {
      // TODO: Implement actual report download using InvMIS API
      // const response = await invmisApi.reports.download(endpoint);
      alert(`Report download feature will be implemented: ${reportName}`);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="tenders">Tenders</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-sm">{category.title}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setActiveTab(category.id)}
                      className="w-full"
                    >
                      View Reports
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {reportCategories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <category.icon className="h-5 w-5 text-blue-600" />
                  <CardTitle>{category.title}</CardTitle>
                </div>
                <CardDescription>{category.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.reports.map((report, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-600" />
                            <span className="font-medium text-sm">{report.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadReport(report.endpoint, report.name)}
                              className="flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default ReportsModule;