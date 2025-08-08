# Complete AI Prompt for LocalRetail System Recreation

## Project Overview
Create a complete **LocalRetail - Offline Sales Management System** using React + TypeScript + Vite + Tailwind CSS. This is a route-based sales management application for retail distribution companies.

## Tech Stack Requirements
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with responsive design
- **Icons**: Lucide React
- **Database**: Supabase (with localStorage fallback)
- **State Management**: React Context API + useState
- **Forms**: React Hook Form + Yup validation
- **PDF Generation**: jsPDF + html2canvas
- **Routing**: Single Page Application with state-based navigation

## Project Structure
```
src/
├── components/
│   ├── Dashboard.tsx
│   ├── Layout.tsx
│   ├── Customers.tsx
│   ├── Invoices.tsx
│   ├── Payments.tsx
│   ├── Products.tsx
│   ├── RouteSheets.tsx
│   ├── RouteManagement.tsx
│   ├── SheetsHistory.tsx
│   ├── Settings.tsx
│   └── StatusIndicator.tsx
├── contexts/
│   └── DataContext.tsx
├── types/
│   └── index.ts
├── utils/
│   ├── storage.ts
│   ├── pdf.ts
│   └── auto-backup.ts
├── lib/
│   └── supabase.ts
├── App.tsx
├── main.tsx
└── index.css
```

## 1. MAIN APPLICATION STRUCTURE

### App.tsx Implementation
```typescript
import { useState, useEffect, Suspense, lazy } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { autoBackupService } from './utils/auto-backup';
import { DataProvider } from './contexts/DataContext';

// Lazy load components for performance
const RouteSheets = lazy(() => import('./components/RouteSheets').then(module => ({ default: module.RouteSheets })));
const SheetsHistory = lazy(() => import('./components/SheetsHistory').then(module => ({ default: module.SheetsHistory })));
const RouteManagement = lazy(() => import('./components/RouteManagement').then(module => ({ default: module.RouteManagement })));
const Customers = lazy(() => import('./components/Customers').then(module => ({ default: module.Customers })));
const Payments = lazy(() => import('./components/Payments').then(module => ({ default: module.Payments })));
const Invoices = lazy(() => import('./components/Invoices').then(module => ({ default: module.Invoices })));
const Products = lazy(() => import('./components/Products').then(module => ({ default: module.Products })));
const Settings = lazy(() => import('./components/Settings').then(module => ({ default: module.Settings })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Loading...</span>
  </div>
);

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    autoBackupService.start();
    return () => autoBackupService.stop();
  }, []);

  const renderPage = () => {
    if (currentPage === 'dashboard') {
      return <Dashboard onPageChange={setCurrentPage} />;
    }

    const PageComponent = () => {
      switch (currentPage) {
        case 'routes': return <RouteSheets onPageChange={setCurrentPage} />;
        case 'sheets-history': return <SheetsHistory />;
        case 'route-management': return <RouteManagement />;
        case 'customers': return <Customers onPageChange={setCurrentPage} />;
        case 'payments': return <Payments />;
        case 'invoices': return <Invoices />;
        case 'products': return <Products />;
        case 'settings': return <Settings />;
        default: return <Dashboard onPageChange={setCurrentPage} />;
      }
    };

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
```

## 2. LAYOUT COMPONENT

### Layout.tsx Implementation
Create a mobile-first layout with hamburger menu navigation:

**Features Required:**
- Hidden sidebar by default on all screen sizes
- Hamburger menu in header to open sidebar
- Full-screen overlay when sidebar is open
- Responsive design with touch-friendly navigation
- Status indicator in header

**Navigation Items (exact order):**
1. Dashboard (Home icon)
2. Route Sheets (Route icon)
3. Sheets History (History icon)
4. Route Management (MapPin icon)
5. Customers (Users icon)
6. Payments (CreditCard icon)
7. Invoices (FileText icon)
8. Products (Package icon)
9. Settings (Settings icon)

**Header Structure:**
- Left: Hamburger menu button
- Center: Current page title (dynamic)
- Right: StatusIndicator component

