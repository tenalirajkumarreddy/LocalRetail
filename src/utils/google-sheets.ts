import { Customer, Transaction, Invoice, Product, CompanySettings } from '../types';

// Google Sheets API configuration
const GOOGLE_SHEETS_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;

// Google API scopes
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Google Auth instance
let gapi: any;
let isInitialized = false;
let isInitializing = false;
let initializationPromise: Promise<boolean> | null = null;

// Initialize Google Sheets API with singleton pattern
export const initializeGoogleSheets = async (): Promise<boolean> => {
  try {
    // If already initialized, return true
    if (isInitialized) return true;
    
    // If currently initializing, wait for it to complete
    if (isInitializing && initializationPromise) {
      return await initializationPromise;
    }
    
    // Start initialization
    isInitializing = true;
    
    initializationPromise = (async (): Promise<boolean> => {
      try {
        // Check if credentials are configured
        if (!GOOGLE_SHEETS_API_KEY || !GOOGLE_CLIENT_ID || !GOOGLE_SPREADSHEET_ID) {
          console.error('Google Sheets credentials not configured');
          return false;
        }
        
        // Check if gapi is already loaded globally
        if (!(window as any).gapi) {
          // Load Google API
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://apis.google.com/js/api.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        // Initialize gapi if not already done
        if (!(window as any).gapi.client) {
          await new Promise<void>((resolve) => {
            (window as any).gapi.load('client:auth2', resolve);
          });
        }

        gapi = (window as any).gapi;

        // Check if already initialized by checking if auth2 exists
        let authInstance;
        try {
          authInstance = gapi.auth2.getAuthInstance();
        } catch (e) {
          // Auth2 not initialized yet
          authInstance = null;
        }

        if (!authInstance) {
          // Initialize the API client with proper COOP handling
          try {
            await gapi.client.init({
              apiKey: GOOGLE_SHEETS_API_KEY,
              clientId: GOOGLE_CLIENT_ID,
              discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
              scope: SCOPES.join(' '),
              // Add plugin_name to help with COOP issues
              plugin_name: 'LocalRetail'
            });
            
            console.log('Google Sheets API initialized successfully');
          } catch (initError: any) {
            console.error('Error during gapi.client.init:', initError);
            
            // Try alternative initialization approach for COOP issues
            if (initError.error === 'idpiframe_initialization_failed' || 
                initError.error === 'popup_blocked_by_browser' ||
                initError.message?.includes('Cross-Origin-Opener-Policy') ||
                initError.message?.includes('different options')) {
              console.log('Trying alternative initialization for COOP/initialization conflicts...');
              
              // Set up the client manually
              gapi.client.setApiKey(GOOGLE_SHEETS_API_KEY);
              await gapi.client.load('sheets', 'v4');
              
              // Initialize auth separately with redirect flow instead of popup
              await new Promise<void>((resolve) => {
                gapi.load('auth2', async () => {
                  try {
                    await gapi.auth2.init({
                      client_id: GOOGLE_CLIENT_ID,
                      scope: SCOPES.join(' '),
                      // Use redirect flow instead of popup to avoid COOP issues
                      ux_mode: 'redirect',
                      redirect_uri: window.location.origin + window.location.pathname
                    });
                    console.log('Auth2 initialized with redirect flow');
                  } catch (authError: any) {
                    console.log('Auth2 already initialized, getting existing instance');
                  }
                  resolve();
                });
              });
            } else {
              throw initError;
            }
          }
        } else {
          console.log('Google API already initialized, reusing existing instance');
          // Make sure client is set up
          if (!gapi.client.sheets) {
            gapi.client.setApiKey(GOOGLE_SHEETS_API_KEY);
            await gapi.client.load('sheets', 'v4');
          }
        }

        isInitialized = true;
        return true;
      } catch (error: any) {
        console.error('Error initializing Google Sheets API:', error);
        
        // Log more detailed error information
        if (error && typeof error === 'object') {
          console.error('Error details:', {
            error: error.error,
            details: error.details,
            message: error.message,
            full: error
          });
        }
        
        return false;
      } finally {
        isInitializing = false;
        initializationPromise = null;
      }
    })();
    
    return await initializationPromise;
  } catch (error) {
    isInitializing = false;
    initializationPromise = null;
    console.error('Failed to initialize Google Sheets:', error);
    return false;
  }
};

// Authenticate user with COOP-safe methods
export const authenticateUser = async (): Promise<boolean> => {
  try {
    if (!isInitialized) {
      const initialized = await initializeGoogleSheets();
      if (!initialized) {
        console.error('Failed to initialize Google Sheets API');
        return false;
      }
    }

    const authInstance = gapi.auth2.getAuthInstance();
    if (!authInstance) {
      console.error('Auth instance not available');
      return false;
    }

    if (!authInstance.isSignedIn.get()) {
      console.log('Attempting to sign in...');
      
      try {
        // Try normal popup first
        const result = await authInstance.signIn({
          // Configure for better COOP compatibility
          ux_mode: 'popup',
          // Fallback options
          prompt: 'select_account'
        });
        console.log('Sign in result:', result);
      } catch (popupError: any) {
        console.log('Popup failed, trying redirect method:', popupError);
        
        // If popup fails due to COOP, use redirect method
        if (popupError.error === 'popup_closed_by_user' || 
            popupError.error === 'popup_blocked_by_browser' ||
            popupError.error === 'access_denied' ||
            popupError.message?.includes('Cross-Origin-Opener-Policy')) {
          
          // Use redirect flow as fallback
          console.log('Using redirect flow due to COOP restrictions...');
          window.location.href = authInstance.signIn({
            ux_mode: 'redirect',
            redirect_uri: window.location.origin + window.location.pathname
          });
          return false; // Will redirect, so return false for now
        } else {
          throw popupError;
        }
      }
    }
    
    const isSignedIn = authInstance.isSignedIn.get();
    console.log('Authentication status:', isSignedIn);
    return isSignedIn;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return false;
  }
};

// Check if user is authenticated
export const isUserAuthenticated = (): boolean => {
  if (!isInitialized || !gapi) return false;
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance && authInstance.isSignedIn.get();
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
};

// Reset initialization state (for debugging/recovery)
export const resetGoogleSheetsInit = (): void => {
  isInitialized = false;
  isInitializing = false;
  initializationPromise = null;
  console.log('Google Sheets initialization state reset');
};

// Sign out user
export const signOutUser = async (): Promise<void> => {
  if (!isInitialized || !gapi) return;
  try {
    const authInstance = gapi.auth2.getAuthInstance();
    if (authInstance && authInstance.isSignedIn.get()) {
      await authInstance.signOut();
    }
  } catch (error) {
    console.error('Error signing out:', error);
  }
};

// Helper function to convert data to 2D array for sheets
const objectToRowArray = (obj: any, headers: string[]): any[] => {
  return headers.map(header => {
    const value = obj[header];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    if (value instanceof Date) return value.toISOString();
    return value.toString();
  });
};

// Create or get worksheet
const getOrCreateWorksheet = async (sheetName: string): Promise<boolean> => {
  try {
    if (!GOOGLE_SPREADSHEET_ID) {
      console.error('Google Spreadsheet ID not configured');
      return false;
    }

    // Get spreadsheet info
    const response = await gapi.client.sheets.spreadsheets.get({
      spreadsheetId: GOOGLE_SPREADSHEET_ID
    });

    const sheets = response.result.sheets || [];
    const sheetExists = sheets.some((sheet: any) => sheet.properties.title === sheetName);

    if (!sheetExists) {
      // Create new sheet
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: GOOGLE_SPREADSHEET_ID,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: sheetName
              }
            }
          }]
        }
      });
    }

    return true;
  } catch (error) {
    console.error(`Error creating/getting worksheet ${sheetName}:`, error);
    return false;
  }
};

