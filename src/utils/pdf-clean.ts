import jsPDF from 'jspdf';
import { Customer, Product, CompanySettings } from '../types';
import { format } from 'date-fns';
import { getProducts, getCompanySettings } from './storage';

// Generate route sheet for printing - uses professional layout only
export const printRouteSheet = async (route: string, customers: Customer[]): Promise<void> => {
  const companySettings = await getCompanySettings();
  await printWithProfessionalLayout(route, customers, companySettings);
};

// Generate route sheet PDF - uses professional layout only
export const generateRouteSheetPDF = async (route: string, customers: Customer[]): Promise<void> => {
  const companySettings = await getCompanySettings();
  await generatePDFWithProfessionalLayout(route, customers, companySettings);
};

// Professional layout for printing
const printWithProfessionalLayout = async (route: string, customers: Customer[], companySettings: CompanySettings): Promise<void> => {
  const products = await getProducts();
  
  // Split customers into chunks of 30 per sheet
  const CUSTOMERS_PER_SHEET = 30;
  const customerChunks = [];
  for (let i = 0; i < customers.length; i += CUSTOMERS_PER_SHEET) {
    customerChunks.push(customers.slice(i, i + CUSTOMERS_PER_SHEET));
  }
  
  // Create a new window for printing with landscape orientation
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const sheetsHTML = customerChunks.map((chunk, sheetIndex) => 
      generateProfessionalRouteSheetHTML(route, chunk, products, companySettings, sheetIndex + 1, customerChunks.length)
    ).join('<div style="page-break-before: always;"></div>');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Route ${route} Sheet - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm 10mm;
            }
            
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            
            body { 
              font-family: 'Arial', sans-serif; 
              font-size: 11px; 
              line-height: 1.2;
              color: #000;
              background: white;
            }
            
            .sheet-container {
              width: 100%;
              height: 100vh;
              padding: 10px;
              display: flex;
              flex-direction: column;
            }
            
            .company-header { 
              text-align: center; 
              font-size: 20px; 
              font-weight: bold; 
              border: 2px solid #000; 
              padding: 8px; 
              margin-bottom: 10px;
              background: #f8f9fa;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .info-row { 
              display: flex; 
              border: 2px solid #000; 
              margin-bottom: 10px;
              height: 35px;
            }
            
            .info-cell { 
              flex: 1; 
              padding: 6px 8px; 
              border-right: 1px solid #000; 
              display: flex;
              align-items: center;
              font-weight: bold;
            }
            
            .info-cell:last-child { 
              border-right: none; 
            }
            
            .data-table { 
              width: 100%; 
              border-collapse: collapse; 
              border: 2px solid #000;
              flex-grow: 1;
            }
            
            .data-table th, 
            .data-table td { 
              border: 1px solid #000; 
              padding: 4px 2px; 
              text-align: center; 
              vertical-align: middle;
              font-size: 10px;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            
            .data-table th { 
              background: #e9ecef; 
              font-weight: bold;
              font-size: 9px;
              text-align: center;
            }
            
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
              .sheet-container { height: auto; }
            }
          </style>
        </head>
        <body>
          ${sheetsHTML}
          <div class="no-print" style="position: fixed; top: 20px; right: 20px; z-index: 1000;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">🖨️ Print</button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 14px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer;">❌ Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  }
};

