import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const ConnectionDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState({
    envVars: {
      url: false,
      key: false,
      actualUrl: '',
      actualKey: ''
    },
    supabaseConfigured: false,
    connectionTest: {
      status: 'pending',
      error: null as string | null,
      details: null as any
    }
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      // Check environment variables
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      setDiagnostics(prev => ({
        ...prev,
        envVars: {
          url: !!url,
          key: !!key,
          actualUrl: url || 'Not set',
          actualKey: key ? `${key.substring(0, 20)}...` : 'Not set'
        },
        supabaseConfigured: isSupabaseConfigured()
      }));

      // Test connection
      if (url && key) {
        try {
          console.log('Testing Supabase connection...');
          const { data, error, count } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true });
            
          if (error) {
            setDiagnostics(prev => ({
              ...prev,
              connectionTest: {
                status: 'error',
                error: error.message,
                details: error
              }
            }));
          } else {
            setDiagnostics(prev => ({
              ...prev,
              connectionTest: {
                status: 'success',
                error: null,
                details: { count, message: 'Connection successful' }
              }
            }));
          }
        } catch (err: any) {
          setDiagnostics(prev => ({
            ...prev,
            connectionTest: {
              status: 'error',
              error: err.message,
              details: err
            }
          }));
        }
      } else {
        setDiagnostics(prev => ({
          ...prev,
          connectionTest: {
            status: 'error',
            error: 'Missing environment variables',
            details: null
          }
        }));
      }
    };

    runDiagnostics();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Database Connection Diagnostics</h2>
      
      <div className="space-y-4">
        {/* Environment Variables */}
        <div className="border rounded p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Environment Variables</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>VITE_SUPABASE_URL:</span>
              <span className={diagnostics.envVars.url ? 'text-green-600' : 'text-red-600'}>
                {diagnostics.envVars.url ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className="text-xs text-gray-500 break-all">
              {diagnostics.envVars.actualUrl}
            </div>
            
            <div className="flex justify-between">
              <span>VITE_SUPABASE_ANON_KEY:</span>
              <span className={diagnostics.envVars.key ? 'text-green-600' : 'text-red-600'}>
                {diagnostics.envVars.key ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {diagnostics.envVars.actualKey}
            </div>
          </div>
        </div>

        {/* Supabase Configuration */}
        <div className="border rounded p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Supabase Configuration</h3>
          <div className="flex justify-between text-sm">
            <span>isSupabaseConfigured():</span>
            <span className={diagnostics.supabaseConfigured ? 'text-green-600' : 'text-red-600'}>
              {diagnostics.supabaseConfigured ? '✓ Configured' : '✗ Not Configured'}
            </span>
          </div>
        </div>

        {/* Connection Test */}
        <div className="border rounded p-4">
          <h3 className="font-semibold text-gray-700 mb-2">Connection Test</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={
                diagnostics.connectionTest.status === 'success' ? 'text-green-600' :
                diagnostics.connectionTest.status === 'error' ? 'text-red-600' :
                'text-yellow-600'
              }>
                {diagnostics.connectionTest.status === 'success' ? '✓ Connected' :
                 diagnostics.connectionTest.status === 'error' ? '✗ Failed' :
                 '⏳ Testing...'}
              </span>
            </div>
            
            {diagnostics.connectionTest.error && (
              <div className="text-red-600 text-xs mt-2 p-2 bg-red-50 rounded">
                <strong>Error:</strong> {diagnostics.connectionTest.error}
              </div>
            )}
            
            {diagnostics.connectionTest.details && (
              <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
                <pre>{JSON.stringify(diagnostics.connectionTest.details, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
