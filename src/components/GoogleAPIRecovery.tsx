import React from 'react';
import { resetGoogleSheetsInit } from '../utils/google-sheets';

export const GoogleAPIRecovery: React.FC = () => {
  const handleResetGoogleAPI = () => {
    try {
      resetGoogleSheetsInit();
      
      // Also try to clean up any existing gapi instances
      if ((window as any).gapi) {
        console.log('Attempting to clean up existing Google API instances...');
        // Force refresh to clean state
        window.location.reload();
      } else {
        console.log('Google API state reset successfully');
        alert('Google API state has been reset. Try authenticating again.');
      }
    } catch (error) {
      console.error('Error resetting Google API:', error);
      alert('Error resetting Google API. Try refreshing the page.');
    }
  };

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-semibold text-yellow-800 mb-2">Google API Recovery</h3>
      <p className="text-sm text-yellow-700 mb-3">
        If you're experiencing "gapi.auth2 has been initialized with different options" errors, 
        use this tool to reset the Google API state.
      </p>
      <button
        onClick={handleResetGoogleAPI}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
      >
        Reset Google API State
      </button>
      <p className="text-xs text-yellow-600 mt-2">
        Note: This will refresh the page to completely reset the Google API state.
      </p>
    </div>
  );
};
