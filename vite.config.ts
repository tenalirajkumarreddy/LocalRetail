import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('lucide-react')) {
              return 'ui-vendor';
            }
            if (id.includes('date-fns')) {
              return 'utils-vendor';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase-vendor';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-vendor';
            }
            // Other vendor libraries
            return 'vendor';
          }
          
          // Component chunks
          if (id.includes('/src/components/')) {
            if (id.includes('Dashboard') || id.includes('Layout') || id.includes('ConnectionStatus') || id.includes('StatusIndicator')) {
              return 'components-core';
            }
            if (id.includes('Customers') || id.includes('Products') || id.includes('Invoices') || id.includes('Payments')) {
              return 'components-data';
            }
            if (id.includes('Route') || id.includes('Sheets')) {
              return 'components-routes';
            }
            if (id.includes('Settings')) {
              return 'components-settings';
            }
            // Other components
            return 'components-other';
          }
        }
      }
    },
    // Increase chunk size warning limit to reduce noise
    chunkSizeWarningLimit: 600
  }
});