**Sidebar Behavior:**
- Slide in from left as overlay (not push)
- Dark background overlay (clickable to close)
- White sidebar (w-64) with navigation list
- Active page highlighted with blue background + right border
- Click navigation item: close sidebar + change page

## 3. DASHBOARD COMPONENT

### Dashboard.tsx Implementation

**Stats Cards Grid (4 cards, responsive):**
1. **Total Customers** - Blue theme, Users icon, show count from data
2. **Active Routes** - Green theme, Route icon, show count from data
3. **Total Invoices** - Purple theme, FileText icon, show count from data
4. **Outstanding Amount** - Red/Green theme, IndianRupee icon, calculated from customer balances

**Connection Status Banner:**
- Compact status bar showing database connection
- Green = Connected, Red = Error, Yellow = Testing
- Show "Supabase Database" or "Local Storage"
- Retry button for failed connections

**Quick Actions Grid (6 buttons, responsive):**
1. **Add Customer** (Blue) → onPageChange('customers')
2. **Create Invoice** (Green) → onPageChange('invoices')
3. **Route Sheets** (Purple) → onPageChange('routes')
4. **Add Product** (Orange) → onPageChange('products')
5. **Test Connection** (Gray) → Test database connectivity
6. **Settings** (Indigo) → onPageChange('settings')

**Recent Transactions Table:**
- Show last 5 transactions from context data
- Columns: Date, Customer, Type (Sale/Payment), Amount
- Color-coded amounts (red for debit, green for credit)
- Empty state: "No transactions yet"

**Data Integration:**
- Use DataContext for all data (customers, invoices, transactions, routes)
- Calculate stats dynamically
- Format currency as ₹1,23,456 (Indian format)

## 4. DATA MANAGEMENT SYSTEM

### DataContext.tsx Implementation

**State Structure:**
```typescript
interface DataState {
  customers: Customer[];
  invoices: Invoice[];
  transactions: Transaction[];
  routes: Route[];
  products: Product[];
  loading: boolean;
  error: string | null;
}
```

**Data Types Required:**

**Customer:**
```typescript
interface Customer {
  customer_id: string;
  customer_code: string;
  customer_name: string;
  business_name?: string;
  phone_primary: string;
  phone_secondary?: string;
  email?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  route_id?: string;
  customer_type: 'retail' | 'wholesale' | 'distributor';
  credit_limit: number;
  payment_terms: number;
  outstandingAmount: number;
  is_active: boolean;
  created_at: string;
  notes?: string;
}
```

**Invoice:**
```typescript
interface Invoice {
  invoice_id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  invoice_date: string;
  due_date: string;
  items: InvoiceItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue';
  invoice_status: 'draft' | 'sent' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
}

interface InvoiceItem {
  item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_rate: number;
  line_total: number;
}
```

**Transaction:**
```typescript
interface Transaction {
  id: string;
  customer_id: string;
  customerName: string;
  date: string;
  type: 'sale' | 'payment' | 'adjustment';
  amount: number;
  balanceChange: number;
  reference_id?: string;
  notes?: string;
}
```

**Route:**
```typescript
interface Route {
  route_id: string;
  route_code: string;
  route_name: string;
  description?: string;
  assigned_representative?: string;
  coverage_areas: string[];
  is_active: boolean;
  created_at: string;
}
```

**Product:**
```typescript
interface Product {
  product_id: string;
  product_code: string;
  product_name: string;
  description?: string;
  category: string;
  unit_of_measure: string;
  base_price: number;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
}
```

**CRUD Operations Required:**
- addCustomer, updateCustomer, deleteCustomer
- addInvoice, updateInvoice, deleteInvoice
- addPayment, updatePayment
- addProduct, updateProduct, deleteProduct
- addRoute, updateRoute, deleteRoute

**Storage Strategy:**
- Primary: Supabase database integration
- Fallback: localStorage for offline functionality
- Auto-sync when connection restored

## 5. COMPONENT SPECIFICATIONS

