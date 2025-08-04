import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Route, 
  TrendingUp,
  IndianRupee,
  Database,
  CheckCircle,
  XCircle,
  Box,
  Settings
} from 'lucide-react';
import { getCustomers, getInvoices, getTransactions, getRoutes } from '../utils/supabase-storage';
import { Customer, Invoice, Transaction } from '../types';
import { testSupabaseConnection } from '../utils/test-supabase';

interface DashboardProps {
  onPageChange?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onPageChange }) => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRoutes: 0,
    totalInvoices: 0,
    totalOutstanding: 0,
    recentTransactions: [] as Transaction[]
  });

  const [connectionStatus, setConnectionStatus] = useState<{
    isConfigured: boolean;
    connectionStatus: 'success' | 'error' | 'testing';
    message: string;
  }>({
    isConfigured: false,
    connectionStatus: 'testing',
    message: 'Testing connection...'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const testConnection = async () => {
          const result = await testSupabaseConnection();
          setConnectionStatus(result);
        };
        
        testConnection();
        
        const customers = await getCustomers();
        const invoices = await getInvoices();
        const transactions = await getTransactions();
        const routes = await getRoutes();

        const totalOutstanding = customers.reduce((sum, customer) => sum + customer.outstandingAmount, 0);
        const recentTransactions = transactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5);

        setStats({
          totalCustomers: customers.length,
          totalRoutes: routes.length,
          totalInvoices: invoices.length,
          totalOutstanding,
          recentTransactions
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    
    loadData();
  }, []);

  const statCards = [
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Active Routes',
      value: stats.totalRoutes,
      icon: Route,
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: FileText,
      color: 'bg-purple-500',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Outstanding Amount',
      value: `₹${Math.abs(stats.totalOutstanding).toLocaleString()}`,
      icon: IndianRupee,
      color: stats.totalOutstanding >= 0 ? 'bg-red-500' : 'bg-green-500',
      textColor: stats.totalOutstanding >= 0 ? 'text-red-700' : 'text-green-700',
      bgColor: stats.totalOutstanding >= 0 ? 'bg-red-50' : 'bg-green-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your sales management system</p>
      </div>

      {/* Database Connection Status - More Compact */}
      <div className={`p-3 rounded-lg border ${
        connectionStatus.connectionStatus === 'success' 
          ? 'bg-green-50 border-green-200' 
          : connectionStatus.connectionStatus === 'error'
          ? 'bg-red-50 border-red-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center">
          {connectionStatus.connectionStatus === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
          ) : connectionStatus.connectionStatus === 'error' ? (
            <XCircle className="w-4 h-4 text-red-600 mr-2" />
          ) : (
            <Database className="w-4 h-4 text-yellow-600 mr-2" />
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {connectionStatus.isConfigured ? 'Supabase Database' : 'Local Storage'}
              </span>
              <span className={`text-xs px-2 py-1 rounded ${
                connectionStatus.connectionStatus === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {connectionStatus.connectionStatus === 'success' ? 'Connected' : 'Error'}
              </span>
            </div>
            {connectionStatus.connectionStatus === 'error' && (
              <div className="text-xs text-gray-600 mt-1">
                {connectionStatus.message}
                <button 
                  onClick={async () => {
                    const result = await testSupabaseConnection();
                    setConnectionStatus(result);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Simplified for all screen sizes */}
      <div className="space-y-6">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className={`${stat.bgColor} rounded-lg p-4 border border-gray-200 shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className={`text-xl font-bold ${stat.textColor} mt-1`}>
                      {stat.value}
                    </p>
                  </div>
                  <div className={`${stat.color} p-2 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <button 
                onClick={() => onPageChange?.('customers')}
                className="flex items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <Users className="w-6 h-6 text-blue-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-blue-900">Add Customer</p>
                  <p className="text-sm text-blue-700">Create new customer</p>
                </div>
              </button>
              
              <button 
                onClick={() => onPageChange?.('invoices')}
                className="flex items-center p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors border border-green-200"
              >
                <FileText className="w-6 h-6 text-green-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-green-900">Create Invoice</p>
                  <p className="text-sm text-green-700">Generate new invoice</p>
                </div>
              </button>
              
              <button 
                onClick={() => onPageChange?.('routes')}
                className="flex items-center p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors border border-purple-200"
              >
                <Route className="w-6 h-6 text-purple-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-purple-900">Route Sheets</p>
                  <p className="text-sm text-purple-700">Manage deliveries</p>
                </div>
              </button>
              
              <button 
                onClick={() => onPageChange?.('products')}
                className="flex items-center p-4 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-200"
              >
                <Box className="w-6 h-6 text-orange-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-orange-900">Add Product</p>
                  <p className="text-sm text-orange-700">Create new product</p>
                </div>
              </button>
              
              <button 
                onClick={async () => {
                  const result = await testSupabaseConnection();
                  setConnectionStatus(result);
                }}
                className="flex items-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <Database className="w-6 h-6 text-gray-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Test Connection</p>
                  <p className="text-sm text-gray-700">Check database</p>
                </div>
              </button>
              
              <button 
                onClick={() => onPageChange?.('settings')}
                className="flex items-center p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200"
              >
                <Settings className="w-6 h-6 text-indigo-600 mr-3" />
                <div className="text-left">
                  <p className="font-medium text-indigo-900">Settings</p>
                  <p className="text-sm text-indigo-700">App configuration</p>
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Recent Transactions
            </h2>
          </div>
          
          {stats.recentTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stats.recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.customerName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === 'sale' 
                            ? 'bg-blue-100 text-blue-800'
                            : transaction.type === 'payment'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.balanceChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                          ₹{Math.abs(transaction.balanceChange).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-gray-500">No transactions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};