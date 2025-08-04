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
      
      return {
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
    } catch (error) {
      handleError(error, 'add customer to Supabase');
    }
  }
  
  // Fallback to localStorage
  const { addCustomer: localAddCustomer } = await import('./storage');
  return localAddCustomer(customer);
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
        status: i.status as 'paid' | 'partial' | 'pending'
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
        invoiceNumber: t.invoice_number || ''
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
    [customerId: string]: number;
  };
  notes: string;
}

export const getSheetHistory = async (): Promise<SheetRecord[]> => {
  const data = localStorage.getItem('sales_app_sheets_history');
  return data ? JSON.parse(data).map((sheet: any) => ({
    ...sheet,
    createdAt: new Date(sheet.createdAt),
    updatedAt: new Date(sheet.updatedAt)
  })) : [];
};

export const saveSheetHistory = async (sheetRecord: Omit<SheetRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const sheets = await getSheetHistory();
  const newSheet: SheetRecord = {
    ...sheetRecord,
    id: `SHEET-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  sheets.push(newSheet);
  localStorage.setItem('sales_app_sheets_history', JSON.stringify(sheets));
  return newSheet.id;
};

export const updateSheetRecord = async (id: string, updates: Partial<SheetRecord>): Promise<void> => {
  const sheets = await getSheetHistory();
  const index = sheets.findIndex(sheet => sheet.id === id);
  
  if (index !== -1) {
    sheets[index] = { ...sheets[index], ...updates, updatedAt: new Date() };
    localStorage.setItem('sales_app_sheets_history', JSON.stringify(sheets));
  }
};

export const deleteSheetRecord = async (id: string): Promise<void> => {
  const sheets = await getSheetHistory();
  const filteredSheets = sheets.filter(sheet => sheet.id !== id);
  localStorage.setItem('sales_app_sheets_history', JSON.stringify(filteredSheets));
};

export const closeSheetRecord = async (id: string): Promise<void> => {
  const sheets = await getSheetHistory();
  const sheetIndex = sheets.findIndex(sheet => sheet.id === id);
  
  if (sheetIndex === -1) return;
  
  const sheet = sheets[sheetIndex];
  const products = await getProducts();
  
  // Process each customer's transactions
  for (const customer of sheet.customers) {
    const customerDeliveryData = sheet.deliveryData[customer.id] || {};
    const amountReceived = sheet.amountReceived?.[customer.id] || 0;
    
    // Calculate total purchase amount
    const customerTotal = Object.values(customerDeliveryData)
      .reduce((sum, item) => sum + item.amount, 0);
    
    // Create sale transaction if customer purchased products
    if (customerTotal > 0) {
      const saleItems: InvoiceItem[] = [];
      
      // Convert delivery data to invoice items
      for (const [productId, data] of Object.entries(customerDeliveryData)) {
        if (data.quantity > 0) {
          const product = products.find(p => p.id === productId);
          if (product) {
            saleItems.push({
              productName: product.name,
              quantity: data.quantity,
              price: data.amount / data.quantity, // Calculate unit price
              total: data.amount
            });
          }
        }
      }
      
      // Add sale transaction
      await addTransaction({
        customerId: customer.id,
        customerName: customer.name,
        type: 'sale',
        items: saleItems,
        totalAmount: customerTotal,
        amountReceived: 0, // Payment is separate transaction
        balanceChange: customerTotal, // Increases outstanding
        date: new Date(),
        invoiceNumber: `SHEET-${sheet.id}-${customer.id}`,
        routeId: sheet.routeId,
        routeName: sheet.routeName,
        sheetId: sheet.id
      });
    }
    
    // Create payment transaction if customer paid money
    if (amountReceived > 0) {
      await addTransaction({
        customerId: customer.id,
        customerName: customer.name,
        type: 'payment',
        items: [],
        totalAmount: 0,
        amountReceived: amountReceived,
        balanceChange: -amountReceived, // Reduces outstanding
        date: new Date(),
        invoiceNumber: `PAY-${sheet.id}-${customer.id}`,
        routeId: sheet.routeId,
        routeName: sheet.routeName,
        sheetId: sheet.id
      });
    }
    
    // Update customer's outstanding amount
    const outstandingChange = customerTotal - amountReceived;
    if (outstandingChange !== 0 || amountReceived > 0) {
      const updatedCustomer = {
        ...customer,
        outstandingAmount: customer.outstandingAmount + outstandingChange
      };
      
      // Update customer in the main storage
      await updateCustomer(customer.id, { outstandingAmount: updatedCustomer.outstandingAmount });
    }
  }
  
  // Mark sheet as closed
  sheets[sheetIndex] = {
    ...sheet,
    status: 'closed',
    updatedAt: new Date()
  };
  
  localStorage.setItem('sales_app_sheets_history', JSON.stringify(sheets));
};
