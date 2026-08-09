import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, User, Building2 } from 'lucide-react';
import { sessionService } from '../services/sessionService';

const DigitalSystemLanding: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = sessionService.getCurrentUser();

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Inventory Management System
          </h1>
          <p className="text-xl text-gray-600">
            Welcome, {currentUser?.name || 'User'} - Please select your access module
          </p>
        </div>

        {/* Three Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* IMS Admin Wing Card */}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 hover:border-blue-500"
            onClick={() => handleCardClick('/dashboard')}
          >
            <CardHeader className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-t-lg pb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-full p-4">
                  <Shield className="h-12 w-12 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">IMS - Admin Wing</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-8">
              <CardDescription className="text-center text-gray-600 text-base leading-relaxed">
                Full administrative access to the Inventory Management System. 
                Manage tenders, stock, vendors, categories, and all system operations.
              </CardDescription>
              <div className="mt-6 text-center">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  Admin Access
                </span>
              </div>
            </CardContent>
          </Card>

          {/* IMS Personal Card */}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 hover:border-green-500"
            onClick={() => handleCardClick('/personal-ims')}
          >
            <CardHeader className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-t-lg pb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-full p-4">
                  <User className="h-12 w-12 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">IMS - Personal</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-8">
              <CardDescription className="text-center text-gray-600 text-base leading-relaxed">
                Access your personal inventory records, requests, and allocations. 
                View your items and submit new requests.
              </CardDescription>
              <div className="mt-6 text-center">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Personal Access
                </span>
              </div>
            </CardContent>
          </Card>

          {/* IMS Wings Card */}
          <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-105 border-2 hover:border-purple-500"
            onClick={() => handleCardClick('/wing-ims')}
          >
            <CardHeader className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-t-lg pb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-full p-4">
                  <Building2 className="h-12 w-12 text-purple-600" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">IMS - Wings</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 pb-8">
              <CardDescription className="text-center text-gray-600 text-base leading-relaxed">
                View wing-related inventory status, department allocations, 
                and organizational inventory reports.
              </CardDescription>
              <div className="mt-6 text-center">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Wing Access
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Logged in as: <span className="font-semibold">{currentUser?.email || 'Unknown User'}</span></p>
          <p className="mt-2">Role: <span className="font-semibold">{currentUser?.role || 'User'}</span></p>
        </div>
      </div>
    </div>
  );
};

export default DigitalSystemLanding;
