import React from 'react';
import { 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  Settings as SettingsIcon,
  Cloud,
  Key,
  FileSpreadsheet
} from 'lucide-react';

export const GoogleSheetsSetupGuide: React.FC = () => {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const steps = [
    {
      title: "Create Google Cloud Project",
      description: "Go to Google Cloud Console and create a new project",
      link: "https://console.cloud.google.com/",
      linkText: "Open Google Cloud Console"
    },
    {
      title: "Enable Google Sheets API",
      description: "Navigate to APIs & Services > Library and enable Google Sheets API",
      link: "https://console.cloud.google.com/apis/library/sheets.googleapis.com",
      linkText: "Enable Sheets API"
    },
    {
      title: "Create API Credentials",
      description: "Go to APIs & Services > Credentials and create:",
      substeps: [
        "API Key (for public access)",
        "OAuth 2.0 Client ID (for user authentication)"
      ],
      link: "https://console.cloud.google.com/apis/credentials",
      linkText: "Create Credentials"
    },
    {
      title: "Configure OAuth 2.0",
      description: "In OAuth 2.0 Client ID settings:",
      substeps: [
        "Application type: Web application",
        "Authorized JavaScript origins: http://localhost:5176, https://yourdomain.com",
        "Authorized redirect URIs: http://localhost:5176, https://yourdomain.com"
      ]
    },
    {
      title: "Create Google Spreadsheet",
      description: "Create a new Google Spreadsheet and copy its ID from the URL",
      example: "https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit",
      link: "https://sheets.google.com/",
      linkText: "Create New Spreadsheet"
    },
    {
      title: "Update Environment Variables",
      description: "Add the following to your .env file:",
      envVars: [
        "VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here",
        "VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com",
        "VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here"
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Cloud className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Google Sheets Integration Setup</h1>
              <p className="text-gray-600">Follow these steps to enable automatic backup to Google Sheets</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold">
                    {index + 1}
                  </div>
                  
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      {step.title}
                      {index === 0 && <SettingsIcon className="w-5 h-5 text-gray-500" />}
                      {index === 1 && <Key className="w-5 h-5 text-gray-500" />}
                      {index === 2 && <Key className="w-5 h-5 text-gray-500" />}
                      {index === 4 && <FileSpreadsheet className="w-5 h-5 text-gray-500" />}
                    </h3>
                    
                    <p className="text-gray-600 mb-3">{step.description}</p>
                    
                    {step.substeps && (
                      <ul className="list-disc list-inside text-gray-600 space-y-1 mb-3 ml-4">
                        {step.substeps.map((substep, idx) => (
                          <li key={idx}>{substep}</li>
                        ))}
                      </ul>
                    )}
                    
                    {step.example && (
                      <div className="bg-gray-50 p-3 rounded-lg mb-3">
                        <p className="text-sm text-gray-700">
                          <strong>Example URL:</strong> {step.example}
                        </p>
                      </div>
                    )}
                    
                    {step.envVars && (
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-3">
                        {step.envVars.map((envVar, idx) => (
                          <div key={idx} className="flex items-center justify-between group">
                            <span>{envVar}</span>
                            <button
                              onClick={() => copyToClipboard(envVar)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-800 rounded"
                              title="Copy to clipboard"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {step.link && (
                      <a
                        href={step.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        {step.linkText}
                      </a>
                    )}
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <div className="absolute left-4 top-10 w-px h-8 bg-gray-200"></div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="w-5 h-5" />
              <h3 className="font-semibold">Setup Complete!</h3>
            </div>
            <p className="text-green-700 text-sm">
              Once you've completed these steps, go to Settings → Google Sheets Backup to authenticate and start using the backup features.
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">Features You'll Get:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Automatic backup of all customers, products, invoices, and transactions</li>
              <li>• Route sheets automatically saved to Google Sheets when downloaded</li>
              <li>• Manual backup trigger from Settings page</li>
              <li>• Organized data in separate sheets for easy access</li>
              <li>• Real-time sync with your Google Drive</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
