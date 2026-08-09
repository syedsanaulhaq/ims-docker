import React, { useState } from 'react';
import { User, LogOut, Settings, Shield, Mail, MapPin, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from '@/contexts/SessionContext';
import { useNavigate } from 'react-router-dom';

const UserProfileDropdown: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Redirect to DS login page
      const dsLoginUrl = import.meta.env.VITE_DS_LOGIN_URL || 'http://172.20.150.34/Account/Login';
      window.location.href = dsLoginUrl;
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMenuItemClick = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approver':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-3 hover:bg-gray-50">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user.user_name}</p>
            <p className="text-xs text-gray-500">{user.role} (IMS)</p>
          </div>
          <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
            <span className="text-white font-medium text-sm">
              {user.user_name?.charAt(0) || 'U'}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-72" align="end">
        {/* User Info Header */}
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.user_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.user_name}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {user.email}
              </p>
              <Badge 
                variant="secondary" 
                className={`mt-1 text-xs ${getRoleBadgeColor(user.role)}`}
              >
                <Shield className="h-3 w-3 mr-1" />
                {user.role}
              </Badge>
            </div>
          </div>
        </div>

        {/* User Details */}
        <div className="p-3 space-y-2 border-b">
          {user.email && (
            <div className="flex items-center space-x-2 text-xs text-gray-600">
              <Mail className="h-3 w-3" />
              <span className="truncate">{user.email}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            <span>Active Session</span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <DropdownMenuItem
            onClick={() => handleMenuItemClick('/user-profile')}
            className="cursor-pointer"
          >
            <User className="h-4 w-4 mr-2" />
            My Profile
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => handleMenuItemClick('/dashboard')}
            className="cursor-pointer"
          >
            <Settings className="h-4 w-4 mr-2" />
            Dashboard Settings
          </DropdownMenuItem>

          {user.is_super_admin && (
            <DropdownMenuItem
              onClick={() => handleMenuItemClick('/admin-settings')}
              className="cursor-pointer"
            >
              <Shield className="h-4 w-4 mr-2" />
              Admin Settings
            </DropdownMenuItem>
          )}
        </div>

        <DropdownMenuSeparator />
        
        {/* Logout */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserProfileDropdown;
