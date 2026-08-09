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
        // Map legacy permission keys to their new equivalents (server-side naming)
        const altKeys: Record<string, string[]> = {
          // Issuance/request permissions
          'issuance.request': ['stock_request.create', 'stock_request.view_own'],
          'issuance.view': ['stock_request.view_own'],
          // Inventory basic view
          'inventory.view': ['inventory.view_personal'],
          // Reports
          'reports.view': ['reports.view_own'],
        };

        const effectiveKeys = [permissionKey, ...(altKeys[permissionKey] || [])];
        // Check if user has IMS permissions in session (client-side check)
        if (user?.ims_permissions) {
          const hasClientPermission = user.ims_permissions.some(
            (p: any) => effectiveKeys.includes(p.permission_key)
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
          `http://localhost:3001/api/ims/check-permission?permission=${encodeURIComponent(permissionKey)}`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        if (response.ok) {
          const data = await response.json();
          // If direct check fails, try alternative keys one by one
          let allowed = !!data.hasPermission;
          if (!allowed && (altKeys[permissionKey]?.length || 0) > 0) {
            for (const k of altKeys[permissionKey]) {
              const r = await fetch(
                `http://localhost:3001/api/ims/check-permission?permission=${encodeURIComponent(k)}`,
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
