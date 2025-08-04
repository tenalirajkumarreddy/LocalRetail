import React, { useState, useEffect } from 'react';
import { Download, Users, FileText, Search, Cloud } from 'lucide-react';
import { getRoutes, getCustomersByRoute, getProducts } from '../utils/supabase-storage';
import { generateRouteSheetPDF } from '../utils/pdf';
import { backupRouteSheetToSheets, isUserAuthenticated } from '../utils/google-sheets';
import { Customer, Product } from '../types';

export const RouteSheets: React.FC = () => {
  const [routes, setRoutes] = useState<string[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [availableRoutes, allProducts] = await Promise.all([
          getRoutes(),
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

  const handleRouteSelect = async (route: string) => {
    setSelectedRoute(route);
    try {
      const routeCustomers = await getCustomersByRoute(route);
      setCustomers(routeCustomers);
    } catch (error) {
      console.error('Error loading route customers:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedRoute || customers.length === 0) return;
    
    setLoading(true);
    try {
      // Generate PDF
      await generateRouteSheetPDF(selectedRoute, customers);
      
      // Backup to Google Sheets if authenticated
      if (isUserAuthenticated()) {
        try {
          const success = await backupRouteSheetToSheets(selectedRoute, customers, products);
          if (success) {
            console.log(`Route sheet backed up to Google Sheets: ${selectedRoute}`);
          }
        } catch (error) {
          console.error('Error backing up route sheet to Google Sheets:', error);
          // Don't show error to user as PDF generation was successful
        }
      }
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setLoading(false);
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
                  <option key={route} value={route}>
                    Route {route}
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
            {isUserAuthenticated() && (
              <div className="flex items-center text-sm text-green-600">
                <Cloud className="w-4 h-4 mr-1" />
                Will backup to Google Sheets
              </div>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {loading ? 'Generating PDF...' : 'Download Route Sheet'}
            </button>
          </div>
        )}
      </div>

      {/* Customer List Preview */}
      {selectedRoute && customers.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Route {selectedRoute} - Customer Details
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
                  {products.map((product) => (
                    <th key={product.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {product.name}
                    </th>
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
                    {products.map((product) => (
                      <td key={product.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{customer.productPrices[product.id] || product.defaultPrice || 0}
                      </td>
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
          <p className="text-gray-600">There are no customers assigned to Route {selectedRoute}.</p>
        </div>
      )}
    </div>
  );
};