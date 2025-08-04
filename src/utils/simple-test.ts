import { supabase } from '../lib/supabase';

// Simple connection test without complex queries
export const simpleConnectionTest = async () => {
  console.log('🔍 Testing basic Supabase connection...');
  
  try {
    // Test 1: Check if supabase client is created
    console.log('Supabase client:', supabase);
    
    // Test 2: Simple ping test
    const { data, error } = await supabase.from('company_settings').select('*').limit(1);
    
    if (error) {
      console.error('❌ Query error:', error);
      return { success: false, error: error.message, details: error };
    }
    
    console.log('✅ Query successful:', data);
    return { success: true, data };
    
  } catch (err) {
    console.error('❌ Connection error:', err);
    return { success: false, error: (err as Error).message, details: err };
  }
};

// Auto-run the test
simpleConnectionTest();
