import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Shield,
  Search,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  UserCheck,
  Building2,
  Trash2,
  Settings,
  RefreshCw,
  ShieldAlert,
  Layers,
  ChevronRight
} from 'lucide-react';
import { useIsSuperAdmin } from '../hooks/usePermission';
import { useNavigate } from 'react-router-dom';

import { getApiBaseUrl } from '@/services/invmisApi';

const API_BASE_URL = getApiBaseUrl().replace(/\/api$/, '');

interface User {
  user_id: string;
  full_name: string;
  email: string;
  cnic: string;
  office_id: number;
  wing_id: number;
  designation_id: number;
  office_name: string;
  wing_name: string;
  designation_name: string;
  is_super_admin: boolean;
  roles: UserRole[];
}

interface UserRole {
  user_role_id: string;
  role_name: string;
  display_name: string;
  scope_type: string;
  scope_wing_id: number | null;
  scope_wing_name: string | null;
  assigned_at?: string;
  assigned_by_name?: string;
}

interface Role {
  role_id: string;
  id?: string;
  role_name: string;
  display_name: string;
  description: string;
  is_system_role: boolean;
}

interface Wing {
  Id: number;
  Name: string;
  ShortName?: string;
  WingCode?: string;
}

interface RevokeTarget {
  userId: string;
  userName: string;
  roleId: string; // user_role_id or 'all'
  roleName: string;
  displayName: string;
}

