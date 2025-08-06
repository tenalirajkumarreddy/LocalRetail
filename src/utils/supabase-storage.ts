import { supabase, TABLES, isSupabaseConfigured } from '../lib/supabase';
import { Customer, Transaction, Invoice, Product, CompanySettings, RouteInfo, InvoiceItem } from '../types';

// Storage modes
type StorageMode = 'localStorage' | 'supabase';

// Determine which storage to use
export const getStorageMode = (): StorageMode => {
  return isSupabaseConfigured() ? 'supabase' : 'localStorage';
};

// Helper function to handle errors
const handleError = (error: any, operation: string) => {
  console.error(`Error in ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message || error}`);
};

// Company Settings
export const getCompanySettings = async (): Promise<CompanySettings> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.COMPANY_SETTINGS)
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        const record = data[0];
        return {
          companyName: record.company_name || '',
          address: record.address || '',
          phone: record.phone || '',
          email: record.email || '',
          updatedAt: new Date(record.updated_at || new Date())
        };
      } else {
        return {
          companyName: '',
          address: '',
          phone: '',
          email: '',
          updatedAt: new Date()
        };
      }
    } catch (error) {
      handleError(error, 'get company settings from Supabase');
    }
  }
  
  // Fallback to localStorage
  const data = window.localStorage.getItem('sales_app_company_settings');
  return data ? { 
    ...JSON.parse(data), 
    updatedAt: new Date(JSON.parse(data).updatedAt) 
  } : {
    companyName: '',
    address: '',
    phone: '',
    email: '',
    updatedAt: new Date()
  };
};

export const saveCompanySettings = async (settings: CompanySettings): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.COMPANY_SETTINGS)
        .upsert({
          company_name: settings.companyName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'save company settings to Supabase');
    }
  }
  
  // Fallback to localStorage
  window.localStorage.setItem('sales_app_company_settings', JSON.stringify(settings));
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        defaultPrice: parseFloat(p.default_price),
        createdAt: new Date(p.created_at),
        updatedAt: new Date(p.updated_at)
      }));
    } catch (error) {
      handleError(error, 'get products from Supabase');
    }
  }
  
  // Fallback to localStorage
  const data = window.localStorage.getItem('sales_app_products');
  return data ? JSON.parse(data).map((p: any) => ({ 
    ...p, 
    createdAt: new Date(p.createdAt), 
    updatedAt: new Date(p.updatedAt) 
  })) : [];
};

export const saveProducts = async (products: Product[]): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    // This function is mainly for localStorage compatibility
    // For Supabase, use addProduct, updateProduct, deleteProduct instead
    console.warn('saveProducts: Use individual product operations for Supabase');
    return;
  }
  
  window.localStorage.setItem('sales_app_products', JSON.stringify(products));
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .insert({
          name: product.name,
          default_price: product.defaultPrice
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        id: data.id,
        name: data.name,
        defaultPrice: parseFloat(data.default_price),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      handleError(error, 'add product to Supabase');
    }
  }
  
  // Fallback to localStorage
  const products = await getProducts();
  const newProduct: Product = {
    ...product,
    id: Date.now().toString(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  products.push(newProduct);
  await saveProducts(products);
  return newProduct;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.defaultPrice !== undefined) updateData.default_price = updates.defaultPrice;
      
      const { error } = await supabase
        .from(TABLES.PRODUCTS)
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'update product in Supabase');
    }
  }
  
  // Fallback to localStorage
  const products = await getProducts();
  const index = products.findIndex(p => p.id === id);
  if (index !== -1) {
    products[index] = { ...products[index], ...updates, updatedAt: new Date() };
    await saveProducts(products);
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.PRODUCTS)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'delete product from Supabase');
    }
  }
  
  // Fallback to localStorage
  const products = await getProducts();
  const filtered = products.filter(p => p.id !== id);
  await saveProducts(filtered);
};

