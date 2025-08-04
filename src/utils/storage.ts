import { Customer, Transaction, Invoice } from '../types';

// Local storage keys
const STORAGE_KEYS = {
  CUSTOMERS: 'sales_app_customers',
  TRANSACTIONS: 'sales_app_transactions',
  INVOICES: 'sales_app_invoices',
  COUNTER: 'sales_app_customer_counter'
};

// Customer management
export const getCustomers = (): Customer[] => {
  const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  return data ? JSON.parse(data) : [];
};

export const saveCustomers = (customers: Customer[]): void => {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
};

export const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Customer => {
  const customers = getCustomers();
  const customerId = generateCustomerId();
  
  const newCustomer: Customer = {
    ...customer,
    id: customerId,
    outstandingAmount: customer.openingBalance,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  customers.push(newCustomer);
  saveCustomers(customers);
  return newCustomer;
};

export const updateCustomer = (id: string, updates: Partial<Customer>): void => {
  const customers = getCustomers();
  const index = customers.findIndex(c => c.id === id);
  if (index !== -1) {
    customers[index] = { ...customers[index], ...updates, updatedAt: new Date() };
    saveCustomers(customers);
  }
};

export const getCustomerById = (id: string): Customer | undefined => {
  return getCustomers().find(c => c.id === id);
};

// Generate 6-digit customer ID
export const generateCustomerId = (): string => {
  let counter = parseInt(localStorage.getItem(STORAGE_KEYS.COUNTER) || '100000');
  counter++;
  localStorage.setItem(STORAGE_KEYS.COUNTER, counter.toString());
  return counter.toString();
};

// Transaction management
export const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data).map((t: any) => ({ ...t, date: new Date(t.date) })) : [];
};

export const saveTransactions = (transactions: Transaction[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

export const addTransaction = (transaction: Omit<Transaction, 'id'>): void => {
  const transactions = getTransactions();
  const newTransaction = {
    ...transaction,
    id: Date.now().toString()
  };
  transactions.push(newTransaction);
  saveTransactions(transactions);
};

// Invoice management
export const getInvoices = (): Invoice[] => {
  const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
  return data ? JSON.parse(data).map((i: any) => ({ ...i, date: new Date(i.date) })) : [];
};

export const saveInvoices = (invoices: Invoice[]): void => {
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
};

export const addInvoice = (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>): string => {
  const invoices = getInvoices();
  const invoiceNumber = `INV-${Date.now()}`;
  
  const newInvoice = {
    ...invoice,
    id: Date.now().toString(),
    invoiceNumber
  };
  
  invoices.push(newInvoice);
  saveInvoices(invoices);
  return invoiceNumber;
};

// Get customers by route
export const getCustomersByRoute = (route: string): Customer[] => {
  return getCustomers().filter(c => c.route === route);
};

// Get unique routes
export const getRoutes = (): string[] => {
  const customers = getCustomers();
  const routes = [...new Set(customers.map(c => c.route))];
  return routes.sort();
};

// Get customer transactions
export const getCustomerTransactions = (customerId: string): Transaction[] => {
  return getTransactions().filter(t => t.customerId === customerId);
};