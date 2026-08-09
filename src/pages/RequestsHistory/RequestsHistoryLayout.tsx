import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Clock, CheckCircle, XCircle, Badge as BadgeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const RequestsHistoryLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const categories = [
    {
      path: '/dashboard/requests-history/future',
      label: 'Future Request',
      description: 'Approved requests',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      path: '/dashboard/requests-history/rejected',
      label: 'Rejected Request',
      description: 'Rejected requests',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      path: '/dashboard/requests-history/pending',
      label: 'Pending Request',
      description: 'Requests awaiting action',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  ];

  const isSubPage = location.pathname !== '/dashboard/requests-history';

  if (isSubPage) {
    return <Outlet />;
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900">Request History</h1>
        <p className="text-lg text-gray-600 mt-2">
          Manage and track all your requests across different statuses
        </p>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <BadgeIcon className="h-3 w-3 mr-1" />
            3 Categories
          </Badge>
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = location.pathname.includes(category.path.split('/').pop() || '');
          
          return (
            <button
              key={category.path}
              onClick={() => navigate(category.path)}
              className={`text-left transition-all duration-300 rounded-lg border-l-4 ${
                isActive
                  ? `bg-gradient-to-br ${category.bgColor} border-l-${category.color.split('-')[1]}-500 shadow-lg`
                  : `bg-gradient-to-br ${category.bgColor} border-l-${category.color.split('-')[1]}-500 hover:shadow-xl`
              }`}
            >
              <Card className="h-full bg-transparent border-none shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`h-8 w-8 ${category.color}`} />
                      <div>
                        <CardTitle className="text-lg text-gray-900">{category.label}</CardTitle>
                        <p className="text-xs text-gray-600 mt-1">{category.description}</p>
                      </div>
                    </div>
                    <ArrowRight className={`h-5 w-5 ${category.color} flex-shrink-0`} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-gray-600">Click to view details</p>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RequestsHistoryLayout;
