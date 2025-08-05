import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { 
  getCustomers, 
  getProducts, 
  getInvoices, 
  getTransactions, 
  getSheetHistory,
  getRoutes,
  SheetRecord
} from '../utils/supabase-storage';
import { Customer, Product, Invoice, Transaction } from '../types';

// Data State Interface
interface DataState {
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  transactions: Transaction[];
  sheetHistory: SheetRecord[];
  routes: string[];
  
  // Loading states
  loading: {
    customers: boolean;
    products: boolean;
    invoices: boolean;
    transactions: boolean;
    sheetHistory: boolean;
    routes: boolean;
  };
  
  // Last fetch timestamps for cache management
  lastFetched: {
    customers: number | null;
    products: number | null;
    invoices: number | null;
    transactions: number | null;
    sheetHistory: number | null;
    routes: number | null;
  };
  
  // Error states
  errors: {
    customers: string | null;
    products: string | null;
    invoices: string | null;
    transactions: string | null;
    sheetHistory: string | null;
    routes: string | null;
  };
}

// Actions
type DataAction = 
  | { type: 'SET_LOADING'; entity: keyof DataState['loading']; loading: boolean }
  | { type: 'SET_DATA'; entity: keyof Omit<DataState, 'loading' | 'lastFetched' | 'errors'>; data: any[] }
  | { type: 'SET_ERROR'; entity: keyof DataState['errors']; error: string | null }
  | { type: 'ADD_ITEM'; entity: keyof Omit<DataState, 'loading' | 'lastFetched' | 'errors'>; item: any }
  | { type: 'UPDATE_ITEM'; entity: keyof Omit<DataState, 'loading' | 'lastFetched' | 'errors'>; id: string; updates: any }
  | { type: 'REMOVE_ITEM'; entity: keyof Omit<DataState, 'loading' | 'lastFetched' | 'errors'>; id: string }
  | { type: 'UPDATE_ROUTE'; oldRoute: string; newRoute: string }
  | { type: 'REMOVE_ROUTE'; route: string }
  | { type: 'INVALIDATE_CACHE'; entity?: keyof DataState['lastFetched'] };

const initialState: DataState = {
  customers: [],
  products: [],
  invoices: [],
  transactions: [],
  sheetHistory: [],
  routes: [],
  
  loading: {
    customers: false,
    products: false,
    invoices: false,
    transactions: false,
    sheetHistory: false,
    routes: false,
  },
  
  lastFetched: {
    customers: null,
    products: null,
    invoices: null,
    transactions: null,
    sheetHistory: null,
    routes: null,
  },
  
  errors: {
    customers: null,
    products: null,
    invoices: null,
    transactions: null,
    sheetHistory: null,
    routes: null,
  }
};

// Reducer
function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.entity]: action.loading
        }
      };
      
    case 'SET_DATA':
      return {
        ...state,
        [action.entity]: action.data,
        lastFetched: {
          ...state.lastFetched,
          [action.entity]: Date.now()
        },
        errors: {
          ...state.errors,
          [action.entity]: null
        }
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.entity]: action.error
        },
        loading: {
          ...state.loading,
          [action.entity]: false
        }
      };
      
    case 'ADD_ITEM':
      return {
        ...state,
        [action.entity]: [...state[action.entity], action.item]
      };
      
    case 'UPDATE_ITEM':
      return {
        ...state,
        [action.entity]: state[action.entity].map((item: any) => 
          item.id === action.id ? { ...item, ...action.updates } : item
        )
      };
      
    case 'REMOVE_ITEM':
      return {
        ...state,
        [action.entity]: state[action.entity].filter((item: any) => item.id !== action.id)
      };
      
    case 'UPDATE_ROUTE':
      return {
        ...state,
        routes: state.routes.map(r => r === action.oldRoute ? action.newRoute : r)
      };
      
    case 'REMOVE_ROUTE':
      return {
        ...state,
        routes: state.routes.filter(r => r !== action.route)
      };
      
    case 'INVALIDATE_CACHE':
      if (action.entity) {
        return {
          ...state,
          lastFetched: {
            ...state.lastFetched,
            [action.entity]: null
          }
        };
      } else {
        return {
          ...state,
          lastFetched: {
            customers: null,
            products: null,
            invoices: null,
            transactions: null,
            sheetHistory: null,
            routes: null,
          }
        };
      }
      
    default:
      return state;
  }
}

// Context Interface
interface DataContextType {
  state: DataState;
  