// Backup customers to Google Sheets
export const backupCustomersToSheets = async (customers: Customer[]): Promise<boolean> => {
  try {
    const authenticated = await authenticateUser();
    if (!authenticated) return false;

    const sheetName = 'Customers';
    const success = await getOrCreateWorksheet(sheetName);
    if (!success) return false;

    const headers = [
      'id', 'name', 'phone', 'address', 'route', 'openingBalance', 
      'outstandingAmount', 'productPrices', 'createdAt', 'updatedAt'
    ];

    const values = [
      headers,
      ...customers.map(customer => objectToRowArray(customer, headers))
    ];

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log(`Backed up ${customers.length} customers to Google Sheets`);
    return true;
  } catch (error) {
    console.error('Error backing up customers:', error);
    return false;
  }
};

// Backup transactions to Google Sheets
export const backupTransactionsToSheets = async (transactions: Transaction[]): Promise<boolean> => {
  try {
    const authenticated = await authenticateUser();
    if (!authenticated) return false;

    const sheetName = 'Transactions';
    const success = await getOrCreateWorksheet(sheetName);
    if (!success) return false;

    const headers = [
      'id', 'customerId', 'customerName', 'type', 'items', 'totalAmount',
      'amountReceived', 'balanceChange', 'date', 'invoiceNumber'
    ];

    const values = [
      headers,
      ...transactions.map(transaction => objectToRowArray(transaction, headers))
    ];

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log(`Backed up ${transactions.length} transactions to Google Sheets`);
    return true;
  } catch (error) {
    console.error('Error backing up transactions:', error);
    return false;
  }
};

// Backup invoices to Google Sheets
export const backupInvoicesToSheets = async (invoices: Invoice[]): Promise<boolean> => {
  try {
    const authenticated = await authenticateUser();
    if (!authenticated) return false;

    const sheetName = 'Invoices';
    const success = await getOrCreateWorksheet(sheetName);
    if (!success) return false;

    const headers = [
      'id', 'invoiceNumber', 'customerId', 'customerName', 'items',
      'subtotal', 'totalAmount', 'amountReceived', 'balanceChange', 'date', 'status'
    ];

    const values = [
      headers,
      ...invoices.map(invoice => objectToRowArray(invoice, headers))
    ];

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log(`Backed up ${invoices.length} invoices to Google Sheets`);
    return true;
  } catch (error) {
    console.error('Error backing up invoices:', error);
    return false;
  }
};