// Customers
export const getCustomers = async (): Promise<Customer[]> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return (data || []).map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        address: c.address || '',
        route: c.route || '',
        openingBalance: parseFloat(c.opening_balance) || 0,
        outstandingAmount: parseFloat(c.outstanding_amount) || 0,
        productPrices: c.product_prices || {},
        createdAt: new Date(c.created_at),
        updatedAt: new Date(c.updated_at)
      }));
    } catch (error) {
      handleError(error, 'get customers from Supabase');
    }
  }
  
  // Fallback to localStorage - call original function
  const { getCustomers: localGetCustomers } = await import('./storage');
  return localGetCustomers();
};

export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      // Generate sequential customer ID starting from 100001
      const { generateCustomerId } = await import('./storage');
      const customerId = generateCustomerId();
      
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .insert({
          id: customerId,
          name: customer.name,
          phone: customer.phone,
          address: customer.address,
          route: customer.route,
          opening_balance: customer.openingBalance,
          outstanding_amount: customer.outstandingAmount,
          product_prices: customer.productPrices
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newCustomer = {
        id: data.id,
        name: data.name,
        phone: data.phone || '',
        address: data.address || '',
        route: data.route || '',
        openingBalance: parseFloat(data.opening_balance) || 0,
        outstandingAmount: parseFloat(data.outstanding_amount) || 0,
        productPrices: data.product_prices || {},
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
      
      // Create initial balance transaction if opening balance is not zero
      if (customer.openingBalance !== 0) {
        await addTransaction({
          customerId: newCustomer.id,
          customerName: newCustomer.name,
          type: 'adjustment',
          items: [],
          totalAmount: 0,
          amountReceived: 0,
          balanceChange: customer.openingBalance,
          date: new Date(),
          invoiceNumber: `INITIAL-${newCustomer.id}`,
          routeId: undefined,
          routeName: undefined,
          sheetId: undefined
        });
      }
      
      return newCustomer;
    } catch (error) {
      handleError(error, 'add customer to Supabase');
    }
  }
  
  // Fallback to localStorage
  const { addCustomer: localAddCustomer } = await import('./storage');
  const newCustomer = localAddCustomer(customer);
  
  // Create initial balance transaction for localStorage as well
  if (customer.openingBalance !== 0) {
    await addTransaction({
      customerId: newCustomer.id,
      customerName: newCustomer.name,
      type: 'adjustment',
      items: [],
      totalAmount: 0,
      amountReceived: 0,
      balanceChange: customer.openingBalance,
      date: new Date(),
      invoiceNumber: `INITIAL-${newCustomer.id}`,
      routeId: undefined,
      routeName: undefined,
      sheetId: undefined
    });
  }
  
  return newCustomer;
};

// Invoices
export const getInvoices = async (): Promise<Invoice[]> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.INVOICES)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(i => ({
        id: i.id,
        invoiceNumber: i.invoice_number,
        customerId: i.customer_id,
        customerName: i.customer_name,
        items: i.items || [],
        subtotal: parseFloat(i.subtotal) || 0,
        totalAmount: parseFloat(i.total_amount) || 0,
        amountReceived: parseFloat(i.amount_received) || 0,
        balanceChange: parseFloat(i.balance_change) || 0,
        date: new Date(i.date),
        status: i.status as 'paid' | 'partial' | 'pending',
        routeId: i.route_id,
        routeName: i.route_name || 'No route',
        sheetId: i.sheet_id,
        cashAmount: parseFloat(i.cash_amount) || 0,
        upiAmount: parseFloat(i.upi_amount) || 0,
        customerFinalBalance: parseFloat(i.customer_final_balance) || 0
      }));
    } catch (error) {
      handleError(error, 'get invoices from Supabase');
    }
  }
  
  // Fallback to localStorage
  const { getInvoices: localGetInvoices } = await import('./storage');
  return localGetInvoices();
};

