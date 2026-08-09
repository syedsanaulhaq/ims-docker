import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  Users,
  Package,
  Gavel,
  TrendingUp,
  Building,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  Target
} from 'lucide-react';

const InvMISWelcomePage: React.FC = () => {
  const modules = [
    {
      title: 'InvMIS Dashboard',
      description: 'Comprehensive overview of your inventory management system with real-time analytics and insights.',
      icon: BarChart3,
      path: '/invmis-dashboard',
      color: 'bg-blue-500',
      features: ['Real-time Analytics', 'Performance Metrics', 'Quick Actions', 'System Overview']
    },
    {
      title: 'User Management',
      description: 'Complete user lifecycle management with roles, permissions, departments, and access control.',
      icon: Users,
      path: '/user-management',
      color: 'bg-green-500',
      features: ['User CRUD Operations', 'Role Management', 'Department Structure', 'Access Control']
    },
    {
      title: 'Inventory Management',
      description: 'Advanced inventory tracking with stock management, categories, movements, and adjustments.',
      icon: Package,
      path: '/inventory-management',
      color: 'bg-purple-500',
      features: ['Stock Tracking', 'Category Management', 'Movement History', 'Automated Alerts']
    },
    {
      title: 'Tender Management',
      description: 'End-to-end procurement process with tender creation, bidding, evaluation, and awards.',
      icon: Gavel,
      path: '/tender-management',
      color: 'bg-orange-500',
      features: ['Tender Creation', 'Bid Management', 'Evaluation Tools', 'Award Processing']
    },
    {
      title: 'Reports & Analytics',
      description: 'Comprehensive reporting suite with financial analytics, vendor performance, and insights.',
      icon: TrendingUp,
      path: '/reports-analytics',
      color: 'bg-pink-500',
      features: ['Financial Reports', 'Vendor Analytics', 'Performance Metrics', 'Data Export']
    }
  ];

  const systemFeatures = [
    {
      icon: Zap,
      title: 'High Performance',
      description: 'Built with modern React and optimized for speed'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with role-based access'
    },
    {
      icon: Clock,
      title: 'Real-time Updates',
      description: 'Live data synchronization across all modules'
    },
    {
      icon: Target,
      title: 'Goal Oriented',
      description: 'Designed for efficiency and productivity'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Building className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">InvMIS</h1>
                <p className="text-sm text-gray-600">Inventory Management Information System</p>
              </div>
            </div>
            <Link to="/user-dashboard">
              <Button variant="outline">
                Go to User Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to InvMIS
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A comprehensive Inventory Management Information System with advanced ERP capabilities. 
            Streamline your procurement, inventory, and reporting processes with our modern solution.
          </p>
          <div className="flex justify-center gap-4">
            <Link to="/invmis-dashboard">
              <Button size="lg" className="px-8">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/reports-analytics">
              <Button variant="outline" size="lg" className="px-8">
                View Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* System Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
          {systemFeatures.map((feature) => (
            <Card key={feature.title} className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <feature.icon className="w-12 h-12 mx-auto text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Modules Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            System Modules
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Explore our comprehensive ERP modules designed to handle all aspects of your inventory and procurement operations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Link key={module.title} to={module.path}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-3 rounded-lg ${module.color} text-white`}>
                        <module.icon className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-xl group-hover:text-blue-600 transition-colors">
                        {module.title}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-gray-600 leading-relaxed">
                      {module.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Key Features:</h4>
                      <ul className="space-y-1">
                        {module.features.map((feature) => (
                          <li key={feature} className="flex items-center text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></div>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6">
                      <Button className="w-full group-hover:bg-blue-600 transition-colors">
                        Access Module
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Built for Enterprise Scale</h2>
          <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
            Our system is designed to handle complex inventory operations with reliability and performance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold mb-2">5+</div>
              <div className="text-lg opacity-80">Core Modules</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">100%</div>
              <div className="text-lg opacity-80">TypeScript</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-lg opacity-80">System Availability</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Building className="w-6 h-6" />
            <span className="text-lg font-semibold">InvMIS</span>
          </div>
          <p className="text-gray-400">
            Enterprise Inventory Management System - Built with React, TypeScript, and modern technologies
          </p>
        </div>
      </footer>
    </div>
  );
};

export default InvMISWelcomePage;