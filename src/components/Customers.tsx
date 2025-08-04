import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit, 
  Eye, 
  Users,
  Phone,
  MapPin,
  IndianRupee,
  Trash2
} from 'lucide-react';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getCustomerTransactions } from '../utils/supabase-storage';
import { Customer, Transaction } from '../types';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);

  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    route: '',
    openingBalance: 0,
    productPrices: {} as { [key: string]: number }
  });

  const [editCustomer, setEditCustomer] = useState({
    name: '',
    phone: '',
    address: '',
    route: '',
    productPrices: {} as { [key: string]: number }
  });

  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    loadCustomers();
    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.id.includes(searchTerm) ||
      customer.route.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  }, [customers, searchTerm]);

  const loadCustomers = async () => {
    try {
      const allCustomers = await getCustomers();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { getProducts } = await import('../utils/supabase-storage');
      const allProducts = await getProducts();
      setProducts(allProducts);
      
      // Initialize product prices with default values
      const defaultPrices: { [key: string]: number } = {};
      allProducts.forEach((product: any) => {
        defaultPrices[product.id] = product.defaultPrice;
      });
      setNewCustomer(prev => ({ ...prev, productPrices: defaultPrices }));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim() || !newCustomer.route.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await addCustomer({
        ...newCustomer,
        outstandingAmount: newCustomer.openingBalance // Initialize outstanding amount with opening balance
      });
      await loadCustomers();
      setShowAddModal(false);
      setNewCustomer({
        name: '',
        phone: '',
        address: '',
        route: '',
        openingBalance: 0,
        productPrices: {}
      });
      await loadProducts(); // Reload to reset product prices
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer. Please try again.');
    }
  };

  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    try {
      const transactions = await getCustomerTransactions(customer.id);
      setCustomerTransactions(transactions);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading customer transactions:', error);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditCustomer({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      route: customer.route,
      productPrices: customer.productPrices
    });
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      await updateCustomer(selectedCustomer.id, {
        name: editCustomer.name,
        phone: editCustomer.phone,
        address: editCustomer.address,
        route: editCustomer.route,
        productPrices: editCustomer.productPrices
      });
      
      setShowEditModal(false);
      await loadCustomers();
      alert('Customer updated successfully!');
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer. Please try again.');
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCustomer(customer.id);
      await loadCustomers();
      alert('Customer deleted successfully!');
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer. Please try again.');
    }
  };

  const handleCallCustomer = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleLocationSearch = (address: string) => {
    const query = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, phone, ID, or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-600">
            {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Customer List
          </h2>
        </div>

        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
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
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
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
                      Route {customer.route}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={customer.outstandingAmount >= 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{Math.abs(customer.outstandingAmount).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(customer)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCallCustomer(customer.phone)}
                          className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                          title="Call Customer"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleLocationSearch(customer.address)}
                          className="text-orange-600 hover:text-orange-800 p-1 rounded transition-colors"
                          title="View Location"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer)}
                          className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No customers found</p>
            {searchTerm && (
              <p className="text-sm text-gray-400 mt-2">
                Try adjusting your search terms
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter customer address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Route *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.route}
                    onChange={(e) => setNewCustomer({...newCustomer, route: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter route (e.g., A, B, C)"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opening Balance
                  </label>
                  <input
                    type="number"
                    value={newCustomer.openingBalance}
                    onChange={(e) => setNewCustomer({...newCustomer, openingBalance: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter opening balance"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Product Prices</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {product.name} Price
                      </label>
                      <input
                        type="number"
                        value={newCustomer.productPrices[product.id] || 0}
                        onChange={(e) => setNewCustomer({
                          ...newCustomer, 
                          productPrices: {
                            ...newCustomer.productPrices, 
                            [product.id]: parseFloat(e.target.value) || 0
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`₹${product.defaultPrice}`}
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Customer</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={editCustomer.name}
                    onChange={(e) => setEditCustomer({...editCustomer, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={editCustomer.phone}
                    onChange={(e) => setEditCustomer({...editCustomer, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={editCustomer.address}
                  onChange={(e) => setEditCustomer({...editCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Route</label>
                <input
                  type="text"
                  value={editCustomer.route}
                  onChange={(e) => setEditCustomer({...editCustomer, route: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., A, B, C"
                />
              </div>

              {products.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Prices</label>
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-md">
                        <span className="font-medium">{product.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">₹</span>
                          <input
                            type="number"
                            value={editCustomer.productPrices[product.id] || product.defaultPrice}
                            onChange={(e) => setEditCustomer({
                              ...editCustomer,
                              productPrices: {
                                ...editCustomer.productPrices,
                                [product.id]: parseFloat(e.target.value) || 0
                              }
                            })}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCustomer}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Update Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Customer Details</h2>
            </div>
            
            <div className="px-6 py-4 space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Customer ID</p>
                      <p className="text-xl font-bold text-blue-700">{selectedCustomer.id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Phone className="w-8 h-8 text-green-600 mr-3" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Phone</p>
                      <p className="text-xl font-bold text-green-700">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <MapPin className="w-8 h-8 text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Route</p>
                      <p className="text-xl font-bold text-purple-700">Route {selectedCustomer.route}</p>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg ${selectedCustomer.outstandingAmount >= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <div className="flex items-center">
                    <IndianRupee className={`w-8 h-8 mr-3 ${selectedCustomer.outstandingAmount >= 0 ? 'text-red-600' : 'text-green-600'}`} />
                    <div>
                      <p className={`text-sm font-medium ${selectedCustomer.outstandingAmount >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        Outstanding
                      </p>
                      <p className={`text-xl font-bold ${selectedCustomer.outstandingAmount >= 0 ? 'text-red-700' : 'text-green-700'}`}>
                        ₹{Math.abs(selectedCustomer.outstandingAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Prices */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Prices</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {products.map((product) => (
                    <div key={product.id} className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">{product.name}</p>
                      <p className="text-xl font-bold text-gray-900">₹{selectedCustomer.productPrices[product.id] || 0}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Transaction History</h3>
                {customerTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Money Received</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {customerTransactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(transaction.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {transaction.routeId ? `Route ${transaction.routeId}` : '-'}
                              {transaction.routeName && (
                                <div className="text-xs text-gray-500">{transaction.routeName}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.type === 'sale' 
                                  ? 'bg-blue-100 text-blue-800'
                                  : transaction.type === 'payment'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.type === 'adjustment'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {transaction.type === 'adjustment' && transaction.invoiceNumber.startsWith('INITIAL-') 
                                  ? 'Initial Balance'
                                  : transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
                                }
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {transaction.type === 'sale' && transaction.totalAmount > 0 ? (
                                <span className="text-red-600">
                                  ₹{transaction.totalAmount.toLocaleString()}
                                </span>
                              ) : transaction.type === 'adjustment' && transaction.balanceChange > 0 ? (
                                <span className="text-purple-600">
                                  ₹{transaction.balanceChange.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {transaction.amountReceived > 0 ? (
                                <span className="text-green-600">
                                  ₹{transaction.amountReceived.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              <span className={transaction.balanceChange >= 0 ? 'text-red-600' : 'text-green-600'}>
                                {transaction.balanceChange >= 0 ? '+' : ''}₹{Math.abs(transaction.balanceChange).toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No transactions found</p>
                  </div>
                )}
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