import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  Users, 
  Edit3, 
  Save, 
  X,
  Download,
  Printer,
  Trash2,
  MoreVertical,
  Eye
} from 'lucide-react';
import { 
  getProducts,
  getSheetHistory,
  updateSheetRecord,
  deleteSheetRecord,
  closeSheetRecord,
  SheetRecord
} from '../utils/supabase-storage';
import { generateRouteSheetPDF, printRouteSheet } from '../utils/pdf';
import { Product } from '../types';

export const SheetsHistory: React.FC = () => {
  const [sheetRecords, setSheetRecords] = useState<SheetRecord[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<SheetRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [sheetToClose, setSheetToClose] = useState<SheetRecord | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const sheetsPerPage = 10;

  // Customer pagination states
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const customersPerPage = 5;

  // Get only first 3 products for consistency
  const getFixedProducts = () => {
    return products.slice(0, 3);
  };

  // Filter and paginate sheets
  const getFilteredSheets = () => {
    let filtered = sheetRecords;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(sheet => 
        sheet.routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.routeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sheet.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sheet => sheet.status === statusFilter);
    }
    
    return filtered;
  };

  const getPaginatedSheets = () => {
    const filtered = getFilteredSheets();
    const startIndex = (currentPage - 1) * sheetsPerPage;
    const endIndex = startIndex + sheetsPerPage;
    const currentSheets = filtered.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filtered.length / sheetsPerPage);
    
    return {
      currentSheets,
      totalPages,
      totalSheets: filtered.length,
      startIndex,
      endIndex: Math.min(endIndex, filtered.length)
    };
  };

  // Customer pagination
  const getCustomerPagination = () => {
    if (!selectedSheet) return { currentCustomers: [], totalCustomerPages: 0, customerStartIndex: 0, customerEndIndex: 0 };
    
    const startIndex = (customerCurrentPage - 1) * customersPerPage;
    const endIndex = startIndex + customersPerPage;
    const currentCustomers = selectedSheet.customers.slice(startIndex, endIndex);
    const totalCustomerPages = Math.ceil(selectedSheet.customers.length / customersPerPage);
    
    return {
      currentCustomers,
      totalCustomerPages,
      customerStartIndex: startIndex,
      customerEndIndex: Math.min(endIndex, selectedSheet.customers.length)
    };
  };

  // Reset customer pagination when selecting a new sheet
  useEffect(() => {
    setCustomerCurrentPage(1);
  }, [selectedSheet]);

  useEffect(() => {
    loadData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (dropdownOpen) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [dropdownOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [history, allProducts] = await Promise.all([
        getSheetHistory(),
        getProducts()
      ]);
      setSheetRecords(history);
      setProducts(allProducts);
    } catch (error) {
      console.error('Error loading sheets history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSheet = () => {
    setSelectedSheet(null);
    setEditMode(false);
  };

  const toggleDropdown = (sheetId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setDropdownOpen(dropdownOpen === sheetId ? null : sheetId);
  };

  const handleViewSheet = (sheet: SheetRecord) => {
    // Ensure backwards compatibility - initialize amountReceived if not present
    const sheetWithAmounts = {
      ...sheet,
      amountReceived: sheet.amountReceived ? 
        Object.fromEntries(
          Object.entries(sheet.amountReceived).map(([customerId, amount]) => [
            customerId,
            typeof amount === 'number' 
              ? { cash: 0, upi: 0, total: amount } // Convert old format
              : amount // Keep new format
          ])
        ) : {}
    };
    
    // Refresh customer data to get current outstanding amounts
    refreshCustomerData(sheetWithAmounts);
    setEditMode(false);
    setDropdownOpen(null);
  };

  const refreshCustomerData = async (sheet: SheetRecord) => {
    try {
      // Get fresh customer data from storage
      const { getCustomers } = await import('../utils/supabase-storage');
      const currentCustomers = await getCustomers();
      
      // Update the sheet's customer data with current outstanding amounts
      const updatedCustomers = sheet.customers.map(sheetCustomer => {
        const currentCustomer = currentCustomers.find(c => c.id === sheetCustomer.id);
        return currentCustomer ? {
          ...sheetCustomer,
          outstandingAmount: currentCustomer.outstandingAmount
        } : sheetCustomer;
      });
      
      setSelectedSheet({
        ...sheet,
        customers: updatedCustomers
      });
    } catch (error) {
      console.error('Error refreshing customer data:', error);
      // Fall back to original sheet data if refresh fails
      setSelectedSheet(sheet);
    }
  };

  const updateDeliveryQuantity = (customerId: string, productId: string, quantity: number) => {
    if (!selectedSheet) return;

    // Validate quantity is non-negative
    if (quantity < 0) {
      alert('Quantity cannot be negative');
      return;
    }

    const updatedSheet = { ...selectedSheet };
    if (!updatedSheet.deliveryData[customerId]) {
      updatedSheet.deliveryData[customerId] = {};
    }
    if (!updatedSheet.deliveryData[customerId][productId]) {
      updatedSheet.deliveryData[customerId][productId] = { quantity: 0, amount: 0 };
    }

    // Find customer and product to calculate amount
    const customer = updatedSheet.customers.find(c => c.id === customerId);
    const product = products.find(p => p.id === productId);
    
    if (customer && product) {
      // Use customer-specific price if available, otherwise product default
      const rate = customer.productPrices[productId] || product.defaultPrice || 0;
      
      // Validate rate is positive
      if (rate <= 0 && quantity > 0) {
        alert(`No valid price found for ${product.name}. Please check product pricing.`);
        return;
      }
      
      updatedSheet.deliveryData[customerId][productId] = {
        quantity,
        amount: quantity * rate
      };
    } else {
      console.error(`Customer or product not found: customer=${customerId}, product=${productId}`);
      return;
    }

    setSelectedSheet(updatedSheet);
  };

  const updateNotes = (notes: string) => {
    if (!selectedSheet) return;
    setSelectedSheet({ ...selectedSheet, notes });
  };

  const updateAmountReceived = (customerId: string, paymentType: 'cash' | 'upi', amount: number) => {
    if (!selectedSheet) return;
    
    // Validate amount is non-negative
    if (amount < 0) {
      alert('Amount cannot be negative');
      return;
    }
    
    const updatedSheet = { ...selectedSheet };
    if (!updatedSheet.amountReceived) {
      updatedSheet.amountReceived = {};
    }
    if (!updatedSheet.amountReceived[customerId]) {
      updatedSheet.amountReceived[customerId] = { cash: 0, upi: 0, total: 0 };
    }
    
    updatedSheet.amountReceived[customerId][paymentType] = amount;
    
    // Ensure total is always calculated correctly
    const cash = updatedSheet.amountReceived[customerId].cash || 0;
    const upi = updatedSheet.amountReceived[customerId].upi || 0;
    updatedSheet.amountReceived[customerId].total = cash + upi;
    
    setSelectedSheet(updatedSheet);
  };

  const saveSheet = async () => {
    if (!selectedSheet) return;

    // Validate data consistency before saving
    const validationErrors = validateSheetData(selectedSheet);
    if (validationErrors.length > 0) {
      alert(`Cannot save sheet due to validation errors:\n${validationErrors.join('\n')}`);
      return;
    }

    // Ensure this is only updating sheet data, NOT creating invoices/payments/transactions
    // Those are only created when the sheet is CLOSED, not when it's saved during editing
    
    setSaving(true);
    try {
      await updateSheetRecord(selectedSheet.id, {
        deliveryData: selectedSheet.deliveryData,
        amountReceived: selectedSheet.amountReceived,
        notes: selectedSheet.notes,
        updatedAt: new Date()
        // Note: status remains unchanged - only closing the sheet changes status
      });

      // Update local state
      setSheetRecords(prev => 
        prev.map(sheet => 
          sheet.id === selectedSheet.id 
            ? { ...selectedSheet, updatedAt: new Date() }
            : sheet
        )
      );

      setEditMode(false);
      alert('Sheet data saved successfully! Note: Financial records (invoices, payments, transactions) will only be created when the sheet is closed.');
    } catch (error) {
      console.error('Error saving sheet:', error);
      alert('Error saving sheet data. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const validateSheetData = (sheet: SheetRecord): string[] => {
    const errors: string[] = [];
    
    // Validate delivery data
    for (const [customerId, customerData] of Object.entries(sheet.deliveryData)) {
      for (const [productId, data] of Object.entries(customerData)) {
        if (data.quantity < 0) {
          errors.push(`Customer ${customerId}: Negative quantity for product ${productId}`);
        }
        if (data.amount < 0) {
          errors.push(`Customer ${customerId}: Negative amount for product ${productId}`);
        }
        
        // Validate amount calculation
        const customer = sheet.customers.find(c => c.id === customerId);
        const product = products.find(p => p.id === productId);
        if (customer && product) {
          const expectedRate = customer.productPrices[productId] || product.defaultPrice || 0;
          const expectedAmount = data.quantity * expectedRate;
          if (Math.abs(data.amount - expectedAmount) > 0.01) { // Allow for small floating point differences
            errors.push(`Customer ${customerId}: Amount mismatch for product ${productId}. Expected: ${expectedAmount}, Got: ${data.amount}`);
          }
        }
      }
    }
    
    // Validate payment data
    if (sheet.amountReceived) {
      for (const [customerId, paymentData] of Object.entries(sheet.amountReceived)) {
        if (typeof paymentData === 'object') {
          if (paymentData.cash < 0) {
            errors.push(`Customer ${customerId}: Negative cash amount`);
          }
          if (paymentData.upi < 0) {
            errors.push(`Customer ${customerId}: Negative UPI amount`);
          }
          
          // Validate total calculation
          const expectedTotal = (paymentData.cash || 0) + (paymentData.upi || 0);
          if (Math.abs((paymentData.total || 0) - expectedTotal) > 0.01) {
            errors.push(`Customer ${customerId}: Payment total mismatch. Expected: ${expectedTotal}, Got: ${paymentData.total}`);
          }
        }
      }
    }
    
    return errors;
  };

  const handleFillData = (sheet: SheetRecord) => {
    if (sheet.status === 'closed') {
      alert('This sheet is closed and cannot be edited.');
      return;
    }
    // Ensure backwards compatibility - initialize amountReceived if not present
    const sheetWithAmounts = {
      ...sheet,
      amountReceived: sheet.amountReceived ? 
        Object.fromEntries(
          Object.entries(sheet.amountReceived).map(([customerId, amount]) => [
            customerId,
            typeof amount === 'number' 
              ? { cash: 0, upi: 0, total: amount } // Convert old format
              : amount // Keep new format
          ])
        ) : {}
    };
    
    // Refresh customer data to get current outstanding amounts
    refreshCustomerDataForEdit(sheetWithAmounts);
    setEditMode(true);
    setDropdownOpen(null);
  };

  const refreshCustomerDataForEdit = async (sheet: SheetRecord) => {
    try {
      // Get fresh customer data from storage
      const { getCustomers } = await import('../utils/supabase-storage');
      const currentCustomers = await getCustomers();
      
      // Update the sheet's customer data with current outstanding amounts
      const updatedCustomers = sheet.customers.map(sheetCustomer => {
        const currentCustomer = currentCustomers.find(c => c.id === sheetCustomer.id);
        return currentCustomer ? {
          ...sheetCustomer,
          outstandingAmount: currentCustomer.outstandingAmount
        } : sheetCustomer;
      });
      
      setSelectedSheet({
        ...sheet,
        customers: updatedCustomers
      });
    } catch (error) {
      console.error('Error refreshing customer data:', error);
      // Fall back to original sheet data if refresh fails
      setSelectedSheet(sheet);
    }
  };

  const handleDownloadPDF = async (sheet: SheetRecord) => {
    setDropdownOpen(null);
    try {
      await generateRouteSheetPDF(`${sheet.routeId} - ${sheet.routeName}`, sheet.customers, sheet.id, sheet);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  const handlePrintSheet = async (sheet: SheetRecord) => {
    setDropdownOpen(null);
    try {
      await printRouteSheet(`${sheet.routeId} - ${sheet.routeName}`, sheet.customers, sheet.id, sheet);
    } catch (error) {
      console.error('Error opening print dialog:', error);
      alert('Error opening print dialog. Please try again.');
    }
  };

  const handleDeleteSheet = async (sheet: SheetRecord) => {
    setDropdownOpen(null);
    
    if (sheet.status === 'closed') {
      alert('Closed sheets cannot be deleted to maintain data integrity and audit trails.');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the sheet for Route ${sheet.routeName}?`)) {
      return;
    }

    try {
      // Delete from storage
      await deleteSheetRecord(sheet.id);
      
      // Update local state
      setSheetRecords(prev => prev.filter(s => s.id !== sheet.id));
      
      // If this sheet is currently selected, close it
      if (selectedSheet?.id === sheet.id) {
        setSelectedSheet(null);
        setEditMode(false);
      }
      
      alert('Sheet deleted successfully!');
    } catch (error) {
      console.error('Error deleting sheet:', error);
      alert('Error deleting sheet. Please try again.');
    }
  };

  const handleCloseSheetClick = (sheet: SheetRecord) => {
    setSheetToClose(sheet);
    setShowCloseDialog(true);
  };

  const handleCloseConfirm = async (proceed: boolean) => {
    if (!proceed || !sheetToClose) {
      setShowCloseDialog(false);
      setSheetToClose(null);
      return;
    }

    // Validate data before closing
    const validationErrors = validateSheetData(sheetToClose);
    if (validationErrors.length > 0) {
      alert(`Cannot close sheet due to validation errors:\n${validationErrors.join('\n')}`);
      setShowCloseDialog(false);
      setSheetToClose(null);
      return;
    }

    try {
      await closeSheetRecord(sheetToClose.id);
      
      // Refresh the entire data to ensure consistency
      await loadData();
      
      // If this sheet is currently selected, close it since it can't be edited anymore
      if (selectedSheet?.id === sheetToClose.id) {
        setSelectedSheet(null);
        setEditMode(false);
      }
      
      alert('Sheet closed successfully! Customer outstanding amounts have been updated.');
    } catch (error) {
      console.error('Error closing sheet:', error);
      alert(`Error closing sheet: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setShowCloseDialog(false);
      setSheetToClose(null);
    }
  };

  const getCustomerDeliveryTotal = (customerId: string) => {
    if (!selectedSheet?.deliveryData[customerId]) return 0;
    
    return Object.values(selectedSheet.deliveryData[customerId])
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const getNewOutstanding = (customerId: string) => {
    const currentOutstanding = selectedSheet?.customers.find(c => c.id === customerId)?.outstandingAmount || 0;
    const deliveryTotal = getCustomerDeliveryTotal(customerId);
    const receivedAmount = selectedSheet?.amountReceived?.[customerId]?.total || 0;
    
    return currentOutstanding + deliveryTotal - receivedAmount;
  };

  const getSheetGrandTotal = () => {
    if (!selectedSheet) return 0;
    
    return selectedSheet.customers.reduce((total, customer) => {
      return total + getCustomerDeliveryTotal(customer.id);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sheets History</h1>
          <p className="text-gray-600">View and edit your printed route sheets</p>
        </div>
      </div>

      {/* Sheets List */}
      {!selectedSheet && (
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-visible">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Route Sheets History
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by route name, ID, or sheet ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'closed')}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Sheets</option>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sheets history...</p>
            </div>
          ) : sheetRecords.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sheets found</h3>
              <p className="text-gray-600">No route sheets have been generated yet. Generate some route sheets first.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                {(() => {
                  const { currentSheets, totalPages, totalSheets, startIndex, endIndex } = getPaginatedSheets();
                  
                  return (
                    <>
                      <table className="w-full relative">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sheet ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Route
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Customers
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Updated
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentSheets.map((sheet) => (
                    <tr key={sheet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {sheet.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Route {sheet.routeId} - {sheet.routeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {sheet.customers.length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sheet.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sheet.status === 'active' ? 'Active' : 'Closed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          {sheet.createdAt.toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sheet.updatedAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          {sheet.status === 'active' && (
                            <button
                              onClick={() => handleCloseSheetClick(sheet)}
                              className="px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors"
                              title="Close Sheet"
                            >
                              Close
                            </button>
                          )}
                          <div className="relative">
                            <button
                              onClick={(e) => toggleDropdown(sheet.id, e)}
                              className="text-gray-600 hover:text-gray-800 transition-colors p-1 rounded-md hover:bg-gray-100"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          
                          {dropdownOpen === sheet.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                              <div className="py-1">
                                <button
                                  onClick={() => handleViewSheet(sheet)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Eye className="w-4 h-4 mr-3" />
                                  View
                                </button>
                                <button
                                  onClick={() => handleFillData(sheet)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Edit3 className="w-4 h-4 mr-3" />
                                  Fill Data
                                </button>
                                <button
                                  onClick={() => handleDownloadPDF(sheet)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Download className="w-4 h-4 mr-3" />
                                  Download
                                </button>
                                <button
                                  onClick={() => handlePrintSheet(sheet)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                >
                                  <Printer className="w-4 h-4 mr-3" />
                                  Print
                                </button>
                                <hr className="my-1" />
                                <button
                                  onClick={() => handleDeleteSheet(sheet)}
                                  className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                                    sheet.status === 'closed'
                                      ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                                      : 'text-red-600 hover:bg-red-50'
                                  }`}
                                  disabled={sheet.status === 'closed'}
                                  title={sheet.status === 'closed' ? 'Closed sheets cannot be deleted' : 'Delete sheet'}
                                >
                                  <Trash2 className="w-4 h-4 mr-3" />
                                  Delete {sheet.status === 'closed' ? '(Not Allowed)' : ''}
                                </button>
                              </div>
                            </div>
                          )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                        </tbody>
                      </table>
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                          <div className="text-sm text-gray-700">
                            Showing {startIndex + 1} to {endIndex} of {totalSheets} sheets
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                                      currentPage === pageNum
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sheet Detail/Edit View */}
      {selectedSheet && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              {editMode ? 'Edit' : 'View'} Sheet: Route {selectedSheet.routeId} - {selectedSheet.routeName}
            </h2>
            <div className="flex space-x-2">
              {editMode ? (
                <>
                  <button
                    onClick={saveSheet}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setEditMode(false)}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Sheet
                  </button>
                  <button
                    onClick={handleCloseSheet}
                    className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Close
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sheet Summary */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Sheet ID</p>
                <p className="font-medium">{selectedSheet.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="font-medium">{selectedSheet.customers.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Delivery Value</p>
                <p className="font-medium text-green-600">₹{getSheetGrandTotal().toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">{selectedSheet.updatedAt.toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Customer Data Table */}
          <div className="overflow-x-auto">
            {(() => {
              const { currentCustomers, totalCustomerPages, customerStartIndex, customerEndIndex } = getCustomerPagination();
              
              return (
                <>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          S.No
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        {getFixedProducts().map((product) => (
                          <React.Fragment key={product.id}>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {product.name.replace('ML', '')} Qty
                            </th>
                            <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Rate
                            </th>
                          </React.Fragment>
                        ))}
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Outstanding
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cash
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          UPI
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Received
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentCustomers.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customerStartIndex + index + 1}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.id}</div>
                      </div>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.phone}
                    </td>
                    {getFixedProducts().map((product) => {
                      const deliveryData = selectedSheet.deliveryData[customer.id]?.[product.id];
                      const rate = customer.productPrices[product.id] || product.defaultPrice || 0;
                      
                      return (
                        <React.Fragment key={product.id}>
                          <td className="px-2 py-4 whitespace-nowrap">
                            {editMode ? (
                              <input
                                type="number"
                                min="0"
                                value={deliveryData?.quantity || 0}
                                onChange={(e) => updateDeliveryQuantity(customer.id, product.id, parseInt(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            ) : (
                              <span className="text-sm text-gray-900">
                                {deliveryData?.quantity || 0}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-600">
                            ₹{rate}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div>
                        <div className="text-sm font-medium text-gray-900">₹{Math.abs(customer.outstandingAmount).toLocaleString()}</div>
                        {editMode && (
                          <div className="text-xs text-blue-600">After close: ₹{Math.abs(getNewOutstanding(customer.id)).toLocaleString()}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₹{getCustomerDeliveryTotal(customer.id).toLocaleString()}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {editMode ? (
                        <input
                          type="number"
                          min="0"
                          value={selectedSheet.amountReceived?.[customer.id]?.cash || 0}
                          onChange={(e) => updateAmountReceived(customer.id, 'cash', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          ₹{selectedSheet.amountReceived?.[customer.id]?.cash || 0}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {editMode ? (
                        <input
                          type="number"
                          min="0"
                          value={selectedSheet.amountReceived?.[customer.id]?.upi || 0}
                          onChange={(e) => updateAmountReceived(customer.id, 'upi', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          ₹{selectedSheet.amountReceived?.[customer.id]?.upi || 0}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      ₹{(selectedSheet.amountReceived?.[customer.id]?.total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                    </tbody>
                  </table>
                  
                  {/* Customer Pagination */}
                  {totalCustomerPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-lg">
                      <div className="text-sm text-gray-700">
                        Showing {customerStartIndex + 1} to {Math.min(customerEndIndex, selectedSheet.customers.length)} of {selectedSheet.customers.length} customers
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCustomerCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={customerCurrentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        
                        <div className="flex items-center space-x-1">
                          {Array.from({ length: Math.min(5, totalCustomerPages) }, (_, i) => {
                            let pageNum;
                            if (totalCustomerPages <= 5) {
                              pageNum = i + 1;
                            } else if (customerCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (customerCurrentPage >= totalCustomerPages - 2) {
                              pageNum = totalCustomerPages - 4 + i;
                            } else {
                              pageNum = customerCurrentPage - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCustomerCurrentPage(pageNum)}
                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                  customerCurrentPage === pageNum
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCustomerCurrentPage(prev => Math.min(prev + 1, totalCustomerPages))}
                          disabled={customerCurrentPage === totalCustomerPages}
                          className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Notes Section */}
          <div className="px-6 py-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            {editMode ? (
              <textarea
                value={selectedSheet.notes}
                onChange={(e) => updateNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any notes about this delivery..."
              />
            ) : (
              <div className="px-3 py-2 bg-gray-50 rounded-md min-h-[80px]">
                {selectedSheet.notes || <span className="text-gray-500 italic">No notes</span>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Close Sheet Confirmation Dialog */}
      {showCloseDialog && sheetToClose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Close Route Sheet
                </h3>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to close the sheet for <strong>{sheetToClose.routeName}</strong>? 
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>⚠️ IMPORTANT:</strong> This action will create financial records and cannot be undone.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                This action will:
              </p>
              <ul className="text-sm text-gray-600 mt-1 ml-4 list-disc">
                <li><strong>Create invoices</strong> for all customer purchases</li>
                <li><strong>Create payment records</strong> for all amounts received</li>
                <li><strong>Create transaction history</strong> entries</li>
                <li><strong>Update customer outstanding amounts</strong> based on deliveries and payments</li>
                <li>Prevent further editing of this sheet</li>
                <li>Allow creation of new sheets for this route</li>
              </ul>
              <p className="text-sm text-red-600 mt-2 font-medium">
                ⚠️ Financial records (invoices, payments, transactions) are ONLY created when sheets are closed, not during editing.
              </p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => handleCloseConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCloseConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};