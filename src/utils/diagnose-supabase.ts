import { supabase } from '../lib/supabase';

export const diagnoseSupabase = async () => {
  console.log('🔍 Diagnosing Supabase Connection...');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('- VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('- VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set');
  
  try {
    // Test basic connection
    console.log('🔌 Testing basic connection...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    console.log('Auth session:', authData, authError);
    
    // Test if tables exist
    console.log('📊 Testing table access...');
    
    const tables = ['company_settings', 'products', 'customers', 'invoices', 'transactions'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Table '${table}':`, error.message);
        } else {
          console.log(`✅ Table '${table}': Accessible`);
        }
      } catch (err) {
        console.log(`❌ Table '${table}':`, err);
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  }
};

// Auto-run diagnosis
diagnoseSupabase();
