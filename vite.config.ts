import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['@supabase/supabase-js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Simplified vendor chunks to avoid initialization issues
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-vendor';
            }
            // Keep Supabase with other vendor libraries to avoid initialization conflicts
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
