import { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';

/**
 * Custom hook to check if the current user has a specific permission
 * @param permissionKey - The permission key to check (e.g., 'stock_request.approve_admin')
 * @returns Object with hasPermission boolean and loading state
 */
export function usePermission(permissionKey: string) {
  const { user, isAuthenticated } = useSession();
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkPermission = async () => {
      if (!isAuthenticated || !permissionKey) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      try {
        // Map modular permission keys and legacy keys bi-directionally
        const altKeys: Record<string, string[]> = {
          // Personal
          'personal.dashboard.view': ['issuance.view_own', 'stock_request.view_own'],
          'personal.request.create': ['issuance.request', 'stock_request.create'],
          'personal.request.view_own': ['issuance.view', 'stock_request.view_own'],
          'personal.inventory.view_own': ['inventory.view_personal'],
          'personal.return.create': ['issuance.request'],
          'issuance.request': ['personal.request.create', 'stock_request.create', 'stock_request.view_own'],
          'issuance.view': ['personal.request.view_own', 'stock_request.view_own'],
          // Branch
          'branch.dashboard.view': ['branch.supervisor', 'branch.storekeeper'],
          'branch.inventory.view': ['branch.supervisor', 'branch.storekeeper', 'inventory.view_wing'],
          'branch.inventory.manage': ['branch.supervisor', 'branch.storekeeper'],
          'branch.demand.create': ['branch.supervisor', 'stock_request.create'],
          'branch.demand.view': ['branch.supervisor', 'stock_request.view_wing'],
          'branch.storekeeper.review': ['branch.storekeeper'],
          'branch.issuance.process': ['branch.storekeeper', 'issuance.process'],
          'branch.members.view': ['branch.supervisor'],
          // Wing
          'wing.dashboard.view': ['wing.supervisor'],
          'wing.inventory.view': ['wing.supervisor', 'inventory.manage_store_keeper', 'inventory.view_wing'],
          'wing.inventory.manage': ['wing.supervisor', 'inventory.manage_store_keeper', 'inventory.edit_wing'],
          'wing.demand.create': ['wing.supervisor', 'procurement.request'],
          'wing.demand.view': ['wing.supervisor', 'stock_request.view_wing'],
          'wing.issuance.process': ['inventory.manage_store_keeper', 'issuance.process'],
          'wing.members.view': ['wing.supervisor'],
          'wing.supervisor': ['wing.dashboard.view', 'wing.inventory.view'],
          // Central Inventory
          'inventory.dashboard.view': ['inventory.view', 'inventory.view_all'],
          'inventory.stock.view': ['inventory.view', 'inventory.view_all'],
          'inventory.stock.adjust': ['inventory.manage', 'inventory.edit_all'],
          'inventory.opening_balance.entry': ['inventory.manage', 'inventory.edit_all'],
          'inventory.alerts.view': ['inventory.view', 'inventory.view_all'],
          'inventory.view': ['inventory.dashboard.view', 'inventory.stock.view', 'inventory.view_all'],
          'inventory.manage': ['inventory.stock.adjust', 'inventory.opening_balance.entry', 'inventory.edit_all'],
          // Procurement
          'procurement.tenders.manage': ['procurement.manage', 'tender.create', 'tender.manage'],
          'procurement.annual_tenders.manage': ['procurement.manage', 'tender.create'],
          'procurement.petty_purchase.manage': ['procurement.manage'],
          'procurement.required_items.view': ['procurement.manage', 'procurement.view'],
          'procurement.requests.review': ['procurement.manage', 'procurement.approve'],
          'procurement.po.manage': ['procurement.manage'],
          'procurement.delivery.receive': ['procurement.manage', 'acquisition.create'],
          'procurement.view': ['procurement.tenders.manage', 'procurement.required_items.view'],
          'procurement.manage': ['procurement.tenders.manage', 'procurement.po.manage'],
          // Issuance
          'issuance.dashboard.view': ['issuance.view', 'issuance.process'],
          'issuance.admin.process': ['issuance.process'],
          'issuance.historical.entry': ['issuance.process'],
          'issuance.history.view': ['issuance.view'],
          'issuance.transactions.view': ['issuance.view'],
          'issuance.process': ['issuance.admin.process', 'branch.issuance.process', 'wing.issuance.process'],
          // Approvals
          'approval.supervisor.approve': ['approval.approve', 'supervisor.menu.view', 'stock_request.approve_supervisor'],
          'approval.admin.approve': ['approval.approve', 'stock_request.approve_admin'],
          'approval.approve': ['approval.supervisor.approve', 'approval.admin.approve'],
          'supervisor.menu.view': ['approval.supervisor.approve'],
          // Metadata
          'metadata.items.manage': ['items.manage', 'inventory.manage'],
          'metadata.categories.manage': ['categories.manage', 'inventory.manage'],
          'metadata.subcategories.manage': ['categories.manage', 'inventory.manage'],
          'metadata.vendors.manage': ['vendor.manage', 'procurement.manage'],
          // Admin
          'reports.view_all': ['reports.view', 'reports.view_all'],
          'reports.view': ['reports.view_all'],
          'admin.super': ['admin.super']
        };

        const effectiveKeys = [permissionKey, ...(altKeys[permissionKey] || [])].map(k => k.toLowerCase());
        // Check if user has IMS permissions in session (client-side check)
        if (user?.ims_permissions) {
          const hasClientPermission = user.ims_permissions.some(
            (p: any) => effectiveKeys.includes(String(p.permission_key || '').toLowerCase())
          );
          
          // Also check if user is super admin
          if (user.is_super_admin || hasClientPermission) {
            setHasPermission(true);
            setLoading(false);
            return;
          }
        }

        // Server-side verification for security
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/permissions/check?permission=${encodeURIComponent(permissionKey)}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (response.ok) {
          const data = await response.json();
          let allowed = !!data.hasPermission;
          if (!allowed && (altKeys[permissionKey]?.length || 0) > 0) {
            for (const k of altKeys[permissionKey]) {
              const r = await fetch(
                `${import.meta.env.VITE_API_URL}/api/permissions/check?permission=${encodeURIComponent(k)}`,
                { method: 'GET', credentials: 'include' }
              );
              if (r.ok) {
                const dj = await r.json();
                if (dj.hasPermission) { allowed = true; break; }
              }
            }
          }
          setHasPermission(allowed);
        } else {
          setHasPermission(false);
        }
      } catch (error) {
        console.error('Error checking permission:', error);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionKey, isAuthenticated, user]);

  return { hasPermission, loading };
}

/**
 * Custom hook to check if the current user is a Super Admin
 */
export function useIsSuperAdmin() {
  const { user, isAuthenticated } = useSession();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    // Check from session data
    if (user?.is_super_admin !== undefined) {
      setIsSuperAdmin(user.is_super_admin);
      setLoading(false);
    } else {
      setIsSuperAdmin(false);
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  return { isSuperAdmin, loading };
}

/**
 * Custom hook to check multiple permissions at once
 * @param permissions - Array of permission keys to check
 * @returns Object with permissions map and loading state
 */
export function usePermissions(permissions: string[]) {
  const { user, isAuthenticated } = useSession();
  const [permissionMap, setPermissionMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isAuthenticated || permissions.length === 0) {
      setPermissionMap({});
      setLoading(false);
      return;
    }

    // Check from session data first
    if (user?.ims_permissions || user?.is_super_admin) {
      const map: Record<string, boolean> = {};
      
      permissions.forEach(perm => {
        if (user.is_super_admin) {
          map[perm] = true;
        } else if (user.ims_permissions) {
          map[perm] = user.ims_permissions.some(
            (p: any) => p.permission_key === perm
          );
        } else {
          map[perm] = false;
        }
      });

      setPermissionMap(map);
      setLoading(false);
    } else {
      setPermissionMap({});
      setLoading(false);
    }
  }, [permissions, isAuthenticated, user]);

  return { permissions: permissionMap, loading };
}
