import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Database, 
  CheckCircle, 
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { isUserAuthenticated, getBackupStatus } from '../utils/google-sheets';
import { getStorageMode } from '../utils/supabase-storage';

export const StatusIndicator: React.FC = () => {
  const [googleAuth, setGoogleAuth] = useState(false);
  const [database, setDatabase] = useState<'supabase' | 'localStorage'>('localStorage');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    checkStatus();
    
    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = () => {
    setGoogleAuth(isUserAuthenticated());
    setDatabase(getStorageMode() === 'supabase' ? 'supabase' : 'localStorage');
  };

  const googleConfig = getBackupStatus();

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        title="System Status"
      >
        <div className="flex items-center gap-1">
          {/* Database Status */}
          <div className="flex items-center">
            <Database className="w-4 h-4 text-blue-600" />
            {database === 'supabase' ? (
              <CheckCircle className="w-3 h-3 text-green-600 -ml-1" />
            ) : (
              <AlertTriangle className="w-3 h-3 text-yellow-600 -ml-1" />
            )}
          </div>
          
          {/* Google Sheets Status */}
          <div className="flex items-center">
            <Cloud className="w-4 h-4 text-green-600" />
            {googleAuth ? (
              <CheckCircle className="w-3 h-3 text-green-600 -ml-1" />
            ) : (
              <XCircle className="w-3 h-3 text-red-600 -ml-1" />
            )}
          </div>
        </div>
      </button>

      {/* Status Details Dropdown */}
      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-medium text-gray-800 mb-3">System Status</h3>
            
            <div className="space-y-3">
              {/* Database Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Database</span>
                </div>
                <div className="flex items-center gap-1">
                  {database === 'supabase' ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">Supabase</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <span className="text-xs text-yellow-600">Local</span>
                    </>
                  )}
                </div>
              </div>

              {/* Google Sheets Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Backup</span>
                </div>
                <div className="flex items-center gap-1">
                  {googleAuth ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-xs text-red-600">Disconnected</span>
                    </>
                  )}
                </div>
              </div>

              {/* Configuration Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                  <span className="text-sm">API Config</span>
                </div>
                <div className="flex items-center gap-1">
                  {googleConfig.isConfigured ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600">Ready</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-xs text-red-600">Not Set</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Click anywhere to close
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {showDetails && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDetails(false)}
        />
      )}
    </div>
  );
};
