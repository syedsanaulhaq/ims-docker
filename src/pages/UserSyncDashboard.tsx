import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Users, 
  Database, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Download
} from 'lucide-react';
import { userSyncService } from '@/services/userSyncService';
import { csvUserImportService } from '@/services/csvUserImportService';

interface SyncStats {
  totalUsers: number;
  recentSyncs: Array<{
    id: number;
    sync_started_at: string;
    sync_completed_at: string;
    records_processed: number;
    records_inserted: number;
    records_updated: number;
    records_failed: number;
    sync_status: string;
    source_system: string;
  }>;
  lastSyncTime: string | null;
}

export default function UserSyncDashboard() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Load sync statistics
  const loadStats = async () => {
    try {
      const syncStats = await userSyncService.getSyncStats();
      setStats(syncStats);
    } catch (err) {setError('Failed to load synchronization statistics');
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Trigger manual sync
  const handleManualSync = async () => {
    setIsLoading(true);
    setError('');
    setSyncProgress(0);
    setSyncStatus('Connecting to SQL Server...');

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      setSyncStatus('Synchronizing user data...');
      const result = await userSyncService.manualSync();

      clearInterval(progressInterval);
      setSyncProgress(100);

      if (result.success) {
        setSyncStatus(`Sync completed! Processed ${result.recordsProcessed} users.`);
        await loadStats(); // Reload stats
      } else {
        setError(`Sync failed: ${result.errors.join(', ')}`);
        setSyncStatus('Sync failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setSyncStatus('Sync failed');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setSyncProgress(0);
        setSyncStatus('');
      }, 3000);
    }
  };

  // Import from CSV
  const handleCSVImport = async () => {
    setIsLoading(true);
    setError('');
    setSyncStatus('Importing from CSV file...');

    try {
      const result = await csvUserImportService.importFromCSV('./aspnetuser.csv');
      
      if (result.success) {
        setSyncStatus(`CSV import completed! Processed ${result.recordsProcessed} users.`);
        await loadStats();
      } else {
        setError(`CSV import failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV import failed');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSyncStatus(''), 3000);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'running':
        return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Data Synchronization</h1>
          <p className="text-muted-foreground">
            Sync user data from SQL Server AspNetUser table for stock issuance
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleCSVImport} 
            disabled={isLoading}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
          <Button 
            onClick={handleManualSync} 
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sync Progress */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{syncStatus}</span>
                <span>{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available for stock issuance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.lastSyncTime ? 'Recent' : 'Never'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.lastSyncTime ? formatDate(stats.lastSyncTime) : 'No sync performed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Source</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SQL Server</div>
            <p className="text-xs text-muted-foreground">
              AspNetUser table
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronization History</CardTitle>
          <CardDescription>
            Recent user data synchronization attempts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentSyncs?.length > 0 ? (
            <div className="space-y-4">
              {stats.recentSyncs.map((sync) => (
                <div key={sync.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(sync.sync_status)}
                      <span className="text-sm text-muted-foreground">
                        {sync.source_system}
                      </span>
                    </div>
                    <div className="text-sm">
                      Started: {formatDate(sync.sync_started_at)}
                      {sync.sync_completed_at && (
                        <span className="ml-4">
                          Completed: {formatDate(sync.sync_completed_at)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-medium">
                      {sync.records_processed} processed
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sync.records_inserted} inserted, {sync.records_updated} updated
                      {sync.records_failed > 0 && (
                        <span className="text-red-500">, {sync.records_failed} failed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No synchronization history available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
