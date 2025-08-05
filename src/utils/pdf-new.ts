import jsPDF from 'jspdf';
import { Customer, Product, CompanySettings } from '../types';
import { format } from 'date-fns';
import { getProducts, getCompanySettings } from './storage';

// Generate route sheet for printing with custom template or fallback to professional layout
export const printRouteSheet = async (route: string, customers: Customer[]): Promise<void> => {
  const companySettings = await getCompanySettings();
  
  // If custom template is available, use template-based generation
  if (companySettings.pdfTemplate) {
    await printWithCustomTemplate(route, customers, companySettings);
  } else {
    // Fallback to professional layout
    await printWithProfessionalLayout(route, customers, companySettings);
  }
};

// Generate route sheet PDF with custom template or fallback to professional layout
export const generateRouteSheetPDF = async (route: string, customers: Customer[]): Promise<void> => {
  const companySettings = await getCompanySettings();
  
  // If custom template is available, use template-based generation
  if (companySettings.pdfTemplate) {
    await generatePDFWithCustomTemplate(route, customers, companySettings);
  } else {
    // Fallback to professional layout
    await generatePDFWithProfessionalLayout(route, customers, companySettings);
  }
};

// Print using custom uploaded template
const printWithCustomTemplate = async (route: string, customers: Customer[], companySettings: CompanySettings): Promise<void> => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const templateHTML = await generateTemplateBasedHTML(route, customers, companySettings);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Route ${route} Sheet - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4 landscape;
              margin: 10mm;
            }
            
            * { 
              margin: 0; 
              padding: 0; 
              box-sizing: border-box; 
            }
            
            body { 
              font-family: 'Arial', sans-serif; 
              font-size: 12px; 
              line-height: 1.4;
              color: #000;
              background: white;
            }
            
            .template-container {
              width: 100%;
              height: 100vh;
              position: relative;
            }
            
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            
            .data-table td, .data-table th {
              border: 1px solid #000;
              padding: 4px;
              text-align: center;
              font-size: 10px;
            }
            
            .data-table th {
              background: #f0f0f0;
              font-weight: bold;
            }
            
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${templateHTML}
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

