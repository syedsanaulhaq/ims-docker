import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Download,
  Upload,
  Building,
  Calendar
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { invmisApi } from '@/services/invmisApi';

// Types
interface User {
  Id: string;
  UserName: string;
  Email: string;
  PhoneNumber?: string;
  FullName?: string;
  Department?: string;
  Designation?: string;
  IsActive: boolean;
  CreatedDate: string;
  LastLogin?: string;
  Role?: string;
  Office?: string;
}

interface Department {
  id: string;
  name: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    UserName: '',
    Email: '',
    FullName: '',
    PhoneNumber: '',
    Department: '',
    Designation: '',
    Role: '',
    Office: '',
    IsActive: true
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const usersResponse = await invmisApi.getUsers();
      setUsers(usersResponse);

      // Sample departments and roles (in real app, fetch from API)
      setDepartments([
        { id: '1', name: 'IT Department', description: 'Information Technology' },
        { id: '2', name: 'Finance', description: 'Financial Management' },
        { id: '3', name: 'Procurement', description: 'Procurement and Tenders' },
        { id: '4', name: 'Administration', description: 'General Administration' },
        { id: '5', name: 'Operations', description: 'Operations Management' }
      ]);

      setRoles([
        { id: '1', name: 'Administrator', permissions: ['all'] },
        { id: '2', name: 'Procurement Manager', permissions: ['tenders', 'procurement'] },
        { id: '3', name: 'Inventory Manager', permissions: ['inventory', 'items'] },
        { id: '4', name: 'Finance Officer', permissions: ['finance', 'reports'] },
        { id: '5', name: 'User', permissions: ['view'] }
      ]);
      
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.UserName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.Department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' ||
      (filterStatus === 'active' && user.IsActive) ||
      (filterStatus === 'inactive' && !user.IsActive);
    
    return matchesSearch && matchesFilter;
  });

  const handleCreateUser = async () => {
    try {
      // In real app, call API to create user
      // Reset form and close dialog
      setFormData({
        UserName: '',
        Email: '',
        FullName: '',
        PhoneNumber: '',
        Department: '',
        Designation: '',
        Role: '',
        Office: '',
        IsActive: true
      });
      setIsCreateDialogOpen(false);
      
      // Refresh users list
      await fetchUsers();
      
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  const handleEditUser = async () => {
    try {
      if (!selectedUser) return;
      
      // In real app, call API to update user
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      
      // Refresh users list
      await fetchUsers();
      
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      // In real app, call API to toggle user status
      // Update local state
      setUsers(users.map(u => 
        u.Id === user.Id ? { ...u, IsActive: !u.IsActive } : u
      ));
      
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      UserName: user.UserName || '',
      Email: user.Email || '',
      FullName: user.FullName || '',
      PhoneNumber: user.PhoneNumber || '',
      Department: user.Department || '',
      Designation: user.Designation || '',
      Role: user.Role || '',
      Office: user.Office || '',
      IsActive: user.IsActive
    });
    setIsEditDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
            <p className="text-gray-600">Loading user management...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">Manage system users, roles, and permissions</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              User
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{users.filter(u => u.IsActive).length}</p>
                </div>
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Users</p>
                  <p className="text-2xl font-bold text-red-600">{users.filter(u => !u.IsActive).length}</p>
                </div>
                <UserX className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Departments</p>
                  <p className="text-2xl font-bold text-purple-600">{departments.length}</p>
                </div>
                <Building className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search users by name, email, or department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Users Table */}
            <Card>
              <CardHeader>
                <CardTitle>System Users ({filteredUsers.length})</CardTitle>
                <CardDescription>Manage user accounts and access permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.Id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.FullName || user.UserName}</div>
                              <div className="text-sm text-gray-500">@{user.UserName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center text-sm">
                                <Mail className="w-3 h-3 mr-2 text-gray-400" />
                                {user.Email}
                              </div>
                              {user.PhoneNumber && (
                                <div className="flex items-center text-sm text-gray-500">
                                  <Phone className="w-3 h-3 mr-2 text-gray-400" />
                                  {user.PhoneNumber}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.Department || 'N/A'}</div>
                              <div className="text-sm text-gray-500">{user.Designation || 'No designation'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{user.Role || 'User'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.IsActive ? 'default' : 'destructive'}>
                              {user.IsActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {user.LastLogin ? formatDate(user.LastLogin) : 'Never'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant={user.IsActive ? 'destructive' : 'default'}
                                onClick={() => handleToggleUserStatus(user)}
                              >
                                {user.IsActive ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Organizational departments and their structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((dept) => (
                    <Card key={dept.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{dept.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">{dept.description}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {users.filter(u => u.Department === dept.name).length} users
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Roles & Permissions</CardTitle>
                <CardDescription>System roles and their access permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <Card key={role.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-blue-600" />
                            <div>
                              <h3 className="font-semibold">{role.name}</h3>
                              <p className="text-sm text-gray-500">
                                {users.filter(u => u.Role === role.name).length} users assigned
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {role.permissions.map((permission, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with appropriate role and permissions.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.UserName}
                    onChange={(e) => setFormData({...formData, UserName: e.target.value})}
                    placeholder="Enter username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({...formData, Email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={formData.FullName}
                    onChange={(e) => setFormData({...formData, FullName: e.target.value})}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.PhoneNumber}
                    onChange={(e) => setFormData({...formData, PhoneNumber: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={formData.Department} onValueChange={(value) => setFormData({...formData, Department: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.Designation}
                    onChange={(e) => setFormData({...formData, Designation: e.target.value})}
                    placeholder="Enter designation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={formData.Role} onValueChange={(value) => setFormData({...formData, Role: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.name}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office">Office</Label>
                  <Input
                    id="office"
                    value={formData.Office}
                    onChange={(e) => setFormData({...formData, Office: e.target.value})}
                    placeholder="Enter office location"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            
            {/* Same form as create, but with edit logic */}
            <div className="grid gap-4 py-4">
              {/* Form fields similar to create dialog */}
              <div className="text-center text-gray-500">
                Edit user form - Implementation similar to create form
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditUser}>
                Update User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default UserManagement;