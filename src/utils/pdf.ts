import jsPDF from 'jspdf';
import { Customer, Product, CompanySettings } from '../types';
import { format } from 'date-fns';
import { getProducts, getCompanySettings } from './storage';

// Generate route sheet for printing - uses professional layout only with proper sheet ID and sheet data
export const printRouteSheet = async (route: string, customers: Customer[], sheetId?: string, sheetData?: any): Promise<void> => {
  const companySettings = await getCompanySettings();
  await printWithProfessionalLayout(route, customers, companySettings, sheetId, sheetData);
};

// Generate route sheet PDF - uses professional layout only with proper sheet ID and sheet data
export const generateRouteSheetPDF = async (route: string, customers: Customer[], sheetId?: string, sheetData?: any): Promise<void> => {
  const companySettings = await getCompanySettings();
  await generatePDFWithProfessionalLayout(route, customers, companySettings, sheetId, sheetData);
};

// Professional layout for printing with proper sheet data
const printWithProfessionalLayout = async (route: string, customers: Customer[], companySettings: CompanySettings, sheetId?: string, sheetData?: any): Promise<void> => {
  const products = await getProducts();
  
  // Generate unique sheet ID if not provided (format: ROUTE-YYYYMMDD-ROUTECODE)
  const currentDate = format(new Date(), 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Split customers into chunks of 25 per sheet
  const CUSTOMERS_PER_SHEET = 25;
  const customerChunks = [];
  for (let i = 0; i < customers.length; i += CUSTOMERS_PER_SHEET) {
    customerChunks.push(customers.slice(i, i + CUSTOMERS_PER_SHEET));
  }
  
  // Create a new window for printing with landscape orientation
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const sheetsHTML = customerChunks.map((chunk, sheetIndex) => 
      generateProfessionalRouteSheetHTML(route, chunk, products, companySettings, sheetIndex + 1, customerChunks.length, routeSheetId, sheetData)
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
              height: 25px;
              line-height: 25px;
              font-weight: bold; 
              border: 0.5px solid #000; 
              padding: 0;
              margin: 0 0 8px 0;
              background: #f8f9fa;
              text-transform: uppercase;
              letter-spacing: 1px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .info-row { 
              display: flex; 
              border: 0.5px solid #000; 
              margin-bottom: 10px;
              height: 35px;
            }
            
            .info-cell { 
              flex: 1; 
              padding: 6px 8px; 
              border-right: 0.5px solid #000; 
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
              border: 0.5px solid #000;
              flex-grow: 1;
            }
            
            .data-table th, 
            .data-table td { 
              border: 0.5px solid #000; 
              padding: 5px 2px; 
              text-align: center; 
              vertical-align: middle;
              font-size: 9px;
              word-wrap: break-word;
              overflow-wrap: break-word;
              line-height: 1.2;
            }
            
            .data-table th { 
              background: #e9ecef; 
              font-weight: bold;
              font-size: 8px;
              text-align: center;
              vertical-align: middle;
              height: 48px;
              line-height: 1.3;
              padding: 4px 2px;
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

// Generate professional route sheet HTML content for each page with proper data fetching
const generateProfessionalRouteSheetHTML = (
  route: string, 
  customers: Customer[], 
  products: Product[], 
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number,
  sheetId?: string,
  sheetData?: any
): string => {
  // Generate sheet timestamp and ID
  const sheetGenerationDate = new Date();
  const currentDate = format(sheetGenerationDate, 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Use first 3 products or default names
  const prodA = products[0]?.name || '500 ML';
  const prodB = products[1]?.name || '1 Ltr'; 
  const prodC = products[2]?.name || '250 ML';
  
  // Generate empty rows to fill up to 25 rows
  const allRows = [...customers];
  while (allRows.length < 25) {
    allRows.push({} as Customer); // Empty customer for blank rows
  }
  
  return `
    <div class="sheet-container">
      <div class="company-header">
        ${companySettings.companyName || 'Aqua Prime Retail'}
      </div>

      <div class="info-row">
        <div class="info-cell" style="flex: 0.18; font-weight: bold;">
          <span>Date: ${format(sheetGenerationDate, 'dd/MM/yyyy')}</span>
        </div>
        <div class="info-cell" style="flex: 0.15; font-weight: bold;">
          <span>Time: ${format(sheetGenerationDate, 'HH:mm')}</span>
        </div>
        <div class="info-cell" style="flex: 0.20;">
          <span>Route: ${route}</span>
        </div>
        <div class="info-cell" style="flex: 0.22;">
          <span>Route ID: ${routeSheetId}</span>
        </div>
        <div class="info-cell" style="flex: 0.25;">
          <span>Agent: _______________</span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="3" style="width: 4%;">S.No</th>
            <th rowspan="3" style="width: 7%;">Customer<br>ID</th>
            <th rowspan="3" style="width: 15%;">Customer<br>Name</th>
            <th rowspan="3" style="width: 8%;">Phone<br>Number</th>
            <th rowspan="3" style="width: 11%;">Area</th>
            <th colspan="6" style="width: 34%;">Cases</th>
            <th rowspan="3" style="width: 7%;">Total</th>
            <th rowspan="3" style="width: 8%;">Amount<br>Due</th>
            <th colspan="2" style="width: 12%;">Amount Received</th>
          </tr>
          <tr>
            <th colspan="2">${prodA}</th>
            <th colspan="2">${prodB}</th>
            <th colspan="2">${prodC}</th>
            <th style="width: 6%;">CASH</th>
            <th style="width: 6%;">UPI</th>
          </tr>
          <tr>
            <th style="width: 6%; font-size: 7px;">Qty</th>
            <th style="width: 6%; font-size: 7px;">Rate</th>
            <th style="width: 6%; font-size: 7px;">Qty</th>
            <th style="width: 6%; font-size: 7px;">Rate</th>
            <th style="width: 6%; font-size: 7px;">Qty</th>
            <th style="width: 6%; font-size: 7px;">Rate</th>
            <th style="width: 6%; font-size: 7px;"></th>
            <th style="width: 6%; font-size: 7px;"></th>
          </tr>
        </thead>
        <tbody>
          ${allRows.map((customer, index) => {
            const globalIndex = (sheetNumber - 1) * 25 + index + 1;
            if (!customer.id) {
              return `
                <tr style="height: 22px;">
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
            
            // Get actual delivery data from sheet if available
            const deliveryData = sheetData?.deliveryData?.[customer.id] || {};
            const amountReceived = sheetData?.amountReceived?.[customer.id] || { cash: 0, upi: 0, total: 0 };
            
            // Get customer-specific product prices (custom prices from customer.productPrices)
            const product500ml = products.find(p => p.name.toLowerCase().includes('500ml') || p.name.toLowerCase().includes('500')) || products[0];
            const product1ltr = products.find(p => p.name.toLowerCase().includes('1ltr') || p.name.toLowerCase().includes('1l') || p.name.toLowerCase().includes('liter')) || products[1];
            const product250ml = products.find(p => p.name.toLowerCase().includes('250ml') || p.name.toLowerCase().includes('250')) || products[2];
            
            // Use customer-specific pricing if available, otherwise default pricing with proper null checks
            const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 20;
            const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
            const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
            
            // Get actual quantities from delivery data or default to 0
            const qty500ml = deliveryData[product500ml?.id]?.quantity || 0;
            const qty1ltr = deliveryData[product1ltr?.id]?.quantity || 0;
            const qty250ml = deliveryData[product250ml?.id]?.quantity || 0;
            
            // Calculate total purchase amount
            const totalPurchase = (qty500ml * rate500ml) + (qty1ltr * rate1ltr) + (qty250ml * rate250ml);
            
            // Get payment amounts (ensure backward compatibility)
            const cashAmount = typeof amountReceived === 'number' ? amountReceived : (amountReceived.cash || 0);
            const upiAmount = typeof amountReceived === 'number' ? 0 : (amountReceived.upi || 0);
            const totalReceived = typeof amountReceived === 'number' ? amountReceived : (amountReceived.total || 0);
            
            return `
              <tr style="height: 22px;">
                <td>${globalIndex}</td>
                <td style="font-size: 8px; font-weight: bold;">${customer.id}</td>
                <td style="text-align: left; font-size: 8px;">${customer.name}</td>
                <td style="font-size: 7px; font-weight: bold;">${customer.phone || ''}</td>
                <td style="text-align: left; font-size: 8px;">${customer.address || ''}</td>
                <td style="font-size: 7px;">${qty500ml}</td>
                <td style="font-size: 7px;">₹${rate500ml}</td>
                <td style="font-size: 7px;">${qty1ltr}</td>
                <td style="font-size: 7px;">₹${rate1ltr}</td>
                <td style="font-size: 7px;">${qty250ml}</td>
                <td style="font-size: 7px;">₹${rate250ml}</td>
                <td style="font-size: 7px;">₹${totalPurchase}</td>
                <td style="font-weight: bold; font-size: 8px;">₹${Math.abs(customer.outstandingAmount || 0)}</td>
                <td style="font-size: 7px;">₹${cashAmount}</td>
                <td style="font-size: 7px;">₹${upiAmount}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      ${totalSheets > 1 ? `
        <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #666;">
          Sheet ${sheetNumber} of ${totalSheets} | Route: ${route} | ID: ${routeSheetId} | Generated: ${format(sheetGenerationDate, 'dd/MM/yyyy HH:mm')}
        </div>
      ` : ''}
    </div>
  `;
};

// PDF generation with professional layout and proper data fetching
const generatePDFWithProfessionalLayout = async (route: string, customers: Customer[], companySettings: CompanySettings, sheetId?: string, sheetData?: any): Promise<void> => {
  const products = await getProducts();
  
  // Generate unique sheet ID if not provided
  const currentDate = format(new Date(), 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Split customers into chunks of 25 per sheet
  const CUSTOMERS_PER_SHEET = 25;
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
    await addSheetToPDF(pdf, route, chunk, products, companySettings, chunkIndex + 1, customerChunks.length, routeSheetId, sheetData);
  }
  
  pdf.save(`Route-${route}-Sheet-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
};

// Add a single sheet to the PDF with proper data fetching and Sheet ID
const addSheetToPDF = async (
  pdf: jsPDF,
  route: string,
  customers: Customer[],
  products: Product[],
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number,
  sheetId?: string,
  sheetData?: any
): Promise<void> => {
  const pageWidth = 297; // A4 landscape width
  const pageHeight = 210; // A4 landscape height
  const margin = 8;
  
  // Generate sheet timestamp and ID
  const sheetGenerationDate = new Date();
  const currentDate = format(sheetGenerationDate, 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Set consistent line width for all borders
  pdf.setLineWidth(0.2); // Reduced border width for cleaner look
  
  // Company header with vertical and horizontal centering
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const companyName = companySettings.companyName || 'Aqua Prime Retail';
  const companyWidth = pdf.getTextWidth(companyName);
  const companyHeaderHeight = 10;
  
  // Draw the header rectangle
  pdf.rect(margin, margin, pageWidth - 2 * margin, companyHeaderHeight);
  
  // Center horizontally and vertically
  const xPosition = (pageWidth - companyWidth) / 2;
  const yPosition = margin + (companyHeaderHeight / 2) + 3; // Center vertically with slight adjustment for text baseline
  
  pdf.text(companyName, xPosition, yPosition);
  
  // Info row with 5 cells now (added Route ID)
  const infoY = margin + 15;
  const infoHeight = 10;
  const totalInfoWidth = pageWidth - 2 * margin;
  
  // Define cell widths based on content - optimized for each field
  const infoCellWidths = [
    totalInfoWidth * 0.13, // Date - 18%
    totalInfoWidth * 0.10, // Time - 15%
    totalInfoWidth * 0.23, // Route - 20%
    totalInfoWidth * 0.29, // Route ID - 22%
    totalInfoWidth * 0.25  // Agent - 25%
  ];
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  let currentInfoX = margin;
  
  // Date cell
  pdf.rect(currentInfoX, infoY, infoCellWidths[0], infoHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Date: ${format(sheetGenerationDate, 'dd/MM/yyyy')}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[0];
  
  // Time cell
  pdf.rect(currentInfoX, infoY, infoCellWidths[1], infoHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Time: ${format(sheetGenerationDate, 'HH:mm')}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[1];
  
  // Route cell
  pdf.rect(currentInfoX, infoY, infoCellWidths[2], infoHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Route: ${route}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[2];
  
  // Route ID cell (new) - showing the actual sheet ID
  pdf.rect(currentInfoX, infoY, infoCellWidths[3], infoHeight);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Route ID: ${routeSheetId}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[3];
  
  // Agent cell
  pdf.setFont('helvetica', 'normal');
  pdf.rect(currentInfoX, infoY, infoCellWidths[4], infoHeight);
  pdf.text('Agent: _______________', currentInfoX + 2, infoY + 7);
  
  // Table
  const tableY = infoY + 15;
  const tableWidth = pageWidth - 2 * margin;
  const rowHeight = 5;
  
  // Optimized column widths with Total column - 15 columns total
  // [S.No, Cust ID, Cust Name, Phone, Area, 500ML, Rate, 1Ltr, Rate, 250ML, Rate, Total, Amount Due, CASH, UPI]
  // Adjusted for 10px font size - no font changes, only width optimization
  const colWidths = [10, 18, 36, 26, 43, 13, 13, 13, 13, 13, 13, 20, 22, 16, 16];
  const scaleFactor = tableWidth / colWidths.reduce((a, b) => a + b);
  const scaledWidths = colWidths.map(w => w * scaleFactor);
  
  let currentX = margin;
  let currentY = tableY;
  
  // Header rows - with proper centering and wrapping
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  // Main headers - Updated to include Total column
  const headers = ['S.No', 'Customer ID', 'Customer Name', 'Phone Number', 'Area', '500ML', 'Rate', '1Ltr', 'Rate', '250ML', 'Rate', 'Total', 'Amount Due', 'CASH', 'UPI'];
  
  currentX = margin;
  const headerHeight = rowHeight * 3.5; // Increased height for better text spacing with more line gaps
  for (let i = 0; i < headers.length; i++) {
    const width = scaledWidths[i];
    pdf.rect(currentX, currentY, width, headerHeight);
    
    // Center the text horizontally and vertically with improved wrapping
    const headerText = headers[i];
    const wrappedText = pdf.splitTextToSize(headerText, width - 3); // More margin for wrapping
    
    // Calculate proper vertical spacing with increased line spacing
    const cellHeight = headerHeight;
    const lineHeight = 3.0; // Increased line height to prevent overlap between wrapped lines
    const totalTextHeight = wrappedText.length * lineHeight;
    const yOffset = (cellHeight - totalTextHeight) / 2;
    
    // Draw each line of wrapped text with more spacing between lines
    wrappedText.forEach((line: string, lineIndex: number) => {
      const lineWidth = pdf.getTextWidth(line);
      const lineXOffset = (width - lineWidth) / 2;
      const lineYPosition = currentY + yOffset + 5 + (lineIndex * lineHeight);
      pdf.text(line, currentX + Math.max(1, lineXOffset), lineYPosition);
    });
    
    currentX += width;
  }
  
  // Data rows
  currentY += headerHeight + 2;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // Optimized row height for better spacing
  const dataRowHeight = 5.5;
  
  // Fill up to 25 rows
  const allRows = [...customers];
  while (allRows.length < 25) {
    allRows.push({} as Customer); // Empty customer for blank rows
  }
  
  for (let i = 0; i < allRows.length; i++) {
    const customer = allRows[i];
    const globalIndex = (sheetNumber - 1) * 25 + i + 1;
    
    currentX = margin;
    
    if (!customer.id) {
      // Empty row
      const emptyRowData = Array(15).fill('');
      emptyRowData[0] = globalIndex.toString();
      
      for (let j = 0; j < emptyRowData.length; j++) {
        const width = scaledWidths[j];
        pdf.rect(currentX, currentY, width, dataRowHeight);
        if (emptyRowData[j]) {
          pdf.text(emptyRowData[j], currentX + 1, currentY + 3.5);
        }
        currentX += width;
      }
    } else {
      // Get actual delivery data from sheet if available
      const deliveryData = sheetData?.deliveryData?.[customer.id] || {};
      const amountReceived = sheetData?.amountReceived?.[customer.id] || { cash: 0, upi: 0, total: 0 };
      
      // Get products and use customer-specific pricing
      const product500ml = products.find(p => p.name.toLowerCase().includes('500ml') || p.name.toLowerCase().includes('500')) || products[0];
      const product1ltr = products.find(p => p.name.toLowerCase().includes('1ltr') || p.name.toLowerCase().includes('1l') || p.name.toLowerCase().includes('liter')) || products[1];
      const product250ml = products.find(p => p.name.toLowerCase().includes('250ml') || p.name.toLowerCase().includes('250')) || products[2];
      
      // Use customer-specific pricing if available, otherwise default pricing with proper null checks
      const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 20;
      const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
      const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
      
      // Get actual quantities from delivery data or default to 0
      const qty500ml = deliveryData[product500ml?.id]?.quantity || 0;
      const qty1ltr = deliveryData[product1ltr?.id]?.quantity || 0;
      const qty250ml = deliveryData[product250ml?.id]?.quantity || 0;
      
      // Calculate total purchase amount
      const totalPurchase = (qty500ml * rate500ml) + (qty1ltr * rate1ltr) + (qty250ml * rate250ml);
      
      // Get payment amounts (ensure backward compatibility)
      const cashAmount = typeof amountReceived === 'number' ? amountReceived : (amountReceived.cash || 0);
      const upiAmount = typeof amountReceived === 'number' ? 0 : (amountReceived.upi || 0);
      
      // Data for each column including Total
      const rowData = [
        globalIndex.toString(),
        customer.id || '',
        customer.name || '',
        customer.phone || '',
        customer.address || '',
        qty500ml.toString(), // Actual quantity from sheet data
        `₹${rate500ml}`, // Customer-specific rate
        qty1ltr.toString(), // Actual quantity from sheet data
        `₹${rate1ltr}`, // Customer-specific rate
        qty250ml.toString(), // Actual quantity from sheet data
        `₹${rate250ml}`, // Customer-specific rate
        `₹${totalPurchase}`, // Calculated total purchase
        customer.outstandingAmount !== undefined ? `₹${Math.abs(customer.outstandingAmount)}` : '₹0', // Current outstanding
        `₹${cashAmount}`, // Actual cash received
        `₹${upiAmount}` // Actual UPI received
      ];
      
      for (let j = 0; j < rowData.length; j++) {
        const width = scaledWidths[j];
        pdf.rect(currentX, currentY, width, dataRowHeight);
        if (rowData[j]) {
          // Set font weight - bold for phone number column (index 3) and amount due column (index 12)
          if (j === 3 || j === 12) {
            pdf.setFont('helvetica', 'bold');
          } else {
            pdf.setFont('helvetica', 'normal');
          }
          
          // Center text in cell with proper vertical alignment
          const cellText = rowData[j];
          const textWidth = pdf.getTextWidth(cellText);
          const xOffset = (width - textWidth) / 2;
          const yOffset = dataRowHeight / 2 + 1.5; // Center vertically with slight adjustment
          
          pdf.text(cellText, currentX + Math.max(1, xOffset), currentY + yOffset);
        }
        currentX += width;
      }
    }
    
    currentY += dataRowHeight;
  }
  
  // Sheet footer
  if (totalSheets > 1) {
    pdf.setFontSize(10);
    pdf.text(
      `Sheet ${sheetNumber} of ${totalSheets} | Route: ${route} | ID: ${routeSheetId} | Generated: ${format(sheetGenerationDate, 'dd/MM/yyyy HH:mm')}`,
      margin,
      pageHeight - 5
    );
  }
};
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
            
            // Get customer-specific product prices (custom prices from customer.productPrices)
            const product500ml = products.find(p => p.name.toLowerCase().includes('500ml') || p.name.toLowerCase().includes('500')) || products[0];
            const product1ltr = products.find(p => p.name.toLowerCase().includes('1ltr') || p.name.toLowerCase().includes('1l') || p.name.toLowerCase().includes('liter')) || products[1];
            const product250ml = products.find(p => p.name.toLowerCase().includes('250ml') || p.name.toLowerCase().includes('250')) || products[2];
            
            // Use customer-specific pricing if available, otherwise default pricing with proper null checks
            const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 20;
            const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
            const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
            
            return `
              <tr style="height: 22px;">
                <td>${globalIndex}</td>
                <td style="font-size: 8px; font-weight: bold;">${customer.id}</td>
                <td style="text-align: left; font-size: 8px;">${customer.name}</td>
                <td style="font-size: 7px; font-weight: bold;">${customer.phone || ''}</td>
                <td style="text-align: left; font-size: 8px;">${customer.address || ''}</td>
                <td style="font-size: 7px;">0</td>
                <td style="font-size: 7px;">₹${rate500ml}</td>
                <td style="font-size: 7px;">0</td>
                <td style="font-size: 7px;">₹${rate1ltr}</td>
                <td style="font-size: 7px;">0</td>
                <td style="font-size: 7px;">₹${rate250ml}</td>
                <td style="font-size: 7px;">₹0</td>
                <td style="font-weight: bold; font-size: 8px;">₹${Math.abs(customer.outstandingAmount || 0)}</td>
                <td></td>
                <td></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      ${totalSheets > 1 ? `
        <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #666;">
          Sheet ${sheetNumber} of ${totalSheets} | Route: ${route} | ID: ${routeSheetId} | Generated: ${format(sheetGenerationDate, 'dd/MM/yyyy HH:mm')}
        </div>
      ` : ''}
    </div>
  `;
};

// PDF generation with professional layout and proper data fetching
const generatePDFWithProfessionalLayout = async (route: string, customers: Customer[], companySettings: CompanySettings, sheetId?: string): Promise<void> => {
  const products = await getProducts();
  
  // Generate unique sheet ID if not provided
  const currentDate = format(new Date(), 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Split customers into chunks of 25 per sheet
  const CUSTOMERS_PER_SHEET = 25;
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
    await addSheetToPDF(pdf, route, chunk, products, companySettings, chunkIndex + 1, customerChunks.length, routeSheetId);
  }
  
  pdf.save(`Route-${route}-Sheet-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
};

// Add a single sheet to the PDF with proper data fetching and Sheet ID
const addSheetToPDF = async (
  pdf: jsPDF,
  route: string,
  customers: Customer[],
  products: Product[],
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number,
  sheetId?: string
): Promise<void> => {
  const pageWidth = 297; // A4 landscape width
  const pageHeight = 210; // A4 landscape height
  const margin = 8;
  
  // Generate sheet timestamp and ID
  const sheetGenerationDate = new Date();
  const currentDate = format(sheetGenerationDate, 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Set consistent line width for all borders
  pdf.setLineWidth(0.2); // Reduced border width for cleaner look
  
  // Company header with vertical and horizontal centering
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const companyName = companySettings.companyName || 'Aqua Prime Retail';
  const companyWidth = pdf.getTextWidth(companyName);
  const companyHeaderHeight = 10;
  
  // Draw the header rectangle
  pdf.rect(margin, margin, pageWidth - 2 * margin, companyHeaderHeight);
  
  // Center horizontally and vertically
  const xPosition = (pageWidth - companyWidth) / 2;
  const yPosition = margin + (companyHeaderHeight / 2) + 3; // Center vertically with slight adjustment for text baseline
  
  pdf.text(companyName, xPosition, yPosition);
  
  // Info row with 5 cells now (added Route ID)
  const infoY = margin + 15;
  const infoHeight = 10;
  const totalInfoWidth = pageWidth - 2 * margin;
  
  // Define cell widths based on content - optimized for each field
  const infoCellWidths = [
    totalInfoWidth * 0.13, // Date - 18%
    totalInfoWidth * 0.10, // Time - 15%
    totalInfoWidth * 0.23, // Route - 20%
    totalInfoWidth * 0.29, // Route ID - 22%
    totalInfoWidth * 0.25  // Agent - 25%
  ];
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  let currentInfoX = margin;
  
  // Date cell
  pdf.rect(currentInfoX, infoY, infoCellWidths[0], infoHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Date: ${format(sheetGenerationDate, 'dd/MM/yyyy')}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[0];
  
  // Time cell
  pdf.rect(currentInfoX, infoY, infoCellWidths[1], infoHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Time: ${format(sheetGenerationDate, 'HH:mm')}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[1];
  
  // Route cell
  pdf.rect(currentInfoX, infoY, infoCellWidths[2], infoHeight);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Route: ${route}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[2];
  
  // Route ID cell (new) - showing the actual sheet ID
  pdf.rect(currentInfoX, infoY, infoCellWidths[3], infoHeight);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Route ID: ${routeSheetId}`, currentInfoX + 2, infoY + 7);
  currentInfoX += infoCellWidths[3];
  
  // Agent cell
  pdf.setFont('helvetica', 'normal');
  pdf.rect(currentInfoX, infoY, infoCellWidths[4], infoHeight);
  pdf.text('Agent: _______________', currentInfoX + 2, infoY + 7);
  
  // Table
  const tableY = infoY + 15;
  const tableWidth = pageWidth - 2 * margin;
  const rowHeight = 5;
  
  // Optimized column widths with Total column - 15 columns total
  // [S.No, Cust ID, Cust Name, Phone, Area, 500ML, Rate, 1Ltr, Rate, 250ML, Rate, Total, Amount Due, CASH, UPI]
  // Adjusted for 10px font size - no font changes, only width optimization
  const colWidths = [10, 18, 36, 26, 43, 13, 13, 13, 13, 13, 13, 20, 22, 16, 16];
  const scaleFactor = tableWidth / colWidths.reduce((a, b) => a + b);
  const scaledWidths = colWidths.map(w => w * scaleFactor);
  
  let currentX = margin;
  let currentY = tableY;
  
  // Header rows - with proper centering and wrapping
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  // Main headers - Updated to include Total column
  const headers = ['S.No', 'Customer ID', 'Customer Name', 'Phone Number', 'Area', '500ML', 'Rate', '1Ltr', 'Rate', '250ML', 'Rate', 'Total', 'Amount Due', 'CASH', 'UPI'];
  
  currentX = margin;
  const headerHeight = rowHeight * 3.5; // Increased height for better text spacing with more line gaps
  for (let i = 0; i < headers.length; i++) {
    const width = scaledWidths[i];
    pdf.rect(currentX, currentY, width, headerHeight);
    
    // Center the text horizontally and vertically with improved wrapping
    const headerText = headers[i];
    const wrappedText = pdf.splitTextToSize(headerText, width - 3); // More margin for wrapping
    
    // Calculate proper vertical spacing with increased line spacing
    const cellHeight = headerHeight;
    const lineHeight = 3.0; // Increased line height to prevent overlap between wrapped lines
    const totalTextHeight = wrappedText.length * lineHeight;
    const yOffset = (cellHeight - totalTextHeight) / 2;
    
    // Draw each line of wrapped text with more spacing between lines
    wrappedText.forEach((line: string, lineIndex: number) => {
      const lineWidth = pdf.getTextWidth(line);
      const lineXOffset = (width - lineWidth) / 2;
      const lineYPosition = currentY + yOffset + 5 + (lineIndex * lineHeight);
      pdf.text(line, currentX + Math.max(1, lineXOffset), lineYPosition);
    });
    
    currentX += width;
  }
  
  // Data rows
  currentY += headerHeight + 2;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // Optimized row height for better spacing
  const dataRowHeight = 5.5;
  
  // Fill up to 25 rows
  const allRows = [...customers];
  while (allRows.length < 25) {
    allRows.push({} as Customer); // Empty customer for blank rows
  }
  
  for (let i = 0; i < allRows.length; i++) {
    const customer = allRows[i];
    const globalIndex = (sheetNumber - 1) * 25 + i + 1;
    
    currentX = margin;
    
    // Get product prices and use customer-specific pricing
    const product500ml = products.find(p => p.name.toLowerCase().includes('500ml') || p.name.toLowerCase().includes('500')) || products[0];
    const product1ltr = products.find(p => p.name.toLowerCase().includes('1ltr') || p.name.toLowerCase().includes('1l') || p.name.toLowerCase().includes('liter')) || products[1];
    const product250ml = products.find(p => p.name.toLowerCase().includes('250ml') || p.name.toLowerCase().includes('250')) || products[2];
    
    // Use customer-specific pricing if available, otherwise default pricing with proper null checks
    const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 20;
    const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
    const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
    
    // Data for each column including Total
    const rowData = [
      globalIndex.toString(),
      customer.id || '',
      customer.name || '',
      customer.phone || '',
      customer.address || '',
      customer.id ? '0' : '', // 500ML quantity
      customer.id ? `₹${rate500ml}` : '', // 500ML rate (customer-specific)
      customer.id ? '0' : '', // 1Ltr quantity
      customer.id ? `₹${rate1ltr}` : '', // 1Ltr rate (customer-specific)
      customer.id ? '0' : '', // 250ML quantity
      customer.id ? `₹${rate250ml}` : '', // 250ML rate (customer-specific)
      customer.id ? '₹0' : '', // Total (initially 0)
      customer.id && customer.outstandingAmount !== undefined ? `₹${Math.abs(customer.outstandingAmount)}` : customer.id ? '₹0' : '', // Amount Due (current outstanding)
      '', // CASH amount (blank for manual entry)
      '' // UPI amount (blank for manual entry)
    ];
    
    for (let j = 0; j < rowData.length; j++) {
      const width = scaledWidths[j];
      pdf.rect(currentX, currentY, width, dataRowHeight);
      if (rowData[j]) {
        // Set font weight - bold for phone number column (index 3) and amount due column (index 12)
        if (j === 3 || j === 12) {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
        
        // Center text in cell with proper vertical alignment
        const cellText = rowData[j];
        const textWidth = pdf.getTextWidth(cellText);
        const xOffset = (width - textWidth) / 2;
        const yOffset = dataRowHeight / 2 + 1.5; // Center vertically with slight adjustment
        
        pdf.text(cellText, currentX + Math.max(1, xOffset), currentY + yOffset);
      }
      currentX += width;
    }
    
    currentY += dataRowHeight;
  }
  
  // Sheet footer
  if (totalSheets > 1) {
    pdf.setFontSize(10);
    pdf.text(
      `Sheet ${sheetNumber} of ${totalSheets} | Route: ${route} | ID: ${routeSheetId} | Generated: ${format(sheetGenerationDate, 'dd/MM/yyyy HH:mm')}`,
      margin,
      pageHeight - 5
    );
  }
};