// Transactions
export const getTransactions = async (): Promise<Transaction[]> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(t => ({
        id: t.id,
        customerId: t.customer_id,
        customerName: t.customer_name,
        type: t.type as 'sale' | 'payment' | 'adjustment',
        items: t.items || [],
        totalAmount: parseFloat(t.total_amount) || 0,
        amountReceived: parseFloat(t.amount_received) || 0,
        balanceChange: parseFloat(t.balance_change) || 0,
        date: new Date(t.date),
        invoiceNumber: t.invoice_number || '',
        routeId: t.route_id || undefined,
        routeName: t.route_name || undefined,
        sheetId: t.sheet_id || undefined
      }));
    } catch (error) {
      handleError(error, 'get transactions from Supabase');
    }
  }
  
  // Fallback to localStorage
  const { getTransactions: localGetTransactions } = await import('./storage');
  return localGetTransactions();
};

// Routes - derived from customers
export const getRoutes = async (): Promise<string[]> => {
  const customers = await getCustomers();
  const routes = [...new Set(customers.map(c => c.route).filter(r => r))];
  return routes.sort();
};

// Customer transactions
export const getCustomerTransactions = async (customerId: string): Promise<Transaction[]> => {
  const transactions = await getTransactions();
  return transactions.filter(t => t.customerId === customerId);
};

// Additional missing functions
export const updateCustomer = async (id: string, updates: Partial<Customer>): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const updateData: any = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.route !== undefined) updateData.route = updates.route;
      if (updates.openingBalance !== undefined) updateData.opening_balance = updates.openingBalance;
      if (updates.outstandingAmount !== undefined) updateData.outstanding_amount = updates.outstandingAmount;
      if (updates.productPrices !== undefined) updateData.product_prices = updates.productPrices;
      
      const { error } = await supabase
        .from(TABLES.CUSTOMERS)
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'update customer in Supabase');
    }
  }
  
  // Fallback to localStorage
  const { updateCustomer: localUpdateCustomer } = await import('./storage');
  return localUpdateCustomer(id, updates);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.CUSTOMERS)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'delete customer from Supabase');
    }
  }
  
  // Fallback to localStorage
  const { deleteCustomer: localDeleteCustomer } = await import('./storage');
  return localDeleteCustomer(id);
};

export const getCustomerById = async (id: string): Promise<Customer | undefined> => {
  const customers = await getCustomers();
  return customers.find(c => c.id === id);
};

export const addInvoice = async (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): Promise<string> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      // Generate sequential invoice number starting from INV00001
      const { generateInvoiceNumber } = await import('./storage');
      const invoiceNumber = generateInvoiceNumber();
      
      const { data, error } = await supabase
        .from(TABLES.INVOICES)
        .insert({
          invoice_number: invoiceNumber,
          customer_id: invoice.customerId,
          customer_name: invoice.customerName,
          items: invoice.items,
          subtotal: invoice.subtotal,
          total_amount: invoice.totalAmount,
          amount_received: invoice.amountReceived,
          balance_change: invoice.balanceChange,
          status: invoice.status,
          route_id: invoice.routeId || null,
          route_name: invoice.routeName || 'No route',
          sheet_id: invoice.sheetId || null,
          cash_amount: invoice.cashAmount || 0,
          upi_amount: invoice.upiAmount || 0,
          customer_final_balance: invoice.customerFinalBalance,
          date: invoice.date.toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data.invoice_number;
    } catch (error) {
      handleError(error, 'add invoice to Supabase');
    }
  }
  
  // Fallback to localStorage
  const { addInvoice: localAddInvoice } = await import('./storage');
  return localAddInvoice(invoice);
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      // For now, skip route fields if they don't exist in Supabase schema
      // This allows the system to work with localStorage as primary storage
      const { error } = await supabase
        .from(TABLES.TRANSACTIONS)
        .insert({
          customer_id: transaction.customerId,
          customer_name: transaction.customerName,
          type: transaction.type,
          items: transaction.items,
          total_amount: transaction.totalAmount,
          amount_received: transaction.amountReceived,
          balance_change: transaction.balanceChange,
          invoice_number: transaction.invoiceNumber,
          date: transaction.date.toISOString()
          // Note: route_id, route_name, sheet_id skipped for Supabase compatibility
          // These fields are stored in localStorage version
        });
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'add transaction to Supabase');
    }
  }
  
  // Fallback to localStorage
  const { addTransaction: localAddTransaction } = await import('./storage');
  return localAddTransaction(transaction);
};

