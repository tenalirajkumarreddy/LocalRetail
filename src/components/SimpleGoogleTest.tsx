import React, { useState } from 'react';

export const SimpleGoogleTest: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready to test');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testSimpleAuth = async () => {
    try {
      setStatus('Testing...');
      clearLogs();

      const apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const spreadsheetId = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;

      addLog('🔍 Checking environment variables...');
      addLog(`API Key: ${apiKey ? '✅ Configured' : '❌ Missing'}`);
      addLog(`Client ID: ${clientId ? '✅ Configured' : '❌ Missing'}`);
      addLog(`Spreadsheet ID: ${spreadsheetId ? '✅ Configured' : '❌ Missing'}`);

      if (!apiKey || !clientId || !spreadsheetId) {
        setStatus('❌ Missing environment variables');
        return;
      }

      // Test Google OAuth popup directly
      addLog('🚀 Opening Google OAuth popup...');
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets')}&` +
        `include_granted_scopes=true&` +
        `state=test_auth`;

      addLog(`Auth URL: ${authUrl}`);

      // Open popup
      const popup = window.open(
        authUrl,
        'google_auth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!popup) {
        addLog('❌ Popup blocked by browser');
        setStatus('❌ Popup blocked - allow popups and try again');
        return;
      }

      addLog('✅ Popup opened successfully');
      
      // Monitor popup
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          addLog('ℹ️ Popup was closed');
          setStatus('⚠️ Authentication cancelled or completed');
        }
      }, 1000);

      // Listen for redirect
      window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        
        addLog(`📨 Received message: ${JSON.stringify(event.data)}`);
        
        if (event.data.access_token) {
          addLog('✅ Access token received!');
          setStatus('✅ Authentication successful!');
          popup.close();
          clearInterval(checkClosed);
          
          // Test API call with token
          testApiCall(event.data.access_token, spreadsheetId);
        }
      }, { once: true });

    } catch (error: any) {
      addLog(`❌ Error: ${error.message || error}`);
      setStatus(`❌ Error: ${error.message || error}`);
    }
  };

  const testApiCall = async (accessToken: string, spreadsheetId: string) => {
    try {
      addLog('🧪 Testing API call with access token...');
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?access_token=${accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        addLog(`✅ API call successful! Spreadsheet: "${data.properties?.title}"`);
        setStatus('✅ Full integration test successful!');
      } else {
        const errorData = await response.text();
        addLog(`❌ API call failed: ${response.status} - ${errorData}`);
        setStatus(`❌ API call failed: ${response.status}`);
      }
    } catch (error: any) {
      addLog(`❌ API call error: ${error.message || error}`);
      setStatus(`❌ API call error: ${error.message || error}`);
    }
  };

  const testRedirectUri = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const currentOrigin = window.location.origin;
    
    addLog('🔍 Checking redirect URI configuration...');
    addLog(`Current origin: ${currentOrigin}`);
    addLog(`Client ID: ${clientId}`);
    addLog('');
    addLog('📋 Required Google Cloud Console settings:');
    addLog('Go to: APIs & Services → Credentials → OAuth 2.0 Client IDs');
    addLog(`Add to "Authorized JavaScript origins": ${currentOrigin}`);
    addLog(`Add to "Authorized redirect URIs": ${currentOrigin}`);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Simple Google Authentication Test</h2>
      
      <div className="flex gap-4 mb-4">
        <button
          onClick={testSimpleAuth}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Test Authentication
        </button>
        
        <button
          onClick={testRedirectUri}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Check Redirect URI
        </button>
        
        <button
          onClick={clearLogs}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Clear Logs
        </button>
      </div>

      <div className="mb-4">
        <strong>Status:</strong> <span className="ml-2">{status}</span>
      </div>

      <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
        <strong>Logs:</strong>
        {logs.length === 0 ? (
          <p className="text-gray-500 mt-2">No logs yet. Click a test button to start.</p>
        ) : (
          <div className="mt-2 font-mono text-sm">
            {logs.map((log, index) => (
              <div key={index} className="mb-1 break-words">{log}</div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-bold text-yellow-800">Instructions:</h3>
        <ol className="list-decimal list-inside text-sm text-yellow-700 mt-2 space-y-1">
          <li>First click "Check Redirect URI" to verify your settings</li>
          <li>Update Google Cloud Console with the displayed origins</li>
          <li>Wait 2-3 minutes for changes to propagate</li>
          <li>Click "Test Authentication" to test the flow</li>
          <li>Allow popups in your browser if prompted</li>
        </ol>
      </div>
    </div>
  );
};
