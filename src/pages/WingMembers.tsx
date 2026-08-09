import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, ArrowLeft, RefreshCw, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface WingMember {
  Id: string;
  FullName: string;
  UserName: string;
  Email: string;
  Role: string;
  intWingID: number;
  wing_name?: string;
  is_active?: boolean;
  ContactNo?: string;
  roles?: Array<{
    user_role_id: string;
    role_name: string;
    display_name: string;
    scope_type?: string;
    scope_wing_id?: number;
  }>;
}

const WingMembers: React.FC = () => {
  const navigate = useNavigate();
  const { user, getUserWingId } = useSession();
  const [members, setMembers] = useState<WingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [wingName, setWingName] = useState('');

  useEffect(() => {
    loadWingMembers();
  }, [user]);

  const loadWingMembers = async () => {
    try {
      setLoading(true);
      const apiBase = getApiBaseUrl();
      const wingId = getUserWingId();

      if (!wingId) {
        console.error('No wing ID found for user');
        return;
      }

      // Fetch wing information
      const wingsRes = await fetch(`${apiBase}/wings`, { credentials: 'include' });
      if (wingsRes.ok) {
        const wingsData = await wingsRes.json();
        const wingsList = Array.isArray(wingsData) ? wingsData : (wingsData?.data || []);
        const currentWing = wingsList.find((w: any) => Number(w.Id ?? w.id) === Number(wingId));
        setWingName(currentWing?.Name || 'Unknown Wing');
      }

      // Fetch wing members scoped to the current wing
      const membersRes = await fetch(
        `${apiBase}/ims/users?wing_id=${wingId}`,
        { credentials: 'include' }
      );

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        // Transform the API response to match our interface
        const transformedMembers: WingMember[] = (Array.isArray(membersData) ? membersData : [])
          .filter((u: any) => {
            const memberWingId = u.intWingID ?? u.wing_id;
            return memberWingId !== undefined && memberWingId !== null && Number(memberWingId) === Number(wingId);
          })
          .map((user: any) => ({
          Id: user.Id || user.user_id,
          FullName: user.FullName || user.full_name,
          UserName: user.UserName || user.username || user.Email?.split('@')[0] || user.email?.split('@')[0] || '',
          Email: user.Email || user.email,
          Role: user.roles && user.roles.length > 0 
            ? user.roles.map((r: any) => r.display_name || r.role_name).join(', ')
            : (user.Role || user.role || 'Member'),
          intWingID: Number(user.intWingID ?? user.wing_id),
          wing_name: user.wing_name || wingName,
          is_active: true,
          ContactNo: user.phone || user.ContactNo,
          roles: user.roles
        }));
        setMembers(transformedMembers);
        } else {
        console.error('Failed to fetch wing members:', membersRes.status);
      }
    } catch (error) {
      console.error('Error loading wing members:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(member =>
    member.FullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.UserName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.Email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'Wing Supervisor': 'bg-blue-100 text-blue-800',
      'Wing Member': 'bg-green-100 text-green-800',
      'Admin': 'bg-red-100 text-red-800',
      'Department Head': 'bg-purple-100 text-purple-800',
      'Approver': 'bg-orange-100 text-orange-800',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/dashboard/wing-dashboard')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Wing Members</h1>
            <p className="text-gray-600 mt-1">{wingName}</p>
          </div>
        </div>
        <Button onClick={loadWingMembers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search Card */}
      <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Members</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, username, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      {filteredMembers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">No members found</p>
            <p className="text-gray-400 text-sm mt-2">
              {searchTerm ? 'Try adjusting your search' : 'No members in this wing yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Wing</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Roles</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, index) => (
                    <tr key={member.Id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{member.FullName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">@{member.UserName}</td>
                      <td className="px-6 py-4 text-sm">
                        <a href={`mailto:${member.Email}`} className="text-blue-600 hover:text-blue-800 underline">
                          {member.Email}
                        </a>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {member.wing_name || wingName || 'Current Wing'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {member.roles && member.roles.length > 0 ? (
                            member.roles.map((role, idx) => (
                              <Badge key={idx} className={getRoleColor(role.display_name || role.role_name)}>
                                {role.display_name || role.role_name}
                              </Badge>
                            ))
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Member</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Badge className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {filteredMembers.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <p className="text-sm text-blue-900">
              Showing <strong>{filteredMembers.length}</strong> of <strong>{members.length}</strong> members in {wingName}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WingMembers;