### Customer Management (Customers.tsx)
**Features:**
- Customer list with search and filtering
- Add/Edit customer modal with form validation
- Customer detail view with transaction history
- Route assignment dropdown
- Export customer list to Excel/PDF

**Form Fields:**
- Customer Name* (required)
- Business Name
- Primary Phone* (required)
- Secondary Phone
- Email
- Address Line 1* (required)
- Address Line 2
- City*, State*, Pincode* (required)
- Customer Type (retail/wholesale/distributor)
- Credit Limit
- Payment Terms (days)
- Route Assignment
- Notes

### Invoice Management (Invoices.tsx)
**Features:**
- Invoice list with search and status filtering
- Create/Edit invoice with line items
- PDF generation and download
- Email invoice functionality
- Payment tracking against invoices

**Invoice Creation Flow:**
1. Select customer
2. Add products (with search and quantity)
3. Apply discounts (line-level and total)
4. Auto-calculate taxes (18% GST)
5. Generate invoice number automatically
6. Save as draft or finalize
7. Generate PDF

### Payment Management (Payments.tsx)
**Features:**
- Payment entry against invoices
- Multiple payment methods (Cash, Check, UPI, Card, Bank Transfer)
- Outstanding balance tracking
- Payment history and reporting
- Bulk payment allocation

### Product Management (Products.tsx)
**Features:**
- Product catalog with categories
- Add/Edit products with pricing
- Search and filter by category
- Bulk import from Excel
- Product usage analytics

### Route Management (RouteSheets.tsx & RouteManagement.tsx)
**Features:**
- Create and manage sales routes
- Assign customers to routes
- Generate daily route sheets
- Track route completion
- Route performance analytics

### Settings (Settings.tsx)
**Features:**
- Company information setup
- Tax configuration
- Invoice template customization
- Backup and restore data
- Database connection settings

## 6. STYLING REQUIREMENTS

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    }
  },
  plugins: []
}
```

### Design System
- **Background**: Gray-50 (#f9fafb)
- **Cards**: White with shadow and rounded borders
- **Primary Color**: Blue-600 (#2563eb)
- **Success**: Green-600 (#16a34a)
- **Warning**: Yellow-500 (#eab308)
- **Danger**: Red-600 (#dc2626)
- **Typography**: Inter font family
- **Spacing**: Consistent 4px grid system

### Responsive Breakpoints
- **Mobile**: < 640px (stack cards, full-width)
- **Tablet**: 640px - 1024px (2-column layout)
- **Desktop**: > 1024px (multi-column layout)

## 7. FUNCTIONALITY REQUIREMENTS

### Offline Capability
- Work without internet connection
- Store data in localStorage
- Sync with Supabase when online
- Conflict resolution for concurrent edits
- Background sync service

### PDF Generation
- Professional invoice templates
- Company branding and logo
- Item-wise details with taxes
- Terms and conditions
- Download and email capability

### Data Validation
- Form validation using Yup schemas
- Required field validation
- Email and phone format validation
- Numeric range validation
- Duplicate prevention

### Search and Filtering
- Global search across entities
- Advanced filtering options
- Sort by multiple columns
- Pagination for large datasets
- Export filtered results

### Reporting
- Sales summary by date range
- Customer-wise sales analysis
- Product performance reports
- Outstanding receivables aging
- Route performance metrics

## 8. TECHNICAL IMPLEMENTATION DETAILS

### Package.json Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "lucide-react": "^0.263.1",
    "react-hook-form": "^7.45.4",
    "@hookform/resolvers": "^3.3.1",
    "yup": "^1.3.2",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.2",
    "vite": "^4.4.5"
  }
}
```

### Environment Variables
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_APP_NAME=LocalRetail
VITE_APP_VERSION=1.0.0
```

### Vite Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true
  }
})
```

## 9. DATABASE SCHEMA (Supabase)

### Tables Required
- **customers** - Customer master data
- **products** - Product catalog
- **invoices** - Invoice headers
- **invoice_items** - Invoice line items
- **payments** - Payment transactions
- **routes** - Sales route definitions
- **route_sheets** - Daily route planning

