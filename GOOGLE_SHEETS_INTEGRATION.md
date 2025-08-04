# Google Sheets Integration Guide

## Overview
The LocalRetail application now includes comprehensive Google Sheets integration for automatic data backup and route sheet management. This feature provides:

- **Automatic Backup**: Daily automatic backup of all application data
- **Manual Backup**: On-demand backup through the Settings page
- **Route Sheet Backup**: Automatic backup when route sheets are downloaded
- **Real-time Sync**: Direct integration with Google Drive

## Setup Instructions

### Step 1: Google Cloud Console Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Click "New Project" and give it a name
   - Select your project

2. **Enable Google Sheets API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Create Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials"
   - Create both:
     - **API Key** (for public access)
     - **OAuth 2.0 Client ID** (for user authentication)

4. **Configure OAuth 2.0**
   - In OAuth 2.0 Client ID settings:
     - Application type: Web application
     - Authorized JavaScript origins: 
       - `http://localhost:5176` (development)
       - `https://yourdomain.com` (production)
     - Authorized redirect URIs: Same as above

### Step 2: Google Spreadsheet Setup

1. **Create a New Spreadsheet**
   - Go to [Google Sheets](https://sheets.google.com/)
   - Create a new blank spreadsheet
   - Give it a meaningful name (e.g., "LocalRetail Backup")

2. **Copy Spreadsheet ID**
   - From the URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
   - Copy the `SPREADSHEET_ID` part

### Step 3: Environment Configuration

Add these variables to your `.env` file:

```bash
# Google Sheets Configuration
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
```

## Features

### 1. Automatic Backup Service

The application automatically backs up data every 24 hours when:
- User is authenticated with Google
- Google Sheets integration is configured
- Application is running

**Data backed up:**
- Customers
- Products
- Transactions
- Invoices
- Company Settings

### 2. Manual Backup

Users can trigger immediate backup from Settings > Google Sheets Backup:
- Click "Backup All Data to Google Sheets"
- View backup results and status
- Check last backup time

### 3. Route Sheet Backup

When downloading route sheets:
- PDF is generated as usual
- Route data is automatically backed up to Google Sheets
- Creates a new sheet named: `Route_{RouteName}_{Date}`
- Includes all customer data and product pricing

### 4. Data Organization

Data is organized in separate sheets:
- **Customers**: All customer information and product pricing
- **Products**: Product catalog with default pricing
- **Transactions**: All sales, payments, and adjustments
- **Invoices**: Invoice details and status
- **Company_Settings**: Business information
- **Route_{Name}_{Date}**: Individual route sheets

## Usage

### Initial Setup

1. Complete the setup instructions above
2. Go to Settings > Google Sheets Backup
3. Click "Sign In to Google"
4. Grant necessary permissions
5. Click "Backup All Data to Google Sheets"

### Daily Operations

- The system automatically backs up data every 24 hours
- Route sheets are automatically backed up when downloaded
- Check backup status in Settings page
- Force manual backup when needed

### Monitoring

The Settings page shows:
- **Configuration Status**: API setup verification
- **Authentication Status**: Google account connection
- **Auto Backup Status**: Service running status
- **Last Backup**: Timestamp and results
- **Next Backup**: Scheduled time

## Data Structure

### Customers Sheet
```
id | name | phone | address | route | openingBalance | outstandingAmount | productPrices | createdAt | updatedAt
```

### Products Sheet
```
id | name | defaultPrice | createdAt | updatedAt
```

### Transactions Sheet
```
id | customerId | customerName | type | items | totalAmount | amountReceived | balanceChange | date | invoiceNumber
```

### Invoices Sheet
```
id | invoiceNumber | customerId | customerName | items | subtotal | totalAmount | amountReceived | balanceChange | date | status
```

### Route Sheets
```
Customer ID | Customer Name | Phone | Address | Product1 (Qty) | Product1 (Rate) | Product1 (Amount) | ... | Total Amount | Amount Received | Balance
```

## Security

- **OAuth 2.0**: Secure user authentication
- **Scoped Access**: Only Google Sheets access
- **Local Storage**: Credentials stored securely in browser
- **HTTPS**: Secure communication with Google APIs

## Troubleshooting

### Common Issues

1. **"API Key not configured"**
   - Check `.env` file has correct Google API key
   - Verify API key is enabled for Google Sheets API

2. **"Authentication failed"**
   - Check OAuth 2.0 Client ID configuration
   - Verify authorized origins match your domain
   - Clear browser cache and try again

3. **"Spreadsheet not found"**
   - Verify spreadsheet ID in `.env` file
   - Ensure spreadsheet exists and is accessible
   - Check sharing permissions

4. **"Backup failed"**
   - Check internet connection
   - Verify Google API quotas not exceeded
   - Check browser console for error details

### Debug Information

Check browser console for detailed error messages:
- Network errors
- Authentication issues
- API quota problems
- Permission errors

## API Limits

Google Sheets API has usage limits:
- **100 requests per 100 seconds per user**
- **300 requests per minute**

The application respects these limits by:
- Batching operations
- Implementing retry logic
- Spacing out automatic backups

## Benefits

1. **Data Security**: Automatic cloud backup
2. **Accessibility**: Access data from anywhere
3. **Collaboration**: Share sheets with team members
4. **Analysis**: Use Google Sheets tools for data analysis
5. **History**: Complete audit trail of all changes
6. **Recovery**: Easy data recovery in case of issues

## Support

For issues or questions:
1. Check browser console for errors
2. Verify setup instructions followed correctly
3. Test with a simple spreadsheet first
4. Check Google Cloud Console for API usage

---

*Last updated: August 2025*
