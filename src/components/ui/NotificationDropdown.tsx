import React, { useState } from 'react';
import { Bell, X, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAllNotifications 
  } = useNotifications();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 max-h-96 overflow-hidden" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex space-x-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-6 px-2 text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {notification.title}
                      </p>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {getTimeAgo(notification.createdAt)}
                      </span>
                      {notification.actionText && (
                        <span className="text-xs text-blue-600 hover:text-blue-700">
                          {notification.actionText} →
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(notification.id);
                    }}
                    className="h-6 w-6 p-0 ml-2 opacity-0 group-hover:opacity-100 hover:bg-red-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
              >
                View All Notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationDropdown;