### Key Relationships
- customers.route_id → routes.route_id
- invoices.customer_id → customers.customer_id
- invoice_items.invoice_id → invoices.invoice_id
- payments.customer_id → customers.customer_id
- payments.invoice_id → invoices.invoice_id

## 10. IMPLEMENTATION PRIORITY

### Phase 1 (Core Foundation)
1. Setup project structure with Vite + React + TypeScript
2. Implement Layout component with navigation
3. Create Dashboard with basic stats
4. Setup DataContext with localStorage
5. Implement Customer management (CRUD)

### Phase 2 (Business Logic)
1. Product management system
2. Invoice creation and management
3. Payment tracking system
4. PDF generation for invoices
5. Basic reporting features

### Phase 3 (Advanced Features)
1. Route management and planning
2. Supabase integration with sync
3. Advanced reporting and analytics
4. Offline capability enhancement
5. Data export/import features

### Phase 4 (Polish & Optimization)
1. Performance optimization
2. Advanced search and filtering
3. Email integration
4. Mobile app optimization
5. Advanced customization options

## 11. COMPLETE USER WORKFLOWS AND SYSTEM CHANGES

### User Role: Admin (Primary User)

### A. USER MANAGEMENT WORKFLOW
**Flow**: Admin creates and manages users
**Actions & System Changes:**

1. **Create New User**
   - Admin → Settings → User Management → Add User
   - Enter: Name, Email, Phone, Role (Admin/Sales Rep), Route Assignment
   - System Changes: 
     - Creates user record in `users` table
     - Generates login credentials
     - Assigns default permissions based on role
     - Logs action in audit trail

2. **Assign Routes to Users**
   - Admin → Route Management → Select Route → Assign Representative
   - System Changes:
     - Updates `routes.assigned_representative`
     - Creates user-route mapping
     - Restricts route sheet access to assigned user

### B. PRODUCT MANAGEMENT WORKFLOW
**Flow**: Admin manages product catalog
**Actions & System Changes:**

1. **Add New Product**
   - Admin → Products → Add Product Button
   - Enter: Product Code, Name, Category, Price, Tax Rate, Unit of Measure
   - System Changes:
     - Creates record in `products` table
     - Generates unique product_code if not provided
     - Sets is_active = true
     - Logs creation timestamp and admin user

2. **Update Product Details**
   - Admin → Products → Select Product → Edit
   - Modify: Price, Description, Category, Status
   - System Changes:
     - Updates product record
     - Maintains price history for existing invoices
     - Logs modification with timestamp

3. **Bulk Import Products**
   - Admin → Products → Import → Upload Excel/CSV
   - System Changes:
     - Validates data format
     - Creates multiple product records
     - Generates import report with success/failure details

### C. CUSTOMER & ROUTE ASSIGNMENT WORKFLOW
**Flow**: Admin manages customers and assigns to routes
**Actions & System Changes:**

1. **Add Customer**
   - Admin → Customers → Add Customer
   - Enter: Name, Business, Phone, Address, Customer Type, Credit Limit
   - System Changes:
     - Creates record in `customers` table
     - Generates unique customer_code
     - Sets outstandingAmount = 0
     - Creates customer transaction history entry

2. **Assign Customer to Route**
   - Admin → Customers → Select Customer → Edit → Route Assignment
   - OR Admin → Route Management → Select Route → Assign Customers
   - System Changes:
     - Updates `customers.route_id`
     - Recalculates route statistics
     - Updates route planning data

3. **Bulk Route Assignment**
   - Admin → Route Management → Bulk Assign → Select Multiple Customers
   - System Changes:
     - Updates multiple customer records
     - Optimizes route coverage
     - Generates assignment report

### D. ROUTE SHEET GENERATION & MANAGEMENT WORKFLOW
**Flow**: Daily route planning and execution
**Actions & System Changes:**

1. **Generate Daily Route Sheet**
   - Admin/Sales Rep → Route Sheets → Create New Sheet
   - Select: Route, Date, Customers to Visit
   - System Changes:
     - Creates record in `route_sheets` table
     - Status = 'planned'
     - Generates sheet_number (auto-increment)
     - Calculates planned_customers count
     - Links customers to sheet

