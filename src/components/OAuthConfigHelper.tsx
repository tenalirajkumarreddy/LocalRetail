import React, { useState } from 'react';
import { Copy, ExternalLink, CheckCircle } from 'lucide-react';

export const OAuthConfigHelper: React.FC = () => {
  const [copied, setCopied] = useState<string>('');

  const currentOrigin = window.location.origin;
  const currentProtocol = window.location.protocol;
  const currentHost = window.location.host;
  const currentPort = window.location.port;

  const configData = {
    'JavaScript Origins': [
      currentOrigin
    ],
    'Redirect URIs': [
      currentOrigin,
      `${currentOrigin}/`,
      `${currentOrigin}/auth/callback`
    ]
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow border border-gray-200">
      <div className="flex items-center gap-3 mb-4">
        <ExternalLink className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Google Cloud Console OAuth Configuration</h2>
      </div>

      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-semibold text-red-800 mb-2">❌ Error: redirect_uri_mismatch</h3>
        <p className="text-sm text-red-700">
          Your Google OAuth settings don't match your current domain. Follow the steps below to fix this.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">📍 Current Application Details:</h3>
        <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
          <div><strong>Protocol:</strong> {currentProtocol}</div>
          <div><strong>Host:</strong> {currentHost}</div>
          <div><strong>Port:</strong> {currentPort || 'default'}</div>
          <div><strong>Full Origin:</strong> <code className="bg-gray-200 px-2 py-1 rounded">{currentOrigin}</code></div>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">🔧 Required Google Cloud Console Settings:</h3>
        
        {Object.entries(configData).map(([section, uris]) => (
          <div key={section} className="mb-4">
            <h4 className="font-medium text-gray-800 mb-2">{section}:</h4>
            <div className="space-y-2">
              {uris.map((uri, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  <code className="flex-1 text-sm bg-white px-2 py-1 rounded border">{uri}</code>
                  <button
                    onClick={() => copyToClipboard(uri, `${section}-${index}`)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {copied === `${section}-${index}` ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📋 Step-by-Step Instructions:</h3>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
          <li>Navigate to <strong>APIs & Services</strong> → <strong>Credentials</strong></li>
          <li>Find your <strong>OAuth 2.0 Client ID</strong> and click the edit icon</li>
          <li>In <strong>"Authorized JavaScript origins"</strong> section, add the JavaScript Origins listed above</li>
          <li>In <strong>"Authorized redirect URIs"</strong> section, add the Redirect URIs listed above</li>
          <li>Click <strong>Save</strong></li>
          <li><strong>Wait 5-10 minutes</strong> for changes to propagate</li>
          <li>Try authentication again</li>
        </ol>
      </div>

      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</h3>
        <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
          <li>URLs must match <strong>exactly</strong> - including protocol (http/https) and port</li>
          <li>For development, use <code>http://localhost:5173</code></li>
          <li>For production, use your actual domain with <code>https://</code></li>
          <li>Changes can take up to 10 minutes to take effect</li>
          <li>Clear browser cache if issues persist</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <ExternalLink className="w-4 h-4" />
          Open Google Cloud Console
        </a>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh Page After Changes
        </button>
      </div>
    </div>
  );
};
