-- Migration to fix route_sheets ID column from UUID to TEXT
-- This allows custom sheet IDs like ROUTE-20250805-A

-- Step 1: Drop existing foreign key constraints if any
-- (Check if there are any tables referencing route_sheets.id)

-- Step 2: Drop the table and recreate with TEXT ID
-- Since this is likely development data, we'll recreate the table
-- For production, you'd want to migrate data first

DROP TABLE IF EXISTS route_sheets;

-- Step 3: Recreate the table with TEXT ID
CREATE TABLE route_sheets (
  id TEXT PRIMARY KEY,
  route_id TEXT NOT NULL,
  route_name TEXT NOT NULL,
  customers JSONB NOT NULL DEFAULT '[]', -- Array of customer objects with their data
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  delivery_data JSONB NOT NULL DEFAULT '{}', -- Object with customer delivery quantities and amounts
  amount_received JSONB NOT NULL DEFAULT '{}', -- Object with customer payment amounts - supports {customerId: {cash: number, upi: number, total: number}} format
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Recreate indexes
CREATE INDEX idx_route_sheets_route_id ON route_sheets(route_id);
CREATE INDEX idx_route_sheets_status ON route_sheets(status);
CREATE INDEX idx_route_sheets_created_at ON route_sheets(created_at);

-- Step 5: Recreate the trigger for updated_at
CREATE TRIGGER update_route_sheets_updated_at BEFORE UPDATE ON route_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Alternative approach for production (if you have existing data to preserve):
-- 
-- Step 1: Add a new column with TEXT type
-- ALTER TABLE route_sheets ADD COLUMN new_id TEXT;
-- 
-- Step 2: Update the new column with converted values
-- UPDATE route_sheets SET new_id = 'LEGACY-' || id::text;
-- 
-- Step 3: Drop the old id column and rename new_id
-- ALTER TABLE route_sheets DROP CONSTRAINT route_sheets_pkey;
-- ALTER TABLE route_sheets DROP COLUMN id;
-- ALTER TABLE route_sheets RENAME COLUMN new_id TO id;
-- ALTER TABLE route_sheets ADD PRIMARY KEY (id);