2. **Start Route Execution**
   - Sales Rep → Route Sheets → Select Sheet → Start Route
   - System Changes:
     - Updates `route_sheets.status` = 'in_progress'
     - Sets `start_time` = current timestamp
     - Creates route execution log

3. **Update Customer Visit Status**
   - Sales Rep → Route Sheet → Customer List → Mark as Visited/Skipped
   - Enter: Visit Notes, Order Details, Payment Collected
   - System Changes:
     - Updates customer visit status in route sheet
     - Creates visit log entry
     - If order taken: creates draft invoice
     - If payment collected: creates payment record

4. **Record Sales During Route**
   - Sales Rep → Route Sheet → Customer → Take Order
   - Select Products, Enter Quantities, Apply Discounts
   - System Changes:
     - Creates `invoices` record with status = 'draft'
     - Creates `invoice_items` for each product
     - Calculates totals and taxes
     - Updates customer outstanding balance
     - Creates transaction record

5. **Collect Payments During Route**
   - Sales Rep → Route Sheet → Customer → Collect Payment
   - Enter: Amount, Payment Method, Reference
   - System Changes:
     - Creates `payments` record
     - Updates `customers.outstandingAmount`
     - Links payment to specific invoices if applicable
     - Creates transaction record
     - Updates route sheet total_sales

6. **Complete Route Sheet**
   - Sales Rep → Route Sheet → Close Route
   - System Changes:
     - Updates `route_sheets.status` = 'completed'
     - Sets `end_time` = current timestamp
     - Calculates final statistics (completed_customers, total_sales)
     - Finalizes all draft invoices created during route
     - Generates route completion report

7. **Download Route Sheet Report**
   - Admin/Sales Rep → Route Sheets → Completed Sheet → Download
   - System Changes:
     - Generates PDF with visit summary
     - Includes sales details, payments collected
     - Customer-wise order summary
     - Route performance metrics

### E. INVOICE MANAGEMENT WORKFLOW
**Flow**: Invoice creation, modification, and processing
**Actions & System Changes:**

1. **Create Manual Invoice**
   - Admin → Invoices → Create Invoice
   - Select Customer → Add Products → Set Quantities
   - System Changes:
     - Creates `invoices` record with auto-generated invoice_number
     - Creates `invoice_items` for each product
     - Calculates subtotal, tax_amount, total_amount
     - Updates `customers.outstandingAmount`
     - Creates transaction record

2. **Generate Invoice PDF**
   - User → Invoices → Select Invoice → Generate PDF
   - System Changes:
     - Creates professional PDF with company branding
     - Includes itemized details, taxes, terms
     - Updates invoice status if first PDF generation
     - Logs PDF generation activity

3. **Send Invoice to Customer**
   - User → Invoices → Select Invoice → Send Email
   - System Changes:
     - Updates `invoices.invoice_status` = 'sent'
     - Logs email sent timestamp
     - Creates communication history record

4. **Modify Draft Invoice**
   - User → Invoices → Select Draft Invoice → Edit
   - Add/Remove Items, Change Quantities, Apply Discounts
   - System Changes:
     - Updates invoice_items
     - Recalculates totals
     - Maintains audit trail of changes
     - Updates customer outstanding if totals changed

5. **Cancel Invoice**
   - Admin → Invoices → Select Invoice → Cancel
   - Enter Cancellation Reason
   - System Changes:
     - Updates `invoices.invoice_status` = 'cancelled'
     - Reverses outstanding amount changes
     - Creates reversal transaction
     - Maintains cancelled invoice for audit

### F. PAYMENT PROCESSING WORKFLOW
**Flow**: Payment collection and allocation
**Actions & System Changes:**

1. **Record Customer Payment**
   - User → Payments → Add Payment
   - Select Customer, Enter Amount, Payment Method
   - System Changes:
     - Creates `payments` record
     - Auto-allocates to oldest outstanding invoices
     - Updates `invoices.paid_amount` and `outstanding_amount`
     - Updates `customers.outstandingAmount`
     - Creates transaction record

