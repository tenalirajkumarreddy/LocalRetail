import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const testSupabaseConnection = async (): Promise<{
  isConfigured: boolean;
  connectionStatus: 'success' | 'error';
  message: string;
  details?: any;
}> => {
  try {
    const configured = isSupabaseConfigured();
    
    if (!configured) {
      return {
        isConfigured: false,
        connectionStatus: 'error',
        message: 'Supabase not configured - using localStorage fallback'
      };
    }

    console.log('Testing Supabase connection...');
    
    // Test with a simpler query first
    const { data, error } = await supabase
      .from('company_settings')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return {
        isConfigured: true,
        connectionStatus: 'error',
        message: `Supabase connection failed: ${error.message}`,
        details: error
      };
    }

    console.log('Supabase connection successful:', data);
    return {
      isConfigured: true,
      connectionStatus: 'success',
      message: 'Supabase connected successfully!',
      details: { data }
    };
  } catch (error: any) {
    console.error('Connection test error:', error);
    return {
      isConfigured: true,
      connectionStatus: 'error',
      message: `Connection test failed: ${error.message}`,
      details: error
    };
  }
};
