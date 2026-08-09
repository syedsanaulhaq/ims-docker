import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '@/services/invmisApi';
import { useSession } from '@/contexts/SessionContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface BranchMember {
  Id: string;
  FullName: string;
  UserName: string;
  Email: string;
  Role: string;
  intBranchID?: number;
}

const BranchMembers: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [members, setMembers] = useState<BranchMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadBranchMembers = async () => {
    try {
      setLoading(true);
      const apiBase = getApiBaseUrl();

      const query = '?branch_id=me';
      const membersRes = await fetch(`${apiBase}/ims/users/aspnet/filtered${query}`, { credentials: 'include' });
      if (!membersRes.ok) {
        throw new Error('Failed to fetch branch members');
      }

      const data = await membersRes.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading branch members:', error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchMembers();
  }, [user?.user_id]);

  const filteredMembers = members.filter((member) =>
    String(member.FullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(member.UserName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(member.Email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/branch-dashboard')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Branch Members</h1>
            <p className="text-gray-600 mt-1">Branch scoped team members</p>
          </div>
        </div>
        <Button onClick={loadBranchMembers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-gray-50 to-gray-100">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, username, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredMembers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 text-lg">No members found</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Username</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, index) => (
                  <tr key={member.Id} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{member.FullName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">@{member.UserName}</td>
                    <td className="px-6 py-4 text-sm text-blue-700">{member.Email}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{member.Role || 'Member'}</td>
                    <td className="px-6 py-4 text-sm">
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BranchMembers;