export const getCustomersByRoute = async (route: string): Promise<Customer[]> => {
  const customers = await getCustomers();
  return customers.filter(c => c.route === route);
};

// Initialize default data
export const initializeDefaultData = async (): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    // Check if company settings exist, if not create default ones
    try {
      const settings = await getCompanySettings();
      if (!settings.companyName) {
        await saveCompanySettings({
          companyName: 'Your Company Name',
          address: 'Your Company Address',
          phone: '+91 XXXXXXXXXX',
          email: 'info@company.com',
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error initializing default company settings:', error);
    }
    return;
  }
  
  // Use original localStorage initialization
  const { initializeDefaultData: initLocalStorage } = await import('./storage');
  initLocalStorage();
};

// Route Management Functions
export const getRouteInfos = async (): Promise<RouteInfo[]> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.ROUTES)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.map(route => ({
        id: route.id,
        name: route.name,
        description: route.description || '',
        areas: route.areas || [],
        pincodes: route.pincodes || [],
        isActive: route.is_active,
        createdAt: new Date(route.created_at),
        updatedAt: new Date(route.updated_at)
      })) || [];
    } catch (error) {
      handleError(error, 'get route infos from Supabase');
    }
  }
  
  // Fallback to localStorage
  const data = window.localStorage.getItem('sales_app_route_infos');
  return data ? JSON.parse(data).map((route: any) => ({
    ...route,
    createdAt: new Date(route.createdAt),
    updatedAt: new Date(route.updatedAt)
  })) : [];
};

export const saveRouteInfo = async (routeData: Omit<RouteInfo, 'id' | 'createdAt' | 'updatedAt'>, customId?: string): Promise<void> => {
  const mode = getStorageMode();
  
  const routeInfo: RouteInfo = {
    id: customId || `R${Date.now()}`,
    ...routeData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.ROUTES)
        .insert({
          id: routeInfo.id,
          name: routeInfo.name,
          description: routeInfo.description,
          areas: routeInfo.areas,
          pincodes: routeInfo.pincodes,
          is_active: routeInfo.isActive,
          created_at: routeInfo.createdAt.toISOString(),
          updated_at: routeInfo.updatedAt.toISOString()
        });
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'save route info to Supabase');
    }
  }
  
  // Fallback to localStorage
  const existingData = window.localStorage.getItem('sales_app_route_infos');
  const routeInfos = existingData ? JSON.parse(existingData) : [];
  routeInfos.push(routeInfo);
  window.localStorage.setItem('sales_app_route_infos', JSON.stringify(routeInfos));
};

export const updateRouteInfo = async (routeId: string, routeData: Omit<RouteInfo, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.ROUTES)
        .update({
          name: routeData.name,
          description: routeData.description,
          areas: routeData.areas,
          pincodes: routeData.pincodes,
          is_active: routeData.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', routeId);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'update route info in Supabase');
    }
  }
  
  // Fallback to localStorage
  const existingData = window.localStorage.getItem('sales_app_route_infos');
  const routeInfos = existingData ? JSON.parse(existingData) : [];
  const index = routeInfos.findIndex((route: RouteInfo) => route.id === routeId);
  if (index !== -1) {
    routeInfos[index] = {
      ...routeInfos[index],
      ...routeData,
      updatedAt: new Date()
    };
    window.localStorage.setItem('sales_app_route_infos', JSON.stringify(routeInfos));
  }
};