const UserRoleAssignment: React.FC = () => {
  const navigate = useNavigate();
  const { isSuperAdmin, loading: authLoading } = useIsSuperAdmin();
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [offices, setOffices] = useState<Array<{ intOfficeID: number; strOfficeName: string }>>([]);
  const [wings, setWings] = useState<Wing[]>([]);
  
  // Selected user for Manage Roles modal
  const [activeUser, setActiveUser] = useState<User | null>(null);
  
  // Confirmation modal target for role revocation
  const [revokeTarget, setRevokeTarget] = useState<RevokeTarget | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterWing, setFilterWing] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // Applied filters
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedOffice, setAppliedOffice] = useState('');
  const [appliedWing, setAppliedWing] = useState('');
  const [appliedRole, setAppliedRole] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);

  // Assign Form state
  const [assignForm, setAssignForm] = useState({
    role_id: '',
    scope_type: 'Global',
    scope_wing_id: ''
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Fetch users with current applied filters
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (appliedSearch) params.append('search', appliedSearch);
      if (appliedOffice) params.append('office_id', appliedOffice);
      if (appliedWing) params.append('wing_id', appliedWing);
      if (appliedRole) params.append('role_name', appliedRole);

      const queryString = params.toString();
      const urlToFetch = `${API_BASE_URL}/api/permissions/users${queryString ? '?' + queryString : ''}`;
      const response = await fetch(urlToFetch, {
        credentials: 'include',
      });

      if (response.ok) {
        const data: User[] = await response.json();
        setUsers(data);
        // If modal is open for a user, refresh that user's role list in the modal
        if (activeUser) {
          const updatedSelected = data.find(u => u.user_id === activeUser.user_id);
          if (updatedSelected) {
            setActiveUser(updatedSelected);
          }
        }
      } else {
        console.error('Failed to fetch users:', response.status);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('error', 'Failed to load users from server.');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, appliedOffice, appliedWing, appliedRole, activeUser]);

  const fetchOffices = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/offices`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setOffices(data);
      }
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/permissions/roles`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }, []);

  const fetchWings = useCallback(async (officeId: string) => {
    if (!officeId) {
      setWings([]);
      return;
    }
    try {
      const wingUrl = `${API_BASE_URL}/api/wings?office_id=${officeId}`;
      const response = await fetch(wingUrl, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setWings(data);
      }
    } catch (error) {
      console.error('Error fetching wings:', error);
    }
  }, []);

  // Filter actions
  const handleSearch = () => {
    setAppliedSearch(searchTerm);
    setAppliedOffice(filterOffice);
    setAppliedWing(filterWing);
    setAppliedRole(filterRole);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterOffice('');
    setFilterWing('');
    setFilterRole('');
    setAppliedSearch('');
    setAppliedOffice('');
    setAppliedWing('');
    setAppliedRole('');
    setWings([]);
    setCurrentPage(1);
  };

  // Office filter change
  const handleOfficeChange = (officeId: string) => {
    setFilterOffice(officeId);
    setFilterWing('');
    fetchWings(officeId);
  };

  // Redirect if not Super Admin
  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, authLoading, navigate]);

  // Initial load
  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchOffices();
      fetchRoles();
    }
  }, [authLoading, isSuperAdmin, fetchOffices, fetchRoles]);

  // Fetch users when filters change
  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchUsers();
    }
  }, [appliedSearch, appliedOffice, appliedWing, appliedRole, authLoading, isSuperAdmin]);

  // Handle Assigning Role to activeUser
  const handleAssignRole = async () => {
    if (!activeUser || !assignForm.role_id) return;

    try {
      setActionLoading(true);
      const payload = {
        role_id: assignForm.role_id,
        scope_type: assignForm.scope_type,
        scope_wing_id: assignForm.scope_wing_id ? parseInt(assignForm.scope_wing_id) : null
      };

      const response = await fetch(`${API_BASE_URL}/api/permissions/users/${activeUser.user_id}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', 'Role assigned successfully!');
        setAssignForm({ role_id: '', scope_type: 'Global', scope_wing_id: '' });
        await fetchUsers();
      } else {
        showToast('error', data.error || 'Failed to assign role');
      }
    } catch (error) {
      console.error('Error assigning role:', error);
      showToast('error', 'Error assigning role');
    } finally {
      setActionLoading(false);
    }
  };

  // Open confirmation modal for role revocation
  const promptRevokeRole = (user: User, role: UserRole) => {
    setRevokeTarget({
      userId: user.user_id,
      userName: user.full_name,
      roleId: role.user_role_id,
      roleName: role.role_name,
      displayName: role.display_name
    });
  };

  // Open confirmation modal for revoking ALL roles
  const promptRevokeAllRoles = (user: User) => {
    setRevokeTarget({
      userId: user.user_id,
      userName: user.full_name,
      roleId: 'all',
      roleName: 'ALL_ROLES',
      displayName: 'All Assigned Roles'
    });
  };

  // Execute the confirmed revocation
  const executeRevokeRole = async () => {
    if (!revokeTarget) return;

    try {
      setActionLoading(true);
      const { userId, roleId } = revokeTarget;
      const response = await fetch(`${API_BASE_URL}/api/permissions/users/${userId}/roles/${roleId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        showToast('success', data.message || 'Role removed successfully!');
        setRevokeTarget(null);
        await fetchUsers();
      } else {
        showToast('error', data.error || 'Failed to remove role');
      }
    } catch (error) {
      console.error('Error revoking role:', error);
      showToast('error', 'Network error while removing role');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to get stylized role badge classes
  const getRoleBadgeStyle = (roleName: string) => {
    const upper = (roleName || '').toUpperCase();
    if (upper.includes('SUPER_ADMIN')) {
      return 'bg-purple-100 text-purple-800 border border-purple-200';
    }
    if (upper.includes('ADMIN') || upper.includes('IMS_ADMIN')) {
      return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
    if (upper.includes('WING_SUPERVISOR')) {
      return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
    }
    if (upper.includes('BRANCH_SUPERVISOR')) {
      return 'bg-amber-100 text-amber-800 border border-amber-200';
    }
    if (upper.includes('STORE_KEEPER') || upper.includes('STOREKEEPER')) {
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    }
    if (upper.includes('PROCUREMENT')) {
      return 'bg-cyan-100 text-cyan-800 border border-cyan-200';
    }
    if (upper.includes('AUDITOR')) {
      return 'bg-rose-100 text-rose-800 border border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border border-slate-200';
  };

  // Pagination calculations
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  const totalAssignedUsers = users.filter(u => u.roles && u.roles.length > 0).length;

  if (authLoading || (loading && users.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-80 space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-600">Loading User Role Management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <UserCheck className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Role & Scope Assignment</h1>
              <p className="text-blue-200/80 text-sm mt-0.5">
                Assign and revoke module privileges and administrative scopes for all system users
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 text-center flex-1 md:flex-initial">
            <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold block">Total Users</span>
            <span className="text-xl font-bold">{users.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/10 text-center flex-1 md:flex-initial">
            <span className="text-xs text-blue-200 uppercase tracking-wider font-semibold block">With Roles</span>
            <span className="text-xl font-bold text-emerald-300">{totalAssignedUsers}</span>
          </div>
          <button
            onClick={() => fetchUsers()}
            disabled={loading}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl border border-white/10 transition-colors flex items-center justify-center text-white"
            title="Refresh List"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Toast Notification */}
      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-md transition-all animate-in fade-in slide-in-from-top-4 ${
          message.type === 'success'
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
            : 'bg-red-50 text-red-900 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="font-medium text-sm">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Office Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Filter by Office
            </label>
            <select
              value={filterOffice}
              onChange={(e) => handleOfficeChange(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Offices</option>
              {offices.map((office) => (
                <option key={office.intOfficeID} value={String(office.intOfficeID)}>
                  {office.strOfficeName}
                </option>
              ))}
            </select>
          </div>

          {/* Wing Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Filter by Wing
            </label>
            <select
              value={filterWing}
              onChange={(e) => setFilterWing(e.target.value)}
              disabled={!filterOffice}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              <option value="">
                {filterOffice ? 'All Wings in Office' : 'Select Office First'}
              </option>
              {wings.map((wing) => (
                <option key={wing.Id} value={String(wing.Id)}>
                  {wing.Name} {wing.ShortName ? `(${wing.ShortName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Filter by Role
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.role_id || r.id} value={r.role_name}>
                  {r.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box & Controls */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Search by Name / CNIC / Email
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Type name, CNIC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                Apply
              </button>
              {(appliedSearch || appliedOffice || appliedWing || appliedRole || searchTerm) && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg border border-slate-300 transition-colors"
                  title="Clear all filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-6">User Details</th>
                <th className="py-3.5 px-6">Office & Wing Placement</th>
                <th className="py-3.5 px-6">Active Roles & Scopes</th>
                <th className="py-3.5 px-6 text-right">Role Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {currentUsers.map((user) => (
                <tr key={user.user_id} className="hover:bg-slate-50/75 transition-colors">
                  {/* User Column */}
                  <td className="py-4 px-6 align-top">
                    <div>
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        {user.full_name}
                        {user.is_super_admin && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 rounded-full">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">
                        CNIC: <span className="text-slate-700 font-medium">{user.cnic || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
                    </div>
                  </td>

                  {/* Office & Wing Placement */}
                  <td className="py-4 px-6 align-top">
                    <div>
                      <div className="font-medium text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        {user.office_name || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 pl-5">
                        Wing: <span className="font-medium text-slate-700">{user.wing_name || 'N/A'}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 pl-5">
                        Designation: {user.designation_name || 'Not Assigned'}
                      </div>
                    </div>
                  </td>

                  {/* Active Roles & Scopes */}
                  <td className="py-4 px-6 align-top">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span
                            key={role.user_role_id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shadow-xs ${getRoleBadgeStyle(
                              role.role_name
                            )}`}
                          >
                            <Shield className="w-3 h-3 opacity-70" />
                            <span>{role.display_name}</span>
                            <span className="opacity-75 text-[11px]">
                              ({role.scope_type || 'Global'}
                              {role.scope_wing_name ? `: ${role.scope_wing_name}` : ''})
                            </span>
                            <button
                              onClick={() => promptRevokeRole(user, role)}
                              className="ml-1 p-0.5 hover:bg-red-200/60 rounded text-red-600 hover:text-red-800 transition-colors"
                              title={`Revoke ${role.display_name} from ${user.full_name}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic bg-slate-50 px-2.5 py-1 rounded border border-dashed border-slate-200">
                          No roles assigned (No active permissions)
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Role Actions */}
                  <td className="py-4 px-6 align-top text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setActiveUser(user);
                        setAssignForm({ role_id: '', scope_type: 'Global', scope_wing_id: '' });
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg text-xs border border-indigo-200 transition-colors shadow-xs"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Manage Roles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {currentUsers.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">No users match your criteria</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing or adjusting your search filters above.</p>
          </div>
        )}

        {/* Pagination Controls */}
        {users.length > itemsPerPage && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(endIndex, users.length)}</span> of{' '}
              <span className="font-bold text-slate-900">{users.length}</span> users
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium"
              >
                Previous
              </button>

              <span className="px-3 py-1.5 font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MANAGE USER ROLES MODAL */}
      {/* ========================================================================= */}
      {activeUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between flex-shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-300" />
                  <h3 className="text-xl font-bold">Manage Roles & Scopes</h3>
                </div>
                <p className="text-indigo-200 text-xs mt-1">
                  User: <span className="font-semibold text-white">{activeUser.full_name}</span> ({activeUser.email})
                </p>
              </div>
              <button
                onClick={() => setActiveUser(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* User Overview Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">CNIC</span>
                  <span className="font-semibold text-slate-800">{activeUser.cnic || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Office</span>
                  <span className="font-semibold text-slate-800">{activeUser.office_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Wing / Branch</span>
                  <span className="font-semibold text-slate-800">{activeUser.wing_name || 'N/A'}</span>
                </div>
              </div>

              {/* Section 1: Currently Assigned Roles */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Currently Assigned Roles ({activeUser.roles?.length || 0})
                  </h4>
                  {activeUser.roles && activeUser.roles.length > 1 && (
                    <button
                      onClick={() => promptRevokeAllRoles(activeUser)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors"
                    >
                      Revoke All Roles
                    </button>
                  )}
                </div>

                {activeUser.roles && activeUser.roles.length > 0 ? (
                  <div className="space-y-2">
                    {activeUser.roles.map((role) => (
                      <div
                        key={role.user_role_id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getRoleBadgeStyle(
                              role.role_name
                            )}`}
                          >
                            {role.display_name}
                          </span>
                          <div className="text-xs text-slate-600">
                            Scope: <span className="font-semibold text-slate-800">{role.scope_type || 'Global'}</span>
                            {role.scope_wing_name && (
                              <span className="text-slate-500 font-medium"> ({role.scope_wing_name})</span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => promptRevokeRole(activeUser, role)}
                          disabled={actionLoading}
                          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Revoke Role
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>No roles currently assigned. This user has 0 access permissions in the portal.</span>
                  </div>
                )}
              </div>

              {/* Section 2: Assign a New Role */}
              <div className="border-t border-slate-200 pt-6">
                <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-600" />
                  Assign Additional Role
                </h4>

                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Role to Grant *
                    </label>
                    <select
                      value={assignForm.role_id}
                      onChange={(e) => setAssignForm({ ...assignForm, role_id: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">Choose a role...</option>
                      {roles
                        .filter(
                          (r) =>
                            !activeUser.roles?.some(
                              (ur) => ur.role_name === r.role_name
                            )
                        )
                        .map((r) => (
                          <option key={r.role_id || r.id} value={r.role_id || r.id}>
                            {r.display_name} {r.is_system_role ? '(System Preset)' : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Scope Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Scope Type *
                      </label>
                      <select
                        value={assignForm.scope_type}
                        onChange={(e) =>
                          setAssignForm({
                            ...assignForm,
                            scope_type: e.target.value,
                            scope_wing_id: ''
                          })
                        }
                        className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Global">Global (Full System Access)</option>
                        <option value="Wing">Wing Specific</option>
                        <option value="Office">Office Specific</option>
                        <option value="Branch">Branch Specific</option>
                      </select>
                    </div>

                    {/* Wing Selector if Scope is Wing */}
                    {assignForm.scope_type === 'Wing' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Select Specific Wing *
                        </label>
                        <select
                          value={assignForm.scope_wing_id}
                          onChange={(e) =>
                            setAssignForm({ ...assignForm, scope_wing_id: e.target.value })
                          }
                          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Choose a wing...</option>
                          {wings.map((w) => (
                            <option key={w.Id} value={String(w.Id)}>
                              {w.Name} {w.ShortName ? `(${w.ShortName})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAssignRole}
                    disabled={
                      actionLoading ||
                      !assignForm.role_id ||
                      (assignForm.scope_type === 'Wing' && !assignForm.scope_wing_id)
                    }
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Assign Role to User
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
              <button
                onClick={() => setActiveUser(null)}
                className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED IN-APP REVOCATION CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {revokeTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 animate-in zoom-in-95 duration-150">
            {/* Modal Top Banner */}
            <div className="p-5 bg-red-50 border-b border-red-100 flex items-center gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-950">Confirm Role Revocation</h3>
                <p className="text-xs text-red-700">This action will modify user privileges immediately</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-3 text-sm text-slate-600">
              <p>
                Are you sure you want to revoke{' '}
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {revokeTarget.displayName}
                </span>{' '}
                from <span className="font-semibold text-slate-900">{revokeTarget.userName}</span>?
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                The user will immediately lose all privileges associated with this role upon confirmation.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button
                onClick={() => setRevokeTarget(null)}
                disabled={actionLoading}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg border border-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeRevokeRole}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm & Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRoleAssignment;
