import React from 'react';
import { usePermission, useIsSuperAdmin } from '../hooks/usePermission';
import { Loader2 } from 'lucide-react';

interface PermissionGateProps {
  permission?: string;
  requireSuperAdmin?: boolean;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Component that conditionally renders children based on user permissions
 * 
 * Usage:
 * <PermissionGate permission="stock_request.approve_admin">
 *   <AdminButton />
 * </PermissionGate>
 * 
 * Or for Super Admin only:
 * <PermissionGate requireSuperAdmin>
 *   <SuperAdminPanel />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  requireSuperAdmin = false,
  fallback = null,
  loadingFallback = <Loader2 className="w-4 h-4 animate-spin" />,
  children,
}) => {
  const { hasPermission, loading: permissionLoading } = usePermission(permission || '');
  const { isSuperAdmin, loading: superAdminLoading } = useIsSuperAdmin();

  // Show loading state
  if (permissionLoading || superAdminLoading) {
    return <>{loadingFallback}</>;
  }

  // Check if user has required access
  let hasAccess = false;

  if (requireSuperAdmin) {
    hasAccess = isSuperAdmin;
  } else if (permission) {
    hasAccess = hasPermission || isSuperAdmin; // Super admins have all permissions
  } else {
    hasAccess = true; // No specific requirement
  }

  // Render children if access granted, otherwise fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default PermissionGate;