// Backup products to Google Sheets
export const backupProductsToSheets = async (products: Product[]): Promise<boolean> => {
  try {
    const authenticated = await authenticateUser();
    if (!authenticated) return false;

    const sheetName = 'Products';
    const success = await getOrCreateWorksheet(sheetName);
    if (!success) return false;

    const headers = ['id', 'name', 'defaultPrice', 'createdAt', 'updatedAt'];

    const values = [
      headers,
      ...products.map(product => objectToRowArray(product, headers))
    ];

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log(`Backed up ${products.length} products to Google Sheets`);
    return true;
  } catch (error) {
    console.error('Error backing up products:', error);
    return false;
  }
};

// Backup route sheet to Google Sheets
export const backupRouteSheetToSheets = async (
  routeName: string, 
  customers: Customer[], 
  products: Product[]
): Promise<boolean> => {
  try {
    const authenticated = await authenticateUser();
    if (!authenticated) return false;

    const sheetName = `Route_${routeName}_${new Date().toISOString().split('T')[0]}`;
    const success = await getOrCreateWorksheet(sheetName);
    if (!success) return false;

    // Create route sheet structure
    const headerRow = ['Customer ID', 'Customer Name', 'Phone', 'Address'];
    products.forEach(product => {
      headerRow.push(`${product.name} (Qty)`, `${product.name} (Rate)`, `${product.name} (Amount)`);
    });
    headerRow.push('Total Amount', 'Amount Received', 'Balance');

    const values = [headerRow];

    // Add customer rows
    customers.forEach(customer => {
      const row = [customer.id, customer.name, customer.phone, customer.address];
      
      products.forEach(product => {
        const customerPrice = customer.productPrices[product.id] || product.defaultPrice;
        row.push('', customerPrice.toString(), ''); // Qty, Rate, Amount (Amount will be calculated)
      });
      
      row.push('', '', ''); // Total Amount, Amount Received, Balance
      values.push(row);
    });

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log(`Created route sheet: ${sheetName} with ${customers.length} customers`);
    return true;
  } catch (error) {
    console.error('Error creating route sheet:', error);
    return false;
  }
};

// Backup company settings to Google Sheets
export const backupCompanySettingsToSheets = async (settings: CompanySettings): Promise<boolean> => {
  try {
    const authenticated = await authenticateUser();
    if (!authenticated) return false;

    const sheetName = 'Company_Settings';
    const success = await getOrCreateWorksheet(sheetName);
    if (!success) return false;

    const values = [
      ['Setting', 'Value', 'Last Updated'],
      ['Company Name', settings.companyName, settings.updatedAt.toISOString()],
      ['Address', settings.address, settings.updatedAt.toISOString()],
      ['Phone', settings.phone, settings.updatedAt.toISOString()],
      ['Email', settings.email, settings.updatedAt.toISOString()]
    ];

    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values }
    });

    console.log('Backed up company settings to Google Sheets');
    return true;
  } catch (error) {
    console.error('Error backing up company settings:', error);
    return false;
  }
};

// Backup all data to Google Sheets
export const backupAllDataToSheets = async (): Promise<{
  customers: boolean;
  transactions: boolean;
  invoices: boolean;
  products: boolean;
  settings: boolean;
}> => {
  const results = {
    customers: false,
    transactions: false,
    invoices: false,
    products: false,
    settings: false
  };

  try {
    // Import storage functions
    const { getCustomers, getTransactions, getInvoices, getProducts, getCompanySettings } = 
      await import('./supabase-storage');

    // Backup customers
    try {
      const customers = await getCustomers();
      results.customers = await backupCustomersToSheets(customers);
    } catch (error) {
      console.error('Error backing up customers:', error);
    }

    // Backup transactions
    try {
      const transactions = await getTransactions();
      results.transactions = await backupTransactionsToSheets(transactions);
    } catch (error) {
      console.error('Error backing up transactions:', error);
    }

    // Backup invoices
    try {
      const invoices = await getInvoices();
      results.invoices = await backupInvoicesToSheets(invoices);
    } catch (error) {
      console.error('Error backing up invoices:', error);
    }

    // Backup products
    try {
      const products = await getProducts();
      results.products = await backupProductsToSheets(products);
    } catch (error) {
      console.error('Error backing up products:', error);
    }

    // Backup company settings
    try {
      const settings = await getCompanySettings();
      results.settings = await backupCompanySettingsToSheets(settings);
    } catch (error) {
      console.error('Error backing up company settings:', error);
    }

  } catch (error) {
    console.error('Error in backup process:', error);
  }

  return results;
};

// Get backup status
export const getBackupStatus = (): {
  isConfigured: boolean;
  isAuthenticated: boolean;
  spreadsheetId: string | null;
} => {
  return {
    isConfigured: !!(GOOGLE_SHEETS_API_KEY && GOOGLE_CLIENT_ID && GOOGLE_SPREADSHEET_ID),
    isAuthenticated: isUserAuthenticated(),
    spreadsheetId: GOOGLE_SPREADSHEET_ID || null
  };
};
