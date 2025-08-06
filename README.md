# LocalRetail - Sales Management System

A comprehensive sales management system designed for local retail businesses, distributors, and route-based sales operations.

## Features

- **Customer Management**: Route-based customer organization with custom pricing
- **Invoice Generation**: Multi-item invoices with automatic calculations
- **Product Catalog**: Flexible product management with customer-specific pricing
- **Route Sheets**: PDF generation for field agents with unique ID format (ROUTE-YYYYMMDD-ROUTECODE)
- **Route Management**: Organize delivery routes by areas and pincodes
- **Transaction Tracking**: Complete sales, payment, and adjustment history
- **Dashboard Analytics**: Business overview and key metrics
- **Responsive Design**: Works on desktop, tablet, and mobile devices with hamburger menu

## Sheet ID Format

Route sheets use a unique identifier format: `ROUTE-<DATE>-<ROUTECODE>`

Examples:
- `ROUTE-20250105-A` - Route A sheet created on January 5, 2025
- `ROUTE-20250105-B` - Route B sheet created on January 5, 2025

This ensures:
- One sheet per route per day
- Easy identification and sorting
- Prevents duplicate sheets for the same route/date combination

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **PDF Generation**: jsPDF + html2canvas
- **Database**: Supabase (with localStorage fallback)
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/tenalirajkumarreddy/LocalRetail.git
   cd LocalRetail
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   - Supabase credentials (see [Supabase Setup Guide](SUPABASE_SETUP.md))

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5176 in your browser

## Integration Setup

### 1. Supabase Database (Recommended for Production)
- Cloud-based PostgreSQL database
- Real-time synchronization
- Scalable and secure
- See [Supabase Setup Guide](SUPABASE_SETUP.md) for detailed instructions

### 2. Local Storage (Development/Demo)
- Browser-based storage
- No external dependencies
- Automatically used as fallback

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx   # Main dashboard
│   ├── Customers.tsx   # Customer management
│   ├── Invoices.tsx    # Invoice creation/management
│   ├── Products.tsx    # Product catalog
│   ├── RouteSheets.tsx # Route sheet generation
│   ├── Settings.tsx    # Company settings
│   └── Layout.tsx      # Navigation layout
├── lib/
│   └── supabase.ts     # Supabase client configuration
├── types/
│   └── index.ts        # TypeScript type definitions
├── utils/
│   ├── storage.ts      # localStorage utilities
│   ├── supabase-storage.ts # Supabase storage utilities
│   └── pdf.ts          # PDF generation utilities
└── main.tsx            # Application entry point
```

## Usage

### Customer Management
1. Navigate to "Customers" in the sidebar
2. Add customers with route information and custom pricing
3. Search and filter customers by name, phone, or route

### Creating Invoices
1. Go to "Invoices" and click "Create Invoice"
2. Search for customer by ID, name, or phone
3. Add products and quantities
4. Process payment and generate PDF

### Route Sheets
1. Navigate to "Route Sheets"
2. Select a route or generate for all routes
3. Download PDF for field agents

### Products
1. Manage your product catalog in "Products"
2. Set default prices and update as needed
3. Prices can be customized per customer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For support and questions:
- Create an issue on GitHub
- Check the [Supabase Setup Guide](SUPABASE_SETUP.md) for database-related questions
