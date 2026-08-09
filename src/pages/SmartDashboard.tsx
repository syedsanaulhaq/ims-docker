import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useSession } from '@/contexts/SessionContext';
import PersonalDashboard from './PersonalDashboard';
import WingDashboard from './WingDashboard';
import Dashboard from './Dashboard'; // System-wide dashboard
import LoadingSpinner from '@/components/common/LoadingSpinner';

/**
 * SmartDashboard - Routes users to appropriate dashboard based on their role/permissions
 * 
 * Priority:
 * 1. Super Admin / IMS Admin -> System Dashboard (full system stats)
 * 2. General User / Wing Supervisor -> Personal Dashboard (default)
 * 
 * Note: Wing Supervisors will see both Personal and Wing menus in the sidebar
 * and can navigate to Wing Dashboard via the menu
 */
const SmartDashboard = () => {
  const { user } = useSession();
  const { hasPermission: canViewInventory, loading: loadingInventoryView } = usePermission('inventory.view');
  const { hasPermission: canManageInventory, loading: loadingInventoryManage } = usePermission('inventory.manage');
  const { hasPermission: canManageRoles, loading: loadingRoles } = usePermission('roles.manage');
  const { hasPermission: canViewReports, loading: loadingReports } = usePermission('reports.view');
  
  // Wait for all permission checks to complete
  const isLoading = loadingInventoryView || loadingInventoryManage || loadingRoles || loadingReports;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }
  
  // Super Admin / IMS Admin - has role management permissions
  // Show full system dashboard
  if (canManageRoles) {
    return <Dashboard />;
  }
  
  // All other users (including Wing Supervisors) default to Personal Dashboard
  // Wing Supervisors can access Wing Dashboard via the sidebar menu
  return <PersonalDashboard />;
};

export default SmartDashboard;
