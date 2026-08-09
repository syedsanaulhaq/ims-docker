import React from 'react';
import { User, Shield } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { Badge } from '@/components/ui/badge';

const UserInfo: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center space-x-2 text-sm text-red-600">
        <User className="h-4 w-4" />
        <span>Not authenticated</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className="flex items-center space-x-1">
        <User className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-gray-700">{user.user_name}</span>
      </div>
      <Badge variant="secondary" className="text-xs">
        <Shield className="h-3 w-3 mr-1" />
        {user.role}
      </Badge>
      <span className="text-xs text-muted-foreground">
        ID: {user.user_id}
      </span>
    </div>
  );
};

export default UserInfo;
