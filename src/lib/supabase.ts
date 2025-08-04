import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase Environment Check:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing',
  actualUrl: supabaseUrl
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', { supabaseUrl, supabaseAnonKey });
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database table names
export const TABLES = {
  CUSTOMERS: 'customers',
  PRODUCTS: 'products',
  INVOICES: 'invoices',
  TRANSACTIONS: 'transactions',
  COMPANY_SETTINGS: 'company_settings',
  ROUTES: 'route_infos'
} as const

// Helper function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const isConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'your_supabase_project_url_here');
  console.log('Supabase configured check:', isConfigured);
  return isConfigured;
}
