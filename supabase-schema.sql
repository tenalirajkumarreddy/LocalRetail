-- LocalRetail Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create the necessary tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Company Settings Table
CREATE TABLE company_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  default_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers Table
CREATE TABLE customers (
  id TEXT PRIMARY KEY, -- 6-digit custom ID
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  route TEXT,
  opening_balance DECIMAL(10,2) DEFAULT 0,
  outstanding_amount DECIMAL(10,2) DEFAULT 0,
  product_prices JSONB DEFAULT '{}', -- Store custom prices per product
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices Table
CREATE TABLE invoices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- Array of invoice items
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_received DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_change DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('paid', 'partial', 'pending')) DEFAULT 'pending',
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  type TEXT CHECK (type IN ('sale', 'payment', 'adjustment')) NOT NULL,
  items JSONB DEFAULT '[]', -- Array of transaction items
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  amount_received DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_change DECIMAL(10,2) NOT NULL DEFAULT 0,
  invoice_number TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Route Sheets Table (for tracking printed/digital route sheets)
CREATE TABLE route_sheets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  route_id TEXT NOT NULL,
  route_name TEXT NOT NULL,
  customers JSONB NOT NULL DEFAULT '[]', -- Array of customer objects with their data
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  delivery_data JSONB NOT NULL DEFAULT '{}', -- Object with customer delivery quantities and amounts
  amount_received JSONB NOT NULL DEFAULT '{}', -- Object with customer payment amounts
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_customers_route ON customers(route);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_date ON invoices(date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_route_sheets_route_id ON route_sheets(route_id);
CREATE INDEX idx_route_sheets_status ON route_sheets(status);
CREATE INDEX idx_route_sheets_created_at ON route_sheets(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_sheets ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust based on your needs)
-- Note: These are permissive policies. In production, you should implement proper authentication and authorization

CREATE POLICY "Allow all operations on company_settings" ON company_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on products" ON products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on customers" ON customers
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on invoices" ON invoices
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on transactions" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on route_sheets" ON route_sheets
  FOR ALL USING (true) WITH CHECK (true);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_route_sheets_updated_at BEFORE UPDATE ON route_sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default company settings
INSERT INTO company_settings (company_name, address, phone, email)
VALUES ('COMPANY NAME', 'Company Address', '+91 9876543210', 'info@company.com');

-- Insert default products
INSERT INTO products (name, default_price) VALUES
('Product A', 100.00),
('Product B', 150.00),
('Product C', 200.00);
