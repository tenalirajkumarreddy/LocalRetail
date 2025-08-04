import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wifi,
  Database,
  Cloud,
  RefreshCw
} from 'lucide-react';
// import { isUserAuthenticated } from '../utils/google-sheets'; // DISABLED: Google integration disabled
import { AutoBackupService } from '../utils/auto-backup';
import { getStorageMode } from '../utils/supabase-storage';

export const ConnectionStatus: React.FC = () => {
  const [googleAuthStatus, setGoogleAuthStatus] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [autoBackupStatus, setAutoBackupStatus] = useState<any>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkAllStatuses();
    
    // Check status every 60 seconds (reduced frequency to prevent conflicts)
    const interval = setInterval(checkAllStatuses, 60000);
    return () => clearInterval(interval);
  }, []);

  const checkAllStatuses = async () => {
    if (isChecking) return; // Prevent multiple simultaneous checks
    
    setIsChecking(true);
    try {
      // Google authentication disabled
      setGoogleAuthStatus(false);
      
      // Check Supabase connection
      const storageMode = getStorageMode();
      setSupabaseStatus(storageMode === 'supabase' ? 'connected' : 'disconnected');
      
      // Check auto-backup status
      const backupStatusResult = AutoBackupService.getBackupStatus();
      setAutoBackupStatus(backupStatusResult);
      
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking connection statuses:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: boolean | string) => {
    if (status === true || status === 'connected') {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (status === false || status === 'disconnected') {
      return <XCircle className="w-5 h-5 text-red-600" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: boolean | string) => {
    if (status === true || status === 'connected') {
      return 'text-green-600';
    } else if (status === false || status === 'disconnected') {
      return 'text-red-600';
    } else {
      return 'text-yellow-600';
    }
  };

  const getOverallHealthStatus = () => {
    const statuses = [
      supabaseStatus === 'connected',
      googleAuthStatus,
      autoBackupStatus?.isActive || false
    ];
    
    const healthyCount = statuses.filter(Boolean).length;
    const totalCount = statuses.length;
    
    if (healthyCount === totalCount) return { status: 'healthy', color: 'text-green-600', label: 'All Systems Operational' };
    if (healthyCount > 0) return { status: 'warning', color: 'text-yellow-600', label: 'Some Issues Detected' };
    return { status: 'critical', color: 'text-red-600', label: 'Multiple Issues' };
  };

  const overallHealth = getOverallHealthStatus();

  return (
    <div className="border-t border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">System Connection Status</h3>
          </div>
          <button
            onClick={checkAllStatuses}
            disabled={isChecking}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <div className="px-6 py-6">
        {/* Overall Health Status */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(overallHealth.status === 'healthy')}
              <div>
                <h4 className="font-medium text-gray-900">System Health</h4>
                <p className={`text-sm ${overallHealth.color}`}>{overallHealth.label}</p>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Last checked: {lastChecked.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Individual Service Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Database Status */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Database</h4>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(supabaseStatus)}
              <span className={`text-sm font-medium ${getStatusColor(supabaseStatus)}`}>
                {supabaseStatus === 'connected' ? 'Connected' : 
                 supabaseStatus === 'disconnected' ? 'Disconnected' : 'Unknown'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {supabaseStatus === 'connected' ? 'Supabase cloud database' : 'Using local storage fallback'}
            </p>
          </div>

          {/* Google Sheets Status */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Google Sheets</h4>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(googleAuthStatus)}
              <span className={`text-sm font-medium ${getStatusColor(googleAuthStatus)}`}>
                {googleAuthStatus ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {googleAuthStatus ? 'Ready for backup operations' : 'Authentication required for backups'}
            </p>
          </div>

          {/* Auto Backup Status */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Auto Backup</h4>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(autoBackupStatus?.isActive || false)}
              <span className={`text-sm font-medium ${getStatusColor(autoBackupStatus?.isActive || false)}`}>
                {autoBackupStatus?.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {autoBackupStatus?.nextBackup ? 
                `Next backup: ${new Date(autoBackupStatus.nextBackup).toLocaleString()}` : 
                'No backup scheduled'}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            {!googleAuthStatus && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Google authentication required for backups
              </span>
            )}
            {supabaseStatus !== 'connected' && (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                Database connection issue - using local storage
              </span>
            )}
            {!autoBackupStatus?.isActive && googleAuthStatus && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Auto backup available but not active
              </span>
            )}
            {overallHealth.status === 'healthy' && (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                All systems operational
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
