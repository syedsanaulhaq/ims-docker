export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  changes?: Record<string, { from: any; to: any }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export class AuditLogService {
  private static instance: AuditLogService;
  private logs: AuditLog[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  private constructor() {
    // Load logs from localStorage if available
    this.loadLogs();
  }

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem('invmis_audit_logs');
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load audit logs from localStorage:', error);
    }
  }

  private saveLogs(): void {
    try {
      // Keep only the most recent logs to prevent localStorage overflow
      const logsToSave = this.logs.slice(-this.maxLogs);
      localStorage.setItem('invmis_audit_logs', JSON.stringify(logsToSave));
    } catch (error) {
      console.error('Failed to save audit logs to localStorage:', error);
    }
  }

  public log(auditData: Omit<AuditLog, 'id' | 'timestamp'>): void {
    const auditLog: AuditLog = {
      id: this.generateId(),
      timestamp: new Date(),
      ...auditData,
    };

    this.logs.push(auditLog);

    // Maintain max log limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.saveLogs();

    // In a real implementation, also send to server
    this.sendToServer(auditLog);
  }

  private async sendToServer(auditLog: AuditLog): Promise<void> {
    try {
      await fetch('http://localhost:3001/api/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(auditLog),
      });
    } catch (error) {
      console.error('Failed to send audit log to server:', error);
    }
  }

  public query(query: AuditLogQuery = {}): AuditLog[] {
    let filteredLogs = [...this.logs];

    if (query.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      filteredLogs = filteredLogs.filter(log => log.action.toLowerCase().includes(query.action!.toLowerCase()));
    }

    if (query.entityType) {
      filteredLogs = filteredLogs.filter(log => log.entityType === query.entityType);
    }

    if (query.entityId) {
      filteredLogs = filteredLogs.filter(log => log.entityId === query.entityId);
    }

    if (query.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
    }

    if (query.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.success === query.success);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    if (query.offset) {
      filteredLogs = filteredLogs.slice(query.offset);
    }

    if (query.limit) {
      filteredLogs = filteredLogs.slice(0, query.limit);
    }

    return filteredLogs;
  }

  public getStats(): {
    totalLogs: number;
    todayLogs: number;
    successRate: number;
    topActions: { action: string; count: number }[];
    topUsers: { userName: string; count: number }[];
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = this.logs.filter(log => log.timestamp >= today);
    const successfulLogs = this.logs.filter(log => log.success);

    // Count actions
    const actionCounts = new Map<string, number>();
    this.logs.forEach(log => {
      const count = actionCounts.get(log.action) || 0;
      actionCounts.set(log.action, count + 1);
    });

    // Count users
    const userCounts = new Map<string, number>();
    this.logs.forEach(log => {
      const count = userCounts.get(log.userName) || 0;
      userCounts.set(log.userName, count + 1);
    });

    return {
      totalLogs: this.logs.length,
      todayLogs: todayLogs.length,
      successRate: this.logs.length > 0 ? (successfulLogs.length / this.logs.length) * 100 : 0,
      topActions: Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topUsers: Array.from(userCounts.entries())
        .map(([userName, count]) => ({ userName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper methods for common audit actions
  public logUserLogin(userId: string, userName: string, success: boolean, error?: string): void {
    this.log({
      userId,
      userName,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: userId,
      entityName: userName,
      success,
      error,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
    });
  }

  public logUserLogout(userId: string, userName: string): void {
    this.log({
      userId,
      userName,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: userId,
      entityName: userName,
      success: true,
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent,
    });
  }

  public logDataExport(userId: string, userName: string, dataType: string, recordCount: number): void {
    this.log({
      userId,
      userName,
      action: 'DATA_EXPORT',
      entityType: dataType,
      entityId: 'bulk',
      success: true,
      metadata: { recordCount, exportFormat: 'excel' },
    });
  }

  public logTenderAction(userId: string, userName: string, action: string, tenderId: string, tenderTitle: string): void {
    this.log({
      userId,
      userName,
      action: `TENDER_${action.toUpperCase()}`,
      entityType: 'Tender',
      entityId: tenderId,
      entityName: tenderTitle,
      success: true,
    });
  }

  public logInventoryAction(userId: string, userName: string, action: string, itemId: string, itemName: string, changes?: Record<string, any>): void {
    this.log({
      userId,
      userName,
      action: `INVENTORY_${action.toUpperCase()}`,
      entityType: 'InventoryItem',
      entityId: itemId,
      entityName: itemName,
      success: true,
      changes,
    });
  }

  public logSystemError(userId: string, userName: string, error: string, context?: string): void {
    this.log({
      userId,
      userName,
      action: 'SYSTEM_ERROR',
      entityType: 'System',
      entityId: 'error',
      success: false,
      error,
      metadata: { context },
    });
  }

  private getClientIP(): string {
    // In a real implementation, this would be determined server-side
    // For demo purposes, return a placeholder
    return '127.0.0.1';
  }
}

// Export singleton instance
export const auditLogService = AuditLogService.getInstance();