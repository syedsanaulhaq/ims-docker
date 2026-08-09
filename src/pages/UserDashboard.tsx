import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  Package, 
  ClipboardList, 
  BarChart3, 
  Settings,
  Bell,
  Calendar,
  CheckCircle
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getDashboardItems = () => {
    const commonItems = [
      {
        title: 'Stock Register',
        subtitle: 'Inventory Management System',
        description: 'Complete inventory tracking and management',
        icon: Package,
        path: '/dashboard/inventory-dashboard',
        bgColor: 'bg-teal-500',
        hoverColor: 'hover:bg-teal-600'
      },
      {
        title: 'Stock Issuance',
        subtitle: 'Issue & Distribution',
        description: 'Handle stock issuance requests and approvals',
        icon: ClipboardList,
        path: '/stock-issuance',
        bgColor: 'bg-orange-500',
        hoverColor: 'hover:bg-orange-600'
      },
      {
        title: 'Approval System',
        subtitle: 'Workflow Management',
        description: 'Manage pending approvals and forwarding',
        icon: CheckCircle,
        path: '/dashboard/approval-dashboard',
        bgColor: 'bg-green-600',
        hoverColor: 'hover:bg-green-700'
      },
      {
        title: 'Analytics',
        subtitle: 'Reports & Insights',
        description: 'View detailed reports and analytics',
        icon: BarChart3,
        path: '/reports',
        bgColor: 'bg-purple-600',
        hoverColor: 'hover:bg-purple-700'
      },
      {
        title: 'Notifications',
        subtitle: 'Alert Management',
        description: 'View system notifications and alerts',
        icon: Bell,
        path: '/notifications',
        bgColor: 'bg-blue-600',
        hoverColor: 'hover:bg-blue-700'
      }
    ];

    // Add admin-only items
    if (user?.Role === 'Admin') {
      commonItems.push({
        title: 'Admin Panel',
        subtitle: 'System Administration',
        description: 'Manage system configuration and users',
        icon: Settings,
        path: '/settings',
        bgColor: 'bg-amber-600',
        hoverColor: 'hover:bg-amber-700'
      });
    }

    return commonItems;
  };

  return (
    <Layout limitedSidebar={true}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="bg-teal-600 rounded-lg p-2 mr-3">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Main Dashboard</h1>
                  <p className="text-sm text-gray-500">Welcome back, {user?.FullName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-gray-50 min-h-screen">
        {/* Service Cards */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {getDashboardItems().map((item, index) => (
              <div
                key={index}
                className={`${item.bgColor} ${item.hoverColor} rounded-lg p-4 text-white cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105`}
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                    <p className="text-sm opacity-90 mb-2">{item.subtitle}</p>
                  </div>
                  <div className="ml-4">
                    <item.icon className="h-6 w-6 opacity-80" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm opacity-90">{item.description}</p>
                  <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UserDashboard;