export const deleteRouteInfo = async (routeId: string): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.ROUTES)
        .delete()
        .eq('id', routeId);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'delete route info from Supabase');
    }
  }
  
  // Fallback to localStorage
  const existingData = window.localStorage.getItem('sales_app_route_infos');
  const routeInfos = existingData ? JSON.parse(existingData) : [];
  const filteredRoutes = routeInfos.filter((route: RouteInfo) => route.id !== routeId);
  window.localStorage.setItem('sales_app_route_infos', JSON.stringify(filteredRoutes));
};

// Sheets History Management
export interface SheetRecord {
  id: string;
  routeId: string;
  routeName: string;
  customers: Customer[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'closed';
  deliveryData: {
    [customerId: string]: {
      [productId: string]: {
        quantity: number;
        amount: number;
      };
    };
  };
  amountReceived: {
    [customerId: string]: {
      cash: number;
      upi: number;
      total: number;
    };
  };
  routeOutstanding: number; // Route outstanding at the time of sheet closure
  notes: string;
}

export const getSheetHistory = async (): Promise<SheetRecord[]> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.SHEETS)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(sheet => ({
        id: sheet.id,
        routeId: sheet.route_id,
        routeName: sheet.route_name,
        customers: sheet.customers || [],
        status: sheet.status as 'active' | 'closed',
        deliveryData: sheet.delivery_data || {},
        amountReceived: sheet.amount_received || {},
        routeOutstanding: sheet.route_outstanding || 0,
        notes: sheet.notes || '',
        createdAt: new Date(sheet.created_at),
        updatedAt: new Date(sheet.updated_at)
      }));
    } catch (error) {
      handleError(error, 'get sheet history from Supabase');
    }
  }
  
  // Fallback to localStorage
  const data = localStorage.getItem('sales_app_sheets_history');
  return data ? JSON.parse(data).map((sheet: any) => ({
    ...sheet,
    createdAt: new Date(sheet.createdAt),
    updatedAt: new Date(sheet.updatedAt)
  })) : [];
};

// Get a specific sheet by ID
export const getSheetById = async (sheetId: string): Promise<SheetRecord | null> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.SHEETS)
        .select('*')
        .eq('id', sheetId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }
      
      if (!data) return null;
      
      return {
        id: data.id,
        routeId: data.route_id,
        routeName: data.route_name,
        customers: data.customers || [],
        status: data.status as 'active' | 'closed',
        deliveryData: data.delivery_data || {},
        amountReceived: data.amount_received || {},
        routeOutstanding: data.route_outstanding || 0,
        notes: data.notes || '',
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.warn('Error fetching sheet by ID from Supabase:', error);
      return null;
    }
  }
  
  // Fallback to localStorage
  const data = localStorage.getItem('sales_app_sheets_history');
  if (!data) return null;
  
  const sheets = JSON.parse(data);
  const sheet = sheets.find((s: any) => s.id === sheetId);
  
  return sheet ? {
    ...sheet,
    createdAt: new Date(sheet.createdAt),
    updatedAt: new Date(sheet.updatedAt)
  } : null;
};

// Generate unique sheet ID with format: ROUTE-<DATE>-<TIME>-<ROUTECODE>
export const generateSheetId = (routeId: string, date?: Date): string => {
  const currentDate = date || new Date();
  const dateStr = currentDate.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD format
  const timeStr = currentDate.toISOString().split('T')[1].split('.')[0].replace(/:/g, ''); // HHMMSS format
  return `ROUTE-${dateStr}-${timeStr}-${routeId}`;
};

// Check if a sheet already exists for a route on a specific date
export const checkSheetExists = async (routeId: string, date?: Date): Promise<SheetRecord | null> => {
  const targetSheetId = generateSheetId(routeId, date);
  const sheets = await getSheetHistory();
  
  return sheets.find(sheet => sheet.id === targetSheetId) || null;
};