  // Data fetching methods
  fetchCustomers: (force?: boolean) => Promise<void>;
  fetchProducts: (force?: boolean) => Promise<void>;
  fetchInvoices: (force?: boolean) => Promise<void>;
  fetchTransactions: (force?: boolean) => Promise<void>;
  fetchSheetHistory: (force?: boolean) => Promise<void>;
  fetchRoutes: (force?: boolean) => Promise<void>;
  
  // Optimistic update methods
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  
  addProduct: (product: Product) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  removeInvoice: (id: string) => void;
  
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  
  addSheetRecord: (sheet: SheetRecord) => void;
  updateSheetRecord: (id: string, updates: Partial<SheetRecord>) => void;
  removeSheetRecord: (id: string) => void;
  
  addRoute: (route: string) => void;
  updateRoute: (oldRoute: string, newRoute: string) => void;
  removeRoute: (route: string) => void;
  
  // Cache management
  invalidateCache: (entity?: keyof DataState['lastFetched']) => void;
  refreshAll: () => Promise<void>;
  refreshBeforeCriticalOperation: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Cache duration (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Provider Component
export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(dataReducer, initialState);
  
  // Generic fetch function
  const fetchData = useCallback(async (
    entity: keyof Omit<DataState, 'loading' | 'lastFetched' | 'errors'>,
    fetchFn: () => Promise<any[]>,
    force = false
  ) => {
    const lastFetched = state.lastFetched[entity];
    const isDataStale = !lastFetched || Date.now() - lastFetched > CACHE_DURATION;
    
    if (!force && !isDataStale && state[entity].length > 0) {
      console.log(`📋 Using cached ${entity} data`);
      return;
    }
    
    dispatch({ type: 'SET_LOADING', entity, loading: true });
    try {
      console.log(`🔄 Fetching ${entity} data...`);
      const data = await fetchFn();
      
      // Handle backward compatibility for invoices
      if (entity === 'invoices') {
        const invoicesWithIds = data.map((invoice: Invoice) => ({
          ...invoice,
          items: invoice.items.map(item => ({
            ...item,
            id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }))
        }));
        dispatch({ type: 'SET_DATA', entity, data: invoicesWithIds });
      } else {
        dispatch({ type: 'SET_DATA', entity, data });
      }
      
      console.log(`✅ ${entity} data fetched successfully`);
    } catch (error) {
      console.error(`❌ Error fetching ${entity}:`, error);
      dispatch({ 
        type: 'SET_ERROR', 
        entity, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      dispatch({ type: 'SET_LOADING', entity, loading: false });
    }
  }, []); // Remove dependencies that cause infinite loops
  
  // Specific fetch methods
  const fetchCustomers = useCallback((force = false) => 
    fetchData('customers', getCustomers, force), [fetchData]);
    
  const fetchProducts = useCallback((force = false) => 
    fetchData('products', getProducts, force), [fetchData]);
    
  const fetchInvoices = useCallback((force = false) => 
    fetchData('invoices', getInvoices, force), [fetchData]);
    
  const fetchTransactions = useCallback((force = false) => 
    fetchData('transactions', getTransactions, force), [fetchData]);
    
  const fetchSheetHistory = useCallback((force = false) => 
    fetchData('sheetHistory', getSheetHistory, force), [fetchData]);
    
  const fetchRoutes = useCallback((force = false) => 
    fetchData('routes', getRoutes, force), [fetchData]);
  
  // Optimistic update methods
  const addCustomer = useCallback((customer: Customer) => {
    dispatch({ type: 'ADD_ITEM', entity: 'customers', item: customer });
  }, []);
  
  const updateCustomer = useCallback((id: string, updates: Partial<Customer>) => {
    dispatch({ type: 'UPDATE_ITEM', entity: 'customers', id, updates });
  }, []);
  
  const removeCustomer = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', entity: 'customers', id });
  }, []);
  
  const addProduct = useCallback((product: Product) => {
    dispatch({ type: 'ADD_ITEM', entity: 'products', item: product });
  }, []);
  
  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    dispatch({ type: 'UPDATE_ITEM', entity: 'products', id, updates });
  }, []);
  
  const removeProduct = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', entity: 'products', id });
  }, []);
  
  const addInvoice = useCallback((invoice: Invoice) => {
    dispatch({ type: 'ADD_ITEM', entity: 'invoices', item: invoice });
  }, []);
  
  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    dispatch({ type: 'UPDATE_ITEM', entity: 'invoices', id, updates });
  }, []);
  
  const removeInvoice = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', entity: 'invoices', id });
  }, []);
  
  const addTransaction = useCallback((transaction: Transaction) => {
    dispatch({ type: 'ADD_ITEM', entity: 'transactions', item: transaction });
  }, []);
  
  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    dispatch({ type: 'UPDATE_ITEM', entity: 'transactions', id, updates });
  }, []);
  
  const removeTransaction = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', entity: 'transactions', id });
  }, []);
  
  const addSheetRecord = useCallback((sheet: SheetRecord) => {
    dispatch({ type: 'ADD_ITEM', entity: 'sheetHistory', item: sheet });
  }, []);
  
  const updateSheetRecord = useCallback((id: string, updates: Partial<SheetRecord>) => {
    dispatch({ type: 'UPDATE_ITEM', entity: 'sheetHistory', id, updates });
  }, []);
  
  const removeSheetRecord = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', entity: 'sheetHistory', id });
  }, []);
  
  const addRoute = useCallback((route: string) => {
    dispatch({ type: 'ADD_ITEM', entity: 'routes', item: route });
  }, []);
  
  const updateRoute = useCallback((oldRoute: string, newRoute: string) => {
    // For string arrays, we need to find and replace
    dispatch({ type: 'UPDATE_ROUTE', oldRoute, newRoute });
  }, []);
  
  const removeRoute = useCallback((route: string) => {
    dispatch({ type: 'REMOVE_ROUTE', route });
  }, []);
  
  // Cache management
  const invalidateCache = useCallback((entity?: keyof DataState['lastFetched']) => {
    console.log(`🗑️ Invalidating cache${entity ? ` for ${entity}` : ' for all entities'}`);
    dispatch({ type: 'INVALIDATE_CACHE', entity });
  }, []);
  
  const refreshAll = useCallback(async () => {
    console.log('🔄 Refreshing all data...');
    await Promise.all([
      fetchData('customers', getCustomers, true),
      fetchData('products', getProducts, true),
      fetchData('invoices', getInvoices, true),
      fetchData('transactions', getTransactions, true),
      fetchData('sheetHistory', getSheetHistory, true),
      fetchData('routes', getRoutes, true)
    ]);
    console.log('✅ All data refreshed');
  }, [fetchData]);
  
  const refreshBeforeCriticalOperation = useCallback(async () => {
    console.log('🔄 Refreshing data before critical operation...');
    // Only refresh the most critical data that affects business logic
    await Promise.all([
      fetchData('customers', getCustomers, true),
      fetchData('products', getProducts, true),
      fetchData('sheetHistory', getSheetHistory, true)
    ]);
    console.log('✅ Critical data refreshed');
  }, [fetchData]);
  
  // Initial data load - using a ref to prevent infinite loops
  const hasInitialized = React.useRef(false);
  
  useEffect(() => {
    if (hasInitialized.current) return;
    
    hasInitialized.current = true;
    console.log('🚀 Initial data load...');
    
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchData('customers', getCustomers),
          fetchData('products', getProducts),
          fetchData('invoices', getInvoices),
          fetchData('transactions', getTransactions),
          fetchData('sheetHistory', getSheetHistory),
          fetchData('routes', getRoutes)
        ]);
        console.log('✅ Initial data load completed');
      } catch (error) {
        console.error('❌ Initial data load failed:', error);
      }
    };
    
    loadInitialData();
  }, []); // Empty dependency array to run only once
  
  const contextValue: DataContextType = {
    state,
    fetchCustomers,
    fetchProducts,
    fetchInvoices,
    fetchTransactions,
    fetchSheetHistory,
    fetchRoutes,
    addCustomer,
    updateCustomer,
    removeCustomer,
    addProduct,
    updateProduct,
    removeProduct,
    addInvoice,
    updateInvoice,
    removeInvoice,
    addTransaction,
    updateTransaction,
    removeTransaction,
    addSheetRecord,
    updateSheetRecord,
    removeSheetRecord,
    addRoute,
    updateRoute,
    removeRoute,
    invalidateCache,
    refreshAll,
    refreshBeforeCriticalOperation
  };
  
  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  );
};

// Custom hook
export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

// Utility hook for accessing specific data with automatic fetching
export const useDataEntity = <T extends keyof Omit<DataState, 'loading' | 'lastFetched' | 'errors'>>(
  entity: T
): {
  data: DataState[T];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} => {
  const context = useData();
  
  const refresh = useCallback(() => {
    switch (entity) {
      case 'customers': return context.fetchCustomers(true);
      case 'products': return context.fetchProducts(true);
      case 'invoices': return context.fetchInvoices(true);
      case 'transactions': return context.fetchTransactions(true);
      case 'sheetHistory': return context.fetchSheetHistory(true);
      case 'routes': return context.fetchRoutes(true);
      default: return Promise.resolve();
    }
  }, [context, entity]);
  
  return {
    data: context.state[entity],
    loading: context.state.loading[entity],
    error: context.state.errors[entity],
    refresh
  };
};
