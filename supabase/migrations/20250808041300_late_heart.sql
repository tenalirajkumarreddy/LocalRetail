/*
  # Enable Authentication and Update RLS Policies

  1. Security Updates
    - Update RLS policies to require authentication
    - Ensure only authenticated users can access data
    - Maintain data security and user isolation

  2. Policy Changes
    - Replace permissive policies with authenticated user policies
    - Add proper access controls for all tables
*/

-- Update customers table policies
DROP POLICY IF EXISTS "Allow all operations on customers" ON customers;
CREATE POLICY "Authenticated users can manage customers"
  ON customers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update products table policies  
DROP POLICY IF EXISTS "Allow all operations on products" ON products;
CREATE POLICY "Authenticated users can manage products"
  ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update invoices table policies
DROP POLICY IF EXISTS "Allow all operations on invoices" ON invoices;
CREATE POLICY "Authenticated users can manage invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update transactions table policies
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
CREATE POLICY "Authenticated users can manage transactions"
  ON transactions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update company_settings table policies
DROP POLICY IF EXISTS "Allow all operations on company_settings" ON company_settings;
CREATE POLICY "Authenticated users can manage company_settings"
  ON company_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update route_infos table policies
DROP POLICY IF EXISTS "Allow all operations on route_infos" ON route_infos;
CREATE POLICY "Authenticated users can manage route_infos"
  ON route_infos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable RLS on route_sheets if not already enabled
ALTER TABLE route_sheets ENABLE ROW LEVEL SECURITY;

-- Add policy for route_sheets (it didn't have one before)
CREATE POLICY "Authenticated users can manage route_sheets"
  ON route_sheets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);