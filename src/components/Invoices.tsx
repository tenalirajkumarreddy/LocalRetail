import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Eye
} from 'lucide-react';
import { 
  addInvoice, 
  addTransaction, 
  updateCustomer
} from '../utils/supabase-storage';
import { useData, useDataEntity } from '../contexts/DataContext';
import { Invoice, Customer, InvoiceItem } from '../types';

export const Invoices: React.FC = () => {
  // Use the data context instead of local state
  const dataContext = useData();
  const { 
    data: allInvoices
  } = useDataEntity('invoices');
  const { 
    data: allCustomers
  } = useDataEntity('customers');
  const { 
    data: allProducts
  } = useDataEntity('products');

  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [newInvoice, setNewInvoice] = useState({
    customerId: '',
    customerName: '',
    items: [] as InvoiceItem[],
    cashAmount: 0,
    upiAmount: 0,
    amountReceived: 0
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Update filtered invoices when data changes
  useEffect(() => {
    let filtered = allInvoices.filter(invoice => {
      // Text search
      const matchesText = invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerId.includes(searchTerm);
      
      // Date filter
      const matchesDate = !dateFilter || 
        invoice.date.toISOString().split('T')[0] === dateFilter;
      
      // Route filter
      const matchesRoute = !routeFilter || 
        (invoice.routeId && invoice.routeId.includes(routeFilter));
      
      // Customer filter
      const matchesCustomer = !customerFilter || 
        invoice.customerId === customerFilter;
      
      return matchesText && matchesDate && matchesRoute && matchesCustomer;
    });
    
    setFilteredInvoices(filtered);
  }, [allInvoices, searchTerm, dateFilter, routeFilter, customerFilter]);

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    if (value.length >= 2) {
      const customer = allCustomers.find(c => 
        c.id.includes(value) ||
        c.phone.includes(value) ||
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      if (customer) {
        setSelectedCustomer(customer);
        setNewInvoice({
          ...newInvoice,
          customerId: customer.id,
          customerName: customer.name
        });
      }
    } else {
      setSelectedCustomer(null);
      setNewInvoice({
        ...newInvoice,
        customerId: '',
        customerName: ''
      });
    }
  };

  const addInvoiceItem = () => {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      productName: '',
      quantity: 1,
      price: 0,
      total: 0
    };
    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, newItem]
    });
  };

  const updateInvoiceItem = (itemId: string, field: keyof InvoiceItem, value: any) => {
    const updatedItems = newInvoice.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'quantity' || field === 'price') {
          updatedItem.total = updatedItem.quantity * updatedItem.price;
        }
        
        return updatedItem;
      }
      return item;
    });
    
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const removeInvoiceItem = (itemId: string) => {
    setNewInvoice({
      ...newInvoice,
      items: newInvoice.items.filter(item => item.id !== itemId)
    });
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + item.total, 0);
  };

  const updatePaymentAmount = (field: 'cashAmount' | 'upiAmount', amount: number) => {
    const updatedInvoice = { ...newInvoice, [field]: amount };
    updatedInvoice.amountReceived = updatedInvoice.cashAmount + updatedInvoice.upiAmount;
    setNewInvoice(updatedInvoice);
  };

  const handleCreateInvoice = async () => {
    if (!selectedCustomer || newInvoice.items.length === 0) {
      alert('Please select a customer and add at least one item');
      return;
    }

    // Validate that all items have product names
    const invalidItems = newInvoice.items.filter(item => !item.productName || item.productName.trim() === '');
    if (invalidItems.length > 0) {
      alert('Please select a product for all items');
      return;
    }

    // Validate that all items have valid quantities and prices
    const invalidQuantityOrPrice = newInvoice.items.filter(item => item.quantity <= 0 || item.price <= 0);
    if (invalidQuantityOrPrice.length > 0) {
      alert('Please ensure all items have valid quantities and prices');
      return;
    }

    try {
      // Refresh data before critical operation to ensure consistency
      console.log('🔄 Refreshing data before creating invoice...');
      await dataContext.refreshBeforeCriticalOperation();
      
      const subtotal = calculateSubtotal();
      const balanceChange = subtotal - newInvoice.amountReceived;

      const finalBalance = selectedCustomer.outstandingAmount + balanceChange;
      
      const invoiceData = {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        items: newInvoice.items,
        subtotal,
        totalAmount: subtotal,
        amountReceived: newInvoice.amountReceived,
        balanceChange,
        date: new Date(),
        status: (newInvoice.amountReceived >= subtotal ? 'paid' : 
                 newInvoice.amountReceived > 0 ? 'partial' : 'pending') as 'paid' | 'partial' | 'pending',
        customerFinalBalance: finalBalance,
        cashAmount: newInvoice.cashAmount,
        upiAmount: newInvoice.upiAmount,
        routeId: 'MANUAL',
        routeName: 'No route'
      };

      const invoiceNumber = await addInvoice(invoiceData);

      // Create the full invoice object for optimistic update
      const newInvoiceRecord: Invoice = {
        id: invoiceNumber,
        invoiceNumber,
        ...invoiceData
      };

      // Optimistic update - add to local state immediately
      dataContext.addInvoice(newInvoiceRecord);

      // Add transaction
      await addTransaction({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        type: 'sale',
        items: newInvoice.items,
        totalAmount: subtotal,
        amountReceived: newInvoice.amountReceived,
        balanceChange,
        date: new Date(),
        invoiceNumber,
        routeId: 'MANUAL',
        routeName: 'No route'
      });

      // Update customer outstanding amount optimistically
      dataContext.updateCustomer(selectedCustomer.id, { 
        outstandingAmount: selectedCustomer.outstandingAmount + balanceChange 
      });

      // Update customer outstanding amount in storage
      await updateCustomer(selectedCustomer.id, { outstandingAmount: finalBalance });

      setShowCreateModal(false);
      resetNewInvoice();
      
      console.log('✅ Invoice created successfully with optimistic updates');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Error creating invoice. Please try again.');
      
      // Refresh data to ensure consistency after error
      await dataContext.refreshBeforeCriticalOperation();
    }
  };

  const resetNewInvoice = () => {
    setNewInvoice({
      customerId: '',
      customerName: '',
      items: [],
      cashAmount: 0,
      upiAmount: 0,
      amountReceived: 0
    });
    setCustomerSearch('');
    setSelectedCustomer(null);
  };

  const handleViewDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600">Manage your invoices and billing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by customer name, invoice number, or customer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredInvoices.length} of {allInvoices.length} invoices
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Route</label>
              <input
                type="text"
                placeholder="Route (e.g., A, B, C)"
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Customers</option>
                {allCustomers.map((customer: Customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.id})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setDateFilter('');
                  setRouteFilter('');
                  setCustomerFilter('');
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Invoice List
          </h2>
        </div>

        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.customerName}</div>
                        <div className="text-sm text-gray-500">{invoice.customerId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.routeName && invoice.routeName !== 'No route' 
                        ? `Route ${invoice.routeId}` 
                        : invoice.routeName || 'No route'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(invoice.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{invoice.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        {invoice.cashAmount && invoice.cashAmount > 0 && (
                          <div>Cash: ₹{invoice.cashAmount.toLocaleString()}</div>
                        )}
                        {invoice.upiAmount && invoice.upiAmount > 0 && (
                          <div>UPI: ₹{invoice.upiAmount.toLocaleString()}</div>
                        )}
                        {(!invoice.cashAmount || invoice.cashAmount === 0) && 
                         (!invoice.upiAmount || invoice.upiAmount === 0) && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Outstanding:</div>
                        <div className={`font-medium ${
                          invoice.customerFinalBalance >= 0 
                            ? 'text-red-600' 
                            : 'text-green-600'
                        }`}>
                          {invoice.customerFinalBalance >= 0 
                            ? `Customer has to pay: ₹${Math.abs(invoice.customerFinalBalance).toLocaleString()}` 
                            : `Customer balance is: ₹${Math.abs(invoice.customerFinalBalance).toLocaleString()}`
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(invoice)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No invoices found</p>
            {searchTerm && (
              <p className="text-sm text-gray-400 mt-2">
                Try adjusting your search terms
              </p>
            )}
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Invoice</h2>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Customer Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Customer (ID, Phone, or Name)
                </label>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter customer ID, phone number, or name"
                />
                {selectedCustomer && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      <strong>{selectedCustomer.name}</strong> (ID: {selectedCustomer.id}) - {selectedCustomer.phone}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Outstanding: ₹{Math.abs(selectedCustomer.outstandingAmount)} 
                      {selectedCustomer.outstandingAmount < 0 && ' (Credit)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
                  <button
                    onClick={addInvoiceItem}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Item
                  </button>
                </div>
                
                {newInvoice.items.map((item) => (
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 p-3 border border-gray-200 rounded-md">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                      <select
                        value={item.productName}
                        onChange={(e) => {
                          const productName = e.target.value;
                          let price = 0;
                          if (selectedCustomer && productName) {
                            const product = allProducts.find(p => p.name === productName);
                            if (product) {
                              price = selectedCustomer.productPrices[product.id] || product.defaultPrice;
                            }
                          }
                          updateInvoiceItem(item.id, 'productName', productName);
                          updateInvoiceItem(item.id, 'price', price);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select Product</option>
                        {allProducts.map((product) => (
                          <option key={product.id} value={product.name}>{product.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Price</label>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateInvoiceItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                      <input
                        type="number"
                        value={item.total}
                        readOnly
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => removeInvoiceItem(item.id)}
                        className="px-2 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Invoice Summary */}
              {newInvoice.items.length > 0 && (
                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700">Payment Details</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cash Amount
                        </label>
                        <input
                          type="number"
                          value={newInvoice.cashAmount}
                          onChange={(e) => updatePaymentAmount('cashAmount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          UPI Amount
                        </label>
                        <input
                          type="number"
                          value={newInvoice.upiAmount}
                          onChange={(e) => updatePaymentAmount('upiAmount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                        <span className="text-sm text-gray-900">₹{calculateSubtotal().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Cash Received:</span>
                        <span className="text-sm text-gray-900">₹{newInvoice.cashAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">UPI Received:</span>
                        <span className="text-sm text-gray-900">₹{newInvoice.upiAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Total Received:</span>
                        <span className="text-sm font-medium text-blue-600">₹{newInvoice.amountReceived.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance Change:</span>
                        <span className={`text-sm font-medium ${
                          (calculateSubtotal() - newInvoice.amountReceived) > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₹{Math.abs(calculateSubtotal() - newInvoice.amountReceived).toLocaleString()}
                          {(calculateSubtotal() - newInvoice.amountReceived) > 0 ? ' (Due)' : ' (Credit)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetNewInvoice();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={!selectedCustomer || newInvoice.items.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Details Modal */}
      {showDetailsModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Invoice Details</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Invoice Number</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Date</p>
                  <p className="text-lg text-gray-900">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Route</p>
                  <p className="text-lg text-gray-900">
                    {selectedInvoice.routeName && selectedInvoice.routeName !== 'No route' 
                      ? `Route ${selectedInvoice.routeId} - ${selectedInvoice.routeName}` 
                      : selectedInvoice.routeName || 'No route'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Customer</p>
                  <p className="text-lg text-gray-900">{selectedInvoice.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedInvoice.customerId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <span className={`inline-flex px-2 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Payment Type</p>
                  <div className="text-sm text-gray-900">
                    {selectedInvoice.cashAmount && selectedInvoice.cashAmount > 0 && (
                      <div>Cash: ₹{selectedInvoice.cashAmount.toLocaleString()}</div>
                    )}
                    {selectedInvoice.upiAmount && selectedInvoice.upiAmount > 0 && (
                      <div>UPI: ₹{selectedInvoice.upiAmount.toLocaleString()}</div>
                    )}
                    {(!selectedInvoice.cashAmount || selectedInvoice.cashAmount === 0) && 
                     (!selectedInvoice.upiAmount || selectedInvoice.upiAmount === 0) && 
                     <span className="text-gray-500">-</span>}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Product</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Price</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.productName}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">₹{item.price}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">₹{item.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Total Amount:</span>
                    <span className="text-gray-900">₹{selectedInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Amount Received:</span>
                    <span className="text-gray-900">₹{selectedInvoice.amountReceived.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium text-gray-700">Total Outstanding:</span>
                    <span className={`font-medium ${
                      selectedInvoice.customerFinalBalance >= 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      ₹{Math.abs(selectedInvoice.customerFinalBalance).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-center mt-3">
                    <div className={`px-4 py-2 rounded-md text-sm font-medium ${
                      selectedInvoice.customerFinalBalance >= 0 
                        ? 'bg-red-50 text-red-800' 
                        : 'bg-green-50 text-green-800'
                    }`}>
                      {selectedInvoice.customerFinalBalance >= 0 
                        ? `Customer has to pay: ₹${Math.abs(selectedInvoice.customerFinalBalance).toLocaleString()}` 
                        : `Customer balance is: ₹${Math.abs(selectedInvoice.customerFinalBalance).toLocaleString()}`
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};