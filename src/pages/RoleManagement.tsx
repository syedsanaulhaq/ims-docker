import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  Lock,
  Loader2,
  X,
  Save,
  User,
  Building2,
  Package,
  ShoppingCart,
  ArrowRightLeft,
  Database,
  Sparkles,
  CheckSquare,
  Square
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface Role {
  role_id: string;
  role_name: string;
  display_name: string;
  description?: string;
  is_system_role: boolean;
  created_at: string;
  user_count?: number;
  permission_count?: number;
}

interface Permission {
  permission_id: string;
  permission_key: string;
  module_name: string;
  action_name: string;
  description?: string;
}

const MODULE_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; color: string; bgColor: string }> = {
  Personal: { label: 'Personal Self-Service', icon: User, color: 'text-sky-700', bgColor: 'bg-sky-50 border-sky-200' },
  Branch: { label: 'Branch Management', icon: Building2, color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  Wing: { label: 'Wing Management', icon: Building2, color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  Inventory: { label: 'Central Inventory', icon: Package, color: 'text-teal-700', bgColor: 'bg-teal-50 border-teal-200' },
  Procurement: { label: 'Procurement Lifecycle', icon: ShoppingCart, color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  Issuance: { label: 'Stock Issuance & Fulfillment', icon: ArrowRightLeft, color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
  Approvals: { label: 'Approvals & Workflows', icon: CheckCircle, color: 'text-rose-700', bgColor: 'bg-rose-50 border-rose-200' },
  Metadata: { label: 'Master Meta Data', icon: Database, color: 'text-cyan-700', bgColor: 'bg-cyan-50 border-cyan-200' },
  Administration: { label: 'System Administration', icon: Shield, color: 'text-slate-800', bgColor: 'bg-slate-100 border-slate-300' },
};

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({ displayName: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch roles and permissions on mount
  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/permissions/roles`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/permissions/all`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingRole(null);
    setFormData({ displayName: '', description: '' });
    setSelectedPermissions([]);
    setShowModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setFormData({ displayName: role.display_name, description: role.description || '' });
    fetchRolePermissions(role.role_id);
    setShowModal(true);
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/permissions/roles/${roleId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const permKeys = (data.permissions || []).map((p: Permission) => p.permission_key);
        setSelectedPermissions(permKeys);
      }
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      setSelectedPermissions([]);
    }
  };

  const handleTogglePermission = (permissionKey: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permissionKey)
        ? prev.filter(k => k !== permissionKey)
        : [...prev, permissionKey]
    );
  };

  const handleToggleModulePermissions = (moduleName: string, shouldSelectAll: boolean) => {
    const modulePermKeys = permissions
      .filter(p => p.module_name === moduleName)
      .map(p => p.permission_key);

    if (shouldSelectAll) {
      setSelectedPermissions(prev => Array.from(new Set([...prev, ...modulePermKeys])));
    } else {
      setSelectedPermissions(prev => prev.filter(key => !modulePermKeys.includes(key)));
    }
  };

  const handleToggleAllPermissions = (checked: boolean) => {
    if (checked) {
      setSelectedPermissions(permissions.map(p => p.permission_key));
    } else {
      setSelectedPermissions([]);
    }
  };

  // Quick Preset Handlers
  const applyPreset = (presetName: string) => {
    let targetKeys: string[] = [];
    if (presetName === 'Branch Supervisor') {
      targetKeys = permissions
        .filter(p => p.module_name === 'Personal' || p.module_name === 'Branch' || p.module_name === 'Approvals')
        .map(p => p.permission_key);
      if (!formData.displayName) setFormData(prev => ({ ...prev, displayName: 'Branch Supervisor', description: 'Manage branch inventory and approve branch requests' }));
    } else if (presetName === 'Wing Supervisor') {
      targetKeys = permissions
        .filter(p => p.module_name === 'Personal' || p.module_name === 'Wing' || p.module_name === 'Approvals')
        .map(p => p.permission_key);
      if (!formData.displayName) setFormData(prev => ({ ...prev, displayName: 'Wing Supervisor', description: 'Manage wing inventory and approve wing requests' }));
    } else if (presetName === 'Branch Storekeeper') {
      targetKeys = permissions
        .filter(p => p.module_name === 'Personal' || (p.module_name === 'Branch' && (p.permission_key.includes('storekeeper') || p.permission_key.includes('issuance') || p.permission_key.includes('inventory'))))
        .map(p => p.permission_key);
      if (!formData.displayName) setFormData(prev => ({ ...prev, displayName: 'Branch Storekeeper', description: 'Review and issue branch store inventory' }));
    } else if (presetName === 'Wing Storekeeper') {
      targetKeys = permissions
        .filter(p => p.module_name === 'Personal' || (p.module_name === 'Wing' && (p.permission_key.includes('issuance') || p.permission_key.includes('inventory'))))
        .map(p => p.permission_key);
      if (!formData.displayName) setFormData(prev => ({ ...prev, displayName: 'Wing Storekeeper', description: 'Manage and issue wing store inventory' }));
    } else if (presetName === 'Admin Storekeeper') {
      targetKeys = permissions
        .filter(p => p.module_name === 'Personal' || p.module_name === 'Issuance' || (p.module_name === 'Inventory' && p.permission_key.includes('stock.view')))
        .map(p => p.permission_key);
      if (!formData.displayName) setFormData(prev => ({ ...prev, displayName: 'Admin Storekeeper', description: 'Fulfill and dispatch central warehouse stock requests' }));
    } else if (presetName === 'Procurement Officer') {
      targetKeys = permissions
        .filter(p => p.module_name === 'Personal' || p.module_name === 'Procurement' || (p.module_name === 'Metadata' && (p.permission_key.includes('items') || p.permission_key.includes('vendors'))))
        .map(p => p.permission_key);
      if (!formData.displayName) setFormData(prev => ({ ...prev, displayName: 'Procurement Officer', description: 'Manage tenders, purchase orders, deliveries and vendors' }));
    } else if (presetName === 'General User') {
      targetKeys = permissions
        .filter(p => p.module_name === 'Personal')
        .map(p => p.permission_key);
      if (!formData.displayName) setFormData(prev => ({ ...prev, displayName: 'General User', description: 'Personal stock requisitions and custody viewing' }));
    }

    setSelectedPermissions(Array.from(new Set(targetKeys)));
  };

  const handleSaveRole = async () => {
    if (!formData.displayName.trim()) {
      alert('Role name is required');
      return;
    }

    try {
      if (editingRole) {
        // Update existing role permissions
        const response = await fetch(`${API_BASE_URL}/api/permissions/roles/${editingRole.role_id}/permissions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ permission_keys: selectedPermissions })
        });

        if (!response.ok) throw new Error('Failed to update role');
        alert('Role permissions updated successfully!');
      } else {
        // Create new role
        const response = await fetch(`${API_BASE_URL}/api/permissions/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            display_name: formData.displayName,
            description: formData.description,
            permission_keys: selectedPermissions
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create role');
        }
        alert('Role created successfully!');
      }

      setShowModal(false);
      fetchRoles();
    } catch (error) {
      console.error('Error saving role:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to save role'}`);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ displayName: '', description: '' });
    setSelectedPermissions([]);
  };

  const handleOpenDeleteModal = (role: Role) => {
    setRoleToDelete(role);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setRoleToDelete(null);
    setDeleteLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/permissions/roles/${roleToDelete.role_id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }

      alert('Role deleted successfully. Assigned users were transferred to GENERAL_USER.');
      handleCloseDeleteModal();
      fetchRoles();
    } catch (error) {
      console.error('Error deleting role:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to delete role'}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const permissionsByModule = permissions.reduce((acc, perm) => {
    if (!acc[perm.module_name]) {
      acc[perm.module_name] = [];
    }
    acc[perm.module_name].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-teal-600" />
              Role & Privilege Management
            </h1>
            <p className="text-slate-600 mt-1">
              Configure system roles and assign granular privileges across the 9 core modules (Branch, Wing, Admin, Super Admin).
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Custom Role
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search roles by display name or role key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-slate-800 shadow-sm"
            />
          </div>
        </div>

        {/* Roles Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {filteredRoles.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Role Name</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Privileges</th>
                    <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Users</th>
                    <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRoles.map((role) => (
                    <tr key={role.role_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{role.display_name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{role.role_name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-sm max-w-md">{role.description || '-'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                          {role.permission_count ?? 0} privileges
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-medium text-slate-700">{role.user_count ?? 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        {role.is_system_role ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-full border border-slate-200">
                            <Lock className="w-3 h-3" />
                            System
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors text-sm font-medium border border-teal-200"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Privileges
                        </button>
                        {!role.is_system_role && role.role_name !== 'GENERAL_USER' && (
                          <button
                            onClick={() => handleOpenDeleteModal(role)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 ml-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-sm font-medium border border-rose-200"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600">No roles found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Role Creation / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-teal-600" />
                  {editingRole ? `Edit Role: ${editingRole.display_name}` : 'Create New Custom Role'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Assign module-based permissions to grant users specific operational capabilities.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Role Info Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    disabled={!!editingRole?.is_system_role}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="e.g. Branch Store Officer"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of responsibilities..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Quick Preset Templates */}
              {!editingRole && (
                <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 uppercase tracking-wider mb-2.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Quick Role Presets
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Branch Supervisor', 'Wing Supervisor', 'Branch Storekeeper', 'Wing Storekeeper', 'Admin Storekeeper', 'Procurement Officer', 'General User'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="px-3 py-1 bg-white hover:bg-teal-600 hover:text-white text-teal-800 text-xs font-medium rounded-md border border-teal-200 transition-colors shadow-2xs"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Permissions & Modules Section */}
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Module Privileges</h3>
                    <p className="text-xs text-slate-500">
                      {selectedPermissions.length} of {permissions.length} total privileges assigned
                    </p>
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedPermissions.length === permissions.length && permissions.length > 0}
                      onChange={(e) => handleToggleAllPermissions(e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="text-xs font-bold text-teal-900">Select All Privileges</span>
                  </label>
                </div>

                {/* Modules Grid */}
                <div className="space-y-4">
                  {Object.entries(permissionsByModule).map(([moduleName, perms]) => {
                    const modConfig = MODULE_CONFIG[moduleName] || {
                      label: `${moduleName} Management`,
                      icon: Shield,
                      color: 'text-slate-800',
                      bgColor: 'bg-slate-50 border-slate-200'
                    };
                    const ModIcon = modConfig.icon;
                    const selectedInModule = perms.filter(p => selectedPermissions.includes(p.permission_key)).length;
                    const isAllInModuleSelected = selectedInModule === perms.length;

                    return (
                      <div
                        key={moduleName}
                        className={`rounded-xl border p-4 transition-all ${
                          selectedInModule > 0 ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        {/* Module Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${modConfig.bgColor} ${modConfig.color}`}>
                              <ModIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-sm">{modConfig.label}</span>
                              <span className="ml-2 text-xs text-slate-500 font-medium">
                                ({selectedInModule}/{perms.length} selected)
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleModulePermissions(moduleName, !isAllInModuleSelected)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-teal-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                          >
                            {isAllInModuleSelected ? (
                              <>
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                                Deselect Module
                              </>
                            ) : (
                              <>
                                <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                                Select All in Module
                              </>
                            )}
                          </button>
                        </div>

                        {/* Permissions in Module */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                          {perms.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.permission_key);
                            return (
                              <label
                                key={perm.permission_id}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                                  isChecked
                                    ? 'bg-teal-50/40 border-teal-200 text-slate-900'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.permission_key)}
                                  className="mt-0.5 w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold leading-tight text-slate-800">{perm.action_name}</div>
                                  <div className="text-3xs text-slate-400 font-mono truncate">{perm.permission_key}</div>
                                  {perm.description && (
                                    <div className="text-2xs text-slate-500 mt-0.5 leading-snug">{perm.description}</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 px-6 border-t border-slate-200 bg-slate-50">
              <div className="text-xs text-slate-600">
                <span className="font-bold text-slate-900">{selectedPermissions.length}</span> privileges will be attached to this role.
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRole}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  Save Role Privileges
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && roleToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-200 bg-rose-50/50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-rose-600" />
                Delete Custom Role
              </h2>
            </div>
            <div className="p-6">
              <p className="text-slate-700 text-sm mb-4">
                Are you sure you want to delete <strong>{roleToDelete.display_name}</strong>?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Important system actions on deletion:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Permanently removes this custom role.</li>
                  <li>
                    Automatically transfers <strong>{roleToDelete.user_count ?? 0} assigned user(s)</strong> to <strong>GENERAL_USER</strong>.
                  </li>
                  <li>Revokes associated role permissions.</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={handleCloseDeleteModal}
                disabled={deleteLoading}
                className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleteLoading ? 'Deleting...' : 'Delete Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;

