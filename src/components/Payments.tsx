import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  CreditCard, 
  Eye
} from 'lucide-react';
import { 
  getCustomers, 
  addTransaction, 
  updateCustomer,
  getTransactions,
  generateUniqueTransactionId
} from '../utils/supabase-storage';
import { Customer, Transaction } from '../types';

export const Payments: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [paymentData, setPaymentData] = useState({
    customerId: '',
    customerName: '',
    cashAmount: 0,
    upiAmount: 0,
    totalAmount: 0,
    notes: ''
  });

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    loadCustomers();
    loadTransactions();
  }, []);

  useEffect(() => {
    let filtered = transactions.filter(transaction => {
      // Only show payment transactions
      if (transaction.type !== 'payment') return false;
      
      // Text search
      const matchesText = transaction.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.customerId.includes(searchTerm) ||
        transaction.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Date filter
      const matchesDate = !dateFilter || 
        transaction.date.toISOString().split('T')[0] === dateFilter;
      
      // Customer filter
      const matchesCustomer = !customerFilter || 
        transaction.customerId === customerFilter;
      
      return matchesText && matchesDate && matchesCustomer;
    });
    
    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, dateFilter, customerFilter]);

  const loadCustomers = async () => {
    try {
      const allCustomers = await getCustomers();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const allTransactions = await getTransactions();
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const handleCustomerSearch = (value: string) => {
    setCustomerSearch(value);
    if (value.length >= 2) {
      const customer = customers.find(c => 
        c.id.includes(value) ||
        c.phone.includes(value) ||
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      if (customer) {
        setSelectedCustomer(customer);
        setPaymentData({
          ...paymentData,
          customerId: customer.id,
          customerName: customer.name
        });
      }
    } else {
      setSelectedCustomer(null);
      setPaymentData({
        ...paymentData,
        customerId: '',
        customerName: ''
      });
    }
  };

  const updatePaymentAmount = (field: 'cashAmount' | 'upiAmount', amount: number) => {
    const updatedPayment = { ...paymentData, [field]: amount };
    updatedPayment.totalAmount = updatedPayment.cashAmount + updatedPayment.upiAmount;
    setPaymentData(updatedPayment);
  };

  const handleAddPayment = async () => {
    if (!selectedCustomer || paymentData.totalAmount <= 0) {
      alert('Please select a customer and enter a valid payment amount greater than 0');
      return;
    }

    try {
      // Create payment transaction
      await addTransaction({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        type: 'payment',
        items: [],
        totalAmount: 0,
        amountReceived: paymentData.totalAmount,
        balanceChange: -paymentData.totalAmount, // Reduces outstanding amount
        date: new Date(),
        invoiceNumber: generateUniqueTransactionId('payment', selectedCustomer.id)
      });

      // Update customer's outstanding amount
      const newOutstanding = selectedCustomer.outstandingAmount - paymentData.totalAmount;
      await updateCustomer(selectedCustomer.id, { outstandingAmount: newOutstanding });

      // Refresh data
      await loadCustomers();
      await loadTransactions();
      
      // Close modal and reset
      setShowPaymentModal(false);
      resetPaymentForm();
      
      alert(`Payment of ₹${paymentData.totalAmount.toLocaleString()} (Cash: ₹${paymentData.cashAmount.toLocaleString()}, UPI: ₹${paymentData.upiAmount.toLocaleString()}) recorded for ${selectedCustomer.name}`);
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    }
  };

  const resetPaymentForm = () => {
    setPaymentData({
      customerId: '',
      customerName: '',
      cashAmount: 0,
      upiAmount: 0,
      totalAmount: 0,
      notes: ''
    });
    setCustomerSearch('');
    setSelectedCustomer(null);
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const getPaymentTypeDisplay = (transaction: Transaction) => {
    // For payment transactions, we don't have separate cash/UPI breakdown in the transaction
    // This is a limitation of the current structure, but we can show the total amount
    return `₹${transaction.amountReceived.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Record and manage customer payments</p>
        </div>
        <button
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Payment
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
                placeholder="Search by customer name, ID, or payment reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="text-sm text-gray-600">
              {filteredTransactions.length} of {transactions.filter(t => t.type === 'payment').length} payments
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Customer</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">All Customers</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.id})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end col-span-2">
              <button
                onClick={() => {
                  setDateFilter('');
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

      {/* Payments List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Payment History
          </h2>
        </div>

        {filteredTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Reference
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance Impact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {transaction.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{transaction.customerName}</div>
                        <div className="text-sm text-gray-500">{transaction.customerId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentTypeDisplay(transaction)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-green-600 font-medium">
                        ₹{Math.abs(transaction.balanceChange).toLocaleString()} reduced
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(transaction)}
                        className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
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
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No payments found</p>
            {searchTerm && (
              <p className="text-sm text-gray-400 mt-2">
                Try adjusting your search terms
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Manual Payment</h2>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter customer ID, phone number, or name"
                />
                {selectedCustomer && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      <strong>{selectedCustomer.name}</strong> (ID: {selectedCustomer.id}) - {selectedCustomer.phone}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Current Outstanding: ₹{Math.abs(selectedCustomer.outstandingAmount).toLocaleString()} 
                      {selectedCustomer.outstandingAmount < 0 && ' (Credit Balance)'}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Details */}
              {selectedCustomer && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cash Amount
                      </label>
                      <input
                        type="number"
                        value={paymentData.cashAmount}
                        onChange={(e) => updatePaymentAmount('cashAmount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        step="0.01"
                        min="0"
                        placeholder="Cash amount"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        UPI Amount
                      </label>
                      <input
                        type="number"
                        value={paymentData.upiAmount}
                        onChange={(e) => updatePaymentAmount('upiAmount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        step="0.01"
                        min="0"
                        placeholder="UPI amount"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={paymentData.notes}
                      onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      rows={3}
                      placeholder="Add any notes about this payment..."
                    />
                  </div>

                  {/* Payment Summary */}
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cash Amount:</span>
                        <span className="font-medium">₹{paymentData.cashAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">UPI Amount:</span>
                        <span className="font-medium">₹{paymentData.upiAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-gray-600 font-medium">Total Payment:</span>
                        <span className="font-semibold text-green-600">₹{paymentData.totalAmount.toLocaleString()}</span>
                      </div>
                      {paymentData.totalAmount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Outstanding after payment:</span>
                          <span className="font-medium">
                            ₹{Math.abs(selectedCustomer.outstandingAmount - paymentData.totalAmount).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  resetPaymentForm();
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPayment}
                disabled={!selectedCustomer || paymentData.totalAmount <= 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Payment Details</h2>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Payment Reference</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedTransaction.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Date</p>
                  <p className="text-lg text-gray-900">{new Date(selectedTransaction.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Customer</p>
                  <p className="text-lg text-gray-900">{selectedTransaction.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedTransaction.customerId}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Payment Amount</p>
                  <p className="text-lg font-semibold text-green-600">₹{selectedTransaction.amountReceived.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Balance Impact</p>
                  <p className="text-lg text-green-600">₹{Math.abs(selectedTransaction.balanceChange).toLocaleString()} reduced from outstanding</p>
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
