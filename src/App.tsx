import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { RouteSheets } from './components/RouteSheets';
import { Customers } from './components/Customers';
import { Invoices } from './components/Invoices';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'routes':
        return <RouteSheets />;
      case 'customers':
        return <Customers />;
      case 'invoices':
        return <Invoices />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;