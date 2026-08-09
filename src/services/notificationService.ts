import { toast } from 'sonner';

export interface NotificationConfig {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private subscribers: ((notification: NotificationConfig) => void)[] = [];

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public subscribe(callback: (notification: NotificationConfig) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  public notify(config: NotificationConfig): void {
    // Show toast notification
    switch (config.type) {
      case 'success':
        toast.success(config.title, {
          description: config.message,
          duration: config.duration || 4000,
          action: config.action ? {
            label: config.action.label,
            onClick: config.action.onClick,
          } : undefined,
        });
        break;
      case 'error':
        toast.error(config.title, {
          description: config.message,
          duration: config.duration || 6000,
          action: config.action ? {
            label: config.action.label,
            onClick: config.action.onClick,
          } : undefined,
        });
        break;
      case 'warning':
        toast.warning(config.title, {
          description: config.message,
          duration: config.duration || 5000,
          action: config.action ? {
            label: config.action.label,
            onClick: config.action.onClick,
          } : undefined,
        });
        break;
      case 'info':
        toast.info(config.title, {
          description: config.message,
          duration: config.duration || 4000,
          action: config.action ? {
            label: config.action.label,
            onClick: config.action.onClick,
          } : undefined,
        });
        break;
    }

    // Notify subscribers for real-time updates
    this.subscribers.forEach(callback => callback(config));
  }

  public success(title: string, message: string, action?: NotificationConfig['action']): void {
    this.notify({ title, message, type: 'success', action });
  }

  public error(title: string, message: string, action?: NotificationConfig['action']): void {
    this.notify({ title, message, type: 'error', action });
  }

  public warning(title: string, message: string, action?: NotificationConfig['action']): void {
    this.notify({ title, message, type: 'warning', action });
  }

  public info(title: string, message: string, action?: NotificationConfig['action']): void {
    this.notify({ title, message, type: 'info', action });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// System event notifications
export class SystemNotificationService {
  private static readonly NOTIFICATION_TYPES = {
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    TENDER_CREATED: 'tender_created',
    TENDER_APPROVED: 'tender_approved',
    INVENTORY_LOW: 'inventory_low',
    SYSTEM_ERROR: 'system_error',
  } as const;

  public static notifyUserLogin(userName: string): void {
    notificationService.success(
      'User Logged In',
      `${userName} has successfully logged into the system`,
      {
        label: 'View Activity',
        onClick: () => ,
      }
    );
  }

  public static notifyUserLogout(userName: string): void {
    notificationService.info(
      'User Logged Out',
      `${userName} has logged out of the system`
    );
  }

  public static notifyTenderCreated(tenderTitle: string, createdBy: string): void {
    notificationService.info(
      'New Tender Created',
      `${tenderTitle} has been created by ${createdBy}`,
      {
        label: 'View Tender',
        onClick: () => ,
      }
    );
  }

  public static notifyTenderApproved(tenderTitle: string): void {
    notificationService.success(
      'Tender Approved',
      `${tenderTitle} has been approved and is ready for procurement`
    );
  }

  public static notifyInventoryLow(itemName: string, currentStock: number, minimumLevel: number): void {
    notificationService.warning(
      'Low Inventory Alert',
      `${itemName} stock is running low. Current: ${currentStock}, Minimum: ${minimumLevel}`,
      {
        label: 'Reorder',
        onClick: () => ,
      }
    );
  }

  public static notifySystemError(error: string): void {
    notificationService.error(
      'System Error',
      `An error occurred: ${error}`,
      {
        label: 'Report',
        onClick: () => ,
      }
    );
  }
}