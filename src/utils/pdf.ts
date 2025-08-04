import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Customer } from '../types';
import { format } from 'date-fns';

export const generateRouteSheetPDF = async (route: string, customers: Customer[]): Promise<void> => {
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
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="font-size: 24px; margin-bottom: 10px; color: #1f2937;">Route ${route} - Delivery Sheet</h1>
      <p style="color: #6b7280; margin: 0;">Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
      <p style="color: #6b7280; margin: 5px 0 0 0;">Total Customers: ${customers.length}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">S.No</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Customer ID</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Customer Name</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Phone</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Product 1 Price</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Product 2 Price</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Product 3 Price</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Outstanding</th>
          <th style="border: 1px solid #d1d5db; padding: 12px; text-align: left; font-weight: bold;">Signature</th>
        </tr>
      </thead>
      <tbody>
        ${customers.map((customer, index) => `
          <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : ''}">
            <td style="border: 1px solid #d1d5db; padding: 12px;">${index + 1}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px; font-weight: bold;">${customer.id}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${customer.name}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">${customer.phone}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">₹${customer.productPrices.product1}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">₹${customer.productPrices.product2}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px;">₹${customer.productPrices.product3}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px; color: ${customer.outstandingAmount >= 0 ? '#dc2626' : '#16a34a'};">₹${Math.abs(customer.outstandingAmount)}</td>
            <td style="border: 1px solid #d1d5db; padding: 12px; height: 40px;"></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div style="margin-top: 40px; display: flex; justify-content: space-between;">
      <div>
        <p style="margin: 0; font-weight: bold;">Delivery Person: ________________</p>
        <p style="margin: 10px 0 0 0;">Date: ________________</p>
      </div>
      <div>
        <p style="margin: 0; font-weight: bold;">Supervisor Signature: ________________</p>
        <p style="margin: 10px 0 0 0;">Time: ________________</p>
      </div>
    </div>

    <div style="margin-top: 30px; padding: 15px; background-color: #f3f4f6; border-radius: 8px;">
      <h3 style="margin: 0 0 10px 0; color: #374151;">Instructions:</h3>
      <ul style="margin: 0; padding-left: 20px;">
        <li>Verify customer ID and phone number before delivery</li>
        <li>Collect payment and update outstanding amount</li>
        <li>Get customer signature for confirmation</li>
        <li>Report any issues to supervisor immediately</li>
      </ul>
    </div>
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