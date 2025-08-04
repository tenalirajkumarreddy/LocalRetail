import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Customer, Product, CompanySettings } from '../types';
import { format } from 'date-fns';
import { getProducts, getCompanySettings } from './storage';

export const generateRouteSheetPDF = async (route: string, customers: Customer[]): Promise<void> => {
  const products = getProducts();
  const companySettings = getCompanySettings();
  
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
        <strong>Date:</strong> ${format(new Date(), 'dd/MM/yyyy')}
      </div>
      <div style="border-right: 1px solid #000; padding: 8px; flex: 1;">
        <strong>Time:</strong> ${format(new Date(), 'HH:mm')}
      </div>
      <div style="border-right: 1px solid #000; padding: 8px; flex: 1;">
        <strong>Route:</strong> ${route}
      </div>
      <div style="padding: 8px; flex: 1;">
        <strong>Agent:</strong> ________________
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
          ${products.map(product => `
            <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">${product.name}</th>
            <th style="border: 1px solid #000; padding: 4px; text-align: center; font-weight: bold; font-size: 10px;">Rate</th>
          `).join('')}
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
            ${products.map(product => `
              <td style="border: 1px solid #000; padding: 8px; text-align: center; width: 40px;"></td>
              <td style="border: 1px solid #000; padding: 8px; text-align: center; font-size: 10px;">₹${customer.productPrices[product.id] || 0}</td>
            `).join('')}
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