2. **Allocate Payment to Specific Invoices**
   - User → Payments → Select Payment → Allocate
   - Choose invoices and allocation amounts
   - System Changes:
     - Creates payment allocation records
     - Updates specific invoice balances
     - Recalculates customer outstanding
     - Updates payment status (partial/full)

3. **Record Advance Payment**
   - User → Payments → Add Payment (no invoice selected)
   - System Changes:
     - Creates payment record with no invoice link
     - Creates customer credit balance
     - Available for future invoice allocation

### G. REPORTING & ANALYTICS WORKFLOW
**Flow**: Generate business insights and reports
**Actions & System Changes:**

1. **Daily Sales Report**
   - User → Reports → Daily Sales → Select Date
   - System Changes:
     - Queries all invoices for selected date
     - Calculates totals by route, customer, product
     - Generates summary statistics
     - Exports to PDF/Excel

2. **Outstanding Receivables Report**
   - User → Reports → Outstanding → Select Aging Period
   - System Changes:
     - Queries all unpaid invoices
     - Calculates aging buckets (0-30, 31-60, 60+ days)
     - Ranks customers by outstanding amount
     - Highlights overdue accounts

3. **Route Performance Analysis**
   - User → Reports → Route Performance → Select Date Range
   - System Changes:
     - Analyzes route completion rates
     - Calculates average sales per route
     - Compares sales rep performance
     - Identifies optimization opportunities

### H. DATA SYNCHRONIZATION WORKFLOW
**Flow**: Offline/Online data sync
**Actions & System Changes:**

1. **Offline Mode Operations**
   - User works without internet connection
   - System Changes:
     - All data stored in localStorage
     - Operations marked with sync_pending flag
     - Queue maintains operation order
     - Conflict detection enabled

2. **Online Sync Process**
   - Connection restored → Auto-sync triggered
   - System Changes:
     - Uploads pending operations to Supabase
     - Downloads server changes
     - Resolves conflicts (server wins by default)
     - Updates local data with server state
     - Logs sync completion

### I. SYSTEM AUDIT & TRACKING
**Flow**: Comprehensive activity logging
**System Changes for ALL Operations:**

1. **Transaction Logging**
   - Every financial operation creates transaction record
   - Fields: type, amount, balanceChange, reference_id
   - Maintains complete audit trail

2. **User Activity Logging**
   - All user actions logged with timestamp
   - Track: login/logout, data modifications, report generation
   - Maintains session history

3. **Data Change Tracking**
   - Before/after values for all modifications
   - User identification for every change
   - Rollback capability for critical operations

### J. COMPLETE BUSINESS FLOW EXAMPLE
**Scenario**: Daily Sales Route Execution

1. **Morning Setup**
   - Admin generates route sheet for "Route A" with 10 customers
   - Sales rep receives route sheet on mobile device

2. **Route Execution**
   - Sales rep starts route → status becomes 'in_progress'
   - Visits Customer 1 → takes order for 5 products → creates draft invoice
   - Collects partial payment → creates payment record → updates customer balance
   - Visits Customer 2 → no order → marks as 'visited, no sale'
   - Continues through route...

3. **End of Day**
   - Sales rep completes route → status becomes 'completed'
   - All draft invoices automatically finalized
   - Route sheet PDF generated with complete summary
   - Customer outstanding balances updated across system
   - Transaction history populated for all activities

4. **Admin Review**
   - Admin reviews completed route performance
   - Analyzes sales vs targets
   - Identifies customers needing follow-up
   - Plans next day routes based on results

This comprehensive workflow ensures every user action has defined system responses and maintains complete business logic integrity throughout the application.

## FINAL NOTES

- **Code Quality**: Use TypeScript strictly, implement proper error handling
- **Performance**: Lazy load components, optimize re-renders
- **UX/UI**: Mobile-first responsive design, consistent styling
- **Data Integrity**: Implement proper validation and error handling
- **Testing**: Include unit tests for critical components
- **Documentation**: Add inline comments and README

Create this as a complete, production-ready application that can handle real-world sales management for small to medium retail distribution businesses.
