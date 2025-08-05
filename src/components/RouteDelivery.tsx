import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Search, 
  CheckCircle, 
  FileText,
  Users
} from 'lucide-react';
import { 
  getRouteInfos, 
  getCustomersByRoute, 
  getProducts, 
  addTransaction, 
  updateCustomer,
  getCustomerById,
  addInvoice
} from '../utils/supabase-storage';
import { Product, RouteInfo, InvoiceItem } from '../types';

interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface CustomerDelivery {
  customerId: string;
  customerName: string;
  items: DeliveryItem[];
  totalAmount: number;
  amountReceived: number;
  balanceChange: number;
  remarks: string;
}

export const RouteDelivery: React.FC = () => {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveries, setDeliveries] = useState<CustomerDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getSelectedRouteInfo = () => {
    return routes.find(route => route.id === selectedRoute);
  };

  // Get only first 3 products for consistency with route sheets
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
    setDeliveries([]);
    
    if (!routeId) return;

    setLoading(true);
    try {
      const routeCustomers = await getCustomersByRoute(routeId);
      
      // Initialize deliveries for all customers in the route
      const initialDeliveries: CustomerDelivery[] = routeCustomers.map(customer => ({
        customerId: customer.id,
        customerName: customer.name,
        items: getFixedProducts().map(product => ({
          productId: product.id,
          productName: product.name,
          quantity: 0,
          rate: customer.productPrices[product.id] || product.defaultPrice || 0,
          amount: 0
        })),
        totalAmount: 0,
        amountReceived: 0,
        balanceChange: 0,
        remarks: ''
      }));
      setDeliveries(initialDeliveries);
    } catch (error) {
      console.error('Error loading route customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (deliveryIndex: number, itemIndex: number, quantity: number) => {
    const updatedDeliveries = [...deliveries];
    const item = updatedDeliveries[deliveryIndex].items[itemIndex];
    item.quantity = quantity;
    item.amount = quantity * item.rate;
    
    // Recalculate total amount
    updatedDeliveries[deliveryIndex].totalAmount = updatedDeliveries[deliveryIndex].items.reduce(
      (sum, item) => sum + item.amount, 0
    );
    
    // Recalculate balance change
    const delivery = updatedDeliveries[deliveryIndex];
    delivery.balanceChange = delivery.totalAmount - delivery.amountReceived;
    
    setDeliveries(updatedDeliveries);
  };

  const updateAmountReceived = (deliveryIndex: number, amountReceived: number) => {
    const updatedDeliveries = [...deliveries];
    updatedDeliveries[deliveryIndex].amountReceived = amountReceived;
    updatedDeliveries[deliveryIndex].balanceChange = 
      updatedDeliveries[deliveryIndex].totalAmount - amountReceived;
    setDeliveries(updatedDeliveries);
  };

  const updateRemarks = (deliveryIndex: number, remarks: string) => {
    const updatedDeliveries = [...deliveries];
    updatedDeliveries[deliveryIndex].remarks = remarks;
    setDeliveries(updatedDeliveries);
  };

  const hasDeliveryData = (delivery: CustomerDelivery) => {
    return delivery.items.some(item => item.quantity > 0) || 
           delivery.amountReceived > 0 || 
           delivery.remarks.trim() !== '';
  };

  const saveRouteDeliveries = async () => {
    if (!selectedRoute) return;

    const deliveriesToSave = deliveries.filter(hasDeliveryData);
    
    if (deliveriesToSave.length === 0) {
      alert('No delivery data to save. Please enter at least one delivery.');
      return;
    }

    setSaving(true);
    try {
      const routeInfo = getSelectedRouteInfo();
      const deliveryDate = new Date();

      for (const delivery of deliveriesToSave) {
        // Create invoice if there are items
        if (delivery.items.some(item => item.quantity > 0)) {
          const invoiceItems: InvoiceItem[] = delivery.items
            .filter(item => item.quantity > 0)
            .map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              price: item.rate,
              total: item.amount
            }));

          const invoiceData = {
            customerId: delivery.customerId,
            customerName: delivery.customerName,
            items: invoiceItems,
            subtotal: delivery.totalAmount,
            totalAmount: delivery.totalAmount,
            amountReceived: delivery.amountReceived,
            balanceChange: delivery.balanceChange,
            status: delivery.balanceChange === 0 ? 'paid' as const : 'partial' as const,
            date: deliveryDate
          };

          await addInvoice(invoiceData);
        }

        // Add transaction for amount received or balance change
        if (delivery.amountReceived !== 0 || delivery.balanceChange !== 0) {
          await addTransaction({
            customerId: delivery.customerId,
            customerName: delivery.customerName,
            type: delivery.balanceChange > 0 ? 'sale' : 'payment',
            items: delivery.items.filter(i => i.quantity > 0).map(i => ({
              productName: i.productName,
              quantity: i.quantity,
              price: i.rate,
              total: i.amount
            })),
            totalAmount: Math.abs(delivery.balanceChange),
            amountReceived: delivery.amountReceived,
            balanceChange: delivery.balanceChange,
            date: deliveryDate,
            invoiceNumber: `ROUTE-${deliveryDate.getTime()}`
          });

          // Update customer outstanding balance
          const customer = await getCustomerById(delivery.customerId);
          if (customer) {
            await updateCustomer(delivery.customerId, {
              outstandingAmount: customer.outstandingAmount + delivery.balanceChange
            });
          }
        }
      }

      alert(`Successfully saved ${deliveriesToSave.length} deliveries for Route ${routeInfo?.id}`);
      
      // Reset deliveries
      handleRouteSelect(selectedRoute);
      
    } catch (error) {
      console.error('Error saving route deliveries:', error);
      alert('Error saving deliveries. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getTotalRouteAmount = () => {
    return deliveries.reduce((sum, delivery) => sum + delivery.totalAmount, 0);
  };

  const getTotalAmountReceived = () => {
    return deliveries.reduce((sum, delivery) => sum + delivery.amountReceived, 0);
  };

  const getDeliveriesWithData = () => {
    return deliveries.filter(hasDeliveryData);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Route Delivery Entry</h1>
          <p className="text-gray-600">Enter delivery data from paper route sheets</p>
        </div>
      </div>

      {/* Route Selection */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2" />
          Select Route for Data Entry
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-end">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Route
            </label>
            <select
              value={selectedRoute}
              onChange={(e) => handleRouteSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a route</option>
              {routes.map((route) => (
                <option key={route.id} value={route.id}>
                  Route {route.id} - {route.name}
                </option>
              ))}
            </select>
          </div>
          
          {selectedRoute && deliveries.length > 0 && (
            <>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-sm text-blue-600 font-medium">Customers</p>
                <p className="text-xl font-bold text-blue-700">{deliveries.length}</p>
              </div>
              
              <button
                onClick={saveRouteDeliveries}
                disabled={saving || getDeliveriesWithData().length === 0}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : `Save Route Data (${getDeliveriesWithData().length})`}
              </button>
            </>
          )}
        </div>

        {/* Route Summary */}
        {selectedRoute && deliveries.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 font-medium">Total Sale Amount</p>
              <p className="text-xl font-bold text-gray-900">₹{getTotalRouteAmount().toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600 font-medium">Amount Received</p>
              <p className="text-xl font-bold text-green-700">₹{getTotalAmountReceived().toLocaleString()}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-orange-600 font-medium">Entries with Data</p>
              <p className="text-xl font-bold text-orange-700">{getDeliveriesWithData().length} / {deliveries.length}</p>
            </div>
          </div>
        )}
      </div>

      {/* Delivery Entry Form */}
      {loading && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customers...</p>
        </div>
      )}

      {selectedRoute && !loading && deliveries.length > 0 && (
        <div className="space-y-4">
          {deliveries.map((delivery, deliveryIndex) => (
            <div key={delivery.customerId} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    {delivery.customerName} ({delivery.customerId})
                  </h3>
                  {hasDeliveryData(delivery) && (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Product Items */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Product Deliveries</h4>
                    <div className="space-y-3">
                      {delivery.items.map((item, itemIndex) => (
                        <div key={item.productId} className="grid grid-cols-4 gap-3 items-center">
                          <div className="text-sm font-medium text-gray-700">
                            {item.productName}
                          </div>
                          <div>
                            <input
                              type="number"
                              min="0"
                              value={item.quantity}
                              onChange={(e) => updateItemQuantity(deliveryIndex, itemIndex, parseInt(e.target.value) || 0)}
                              placeholder="Cases"
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="text-sm text-gray-600">
                            @₹{item.rate}
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            ₹{item.amount.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Payment Details</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Total Amount</label>
                        <div className="px-3 py-2 bg-gray-50 rounded text-sm font-medium">
                          ₹{delivery.totalAmount.toLocaleString()}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Amount Received</label>
                        <input
                          type="number"
                          min="0"
                          value={delivery.amountReceived}
                          onChange={(e) => updateAmountReceived(deliveryIndex, parseFloat(e.target.value) || 0)}
                          placeholder="Amount received"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Balance Change</label>
                        <div className={`px-3 py-2 rounded text-sm font-medium ${
                          delivery.balanceChange > 0 
                            ? 'bg-red-50 text-red-700' 
                            : delivery.balanceChange < 0 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-gray-50 text-gray-700'
                        }`}>
                          {delivery.balanceChange > 0 && '+'}₹{delivery.balanceChange.toLocaleString()}
                          {delivery.balanceChange > 0 && ' (Outstanding)'}
                          {delivery.balanceChange < 0 && ' (Credit)'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Remarks</label>
                        <input
                          type="text"
                          value={delivery.remarks}
                          onChange={(e) => updateRemarks(deliveryIndex, e.target.value)}
                          placeholder="Optional remarks"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRoute && !loading && deliveries.length === 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-600">There are no customers assigned to Route {getSelectedRouteInfo()?.id}.</p>
        </div>
      )}
    </div>
  );
};
