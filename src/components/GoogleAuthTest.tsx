import React, { useState } from 'react';

export const GoogleAuthTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Not tested');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testGoogleAuth = async () => {
    try {
      setStatus('Testing...');
      setLogs([]);

      // Check environment variables
      const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;

      addLog(`API Key configured: ${apiKey ? 'Yes' : 'No'}`);
      addLog(`Client ID configured: ${clientId ? 'Yes' : 'No'}`);
      addLog(`Spreadsheet ID configured: ${spreadsheetId ? 'Yes' : 'No'}`);

      // Log current URL details for OAuth debugging
      const currentOrigin = window.location.origin;
      const currentURL = window.location.href;
      const expectedRedirectURI = currentOrigin;
      
      addLog(`Current Origin: ${currentOrigin}`);
      addLog(`Current URL: ${currentURL}`);
      addLog(`Expected Redirect URI: ${expectedRedirectURI}`);
      addLog(`⚠️ IMPORTANT: Add this EXACT URI to Google Cloud Console:`);
      addLog(`   ${expectedRedirectURI}`);

      if (!apiKey || !clientId || !spreadsheetId) {
        setStatus('❌ Environment variables not configured');
        return;
      }

      // Load Google API
      addLog('Loading Google API script...');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
      addLog('✅ Google API script loaded');

      // Initialize gapi
      addLog('Initializing Google API client...');
      await new Promise<void>((resolve) => {
        (window as any).gapi.load('client:auth2', resolve);
      });
      addLog('✅ Google API client loaded');

      const gapi = (window as any).gapi;

      // Initialize client with COOP-safe settings
      addLog('Initializing client with credentials...');
      try {
        await gapi.client.init({
          apiKey: apiKey,
          clientId: clientId,
          discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          plugin_name: 'LocalRetail'
        });
        addLog('✅ Client initialized with standard method');
      } catch (initError: any) {
        addLog(`⚠️ Standard init failed: ${initError.message}`);
        addLog('Trying alternative initialization for COOP issues...');
        
        // Alternative initialization for COOP issues
        gapi.client.setApiKey(apiKey);
        await gapi.client.load('sheets', 'v4');
        
        await new Promise<void>((resolve) => {
          gapi.load('auth2', async () => {
            await gapi.auth2.init({
              client_id: clientId,
              scope: 'https://www.googleapis.com/auth/spreadsheets'
            });
            addLog('✅ Alternative initialization successful');
            resolve();
          });
        });
      }

      // Test authentication with COOP handling
      addLog('Testing authentication...');
      const authInstance = gapi.auth2.getAuthInstance();
      
      if (!authInstance.isSignedIn.get()) {
        addLog('User not signed in, prompting for sign in...');
        
        try {
          // Try popup first
          await authInstance.signIn({
            ux_mode: 'popup',
            prompt: 'select_account'
          });
          addLog('✅ Popup authentication successful');
        } catch (popupError: any) {
          addLog(`⚠️ Popup failed: ${popupError.message}`);
          
          // Check if it's a COOP error
          if (popupError.message?.includes('Cross-Origin-Opener-Policy') ||
              popupError.error === 'popup_blocked_by_browser' ||
              popupError.error === 'popup_closed_by_user') {
            addLog('COOP/popup issue detected. This is a browser security feature.');
            addLog('Solution: Configure your OAuth settings or use redirect flow.');
            addLog('For development, you may need to:');
            addLog('1. Check Google Cloud Console OAuth settings');
            addLog('2. Ensure redirect URI matches exactly');
            addLog('3. Consider using redirect flow instead of popup');
            setStatus('⚠️ COOP/Popup blocked - check OAuth settings');
            return;
          } else {
            throw popupError;
          }
        }
      }

      if (authInstance.isSignedIn.get()) {
        addLog('✅ User authenticated successfully');
        setStatus('✅ Authentication successful!');
        
        // Test API call
        addLog('Testing API call to spreadsheet...');
        const response = await gapi.client.sheets.spreadsheets.get({
          spreadsheetId: spreadsheetId
        });
        addLog(`✅ Spreadsheet accessed: ${response.result.properties?.title}`);
        setStatus('✅ Full integration test successful!');
      } else {
        addLog('❌ Authentication failed');
        setStatus('❌ Authentication failed');
      }

    } catch (error: any) {
      console.error('Full error object:', error);
      
      let errorMessage = 'Unknown error';
      if (error && typeof error === 'object') {
        if (error.error) {
          errorMessage = `${error.error}: ${error.details || 'No details'}`;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.toString) {
          errorMessage = error.toString();
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else {
        errorMessage = String(error);
      }
      
      // Check for specific OAuth errors
      if (errorMessage.includes('redirect_uri_mismatch') || errorMessage.includes('Error 400')) {
        addLog('🔍 REDIRECT URI MISMATCH DETECTED:');
        addLog('This means your Google Cloud Console OAuth settings are incorrect.');
        addLog('');
        addLog('TO FIX THIS:');
        addLog('1. Go to Google Cloud Console (console.cloud.google.com)');
        addLog('2. Navigate to APIs & Services > Credentials');
        addLog('3. Find your OAuth 2.0 Client ID');
        addLog('4. In "Authorized JavaScript origins" add:');
        addLog(`   ${window.location.origin}`);
        addLog('5. In "Authorized redirect URIs" add:');
        addLog(`   ${window.location.origin}`);
        addLog(`   ${window.location.origin}/`);
        addLog('6. Save changes and wait 5-10 minutes for propagation');
        addLog('');
        addLog('Note: The URI must match EXACTLY (including protocol and port)');
      } else if (errorMessage.includes('Cross-Origin-Opener-Policy')) {
        addLog('🔍 COOP Error Detected:');
        addLog('This happens due to browser security policies.');
        addLog('Solutions:');
        addLog('1. Ensure OAuth redirect URI exactly matches your domain');
        addLog('2. Check Google Cloud Console settings');
        addLog('3. Consider using redirect flow instead of popup');
        addLog(`4. Current origin: ${window.location.origin}`);
      }
      
      addLog(`❌ Error: ${errorMessage}`);
      setStatus(`❌ Error: ${errorMessage}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Google Sheets Authentication Test</h2>
      
      <div className="mb-4">
        <button
          onClick={testGoogleAuth}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Test Google Authentication
        </button>
      </div>

      <div className="mb-4">
        <strong>Status:</strong> <span className="ml-2">{status}</span>
      </div>

      <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
        <strong>Logs:</strong>
        {logs.length === 0 ? (
          <p className="text-gray-500 mt-2">No logs yet. Click the test button to start.</p>
        ) : (
          <div className="mt-2 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
