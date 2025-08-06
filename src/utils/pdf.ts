import jsPDF from 'jspdf';
import { Customer, Product, CompanySettings } from '../types';
import { format } from 'date-fns';
import { getProducts, getCompanySettings } from './supabase-storage';
import { getSheetById, SheetRecord } from './supabase-storage';

// Generate route sheet for printing - uses appropriate layout based on sheet status
export const printRouteSheet = async (route: string, customers: Customer[], sheetId?: string, sheetData?: SheetRecord): Promise<void> => {
  const companySettings = await getCompanySettings();
  // Determine sheet status - default to 'active' if not provided
  const sheetStatus = sheetData?.status || 'active';
  await printWithProfessionalLayout(route, customers, companySettings, sheetId, sheetData, sheetStatus);
};

// Generate route sheet PDF - uses appropriate layout based on sheet status
export const generateRouteSheetPDF = async (route: string, customers: Customer[], sheetId?: string, sheetData?: SheetRecord): Promise<void> => {
  const companySettings = await getCompanySettings();
  // Determine sheet status - default to 'active' if not provided
  const sheetStatus = sheetData?.status || 'active';
  await generatePDFWithProfessionalLayout(route, customers, companySettings, sheetId, sheetData, sheetStatus);
};

// Professional layout for printing with proper sheet data and status-based layout
const printWithProfessionalLayout = async (route: string, customers: Customer[], companySettings: CompanySettings, sheetId?: string, sheetData?: SheetRecord, sheetStatus?: 'active' | 'closed'): Promise<void> => {
  const products = await getProducts();
  
  // Use provided status or default to 'active'
  const status = sheetStatus || sheetData?.status || 'active';
  
  // Generate unique sheet ID if not provided (format: ROUTE-YYYYMMDD-ROUTECODE)
  const currentDate = format(new Date(), 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Use provided sheet data or fetch from database if sheetId is provided
  let sheetCreationDate = new Date();
  if (sheetData && sheetData.createdAt) {
    // Use the sheet data that was passed in (from SheetsHistory component)
    sheetCreationDate = new Date(sheetData.createdAt);
  } else if (sheetId) {
    // Fallback: try to fetch from database if no sheet data was provided
    try {
      const fetchedSheetData = await getSheetById(sheetId);
      if (fetchedSheetData && fetchedSheetData.createdAt) {
        sheetCreationDate = new Date(fetchedSheetData.createdAt);
      }
    } catch (error) {
      console.warn('Could not fetch sheet creation date, using current date:', error);
    }
  }
  
  // Split customers into chunks of 25 per sheet
  const CUSTOMERS_PER_SHEET = 25;
  const customerChunks = [];
  for (let i = 0; i < customers.length; i += CUSTOMERS_PER_SHEET) {
    customerChunks.push(customers.slice(i, i + CUSTOMERS_PER_SHEET));
  }

  // Calculate summary values for closed sheets
  let summaryValues: { totalSale: string; totalDue: string; totalCollected: string; totalAmountReceived: string; amountPending: string; routeOutstanding: string; newRouteOutstanding: string; } | undefined;
  if (status === 'closed' && sheetData) {
    const { deliveryData, amountReceived } = sheetData;
    
    let totalSale = 0;
    let totalDue = 0;
    let totalCollected = 0;
    let totalAmountReceived = 0;

    customers.forEach((customer) => {
      // Calculate current outstanding
      totalDue += Math.abs(customer.outstandingAmount || 0);
      
      // Calculate total sale from delivery data
      if (deliveryData && deliveryData[customer.id]) {
        const customerDelivery = deliveryData[customer.id];
        
        const product500ml = products.find(p => p.name === '500 ML' || p.name === 'Product A');
        const product1ltr = products.find(p => p.name === '1 Ltr' || p.name === 'Product B');
        const product250ml = products.find(p => p.name === '250 ML' || p.name === 'Product C');
        
        const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 25;
        const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
        const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
        
        if (product500ml?.id && customerDelivery[product500ml.id]) {
          totalSale += customerDelivery[product500ml.id].quantity * rate500ml;
        }
        if (product1ltr?.id && customerDelivery[product1ltr.id]) {
          totalSale += customerDelivery[product1ltr.id].quantity * rate1ltr;
        }
        if (product250ml?.id && customerDelivery[product250ml.id]) {
          totalSale += customerDelivery[product250ml.id].quantity * rate250ml;
        }
      }
      
      // Calculate total collected and total received
      if (amountReceived && amountReceived[customer.id]) {
        const payment = amountReceived[customer.id];
        totalCollected += (payment.cash || 0) + (payment.upi || 0);
        totalAmountReceived += payment.total || 0;
      }
    });

    // Calculate derived values
    const amountPending = totalSale - totalAmountReceived;
    
    // Old Route Outstanding: stored value from when sheet was generated
    const oldRouteOutstanding = sheetData.routeOutstanding || 0;
    
    // New Route Outstanding: calculated using formula
    const newRouteOutstandingFormula = oldRouteOutstanding + totalSale - totalAmountReceived;
    
    // New Route Outstanding: sum of current customer outstandings (should match formula)
    const newRouteOutstandingSum = customers.reduce((total, customer) => {
      return total + Math.abs(customer.outstandingAmount || 0);
    }, 0);
    
    // Debug: Log both calculation methods to verify they match
    console.log('Route Outstanding Calculation Comparison:');
    console.log('Old Route Outstanding (stored):', oldRouteOutstanding);
    console.log('Total Sale:', totalSale);
    console.log('Amount Total (received):', totalAmountReceived);
    console.log('Formula: Old + Total Sale - Amount Total =', newRouteOutstandingFormula);
    console.log('Sum of Current Customer Outstandings =', newRouteOutstandingSum);
    console.log('Difference:', Math.abs(newRouteOutstandingFormula - newRouteOutstandingSum));

    summaryValues = {
      totalSale: totalSale.toString(),
      totalDue: totalDue.toString(),
      totalCollected: totalCollected.toString(),
      totalAmountReceived: totalAmountReceived.toString(),
      amountPending: amountPending.toString(),
      routeOutstanding: oldRouteOutstanding.toString(),
      newRouteOutstanding: newRouteOutstandingFormula.toString() // Using formula method
    };
  }
  
  // Create a new window for printing with landscape orientation
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const sheetsHTML = customerChunks.map((chunk, sheetIndex) => 
      generateProfessionalRouteSheetHTML(route, chunk, products, companySettings, sheetIndex + 1, customerChunks.length, routeSheetId, sheetCreationDate, status, sheetData, summaryValues)
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

// Generate professional route sheet HTML content for each page with status-based layout
const generateProfessionalRouteSheetHTML = (
  route: string, 
  customers: Customer[], 
  products: Product[], 
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number,
  sheetId?: string,
  sheetCreationDate?: Date,
  sheetStatus?: 'active' | 'closed',
  sheetData?: SheetRecord,
  summaryValues?: { totalSale: string; totalDue: string; totalCollected: string; totalAmountReceived: string; amountPending: string; routeOutstanding: string; newRouteOutstanding: string; }
): string => {
  // Use provided sheet creation date or current date as fallback
  const sheetGenerationDate = sheetCreationDate || new Date();
  const currentDate = format(sheetGenerationDate, 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Determine if this is a closed sheet (needs Amount Total column)
  const isClosed = sheetStatus === 'closed';
  
  // Use first 3 products or default names
  const prodA = products[0]?.name || '500 ML';
  const prodB = products[1]?.name || '1 Ltr'; 
  const prodC = products[2]?.name || '250 ML';
  
  // Generate empty rows to fill up to 25 rows (only for active sheets)
  const allRows = [...customers];
  if (!isClosed) {
    // Only add empty rows for active sheets
    while (allRows.length < 25) {
      allRows.push({} as Customer); // Empty customer for blank rows
    }
  } else {
    // For closed sheets, filter customers who actually bought products
    const customersWithPurchases = customers.filter(customer => {
      if (!sheetData?.deliveryData) return false;
      const deliveryData = typeof sheetData.deliveryData === 'string' 
        ? JSON.parse(sheetData.deliveryData) 
        : sheetData.deliveryData;
      return deliveryData && deliveryData[customer.id];
    });
    allRows.length = 0; // Clear the array
    allRows.push(...customersWithPurchases);
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
            <th colspan="2" style="width: ${isClosed ? '10%' : '12%'};">Amount Received</th>
            ${isClosed ? '<th rowspan="3" style="width: 7%;">Amount<br>Total</th>' : ''}
          </tr>
          <tr>
            <th colspan="2">${prodA}</th>
            <th colspan="2">${prodB}</th>
            <th colspan="2">${prodC}</th>
            <th style="width: ${isClosed ? '5%' : '6%'};">CASH</th>
            <th style="width: ${isClosed ? '5%' : '6%'};">UPI</th>
            ${isClosed ? '' : ''}
          </tr>
          <tr>
            <th style="width: 6%; font-size: 7px;">Qty</th>
            <th style="width: 6%; font-size: 7px;">Rate</th>
            <th style="width: 6%; font-size: 7px;">Qty</th>
            <th style="width: 6%; font-size: 7px;">Rate</th>
            <th style="width: 6%; font-size: 7px;">Qty</th>
            <th style="width: 6%; font-size: 7px;">Rate</th>
            <th style="width: ${isClosed ? '5%' : '6%'}; font-size: 7px;"></th>
            <th style="width: ${isClosed ? '5%' : '6%'}; font-size: 7px;"></th>
            ${isClosed ? '' : ''}
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
                  ${isClosed ? '<td></td>' : ''}
                </tr>
              `;
            }
            
            // Get customer-specific product prices (custom prices from customer.productPrices)
            // Try to match products by name patterns first, then fall back to array index
            const product500ml = products.find(p => 
              p.name.toLowerCase().includes('500ml') || 
              p.name.toLowerCase().includes('500') ||
              p.name.toLowerCase().includes('product a') ||
              p.name.toLowerCase().includes('a')
            ) || products[0];
            
            const product1ltr = products.find(p => 
              p.name.toLowerCase().includes('1ltr') || 
              p.name.toLowerCase().includes('1l') || 
              p.name.toLowerCase().includes('liter') ||
              p.name.toLowerCase().includes('product b') ||
              p.name.toLowerCase().includes('b')
            ) || products[1];
            
            const product250ml = products.find(p => 
              p.name.toLowerCase().includes('250ml') || 
              p.name.toLowerCase().includes('250') ||
              p.name.toLowerCase().includes('product c') ||
              p.name.toLowerCase().includes('c')
            ) || products[2];
            
            // Use customer-specific pricing if available, otherwise default pricing with proper null checks
            const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 20;
            const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
            const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
            
            // For closed sheets, get delivery data and payment info
            let quantities = { qty500ml: '', qty1ltr: '', qty250ml: '' };
            let totals = { total500ml: '', total1ltr: '', total250ml: '', grandTotal: '', amountTotal: '' };
            let payments = { cash: '', upi: '' };
            
            if (isClosed && sheetData) {
              // Parse delivery data
              const deliveryData = typeof sheetData.deliveryData === 'string' 
                ? JSON.parse(sheetData.deliveryData) 
                : sheetData.deliveryData;
              
              // Parse amount received data
              const amountReceived = typeof sheetData.amountReceived === 'string'
                ? JSON.parse(sheetData.amountReceived)
                : sheetData.amountReceived;
              
              if (deliveryData && deliveryData[customer.id]) {
                const customerDelivery = deliveryData[customer.id];
                let grandTotalAmount = 0;
                
                // Get quantities and calculate totals for each product
                if (product500ml?.id && customerDelivery[product500ml.id]) {
                  quantities.qty500ml = customerDelivery[product500ml.id].quantity.toString();
                  totals.total500ml = (customerDelivery[product500ml.id].quantity * rate500ml).toString();
                  grandTotalAmount += customerDelivery[product500ml.id].quantity * rate500ml;
                } else {
                  quantities.qty500ml = '0'; // Show 0 instead of empty
                }
                
                if (product1ltr?.id && customerDelivery[product1ltr.id]) {
                  quantities.qty1ltr = customerDelivery[product1ltr.id].quantity.toString();
                  totals.total1ltr = (customerDelivery[product1ltr.id].quantity * rate1ltr).toString();
                  grandTotalAmount += customerDelivery[product1ltr.id].quantity * rate1ltr;
                } else {
                  quantities.qty1ltr = '0'; // Show 0 instead of empty
                }
                
                if (product250ml?.id && customerDelivery[product250ml.id]) {
                  quantities.qty250ml = customerDelivery[product250ml.id].quantity.toString();
                  totals.total250ml = (customerDelivery[product250ml.id].quantity * rate250ml).toString();
                  grandTotalAmount += customerDelivery[product250ml.id].quantity * rate250ml;
                } else {
                  quantities.qty250ml = '0'; // Show 0 instead of empty
                }
                
                totals.grandTotal = grandTotalAmount.toString();
              }
              
              // Get payment information
              if (amountReceived && amountReceived[customer.id]) {
                const customerPayment = amountReceived[customer.id];
                payments.cash = customerPayment.cash?.toString() || '0';
                payments.upi = customerPayment.upi?.toString() || '0';
                // Amount Total should be the total from amount_received
                totals.amountTotal = customerPayment.total?.toString() || '0';
              } else {
                payments.cash = '0';
                payments.upi = '0';
                totals.amountTotal = '0';
              }
            }
            
            return `
              <tr style="height: 22px;">
                <td>${globalIndex}</td>
                <td style="font-size: 8px; font-weight: bold;">${customer.id}</td>
                <td style="text-align: left; font-size: 8px;">${customer.name}</td>
                <td style="font-size: 7px; font-weight: bold;">${customer.phone || ''}</td>
                <td style="text-align: left; font-size: 8px;">${customer.address || ''}</td>
                <td style="font-size: 7px;">${isClosed ? quantities.qty500ml : ''}</td>
                <td style="font-size: 7px;">${rate500ml}</td>
                <td style="font-size: 7px;">${isClosed ? quantities.qty1ltr : ''}</td>
                <td style="font-size: 7px;">${rate1ltr}</td>
                <td style="font-size: 7px;">${isClosed ? quantities.qty250ml : ''}</td>
                <td style="font-size: 7px;">${rate250ml}</td>
                <td style="font-size: 7px;">${isClosed ? totals.grandTotal : ''}</td>
                <td style="font-weight: bold; font-size: 8px;">${Math.abs(customer.outstandingAmount || 0)}</td>
                <td>${isClosed ? payments.cash : ''}</td>
                <td>${isClosed ? payments.upi : ''}</td>
                ${isClosed ? `<td style="font-weight: bold; font-size: 8px;">${totals.amountTotal}</td>` : ''}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      ${isClosed ? `
        <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
          <table style="width: 40%; border-collapse: collapse; border: 0.5px solid #000;">
            <tr>
              <th colspan="2" style="border: 0.5px solid #000; padding: 5px 2px; text-align: center; font-size: 9px; font-weight: bold; background: #e9ecef; height: 22px;">Summary</th>
            </tr>
            <tr style="height: 22px;">
              <td style="border: 0.5px solid #000; padding: 5px 8px; font-size: 9px; font-weight: bold; width: 50%;">Total Sale:</td>
              <td style="border: 0.5px solid #000; padding: 5px 2px; font-size: 9px; width: 50%;">${summaryValues?.totalSale || ''}</td>
            </tr>
            <tr style="height: 22px;">
              <td style="border: 0.5px solid #000; padding: 5px 8px; font-size: 9px; font-weight: bold; width: 50%;">Amount Due:</td>
              <td style="border: 0.5px solid #000; padding: 5px 2px; font-size: 9px; width: 50%;">${summaryValues?.totalDue || ''}</td>
            </tr>
            <tr style="height: 22px;">
              <td style="border: 0.5px solid #000; padding: 5px 8px; font-size: 9px; font-weight: bold; width: 50%;">Amount Total:</td>
              <td style="border: 0.5px solid #000; padding: 5px 2px; font-size: 9px; width: 50%;">${summaryValues?.totalAmountReceived || ''}</td>
            </tr>
            <tr style="height: 22px;">
              <td style="border: 0.5px solid #000; padding: 5px 8px; font-size: 9px; font-weight: bold; width: 50%;">Amount Pending:</td>
              <td style="border: 0.5px solid #000; padding: 5px 2px; font-size: 9px; width: 50%;">${summaryValues?.amountPending || ''}</td>
            </tr>
            <tr style="height: 22px;">
              <td style="border: 0.5px solid #000; padding: 5px 8px; font-size: 9px; font-weight: bold; width: 50%;">Old Route Outstanding:</td>
              <td style="border: 0.5px solid #000; padding: 5px 2px; font-size: 9px; width: 50%;">${summaryValues?.routeOutstanding || ''}</td>
            </tr>
            <tr style="height: 22px;">
              <td style="border: 0.5px solid #000; padding: 5px 8px; font-size: 9px; font-weight: bold; width: 50%;">New Route Outstanding:</td>
              <td style="border: 0.5px solid #000; padding: 5px 2px; font-size: 9px; width: 50%;">${summaryValues?.newRouteOutstanding || ''}</td>
            </tr>
          </table>
        </div>
      ` : ''}
      
      ${totalSheets > 1 ? `
        <div style="margin-top: 10px; text-align: center; font-size: 9px; color: #666;">
          Sheet ${sheetNumber} of ${totalSheets} | Route: ${route} | ID: ${routeSheetId} | Generated: ${format(sheetGenerationDate, 'dd/MM/yyyy HH:mm')}
        </div>
      ` : ''}
    </div>
  `;
};

// PDF generation with professional layout and status-based layout
const generatePDFWithProfessionalLayout = async (route: string, customers: Customer[], companySettings: CompanySettings, sheetId?: string, sheetData?: SheetRecord, sheetStatus?: 'active' | 'closed'): Promise<void> => {
  const products = await getProducts();
  
  // Use provided status or default to 'active'
  const status = sheetStatus || sheetData?.status || 'active';
  
  // Generate unique sheet ID if not provided
  const currentDate = format(new Date(), 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Use provided sheet data or fetch from database if sheetId is provided
  let sheetCreationDate = new Date();
  if (sheetData && sheetData.createdAt) {
    // Use the sheet data that was passed in (from SheetsHistory component)
    sheetCreationDate = new Date(sheetData.createdAt);
  } else if (sheetId) {
    // Fallback: try to fetch from database if no sheet data was provided
    try {
      const fetchedSheetData = await getSheetById(sheetId);
      if (fetchedSheetData && fetchedSheetData.createdAt) {
        sheetCreationDate = new Date(fetchedSheetData.createdAt);
      }
    } catch (error) {
      console.warn('Could not fetch sheet creation date, using current date:', error);
    }
  }
  
  // Split customers into chunks of 25 per sheet
  const CUSTOMERS_PER_SHEET = 25;
  const customerChunks = [];
  for (let i = 0; i < customers.length; i += CUSTOMERS_PER_SHEET) {
    customerChunks.push(customers.slice(i, i + CUSTOMERS_PER_SHEET));
  }
  
  // Debug: Log first customer's pricing data to verify it's working
  if (customers.length > 0) {
    const firstCustomer = customers[0];
    console.log('PDF Generation Debug - First Customer:');
    console.log('Customer ID:', firstCustomer.id);
    console.log('Customer productPrices:', firstCustomer.productPrices);
    console.log('Available products:', products.map(p => ({ id: p.id, name: p.name, defaultPrice: p.defaultPrice })));
  }
  
  const pdf = new jsPDF('landscape', 'mm', 'a4'); // Landscape A4
  
  for (let chunkIndex = 0; chunkIndex < customerChunks.length; chunkIndex++) {
    if (chunkIndex > 0) {
      pdf.addPage();
    }
    
    const chunk = customerChunks[chunkIndex];
    await addSheetToPDF(pdf, route, chunk, products, companySettings, chunkIndex + 1, customerChunks.length, routeSheetId, sheetCreationDate, status, sheetData);
  }
  
  pdf.save(`Route-${route}-Sheet-${format(sheetCreationDate, 'dd-MM-yyyy')}.pdf`);
};

// Add a single sheet to the PDF with proper data fetching, Sheet ID, and status-based layout
const addSheetToPDF = async (
  pdf: jsPDF,
  route: string,
  customers: Customer[],
  products: Product[],
  companySettings: CompanySettings,
  sheetNumber: number,
  totalSheets: number,
  sheetId?: string,
  sheetCreationDate?: Date,
  sheetStatus?: 'active' | 'closed',
  sheetData?: SheetRecord
): Promise<void> => {
  const pageWidth = 297; // A4 landscape width
  const pageHeight = 210; // A4 landscape height
  const margin = 8;
  
  // Determine if this is a closed sheet (needs Amount Total column)
  const isClosed = sheetStatus === 'closed';
  
  // Use provided sheet creation date or current date as fallback
  const sheetGenerationDate = sheetCreationDate || new Date();
  const currentDate = format(sheetGenerationDate, 'yyyyMMdd');
  const routeSheetId = sheetId || `ROUTE-${currentDate}-${route}`;
  
  // Set consistent line width for all borders
  pdf.setLineWidth(0.2); // Reduced border width for cleaner look
  
  // Get product names for headers
  const prodA = products[0]?.name || '500ML';
  const prodB = products[1]?.name || '1Ltr'; 
  const prodC = products[2]?.name || '250ML';
  
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
  
  // Optimized column widths - conditional based on sheet status
  // Active: [S.No, Cust ID, Cust Name, Phone, Area, 500ML, Rate, 1Ltr, Rate, 250ML, Rate, Total, Amount Due, CASH, UPI] = 15 columns
  // Closed: [S.No, Cust ID, Cust Name, Phone, Area, 500ML, Rate, 1Ltr, Rate, 250ML, Rate, Total, Amount Due, CASH, UPI, Amount Total] = 16 columns
  const colWidths = isClosed 
    ? [10, 18, 36, 26, 43, 13, 13, 13, 13, 13, 13, 20, 22, 14, 14, 18] // 16 columns for closed sheets
    : [10, 18, 36, 26, 43, 13, 13, 13, 13, 13, 13, 20, 22, 16, 16]; // 15 columns for active sheets
  const scaleFactor = tableWidth / colWidths.reduce((a, b) => a + b);
  const scaledWidths = colWidths.map(w => w * scaleFactor);
  
  let currentX = margin;
  let currentY = tableY;
  
  // Header rows - with proper centering and wrapping
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  
  // Main headers - conditionally include Amount Total for closed sheets
  const headers = isClosed 
    ? ['S.No', 'Customer ID', 'Customer Name', 'Phone Number', 'Area', prodA, 'Rate', prodB, 'Rate', prodC, 'Rate', 'Total', 'Amount Due', 'CASH', 'UPI', 'Amount Total']
    : ['S.No', 'Customer ID', 'Customer Name', 'Phone Number', 'Area', prodA, 'Rate', prodB, 'Rate', prodC, 'Rate', 'Total', 'Amount Due', 'CASH', 'UPI'];
  
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
  
  // Fill up to 25 rows (only for active sheets)
  const allRows = [...customers];
  if (sheetStatus !== 'closed') {
    // Only add empty rows for active sheets
    while (allRows.length < 25) {
      allRows.push({} as Customer); // Empty customer for blank rows
    }
  } else {
    // For closed sheets, filter customers who actually bought products
    const customersWithPurchases = customers.filter(customer => {
      if (!sheetData?.deliveryData) return false;
      const deliveryData = typeof sheetData.deliveryData === 'string' 
        ? JSON.parse(sheetData.deliveryData) 
        : sheetData.deliveryData;
      return deliveryData && deliveryData[customer.id];
    });
    allRows.length = 0; // Clear the array
    allRows.push(...customersWithPurchases);
  }
  
  for (let i = 0; i < allRows.length; i++) {
    const customer = allRows[i];
    const globalIndex = (sheetNumber - 1) * 25 + i + 1;
    
    currentX = margin;
    
    // Get product prices and use customer-specific pricing
    // Try to match products by name patterns first, then fall back to array index  
    const product500ml = products.find(p => 
      p.name.toLowerCase().includes('500ml') || 
      p.name.toLowerCase().includes('500') ||
      p.name.toLowerCase().includes('product a') ||
      p.name.toLowerCase().includes('a')
    ) || products[0];
    
    const product1ltr = products.find(p => 
      p.name.toLowerCase().includes('1ltr') || 
      p.name.toLowerCase().includes('1l') || 
      p.name.toLowerCase().includes('liter') ||
      p.name.toLowerCase().includes('product b') ||
      p.name.toLowerCase().includes('b')
    ) || products[1];
    
    const product250ml = products.find(p => 
      p.name.toLowerCase().includes('250ml') || 
      p.name.toLowerCase().includes('250') ||
      p.name.toLowerCase().includes('product c') ||
      p.name.toLowerCase().includes('c')
    ) || products[2];
    
    // Use customer-specific pricing if available, otherwise default pricing with proper null checks
    const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 20;
    const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
    const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
    
    // For closed sheets, get delivery data and payment info
    let quantities = { qty500ml: '', qty1ltr: '', qty250ml: '' };
    let totals = { total500ml: '', total1ltr: '', total250ml: '', grandTotal: '', amountTotal: '' };
    let payments = { cash: '', upi: '' };
    
    if (isClosed && sheetData && customer.id) {
      // Parse delivery data
      const deliveryData = typeof sheetData.deliveryData === 'string' 
        ? JSON.parse(sheetData.deliveryData) 
        : sheetData.deliveryData;
      
      // Parse amount received data
      const amountReceived = typeof sheetData.amountReceived === 'string'
        ? JSON.parse(sheetData.amountReceived)
        : sheetData.amountReceived;
      
      if (deliveryData && deliveryData[customer.id]) {
        const customerDelivery = deliveryData[customer.id];
        let grandTotalAmount = 0;
        
        // Get quantities and calculate totals for each product
        if (product500ml?.id && customerDelivery[product500ml.id]) {
          quantities.qty500ml = customerDelivery[product500ml.id].quantity.toString();
          totals.total500ml = (customerDelivery[product500ml.id].quantity * rate500ml).toString();
          grandTotalAmount += customerDelivery[product500ml.id].quantity * rate500ml;
        } else {
          quantities.qty500ml = '0'; // Show 0 instead of empty
        }
        
        if (product1ltr?.id && customerDelivery[product1ltr.id]) {
          quantities.qty1ltr = customerDelivery[product1ltr.id].quantity.toString();
          totals.total1ltr = (customerDelivery[product1ltr.id].quantity * rate1ltr).toString();
          grandTotalAmount += customerDelivery[product1ltr.id].quantity * rate1ltr;
        } else {
          quantities.qty1ltr = '0'; // Show 0 instead of empty
        }
        
        if (product250ml?.id && customerDelivery[product250ml.id]) {
          quantities.qty250ml = customerDelivery[product250ml.id].quantity.toString();
          totals.total250ml = (customerDelivery[product250ml.id].quantity * rate250ml).toString();
          grandTotalAmount += customerDelivery[product250ml.id].quantity * rate250ml;
        } else {
          quantities.qty250ml = '0'; // Show 0 instead of empty
        }
        
        totals.grandTotal = grandTotalAmount.toString();
      }
      
      // Get payment information
      if (amountReceived && amountReceived[customer.id]) {
        const customerPayment = amountReceived[customer.id];
        payments.cash = customerPayment.cash?.toString() || '0';
        payments.upi = customerPayment.upi?.toString() || '0';
        // Amount Total should be the total from amount_received
        totals.amountTotal = customerPayment.total?.toString() || '0';
      } else {
        payments.cash = '0';
        payments.upi = '0';
        totals.amountTotal = '0';
      }
    }
    
    // Data for each column - conditionally include Amount Total for closed sheets
    const baseRowData = [
      globalIndex.toString(),
      customer.id || '',
      customer.name || '',
      customer.phone || '',
      customer.address || '',
      customer.id ? (isClosed ? quantities.qty500ml : '') : '', // 500ML quantity
      customer.id ? rate500ml.toString() : '', // 500ML rate (customer-specific)
      customer.id ? (isClosed ? quantities.qty1ltr : '') : '', // 1Ltr quantity
      customer.id ? rate1ltr.toString() : '', // 1Ltr rate (customer-specific)
      customer.id ? (isClosed ? quantities.qty250ml : '') : '', // 250ML quantity
      customer.id ? rate250ml.toString() : '', // 250ML rate (customer-specific)
      customer.id ? (isClosed ? totals.grandTotal : '') : '', // Total
      customer.id && customer.outstandingAmount !== undefined ? Math.abs(customer.outstandingAmount).toString() : customer.id ? '0' : '', // Amount Due (current outstanding)
      isClosed ? payments.cash : '', // CASH amount
      isClosed ? payments.upi : '' // UPI amount
    ];
    
    // Add Amount Total column for closed sheets
    const rowData = isClosed ? [...baseRowData, totals.amountTotal] : baseRowData;
    
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
  
  // Calculate summary data for closed sheets
  let summaryValues = { totalSale: '', totalDue: '', totalCollected: '', totalAmountReceived: '', amountPending: '', routeOutstanding: '', newRouteOutstanding: '' };
  
  if (isClosed && sheetData) {
    const deliveryData = typeof sheetData.deliveryData === 'string' 
      ? JSON.parse(sheetData.deliveryData) 
      : sheetData.deliveryData;
    const amountReceived = typeof sheetData.amountReceived === 'string' 
      ? JSON.parse(sheetData.amountReceived) 
      : sheetData.amountReceived;
    
    let totalSale = 0;
    let totalDue = 0;
    let totalCollected = 0;
    let totalAmountReceived = 0; // Total from amount_received.total field
    
    allRows.forEach(customer => {
      if (customer.id) {
        // Calculate total due
        totalDue += Math.abs(customer.outstandingAmount || 0);
        
        // Calculate total sale
        if (deliveryData && deliveryData[customer.id]) {
          const customerDelivery = deliveryData[customer.id];
          
          const product500ml = products.find(p => 
            p.name.toLowerCase().includes('500ml') || 
            p.name.toLowerCase().includes('500') ||
            p.name.toLowerCase().includes('product a') ||
            p.name.toLowerCase().includes('a')
          ) || products[0];
          
          const product1ltr = products.find(p => 
            p.name.toLowerCase().includes('1ltr') || 
            p.name.toLowerCase().includes('1l') || 
            p.name.toLowerCase().includes('liter') ||
            p.name.toLowerCase().includes('product b') ||
            p.name.toLowerCase().includes('b')
          ) || products[1];
          
          const product250ml = products.find(p => 
            p.name.toLowerCase().includes('250ml') || 
            p.name.toLowerCase().includes('250') ||
            p.name.toLowerCase().includes('product c') ||
            p.name.toLowerCase().includes('c')
          ) || products[2];
          
          const rate500ml = (customer.productPrices && product500ml?.id && customer.productPrices[product500ml.id]) || product500ml?.defaultPrice || 20;
          const rate1ltr = (customer.productPrices && product1ltr?.id && customer.productPrices[product1ltr.id]) || product1ltr?.defaultPrice || 35;
          const rate250ml = (customer.productPrices && product250ml?.id && customer.productPrices[product250ml.id]) || product250ml?.defaultPrice || 12;
          
          if (product500ml?.id && customerDelivery[product500ml.id]) {
            totalSale += customerDelivery[product500ml.id].quantity * rate500ml;
          }
          if (product1ltr?.id && customerDelivery[product1ltr.id]) {
            totalSale += customerDelivery[product1ltr.id].quantity * rate1ltr;
          }
          if (product250ml?.id && customerDelivery[product250ml.id]) {
            totalSale += customerDelivery[product250ml.id].quantity * rate250ml;
          }
        }
        
        // Calculate total collected (cash + upi) and total received (from amount_received.total)
        if (amountReceived && amountReceived[customer.id]) {
          const payment = amountReceived[customer.id];
          totalCollected += (payment.cash || 0) + (payment.upi || 0);
          totalAmountReceived += payment.total || 0; // This is the Amount Total
        }
      }
    });
    
    // Calculate Amount Pending = Total Sale - Amount Total (from amount_received.total)
    const amountPending = totalSale - totalAmountReceived;
    
    // Old Route Outstanding: stored value from when sheet was generated
    const oldRouteOutstanding = sheetData.routeOutstanding || 0;
    
    // New Route Outstanding: calculated using formula
    const newRouteOutstandingFormula = oldRouteOutstanding + totalSale - totalAmountReceived;
    
    // New Route Outstanding: sum of current customer outstandings (should match formula)
    const newRouteOutstandingSum = allRows.reduce((total, customer) => {
      if (customer.id) {
        return total + Math.abs(customer.outstandingAmount || 0);
      }
      return total;
    }, 0);
    
    // Debug: Log both calculation methods to verify they match (PDF section)
    console.log('PDF Route Outstanding Calculation Comparison:');
    console.log('Old Route Outstanding (stored):', oldRouteOutstanding);
    console.log('Total Sale:', totalSale);
    console.log('Amount Total (received):', totalAmountReceived);
    console.log('Formula: Old + Total Sale - Amount Total =', newRouteOutstandingFormula);
    console.log('Sum of Current Customer Outstandings =', newRouteOutstandingSum);
    console.log('Difference:', Math.abs(newRouteOutstandingFormula - newRouteOutstandingSum));

    summaryValues = {
      totalSale: totalSale.toString(),
      totalDue: totalDue.toString(),
      totalCollected: totalCollected.toString(),
      totalAmountReceived: totalAmountReceived.toString(),
      amountPending: amountPending.toString(),
      routeOutstanding: oldRouteOutstanding.toString(),
      newRouteOutstanding: newRouteOutstandingFormula.toString() // Using formula method
    };
  }
  
  // Add summary table for closed sheets
  if (isClosed) {
    currentY += 8; // Add some spacing
    
    // Summary table dimensions - compact 6x2 table
    const summaryTableWidth = tableWidth * 0.4; // Use 40% of table width for more compact size
    const summaryTableX = margin + tableWidth - summaryTableWidth; // Align summary table to the right
    const summaryRowHeight = 5.5; // Same as data row height
    const summaryTableHeight = summaryRowHeight * 7; // 7 rows total (1 header + 6 data rows)
    
    // Draw summary table border and content
    pdf.setLineWidth(0.2);
    pdf.setFontSize(9); // Same font size as data table
    
    let summaryY = currentY;
    
    // Header row - "Summary" spanning both columns
    pdf.rect(summaryTableX, summaryY, summaryTableWidth, summaryRowHeight);
    pdf.setFillColor(233, 236, 239); // Same header background as main table
    pdf.rect(summaryTableX, summaryY, summaryTableWidth, summaryRowHeight, 'F');
    pdf.setFont('helvetica', 'bold');
    const headerText = 'Summary';
    const headerTextWidth = pdf.getTextWidth(headerText);
    const headerXOffset = (summaryTableWidth - headerTextWidth) / 2;
    pdf.text(headerText, summaryTableX + headerXOffset, summaryY + 3.5);
    
    summaryY += summaryRowHeight;
    
    // Data rows
    const summaryLabels = ['Total Sale:', 'Amount Due:', 'Amount Total:', 'Amount Pending:', 'Old Outstanding:', 'New Outstanding:'];
    const summaryData = [summaryValues.totalSale, summaryValues.totalDue, summaryValues.totalAmountReceived, summaryValues.amountPending, summaryValues.routeOutstanding, summaryValues.newRouteOutstanding];
    const labelColumnWidth = summaryTableWidth * 0.6; // 60% for label, 40% for value
    const valueColumnWidth = summaryTableWidth * 0.4;
    
    pdf.setFont('helvetica', 'bold');
    
    for (let i = 0; i < summaryLabels.length; i++) {
      // Label column
      pdf.rect(summaryTableX, summaryY, labelColumnWidth, summaryRowHeight);
      pdf.text(summaryLabels[i], summaryTableX + 3, summaryY + 3.5);
      
      // Value column
      pdf.rect(summaryTableX + labelColumnWidth, summaryY, valueColumnWidth, summaryRowHeight);
      if (summaryData[i]) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(summaryData[i], summaryTableX + labelColumnWidth + 3, summaryY + 3.5);
        pdf.setFont('helvetica', 'bold');
      }
      
      summaryY += summaryRowHeight;
    }
    
    currentY += summaryTableHeight + 5;
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
