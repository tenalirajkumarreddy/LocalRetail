import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Customer, Product, CompanySettings } from '../types';
import { format } from 'date-fns';
import { getProducts, getCompanySettings } from './storage';

// Generate route sheet for printing (opens browser print dialog)
export const printRouteSheet = async (route: string, customers: Customer[]): Promise<void> => {
  const routeSheetHTML = generateRouteSheetHTML(route, customers);
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Route ${route} Sheet - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: center; }
            .company-header { text-align: center; font-size: 24px; font-weight: bold; border: 2px solid #000; padding: 10px; margin-bottom: 20px; }
            .info-row { display: flex; border: 1px solid #000; margin-bottom: 20px; }
            .info-cell { flex: 1; padding: 8px; border-right: 1px solid #000; }
            .info-cell:last-child { border-right: none; }
            .manual-field { border-bottom: 1px solid #000; min-height: 20px; display: inline-block; min-width: 50px; }
            .fetch-field { font-weight: bold; color: #333; }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${routeSheetHTML}
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Print</button>
            <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  }
};

// Generate route sheet HTML content
const generateRouteSheetHTML = (route: string, customers: Customer[]): string => {
  const products = getProducts();
  const companySettings = getCompanySettings();
  
  // Use only first 3 products for the fixed format (Prod A, Prod B, Prod C)
  const fixedProducts = products.slice(0, 3);
  
  return `
    <div class="company-header">${companySettings.companyName}</div>

    <div class="info-row">
      <div class="info-cell">
        <strong>Date:</strong> <span class="manual-field"></span>
      </div>
      <div class="info-cell">
        <strong>Time:</strong> <span class="manual-field"></span>
      </div>
      <div class="info-cell">
        <strong>Route:</strong> <span class="fetch-field">${route}</span>
      </div>
      <div class="info-cell">
        <strong>Agent:</strong> <span class="manual-field"></span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2">S.No</th>
          <th rowspan="2">Customer ID</th>
          <th rowspan="2">Customer Name</th>
          <th rowspan="2">Phone Number</th>
          <th rowspan="2">Area</th>
          <th colspan="6">Cases</th>
          <th rowspan="2">Amount Pending</th>
          <th rowspan="2">Amount Received</th>
        </tr>
        <tr>
          <th style="font-size: 10px;">${fixedProducts[0]?.name || 'Prod A'}</th>
          <th style="font-size: 10px;">Rate</th>
          <th style="font-size: 10px;">${fixedProducts[1]?.name || 'Prod B'}</th>
          <th style="font-size: 10px;">Rate</th>
          <th style="font-size: 10px;">${fixedProducts[2]?.name || 'Prod C'}</th>
          <th style="font-size: 10px;">Rate</th>
        </tr>
      </thead>
      <tbody>
        ${customers.map((customer, index) => `
          <tr>
            <td>${index + 1}</td>
            <td class="fetch-field">${customer.id}</td>
            <td class="fetch-field">${customer.name}</td>
            <td class="fetch-field">${customer.phone}</td>
            <td class="fetch-field">${customer.address || ''}</td>
            <td><span class="manual-field"></span></td>
            <td class="fetch-field" style="font-size: 10px;">₹${fixedProducts[0] ? (customer.productPrices[fixedProducts[0].id] || fixedProducts[0].defaultPrice || 0) : 0}</td>
            <td><span class="manual-field"></span></td>
            <td class="fetch-field" style="font-size: 10px;">₹${fixedProducts[1] ? (customer.productPrices[fixedProducts[1].id] || fixedProducts[1].defaultPrice || 0) : 0}</td>
            <td><span class="manual-field"></span></td>
            <td class="fetch-field" style="font-size: 10px;">₹${fixedProducts[2] ? (customer.productPrices[fixedProducts[2].id] || fixedProducts[2].defaultPrice || 0) : 0}</td>
            <td class="fetch-field">₹${Math.abs(customer.outstandingAmount)}</td>
            <td><span class="manual-field"></span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
};

export const generateRouteSheetPDF = async (route: string, customers: Customer[]): Promise<void> => {
  const products = getProducts();
  const companySettings = getCompanySettings();
  
  // Use only first 3 products for the fixed format (Prod A, Prod B, Prod C)
  const fixedProducts = products.slice(0, 3);
  
  // Create a temporary div for the route sheet
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm';
  tempDiv.style.padding = '20px';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  tempDiv.style.fontSize = '12px';
  tempDiv.style.backgroundColor = 'white';

  tempDiv.innerHTML = `
    <div style="text-align: center; margin-bottom: 20px; border: 2px solid #000;">
      <h1 style="font-size: 24px; margin: 10px 0; color: #000; font-weight: bold;">${companySettings.companyName}</h1>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border: 1px solid #000;">
      <div style="border-right: 1px solid #000; padding: 8px; flex: 1;">
        <strong>Date:</strong> <generated date>
      </div>
      <div style="border-right: 1px solid #000; padding: 8px; flex: 1;">
        <strong>Time:</strong> <gene time>
      </div>
      <div style="border-right: 1px solid #000; padding: 8px; flex: 1;">
        <strong>Route:</strong> ${route}
      </div>
      <div style="padding: 8px; flex: 1;">
        <strong>Agent:</strong> <Manual Filling>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; border: 2px solid #000;">
      <thead>
        <tr>
          <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">S.No</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">Customer ID</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">Customer Name</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">Phone Number</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">Area</th>
          <th colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Cases</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">Amount Pending</th>
          <th rowspan="2" style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold; vertical-align: middle;">Amount Received</th>
        </tr>
        <tr>
          <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">${fixedProducts[0]?.name || 'Prod A'}</th>
          <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">Rate</th>
          <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">${fixedProducts[1]?.name || 'Prod B'}</th>
          <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">Rate</th>
          <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">${fixedProducts[2]?.name || 'Prod C'}</th>
          <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">Rate</th>
        </tr>
      </thead>
      <tbody>
        ${customers.map((customer, index) => `
          <tr>
            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${customer.id}</td>
            <td style="border: 1px solid #000; padding: 8px;">${customer.name}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center;">${customer.phone}</td>
            <td style="border: 1px solid #000; padding: 8px;">${customer.address || ''}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px;"></td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10px;">₹${fixedProducts[0] ? (customer.productPrices[fixedProducts[0].id] || fixedProducts[0].defaultPrice || 0) : 0}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px;"></td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10px;">₹${fixedProducts[1] ? (customer.productPrices[fixedProducts[1].id] || fixedProducts[1].defaultPrice || 0) : 0}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px;"></td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10px;">₹${fixedProducts[2] ? (customer.productPrices[fixedProducts[2].id] || fixedProducts[2].defaultPrice || 0) : 0}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center;">₹${Math.abs(customer.outstandingAmount)}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: center; width: 80px;"></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.body.appendChild(tempDiv);

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Route-${route}-Sheet-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  } finally {
    document.body.removeChild(tempDiv);
  }
};