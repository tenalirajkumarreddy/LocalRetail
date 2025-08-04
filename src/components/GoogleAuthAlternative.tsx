import React, { useState, useEffect } from 'react';

export const GoogleAuthAlternative: React.FC = () => {
  const [status, setStatus] = useState<string>('Ready');
  const [logs, setLogs] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Check if we're returning from a redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    
    if (code) {
      addLog('✅ Returned from OAuth redirect with authorization code');
      setStatus('✅ OAuth redirect successful');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      addLog(`❌ OAuth redirect error: ${error}`);
      setStatus(`❌ OAuth error: ${error}`);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const testDirectAuth = async () => {
    try {
      setStatus('Testing Direct Auth...');
      setLogs([]);

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      const redirectUri = window.location.origin + window.location.pathname;
      
      addLog(`Client ID: ${clientId ? 'Configured' : 'Missing'}`);
      addLog(`Redirect URI: ${redirectUri}`);

      if (!clientId) {
        setStatus('❌ Client ID not configured');
        return;
      }

      // Create OAuth URL manually
      const scope = encodeURIComponent('https://www.googleapis.com/auth/spreadsheets');
      const state = Math.random().toString(36).substring(2, 15);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${scope}&` +
        `response_type=code&` +
        `state=${state}&` +
        `access_type=offline&` +
        `prompt=consent`;

      addLog('Generated OAuth URL');
      addLog('Redirecting to Google...');
      
      // Store state in localStorage for validation
      localStorage.setItem('oauth_state', state);
      
      // Redirect to Google OAuth
      window.location.href = authUrl;

    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const testWithIframe = async () => {
    try {
      setStatus('Testing with iframe...');
      setLogs([]);

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      
      if (!clientId) {
        setStatus('❌ Client ID not configured');
        return;
      }

      // Load Google Identity Services (new method)
      addLog('Loading Google Identity Services...');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      addLog('✅ Google Identity Services loaded');

      // Initialize Google Identity Services
      const google = (window as any).google;
      
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          addLog('✅ Received credential response');
          addLog(`Credential: ${response.credential ? 'Received' : 'Missing'}`);
          setStatus('✅ Authentication successful!');
        },
        auto_select: false,
        cancel_on_tap_outside: false
      });

      // Render the sign-in button
      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          width: 250
        }
      );

      addLog('✅ Sign-in button rendered');
      setStatus('Ready - Click the Google Sign-In button');

    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  const getCurrentOrigin = () => {
    return window.location.origin;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Alternative Google Authentication Methods</h2>
      
      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold text-blue-800 mb-2">COOP Error Solutions:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Current origin: <code className="bg-blue-100 px-1 rounded">{getCurrentOrigin()}</code></li>
          <li>• Ensure this exact URL is in your Google Cloud Console OAuth settings</li>
          <li>• Redirect URIs must match exactly (including protocol and port)</li>
          <li>• Try the methods below as alternatives to popup authentication</li>
        </ul>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <button
            onClick={testDirectAuth}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-4"
          >
            Method 1: Direct OAuth Redirect
          </button>
          <span className="text-sm text-gray-600">Redirects to Google, then back to this page</span>
        </div>

        <div>
          <button
            onClick={testWithIframe}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-4"
          >
            Method 2: Google Identity Services
          </button>
          <span className="text-sm text-gray-600">Uses newer Google Identity Services (no popup)</span>
        </div>

        {/* Container for Google Sign-In button */}
        <div id="google-signin-button" className="mt-4"></div>
      </div>

      <div className="mb-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 underline text-sm"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Debugging Info
        </button>
      </div>

      {showAdvanced && (
        <div className="mb-4 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Environment Check:</h3>
          <div className="text-sm space-y-1">
            <div>API Key: {import.meta.env.VITE_GOOGLE_SHEETS_API_KEY ? '✅ Set' : '❌ Missing'}</div>
            <div>Client ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}</div>
            <div>Spreadsheet ID: {import.meta.env.VITE_GOOGLE_SPREADSHEET_ID ? '✅ Set' : '❌ Missing'}</div>
            <div>Current URL: {window.location.href}</div>
            <div>Origin: {window.location.origin}</div>
            <div>Protocol: {window.location.protocol}</div>
            <div>Port: {window.location.port || 'default'}</div>
          </div>
        </div>
      )}

      <div className="mb-4">
        <strong>Status:</strong> <span className="ml-2">{status}</span>
      </div>

      <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
        <strong>Logs:</strong>
        {logs.length === 0 ? (
          <p className="text-gray-500 mt-2">No logs yet. Try one of the authentication methods above.</p>
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