// Generate professional route sheet HTML content for each page with Total column added
const generateProfessionalRouteSheetHTML = (
  route: string, 
  customers: Customer[], 
  products: Product[], 
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number
): string => {
  // Use first 3 products or default names
  const prodA = products[0]?.name || '500 ML';
  const prodB = products[1]?.name || '1 Ltr'; 
  const prodC = products[2]?.name || '250 ML';
  
  // Generate empty rows to fill up to 30 rows
  const allRows = [...customers];
  while (allRows.length < 30) {
    allRows.push({} as Customer); // Empty customer for blank rows
  }
  
  return `
    <div class="sheet-container">
      <div class="company-header">
        ${companySettings.companyName || 'Aqua Prime Retail'}
      </div>

      <div class="info-row">
        <div class="info-cell">
          <span>Date: ${format(new Date(), 'dd/MM/yyyy')}</span>
        </div>
        <div class="info-cell">
          <span>Time: ${format(new Date(), 'HH:mm')}</span>
        </div>
        <div class="info-cell">
          <span>Route: ${route}</span>
        </div>
        <div class="info-cell">
          <span>Agent: _______________</span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="3" style="width: 4%;">S.No</th>
            <th rowspan="3" style="width: 6%;">Customer<br>ID</th>
            <th rowspan="3" style="width: 13%;">Customer<br>Name</th>
            <th rowspan="3" style="width: 8%;">Phone<br>Number</th>
            <th rowspan="3" style="width: 10%;">Area</th>
            <th colspan="6" style="width: 36%;">Cases</th>
            <th rowspan="3" style="width: 6%;">Total</th>
            <th rowspan="3" style="width: 7%;">Amount<br>Due</th>
            <th colspan="2" style="width: 10%;">Amount Received</th>
          </tr>
          <tr>
            <th colspan="2">${prodA}</th>
            <th colspan="2">${prodB}</th>
            <th colspan="2">${prodC}</th>
            <th style="width: 5%;">CASH</th>
            <th style="width: 5%;">UPI</th>
          </tr>
          <tr>
            <th style="width: 6%; font-size: 8px;">Qty</th>
            <th style="width: 6%; font-size: 8px;">Rate</th>
            <th style="width: 6%; font-size: 8px;">Qty</th>
            <th style="width: 6%; font-size: 8px;">Rate</th>
            <th style="width: 6%; font-size: 8px;">Qty</th>
            <th style="width: 6%; font-size: 8px;">Rate</th>
            <th style="width: 5%; font-size: 8px;"></th>
            <th style="width: 5%; font-size: 8px;"></th>
          </tr>
        </thead>
        <tbody>
          ${allRows.map((customer, index) => {
            const globalIndex = (sheetNumber - 1) * 30 + index + 1;
            if (!customer.id) {
              return `
                <tr style="height: 20px;">
                  <td>${globalIndex}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              `;
            }
            
            // Get product prices with better matching
            const product500ml = products.find(p => p.name.toLowerCase().includes('500ml') || p.name.toLowerCase().includes('500')) || products[0];
            const product1ltr = products.find(p => p.name.toLowerCase().includes('1ltr') || p.name.toLowerCase().includes('1l') || p.name.toLowerCase().includes('liter')) || products[1];
            const product250ml = products.find(p => p.name.toLowerCase().includes('250ml') || p.name.toLowerCase().includes('250')) || products[2];
            
            return `
              <tr style="height: 20px;">
                <td>${globalIndex}</td>
                <td style="font-size: 9px; font-weight: bold;">${customer.id}</td>
                <td style="text-align: left; font-size: 9px;">${customer.name}</td>
                <td style="font-size: 8px;">${customer.phone || ''}</td>
                <td style="text-align: left; font-size: 9px;">${customer.address || ''}</td>
                <td style="font-size: 8px;">0</td>
                <td style="font-size: 8px;">₹${product500ml?.defaultPrice || '20'}</td>
                <td style="font-size: 8px;">0</td>
                <td style="font-size: 8px;">₹${product1ltr?.defaultPrice || '35'}</td>
                <td style="font-size: 8px;">0</td>
                <td style="font-size: 8px;">₹${product250ml?.defaultPrice || '12'}</td>
                <td style="font-size: 8px;">₹0</td>
                <td style="font-weight: bold; font-size: 9px;">₹${Math.abs(customer.outstandingAmount || 0)}</td>
                <td></td>
                <td></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      ${totalSheets > 1 ? `
        <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #666;">
          Sheet ${sheetNumber} of ${totalSheets} | Route: ${route} | Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </div>
      ` : ''}
    </div>
  `;
};

// PDF generation with professional layout and Total column
const generatePDFWithProfessionalLayout = async (route: string, customers: Customer[], companySettings: CompanySettings): Promise<void> => {
  const products = await getProducts();
  
  // Split customers into chunks of 30 per sheet
  const CUSTOMERS_PER_SHEET = 30;
  const customerChunks = [];
  for (let i = 0; i < customers.length; i += CUSTOMERS_PER_SHEET) {
    customerChunks.push(customers.slice(i, i + CUSTOMERS_PER_SHEET));
  }
  
  const pdf = new jsPDF('landscape', 'mm', 'a4'); // Landscape A4
  
  for (let chunkIndex = 0; chunkIndex < customerChunks.length; chunkIndex++) {
    if (chunkIndex > 0) {
      pdf.addPage();
    }
    
    const chunk = customerChunks[chunkIndex];
    await addSheetToPDF(pdf, route, chunk, products, companySettings, chunkIndex + 1, customerChunks.length);
  }
  
  pdf.save(`Route-${route}-Sheet-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
};

