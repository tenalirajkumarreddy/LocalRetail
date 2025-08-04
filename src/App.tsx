import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { RouteSheets } from './components/RouteSheets';
import { RouteManagement } from './components/RouteManagement';
import { Customers } from './components/Customers';
import { Invoices } from './components/Invoices';
import { Products } from './components/Products';
import { Settings } from './components/Settings';
import { autoBackupService } from './utils/auto-backup';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Start auto backup service on app load
  useEffect(() => {
    autoBackupService.start();

    // Cleanup on unmount
    return () => {
      autoBackupService.stop();
    };
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'routes':
        return <RouteSheets />;
      case 'route-management':
        return <RouteManagement />;
      case 'customers':
        return <Customers />;
      case 'invoices':
        return <Invoices />;
      case 'products':
        return <Products />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;