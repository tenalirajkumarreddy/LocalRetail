// Core types for the sales management system
export interface Customer {
  id: string; // 6-digit unique ID
  name: string;
  phone: string;
  route: string;
  openingBalance: number;
  outstandingAmount: number;
  productPrices: {
    product1: number;
    product2: number;
    product3: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  type: 'sale' | 'payment' | 'adjustment';
  items: InvoiceItem[];
  totalAmount: number;
  amountReceived: number;
  balanceChange: number;
  date: Date;
  invoiceNumber: string;
}

export interface InvoiceItem {
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  totalAmount: number;
  amountReceived: number;
  balanceChange: number;
  date: Date;
  status: 'paid' | 'partial' | 'pending';
}

export interface RouteSheet {
  route: string;
  customers: Customer[];
  generatedAt: Date;
}