// Generate PDF using custom uploaded template
const generatePDFWithCustomTemplate = async (route: string, customers: Customer[], companySettings: CompanySettings): Promise<void> => {
  try {
    // Create new PDF with landscape orientation
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    
    // Add custom template note and data overlay
    await addCustomerDataToPDF(pdf, route, customers, companySettings);
    
    pdf.save(`Route-${route}-Sheet-Custom-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  } catch (error) {
    console.error('Error generating PDF with template:', error);
    // Fallback to professional layout if template processing fails
    await generatePDFWithProfessionalLayout(route, customers, companySettings);
  }
};

// Generate HTML for template-based printing
const generateTemplateBasedHTML = async (route: string, customers: Customer[], companySettings: CompanySettings): Promise<string> => {
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const currentTime = format(new Date(), 'HH:mm');
  
  // Split customers into chunks of 30 per sheet
  const CUSTOMERS_PER_SHEET = 30;
  const customerChunks = [];
  for (let i = 0; i < customers.length; i += CUSTOMERS_PER_SHEET) {
    customerChunks.push(customers.slice(i, i + CUSTOMERS_PER_SHEET));
  }
  
  return customerChunks.map((chunk, chunkIndex) => `
    <div class="template-container" ${chunkIndex > 0 ? 'style="page-break-before: always;"' : ''}>
      <div style="text-align: center; padding: 15px; border: 2px solid #000; margin-bottom: 15px; background: #f8f9fa;">
        <h1 style="font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">${companySettings.companyName}</h1>
        <p style="margin-top: 8px; font-size: 12px; color: #666;">Custom Template - Route Sheet</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding: 10px; border: 2px solid #000; background: #fff;">
        <div style="flex: 1; border-right: 1px solid #000; padding-right: 10px;"><strong>Date:</strong> ${currentDate}</div>
        <div style="flex: 1; border-right: 1px solid #000; padding: 0 10px;"><strong>Time:</strong> ${currentTime}</div>
        <div style="flex: 1; border-right: 1px solid #000; padding: 0 10px;"><strong>Route:</strong> ${route}</div>
        <div style="flex: 1; padding-left: 10px;"><strong>Agent:</strong> ________________</div>
      </div>
      
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 5%;">S.No</th>
            <th style="width: 10%;">Customer ID</th>
            <th style="width: 20%;">Customer Name</th>
            <th style="width: 12%;">Phone</th>
            <th style="width: 15%;">Area</th>
            <th style="width: 10%;">Prod A</th>
            <th style="width: 10%;">Prod B</th>
            <th style="width: 10%;">Prod C</th>
            <th style="width: 8%;">Amount Due</th>
            <th style="width: 10%;">Amount Received</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 30 }, (_, index) => {
            const customer = chunk[index];
            const globalIndex = chunkIndex * 30 + index + 1;
            
            if (!customer) {
              return `
                <tr style="height: 25px;">
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
                </tr>
              `;
            }
            
            return `
              <tr style="height: 25px;">
                <td>${globalIndex}</td>
                <td style="font-weight: bold;">${customer.id}</td>
                <td style="text-align: left; padding-left: 5px;">${customer.name}</td>
                <td>${customer.phone}</td>
                <td style="text-align: left; padding-left: 5px;">${customer.address || ''}</td>
                <td>____</td>
                <td>____</td>
                <td>____</td>
                <td style="font-weight: bold;">₹${Math.abs(customer.outstandingAmount)}</td>
                <td>____</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      ${customerChunks.length > 1 ? `
        <div style="margin-top: 15px; text-align: center; font-size: 10px; color: #666;">
          Sheet ${chunkIndex + 1} of ${customerChunks.length} | Template: ${companySettings.templateFileName || 'Custom'} | Generated: ${currentDate} ${currentTime}
        </div>
      ` : ''}
    </div>
  `).join('');
};

// Add customer data to PDF (for custom template)
const addCustomerDataToPDF = async (pdf: jsPDF, route: string, customers: Customer[], companySettings: CompanySettings): Promise<void> => {
  const pageWidth = 297; // A4 landscape width
  const pageHeight = 210; // A4 landscape height
  const margin = 15;
  
  // Header
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companySettings.companyName, pageWidth / 2, margin + 10, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Custom Template Mode - Data Export', pageWidth / 2, margin + 20, { align: 'center' });
  
  // Info section
  let y = margin + 35;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Route: ${route}`, margin, y);
  pdf.text(`Date: ${format(new Date(), 'dd/MM/yyyy')}`, margin + 70, y);
  pdf.text(`Time: ${format(new Date(), 'HH:mm')}`, margin + 140, y);
  pdf.text(`Template: ${companySettings.templateFileName || 'Custom'}`, margin + 200, y);
  
  y += 20;
  
  // Customer data
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const CUSTOMERS_PER_SHEET = 25;
  let currentSheet = 1;
  
  customers.forEach((customer, index) => {
    if (index > 0 && index % CUSTOMERS_PER_SHEET === 0) {
      pdf.addPage();
      y = margin + 10;
      currentSheet++;
      
      // Header for new page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.text(`${companySettings.companyName} - Route ${route} (Sheet ${currentSheet})`, pageWidth / 2, y, { align: 'center' });
      y += 15;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
    }
    
    const customerInfo = `${index + 1}. ${customer.name} | ID: ${customer.id} | Phone: ${customer.phone} | Area: ${customer.address} | Due: ₹${Math.abs(customer.outstandingAmount)}`;
    
    // Check if we need a new page
    if (y > pageHeight - margin - 10) {
      pdf.addPage();
      y = margin + 10;
    }
    
    pdf.text(customerInfo, margin, y);
    y += 8;
  });
  
  // Footer
  pdf.setFontSize(8);
  pdf.text(
    `Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Total Customers: ${customers.length}`,
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );
};

// Fallback to professional layout (existing implementation)
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
            }
            
            .data-table th { 
              background: #e9ecef; 
              font-weight: bold;
              font-size: 9px;
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

// Generate professional route sheet HTML content for each page (existing implementation)
const generateProfessionalRouteSheetHTML = (
  route: string, 
  customers: Customer[], 
  products: Product[], 
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number
): string => {
  // Use first 3 products or default names
  const prodA = products[0]?.name || 'Prod A';
  const prodB = products[1]?.name || 'Prod B'; 
  const prodC = products[2]?.name || 'Prod C';
  
  // Generate empty rows to fill up to 30 rows
  const allRows = [...customers];
  while (allRows.length < 30) {
    allRows.push({} as Customer); // Empty customer for blank rows
  }
  
  return `
    <div class="sheet-container">
      <div class="company-header">
        ${companySettings.companyName || 'COMPANY NAME'}
      </div>

      <div class="info-row">
        <div class="info-cell">
          <span>Date: ________________</span>
        </div>
        <div class="info-cell">
          <span>Time: ________________</span>
        </div>
        <div class="info-cell">
          <span>Route: ${route}</span>
        </div>
        <div class="info-cell">
          <span>Agent: ________________</span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="3" style="width: 4%;">S.No</th>
            <th rowspan="3" style="width: 8%;">Customer ID</th>
            <th rowspan="3" style="width: 15%;">Customer Name</th>
            <th rowspan="3" style="width: 11%;">Phone Number</th>
            <th rowspan="3" style="width: 10%;">Area</th>
            <th colspan="6" style="width: 36%;">Cases</th>
            <th rowspan="3" style="width: 8%;">Amount<br>Pending</th>
            <th rowspan="3" style="width: 8%;">Amount<br>Received</th>
          </tr>
          <tr>
            <th colspan="2">${prodA}</th>
            <th colspan="2">${prodB}</th>
            <th colspan="2">${prodC}</th>
          </tr>
          <tr>
            <th style="width: 6%;">&lt;Manual&gt;</th>
            <th style="width: 6%;">&lt;Fetch&gt;</th>
            <th style="width: 6%;">&lt;Manual&gt;</th>
            <th style="width: 6%;">&lt;Fetch&gt;</th>
            <th style="width: 6%;">&lt;Manual&gt;</th>
            <th style="width: 6%;">&lt;Fetch&gt;</th>
          </tr>
        </thead>
        <tbody>
          ${allRows.map((customer, index) => {
            const globalIndex = (sheetNumber - 1) * 30 + index + 1;
            if (!customer.id) {
              return `
                <tr style="height: 25px;">
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
                </tr>
              `;
            }
            
            return `
              <tr style="height: 25px;">
                <td>${globalIndex}</td>
                <td style="font-weight: bold;">&lt;${customer.id}&gt;</td>
                <td style="text-align: left;">&lt;${customer.name}&gt;</td>
                <td>&lt;${customer.phone || ''}&gt;</td>
                <td style="text-align: left;">&lt;${customer.address || ''}&gt;</td>
                <td>&lt;Manual&gt;</td>
                <td>&lt;Fetch&gt;</td>
                <td>&lt;Manual&gt;</td>
                <td>&lt;Fetch&gt;</td>
                <td>&lt;Manual&gt;</td>
                <td>&lt;Fetch&gt;</td>
                <td style="font-weight: bold;">&lt;₹${Math.abs(customer.outstandingAmount)}&gt;</td>
                <td>&lt;Manual&gt;</td>
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

// Fallback PDF generation with professional layout
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

// Add a single sheet to the PDF (existing implementation)
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
  const companyName = companySettings.companyName || 'COMPANY NAME';
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
  pdf.text('Date: _______________', margin + 2, infoY + 7);
  
  // Time cell
  pdf.rect(margin + cellWidth, infoY, cellWidth, infoHeight);
  pdf.text('Time: _______________', margin + cellWidth + 2, infoY + 7);
  
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
  
  // Column widths (proportional)
  const colWidths = [15, 25, 45, 35, 35, 20, 20, 20, 20, 20, 20, 30, 25]; // Simplified to 13 columns
  const scaleFactor = tableWidth / 310;
  const scaledWidths = colWidths.map(w => w * scaleFactor);
  
  let currentX = margin;
  let currentY = tableY;
  
  // Header rows
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  
  // Main header
  const headers = ['S.No', 'Customer ID', 'Customer Name', 'Phone Number', 'Area', 'Prod A', 'Rate', 'Prod B', 'Rate', 'Prod C', 'Rate', 'Amount Due', 'Received'];
  
  currentX = margin;
  for (let i = 0; i < headers.length; i++) {
    const width = scaledWidths[i];
    pdf.rect(currentX, currentY, width, rowHeight * 2);
    pdf.text(headers[i], currentX + 2, currentY + 7);
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
    
    // Data for each column
    const rowData = [
      globalIndex.toString(),
      customer.id || '',
      customer.name || '',
      customer.phone || '',
      customer.address || '',
      '', // Prod A quantity
      '', // Prod A rate
      '', // Prod B quantity
      '', // Prod B rate
      '', // Prod C quantity
      '', // Prod C rate
      customer.outstandingAmount ? `₹${Math.abs(customer.outstandingAmount)}` : '',
      '' // Received amount
    ];
    
    for (let j = 0; j < rowData.length; j++) {
      const width = scaledWidths[j];
      pdf.rect(currentX, currentY, width, rowHeight);
      if (rowData[j]) {
        pdf.text(rowData[j], currentX + 1, currentY + 3.5);
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