export const saveSheetHistory = async (sheetRecord: Omit<SheetRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const mode = getStorageMode();
  
  // Generate custom sheet ID with format: ROUTE-<DATE>-<TIME>-<ROUTECODE>
  const customSheetId = generateSheetId(sheetRecord.routeId);
  
  if (mode === 'supabase') {
    try {
      const { data, error } = await supabase
        .from(TABLES.SHEETS)
        .insert({
          id: customSheetId,
          route_id: sheetRecord.routeId,
          route_name: sheetRecord.routeName,
          customers: sheetRecord.customers,
          status: sheetRecord.status,
          delivery_data: sheetRecord.deliveryData,
          amount_received: sheetRecord.amountReceived,
          route_outstanding: sheetRecord.routeOutstanding,
          notes: sheetRecord.notes
        })
        .select('id')
        .single();
      
      if (error) throw error;
      
      return data.id;
    } catch (error) {
      handleError(error, 'save sheet history to Supabase');
    }
  }
  
  // Fallback to localStorage
  const sheets = await getSheetHistory();
  const newSheet: SheetRecord = {
    ...sheetRecord,
    id: customSheetId,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  sheets.push(newSheet);
  localStorage.setItem('sales_app_sheets_history', JSON.stringify(sheets));
  return newSheet.id;
};

export const updateSheetRecord = async (id: string, updates: Partial<SheetRecord>): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.SHEETS)
        .update({
          route_id: updates.routeId,
          route_name: updates.routeName,
          customers: updates.customers,
          status: updates.status,
          delivery_data: updates.deliveryData,
          amount_received: updates.amountReceived,
          route_outstanding: updates.routeOutstanding,
          notes: updates.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'update sheet record in Supabase');
    }
  }
  
  // Fallback to localStorage
  const sheets = await getSheetHistory();
  const index = sheets.findIndex(sheet => sheet.id === id);
  
  if (index !== -1) {
    sheets[index] = { ...sheets[index], ...updates, updatedAt: new Date() };
    localStorage.setItem('sales_app_sheets_history', JSON.stringify(sheets));
  }
};

export const deleteSheetRecord = async (id: string): Promise<void> => {
  const mode = getStorageMode();
  
  if (mode === 'supabase') {
    try {
      const { error } = await supabase
        .from(TABLES.SHEETS)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return;
    } catch (error) {
      handleError(error, 'delete sheet record from Supabase');
    }
  }
  
  // Fallback to localStorage
  const sheets = await getSheetHistory();
  const filteredSheets = sheets.filter(sheet => sheet.id !== id);
  localStorage.setItem('sales_app_sheets_history', JSON.stringify(filteredSheets));
};

// Utility function to generate unique transaction IDs
export const generateUniqueTransactionId = (type: 'sale' | 'payment', customerId: string, sheetId?: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  
  if (type === 'sale') {
    return `SALE-${sheetId || 'MANUAL'}-${customerId}-${timestamp}-${random}`;
  } else {
    return `PAY-${sheetId ? 'SHEET' : 'MANUAL'}-${customerId}-${timestamp}-${random}`;
  }
};

// Function to check for duplicate payment IDs and fix them
export const validateAndFixDuplicatePayments = async (): Promise<{ duplicatesFound: number; duplicatesFixed: number }> => {
  const transactions = await getTransactions();
  const paymentTransactions = transactions.filter(t => t.type === 'payment');
  
  const idCounts = new Map<string, number>();
  const duplicates: string[] = [];
  
  // Count occurrences of each payment ID
  for (const transaction of paymentTransactions) {
    const count = idCounts.get(transaction.invoiceNumber) || 0;
    idCounts.set(transaction.invoiceNumber, count + 1);
    
    if (count === 1) { // Second occurrence found
      duplicates.push(transaction.invoiceNumber);
    }
  }
  
  console.log(`🔍 Payment ID validation: Found ${duplicates.length} duplicate payment IDs`);
  
  if (duplicates.length > 0) {
    console.warn('Duplicate payment IDs found:', duplicates);
  }
  
  return {
    duplicatesFound: duplicates.length,
    duplicatesFixed: 0 // For now, just reporting. Fixing would require updating storage
  };
};

