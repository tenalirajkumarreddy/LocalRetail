import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Download, 
  Upload, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Zap
} from 'lucide-react';
import {
  initializeGoogleSheets,
  authenticateUser,
  signOutUser,
  isUserAuthenticated,
  getBackupStatus
} from '../utils/google-sheets';
import { AutoBackupService, autoBackupService } from '../utils/auto-backup';

export const GoogleBackup: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [backupResults, setBackupResults] = useState<{
    customers: boolean;
    transactions: boolean;
    invoices: boolean;
    products: boolean;
    settings: boolean;
  } | null>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);
  const [autoBackupStatus, setAutoBackupStatus] = useState<any>(null);

  useEffect(() => {
    checkAuthStatus();
    loadAutoBackupStatus();
    
    // Refresh authentication status every 30 seconds (reduced frequency)
    const interval = setInterval(checkAuthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAutoBackupStatus = () => {
    const status = AutoBackupService.getBackupStatus();
    setAutoBackupStatus(status);
    if (status.lastBackup) {
      setLastBackup(status.lastBackup);
    }
    if (status.results) {
      setBackupResults(status.results);
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Only check if not currently loading to prevent race conditions
      if (!isLoading) {
        const initialized = await initializeGoogleSheets();
        if (initialized) {
          setIsAuthenticated(isUserAuthenticated());
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const success = await authenticateUser();
      setIsAuthenticated(success);
      if (!success) {
        alert('Failed to authenticate with Google. Please try again.');
      }
    } catch (error) {
      console.error('Error signing in:', error);
      alert('Error signing in to Google. Please check your configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOutUser();
      setIsAuthenticated(false);
      setBackupResults(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupAll = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to Google first.');
      return;
    }

    setIsLoading(true);
    try {
      const success = await autoBackupService.forceBackup();
      loadAutoBackupStatus(); // Refresh status
      
      if (success) {
        alert('All data backed up successfully to Google Sheets!');
      } else {
        alert('Backup completed with some issues. Check the results below.');
      }
    } catch (error) {
      console.error('Error during backup:', error);
      alert('Error during backup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const backupStatus = getBackupStatus();

  const getStatusColor = (success: boolean | null) => {
    if (success === null) return 'text-gray-400';
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success: boolean | null) => {
    if (success === null) return <AlertTriangle className="w-4 h-4" />;
    return success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-3 mb-6">
        <Cloud className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">Google Sheets Backup</h2>
      </div>

      {/* Configuration Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-700 mb-3">Configuration Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {backupStatus.isConfigured ? 
              <CheckCircle className="w-4 h-4 text-green-600" /> : 
              <XCircle className="w-4 h-4 text-red-600" />
            }
            <span>Google Sheets API Configuration</span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? 
              <CheckCircle className="w-4 h-4 text-green-600" /> : 
              <XCircle className="w-4 h-4 text-red-600" />
            }
            <span>Google Account Authentication</span>
          </div>
          {backupStatus.spreadsheetId && (
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <a 
                href={`https://docs.google.com/spreadsheets/d/${backupStatus.spreadsheetId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Open Google Spreadsheet
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Authentication */}
      <div className="mb-6">
        {!isAuthenticated ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Sign in to your Google account to enable backup functionality.
            </p>
            <button
              onClick={handleSignIn}
              disabled={isLoading || !backupStatus.isConfigured}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Sign In to Google
            </button>
            {!backupStatus.isConfigured && (
              <p className="text-red-600 text-sm mt-2">
                Please configure Google Sheets API in your .env file first.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span>Connected to Google Sheets</span>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 text-sm"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Backup Actions */}
      {isAuthenticated && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">Backup Actions</h3>
            {lastBackup && (
              <span className="text-sm text-gray-500">
                Last backup: {lastBackup.toLocaleString()}
              </span>
            )}
          </div>
          
          <button
            onClick={handleBackupAll}
            disabled={isLoading}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isLoading ? 'Backing up...' : 'Backup All Data to Google Sheets'}
          </button>
        </div>
      )}

      {/* Auto Backup Status */}
      {isAuthenticated && autoBackupStatus && (
        <div className="mb-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Auto Backup Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Service Status:</span>
              <span className={`ml-2 ${autoBackupService.isServiceRunning() ? 'text-green-600' : 'text-red-600'}`}>
                {autoBackupService.isServiceRunning() ? 'Running' : 'Stopped'}
              </span>
            </div>
            {autoBackupStatus.lastBackup && (
              <div>
                <span className="text-blue-600 font-medium">Last Auto Backup:</span>
                <span className="ml-2 text-gray-700">
                  {autoBackupStatus.lastBackup.toLocaleString()}
                </span>
              </div>
            )}
            {autoBackupStatus.nextBackup && (
              <div>
                <span className="text-blue-600 font-medium">Next Backup:</span>
                <span className="ml-2 text-gray-700">
                  {autoBackupStatus.nextBackup.toLocaleString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-blue-600 font-medium">Status:</span>
              <span className={`ml-2 ${autoBackupStatus.isSuccessful ? 'text-green-600' : 'text-red-600'}`}>
                {autoBackupStatus.isSuccessful ? 'Successful' : 'Issues Found'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Backup Results */}
      {backupResults && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-700 mb-3">Last Backup Results</h3>
          <div className="space-y-2">
            {Object.entries(backupResults).map(([key, success]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className={getStatusColor(success)}>
                  {getStatusIcon(success)}
                </span>
                <span className="capitalize">{key}</span>
                <span className={`ml-auto ${getStatusColor(success)}`}>
                  {success ? 'Success' : 'Failed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions */}
      {!backupStatus.isConfigured && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-medium text-yellow-800 mb-2">Setup Instructions</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>1. Go to Google Cloud Console and create a new project</p>
            <p>2. Enable Google Sheets API</p>
            <p>3. Create credentials (API Key and OAuth 2.0 Client ID)</p>
            <p>4. Create a Google Spreadsheet and copy its ID</p>
            <p>5. Add the credentials to your .env file</p>
          </div>
        </div>
      )}
    </div>
  );
};
