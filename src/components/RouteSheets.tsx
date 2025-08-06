import React, { useState, useEffect } from 'react';
import { Users, FileText, Search, RefreshCw } from 'lucide-react';
import { getRouteInfos, getCustomersByRoute, getProducts, saveSheetHistory, getSheetHistory } from '../utils/supabase-storage';
import { Customer, Product, RouteInfo } from '../types';

interface RouteSheetProps {
  onPageChange?: (page: string) => void;
}

export const RouteSheets: React.FC<RouteSheetProps> = ({ onPageChange }) => {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateRouteInfo, setDuplicateRouteInfo] = useState<{ routeId: string; routeName: string } | null>(null);

  const getSelectedRouteInfo = () => {
    return routes.find(route => route.id === selectedRoute);
  };

  // Get only first 3 products for fixed format (Prod A, Prod B, Prod C)
  const getFixedProducts = () => {
    return products.slice(0, 3);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [availableRoutes, allProducts] = await Promise.all([
          getRouteInfos(),
          getProducts()
        ]);
        setRoutes(availableRoutes);
        setProducts(allProducts);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  const handleRouteSelect = async (routeId: string) => {
    setSelectedRoute(routeId);
    try {
      const routeCustomers = await getCustomersByRoute(routeId);
      setCustomers(routeCustomers);
    } catch (error) {
      console.error('Error loading route customers:', error);
    }
  };

  const handleRefreshRoute = async () => {
    if (!selectedRoute) return;
    
    setLoading(true);
    try {
      const routeCustomers = await getCustomersByRoute(selectedRoute);
      setCustomers(routeCustomers);
    } catch (error) {
      console.error('Error refreshing route customers:', error);
      alert('Error refreshing customer data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkForActiveSheet = async (routeId: string) => {
    try {
      // Check for any active sheets for this route (regardless of date)
      const allSheets = await getSheetHistory();
      
      return allSheets.find(sheet => 
        sheet.routeId === routeId && 
        sheet.status === 'active'
      );
    } catch (error) {
      console.error('Error checking for active sheets:', error);
      return null;
    }
  };

  const handleGenerateRoute = async () => {
    const routeInfo = getSelectedRouteInfo();
    if (!routeInfo || customers.length === 0) return;

    // Check for active sheets for this route - only one active sheet per route allowed
    const activeSheet = await checkForActiveSheet(routeInfo.id);
    if (activeSheet) {
      setDuplicateRouteInfo({ routeId: routeInfo.id, routeName: routeInfo.name });
      setShowDuplicateDialog(true);
      return;
    }

    setLoading(true);
    try {
      // Create sheet history record
      await saveSheetHistory({
        routeId: routeInfo.id,
        routeName: routeInfo.name,
        customers: customers,
        status: 'active',
        deliveryData: {},
        amountReceived: {},
        notes: ''
      });
      
      alert(`Route sheet for "${routeInfo.name}" has been generated successfully! Check Sheets History to manage it.`);
      
      // Reset form
      setSelectedRoute('');
      setCustomers([]);
      
    } catch (error) {
      console.error('Error generating route sheet:', error);
      alert('Error generating route sheet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setShowDuplicateDialog(false);
    setDuplicateRouteInfo(null);
  };

  const handleGoToSheetsHistory = () => {
    // Close the dialog
    handleCloseDialog();
    
    // Navigate to Sheets History page if navigation is available
    if (onPageChange) {
      onPageChange('sheets-history');
    } else {
      // Fallback message if navigation is not available
      alert('Please go to "Sheets History" page to close the existing active sheet before creating a new one.');
    }
  };

  const totalOutstanding = customers.reduce((sum, customer) => sum + customer.outstandingAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Sheets</h1>
          <p className="text-gray-600">Generate delivery sheets for your routes</p>
        </div>
      </div>

      {/* Route Selection */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2" />
          Select Route
        </h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Route
              </label>
              <select
                value={selectedRoute}
                onChange={(e) => handleRouteSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a route</option>
                {routes.map((route) => (
                  <option key={route.id} value={route.id}>
                    Route {route.id} - {route.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedRoute && (
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Customers</p>
                  <p className="text-2xl font-bold text-blue-700">{customers.length}</p>
                </div>
                
                <div className={`p-4 rounded-lg ${totalOutstanding >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className={`text-sm font-medium ${totalOutstanding >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    Total Outstanding
                  </p>
                  <p className={`text-2xl font-bold ${totalOutstanding >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                    ₹{Math.abs(totalOutstanding).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {selectedRoute && customers.length > 0 && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {customers.length} customers • ₹{Math.abs(totalOutstanding).toLocaleString()} total outstanding
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleRefreshRoute}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button
                onClick={() => handleGenerateRoute()}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                {loading ? 'Generating...' : 'Generate Route Sheet'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer List Preview */}
      {selectedRoute && customers.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Route {getSelectedRouteInfo()?.id} - {getSelectedRouteInfo()?.name} - Customer Details
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    S.No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area
                  </th>
                  {getFixedProducts().map((product) => (
                    <React.Fragment key={product.id}>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {product.name} (Cases)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                    </React.Fragment>
                  ))}
                  {/* Fill remaining slots if less than 3 products */}
                  {Array.from({ length: Math.max(0, 3 - products.length) }, (_, index) => (
                    <React.Fragment key={`empty-${index}`}>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prod {String.fromCharCode(65 + products.length + index)} (Cases)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                    </React.Fragment>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {customer.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.address || ''}
                    </td>
                    {getFixedProducts().map((product) => (
                      <React.Fragment key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-400">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{customer.productPrices[product.id] || product.defaultPrice || 0}
                        </td>
                      </React.Fragment>
                    ))}
                    {/* Fill remaining slots if less than 3 products */}
                    {Array.from({ length: Math.max(0, 3 - products.length) }, (_, index) => (
                      <React.Fragment key={`empty-${index}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-400">
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          ₹0
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={customer.outstandingAmount >= 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{Math.abs(customer.outstandingAmount).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedRoute && customers.length === 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600">There are no customers assigned to Route {getSelectedRouteInfo()?.id} - {getSelectedRouteInfo()?.name}.</p>
        </div>
      )}

      {/* Duplicate Route Warning Dialog */}
      {showDuplicateDialog && duplicateRouteInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Active Route Sheet Exists
                </h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                An active route sheet for <strong>{duplicateRouteInfo.routeName}</strong> (Route ID: {duplicateRouteInfo.routeId}) already exists. 
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Only one active sheet per route is allowed to prevent data inconsistency. Please close the existing active sheet first before creating a new one.
              </p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGoToSheetsHistory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Sheets History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};