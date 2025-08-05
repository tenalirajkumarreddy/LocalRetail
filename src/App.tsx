import { useState, useEffect, Suspense, lazy } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { autoBackupService } from './utils/auto-backup';
import { DataProvider } from './contexts/DataContext';

// Lazy load components that are not immediately needed
const RouteSheets = lazy(() => import('./components/RouteSheets').then(module => ({ default: module.RouteSheets })));
const SheetsHistory = lazy(() => import('./components/SheetsHistory').then(module => ({ default: module.SheetsHistory })));
const RouteManagement = lazy(() => import('./components/RouteManagement').then(module => ({ default: module.RouteManagement })));
const Customers = lazy(() => import('./components/Customers').then(module => ({ default: module.Customers })));
const Payments = lazy(() => import('./components/Payments').then(module => ({ default: module.Payments })));
const Invoices = lazy(() => import('./components/Invoices').then(module => ({ default: module.Invoices })));
const Products = lazy(() => import('./components/Products').then(module => ({ default: module.Products })));
const Settings = lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

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
    const PageComponent = () => {
      switch (currentPage) {
        case 'dashboard':
          return <Dashboard onPageChange={setCurrentPage} />;
        case 'routes':
          return <RouteSheets onPageChange={setCurrentPage} />;
        case 'sheets-history':
          return <SheetsHistory />;
        case 'route-management':
          return <RouteManagement />;
        case 'customers':
          return <Customers />;
        case 'payments':
          return <Payments />;
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

    // For dashboard, render directly (no lazy loading for immediate page)
    if (currentPage === 'dashboard') {
      return <Dashboard onPageChange={setCurrentPage} />;
    }

    // For other pages, wrap in Suspense
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <PageComponent />
      </Suspense>
    );
  };

  return (
    <DataProvider>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>
    </DataProvider>
  );
}

export default App;