export const closeSheetRecord = async (id: string): Promise<void> => {
  const sheets = await getSheetHistory();
  const sheetIndex = sheets.findIndex(sheet => sheet.id === id);
  
  if (sheetIndex === -1) {
    throw new Error(`Sheet with ID ${id} not found`);
  }
  
  const sheet = sheets[sheetIndex];
  
  // Check if sheet is already closed
  if (sheet.status === 'closed') {
    throw new Error('Sheet is already closed');
  }
  
  console.log(`🔒 Closing sheet ${id} - Starting financial record creation process...`);
  console.log(`📊 Sheet details: Route ${sheet.routeName}, ${sheet.customers.length} customers`);
  
  const products = await getProducts();
  const currentCustomers = await getCustomers(); // Get fresh customer data
  
  // Process each customer's transactions
  for (const customer of sheet.customers) {
    // Get current customer data to ensure we have the latest outstanding amount
    const currentCustomer = currentCustomers.find(c => c.id === customer.id);
    if (!currentCustomer) {
      console.warn(`Customer ${customer.id} not found in current customer list`);
      continue;
    }
    
    const customerDeliveryData = sheet.deliveryData[customer.id] || {};
    const amountReceived = sheet.amountReceived?.[customer.id] || { cash: 0, upi: 0, total: 0 };
    
    // Validate amountReceived data consistency
    const calculatedTotal = (amountReceived.cash || 0) + (amountReceived.upi || 0);
    if (Math.abs((amountReceived.total || 0) - calculatedTotal) > 0.01) {
      throw new Error(`Payment total mismatch for customer ${customer.id}. Expected: ${calculatedTotal}, Got: ${amountReceived.total}`);
    }
    
    // Calculate total purchase amount
    const customerTotal = Object.values(customerDeliveryData)
      .reduce((sum, item) => sum + item.amount, 0);
    
    // Validate customerTotal calculation
    let recalculatedTotal = 0;
    for (const [productId, data] of Object.entries(customerDeliveryData)) {
      if (data.quantity > 0) {
        const product = products.find(p => p.id === productId);
        if (product) {
          const expectedRate = customer.productPrices[productId] || product.defaultPrice || 0;
          const expectedAmount = data.quantity * expectedRate;
          if (Math.abs(data.amount - expectedAmount) > 0.01) {
            throw new Error(`Amount calculation error for customer ${customer.id}, product ${productId}. Expected: ${expectedAmount}, Got: ${data.amount}`);
          }
          recalculatedTotal += expectedAmount;
        }
      }
    }
    
    if (Math.abs(customerTotal - recalculatedTotal) > 0.01) {
      throw new Error(`Total calculation mismatch for customer ${customer.id}. Expected: ${recalculatedTotal}, Got: ${customerTotal}`);
    }
    
    // Process transaction if either purchase total OR amount received is not zero
    if (customerTotal > 0 || amountReceived.total > 0) {
      
      console.log(`💰 Creating financial records for customer ${customer.name} (${customer.id})`);
      console.log(`📈 Purchase total: ₹${customerTotal}, Payment received: ₹${amountReceived.total}`);
      
      // Create sale transaction if customer purchased products
      if (customerTotal > 0) {
        const saleItems: InvoiceItem[] = [];
        
        // Convert delivery data to invoice items
        for (const [productId, data] of Object.entries(customerDeliveryData)) {
          if (data.quantity > 0) {
            const product = products.find(p => p.id === productId);
            if (product) {
              const unitPrice = customer.productPrices[productId] || product.defaultPrice || 0;
              saleItems.push({
                id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                productName: product.name,
                quantity: data.quantity,
                price: unitPrice,
                total: data.amount
              });
            }
          }
        }
        
        // Generate unique invoice for this customer's purchase
        const invoiceNumber = generateUniqueTransactionId('sale', customer.id, sheet.id);
        
        console.log(`📄 Creating invoice ${invoiceNumber} for customer ${customer.name}`);
        
        // Calculate final customer balance after this transaction using CURRENT outstanding
        const balanceChange = customerTotal - amountReceived.total;
        const finalBalance = currentCustomer.outstandingAmount + balanceChange;
        
        // Use separate cash and UPI amounts
        const cashAmount = amountReceived.cash || 0;
        const upiAmount = amountReceived.upi || 0;
        
        // Create invoice record
        await addInvoice({
          customerId: customer.id,
          customerName: customer.name,
          items: saleItems,
          subtotal: customerTotal,
          totalAmount: customerTotal,
          amountReceived: amountReceived.total,
          balanceChange: balanceChange,
          date: new Date(),
          status: amountReceived.total >= customerTotal ? 'paid' : 
                  amountReceived.total > 0 ? 'partial' : 'pending',
          routeId: sheet.routeId,
          routeName: sheet.routeName,
          sheetId: sheet.id,
          cashAmount: cashAmount,
          upiAmount: upiAmount,
          customerFinalBalance: finalBalance
        });
        
        // Add sale transaction
        console.log(`📊 Creating sale transaction for invoice ${invoiceNumber}`);
        await addTransaction({
          customerId: customer.id,
          customerName: customer.name,
          type: 'sale',
          items: saleItems,
          totalAmount: customerTotal,
          amountReceived: 0, // Payment is separate transaction
          balanceChange: customerTotal, // Increases outstanding
          date: new Date(),
          invoiceNumber: invoiceNumber,
          routeId: sheet.routeId,
          routeName: sheet.routeName,
          sheetId: sheet.id
        });
      }
      
      // Create payment transaction if customer paid money
      if (amountReceived.total > 0) {
        // Generate unique payment ID using timestamp and random component
        const paymentId = generateUniqueTransactionId('payment', customer.id, sheet.id);
        
        console.log(`💳 Creating payment transaction ${paymentId} for ₹${amountReceived.total} (Cash: ₹${amountReceived.cash}, UPI: ₹${amountReceived.upi})`);
        
        await addTransaction({
          customerId: customer.id,
          customerName: customer.name,
          type: 'payment',
          items: [],
          totalAmount: 0,
          amountReceived: amountReceived.total,
          balanceChange: -amountReceived.total, // Reduces outstanding
          date: new Date(),
          invoiceNumber: paymentId,
          routeId: sheet.routeId,
          routeName: sheet.routeName,
          sheetId: sheet.id
        });
      }
      
      // Update customer's outstanding amount using CURRENT outstanding amount
      const outstandingChange = customerTotal - amountReceived.total;
      const updatedOutstanding = currentCustomer.outstandingAmount + outstandingChange;
      
      console.log(`🔄 Updating customer ${customer.name} outstanding: ₹${currentCustomer.outstandingAmount} + ₹${outstandingChange} = ₹${updatedOutstanding}`);
      
      // Update customer in the main storage
      await updateCustomer(customer.id, { outstandingAmount: updatedOutstanding });
    } else {
      console.log(`ℹ️ No financial activity for customer ${customer.name} - skipping record creation`);
    }
  }
  
  console.log(`✅ Financial records creation completed for sheet ${id}`);
  
  // Mark sheet as closed
  await updateSheetRecord(id, {
    status: 'closed',
    updatedAt: new Date()
  });
  
  console.log(`🔒 Sheet ${id} successfully closed`);
};