// Add a single sheet to the PDF with Total column and improved header wrapping
const addSheetToPDF = async (
  pdf: jsPDF,
  route: string,
  customers: Customer[],
  products: Product[],
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number
): Promise<void> => {
  const pageWidth = 297; // A4 landscape width
  const pageHeight = 210; // A4 landscape height
  const margin = 10;
  
  // Company header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const companyName = companySettings.companyName || 'Aqua Prime Retail';
  const companyWidth = pdf.getTextWidth(companyName);
  pdf.rect(margin, margin, pageWidth - 2 * margin, 15);
  pdf.text(companyName, (pageWidth - companyWidth) / 2, margin + 10);
  
  // Info row
  const infoY = margin + 20;
  const infoHeight = 10;
  const cellWidth = (pageWidth - 2 * margin) / 4;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // Date cell
  pdf.rect(margin, infoY, cellWidth, infoHeight);
  pdf.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, margin + 2, infoY + 7);
  
  // Time cell
  pdf.rect(margin + cellWidth, infoY, cellWidth, infoHeight);
  pdf.text(`Time: ${format(new Date(), 'HH:mm')}`, margin + cellWidth + 2, infoY + 7);
  
  // Route cell
  pdf.rect(margin + 2 * cellWidth, infoY, cellWidth, infoHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Route: ${route}`, margin + 2 * cellWidth + 2, infoY + 7);
  
  // Agent cell
  pdf.setFont('helvetica', 'normal');
  pdf.rect(margin + 3 * cellWidth, infoY, cellWidth, infoHeight);
  pdf.text('Agent: _______________', margin + 3 * cellWidth + 2, infoY + 7);
  
  // Table
  const tableY = infoY + 15;
  const tableWidth = pageWidth - 2 * margin;
  const rowHeight = 5;
  
  // Updated column widths with Total column - 15 columns total
  const colWidths = [10, 18, 35, 20, 30, 16, 16, 16, 16, 16, 16, 20, 20, 18, 18]; // 15 columns now
  const scaleFactor = tableWidth / colWidths.reduce((a, b) => a + b);
  const scaledWidths = colWidths.map(w => w * scaleFactor);
  
  let currentX = margin;
  let currentY = tableY;
  
  // Header rows - with proper centering and wrapping
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  // Main headers - Updated to include Total column
  const headers = ['S.No', 'Customer ID', 'Customer Name', 'Phone Number', 'Area', '500ML', 'Rate', '1Ltr', 'Rate', '250ML', 'Rate', 'Total', 'Amount Due', 'CASH', 'UPI'];
  
  currentX = margin;
  for (let i = 0; i < headers.length; i++) {
    const width = scaledWidths[i];
    pdf.rect(currentX, currentY, width, rowHeight * 2);
    
    // Center the text and wrap if needed
    const headerText = headers[i];
    const wrappedText = pdf.splitTextToSize(headerText, width - 2);
    const textWidth = pdf.getTextWidth(wrappedText[0] || headerText);
    const xOffset = (width - textWidth) / 2;
    
    pdf.text(wrappedText, currentX + xOffset, currentY + 7);
    currentX += width;
  }
  
  // Data rows
  currentY += rowHeight * 2 + 2;
  pdf.setFont('helvetica', 'normal');
  
  // Fill up to 30 rows
  const allRows = [...customers];
  while (allRows.length < 30) {
    allRows.push({} as Customer); // Empty customer for blank rows
  }
  
  for (let i = 0; i < allRows.length; i++) {
    const customer = allRows[i];
    const globalIndex = (sheetNumber - 1) * 30 + i + 1;
    
    currentX = margin;
    
    // Get product prices
    const product500ml = products.find(p => p.name.toLowerCase().includes('500ml') || p.name.toLowerCase().includes('500')) || products[0];
    const product1ltr = products.find(p => p.name.toLowerCase().includes('1ltr') || p.name.toLowerCase().includes('1l') || p.name.toLowerCase().includes('liter')) || products[1];
    const product250ml = products.find(p => p.name.toLowerCase().includes('250ml') || p.name.toLowerCase().includes('250')) || products[2];
    
    // Data for each column including Total
    const rowData = [
      globalIndex.toString(),
      customer.id || '',
      customer.name || '',
      customer.phone || '',
      customer.address || '',
      customer.id ? '0' : '', // 500ML quantity
      customer.id ? `₹${product500ml?.defaultPrice || '20'}` : '', // 500ML rate
      customer.id ? '0' : '', // 1Ltr quantity
      customer.id ? `₹${product1ltr?.defaultPrice || '35'}` : '', // 1Ltr rate
      customer.id ? '0' : '', // 250ML quantity
      customer.id ? `₹${product250ml?.defaultPrice || '12'}` : '', // 250ML rate
      customer.id ? '₹0' : '', // Total (initially 0)
      customer.id && customer.outstandingAmount !== undefined ? `₹${Math.abs(customer.outstandingAmount)}` : customer.id ? '₹0' : '', // Amount Due
      '', // CASH amount (blank for manual entry)
      '' // UPI amount (blank for manual entry)
    ];
    
    for (let j = 0; j < rowData.length; j++) {
      const width = scaledWidths[j];
      pdf.rect(currentX, currentY, width, rowHeight);
      if (rowData[j]) {
        pdf.setFont('helvetica', 'normal');
        
        // Center text in cell
        const cellText = rowData[j];
        const textWidth = pdf.getTextWidth(cellText);
        const xOffset = (width - textWidth) / 2;
        
        pdf.text(cellText, currentX + Math.max(1, xOffset), currentY + 3.5);
      }
      currentX += width;
    }
    
    currentY += rowHeight;
  }
  
  // Sheet footer
  if (totalSheets > 1) {
    pdf.setFontSize(8);
    pdf.text(
      `Sheet ${sheetNumber} of ${totalSheets} | Route: ${route} | Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      margin,
      pageHeight - 5
    );
  }
};
