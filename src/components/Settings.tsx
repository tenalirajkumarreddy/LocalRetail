import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  Phone, 
  Mail, 
  MapPin,
  Save,
  FileText,
  Upload,
  Trash2,
  Download
} from 'lucide-react';
import { getCompanySettings, saveCompanySettings, initializeDefaultData } from '../utils/supabase-storage';
import { CompanySettings } from '../types';
import { ConnectionStatus } from './ConnectionStatus';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    updatedAt: new Date()
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initializeData = async () => {
      try {
        await initializeDefaultData();
        await loadSettings();
      } catch (error) {
        console.error('Error initializing settings data:', error);
      }
    };
    initializeData();
  }, []);

  const loadSettings = async () => {
    try {
      const companySettings = await getCompanySettings();
      setSettings(companySettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      // Set default values if loading fails
      setSettings({
        companyName: '',
        address: '',
        phone: '',
        email: '',
        updatedAt: new Date()
      });
    }
  };

  const handleSave = async () => {
    if (!settings.companyName.trim()) {
      alert('Please enter a company name');
      return;
    }

    setIsSaving(true);
    try {
      const updatedSettings = {
        ...settings,
        updatedAt: new Date()
      };

      await saveCompanySettings(updatedSettings);
      setSettings(updatedSettings);
      
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    setIsSaving(false);
  };

  const handleInputChange = (field: keyof CompanySettings, value: string) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is PDF
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file only.');
      return;
    }

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSettings(prev => ({
          ...prev,
          pdfTemplate: result.split(',')[1], // Remove data:application/pdf;base64, prefix
          templateFileName: file.name,
          templateUploadedAt: new Date()
        }));
        setSaveMessage('Template uploaded! Remember to save settings.');
        setTimeout(() => setSaveMessage(''), 3000);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error uploading template. Please try again.');
    }
  };

  const handleTemplateDelete = () => {
    if (confirm('Are you sure you want to delete the current template?')) {
      setSettings(prev => ({
        ...prev,
        pdfTemplate: undefined,
        templateFileName: undefined,
        templateUploadedAt: undefined
      }));
      setSaveMessage('Template removed! Remember to save settings.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleTemplateDownload = () => {
    if (!settings.pdfTemplate || !settings.templateFileName) return;

    try {
      const pdfData = `data:application/pdf;base64,${settings.pdfTemplate}`;
      const link = document.createElement('a');
      link.href = pdfData;
      link.download = settings.templateFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error downloading template.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your company information and system settings</p>
        </div>
      </div>

      {/* Company Information */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Building className="w-5 h-5 mr-2" />
            Company Information
          </h2>
        </div>

        <div className="px-6 py-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Building className="w-4 h-4 inline mr-1" />
                Company Name *
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={settings.companyName ? '' : 'Enter company name'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                value={settings.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter email address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4 inline mr-1" />
              Company Address
            </label>
            <textarea
              value={settings.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter company address"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-500">
              Last updated: {new Date(settings.updatedAt).toLocaleString()}
            </div>
            <div className="flex items-center space-x-3">
              {saveMessage && (
                <span className="text-green-600 text-sm font-medium">
                  {saveMessage}
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Template Section */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            PDF Route Sheet Template
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Upload a custom PDF template for route sheets. The system will fill in customer data, date, time, and route information into this template.
          </p>
        </div>

        <div className="px-6 py-6 space-y-4">
          {!settings.pdfTemplate ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No template uploaded</h3>
              <p className="mt-1 text-sm text-gray-500">Upload a PDF template to customize your route sheets</p>
              <div className="mt-6">
                <label className="cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleTemplateUpload}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose PDF Template
                  </span>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">Maximum file size: 5MB</p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">Template Uploaded</h3>
                    <p className="text-sm text-green-600">{settings.templateFileName}</p>
                    {settings.templateUploadedAt && (
                      <p className="text-xs text-green-500">
                        Uploaded: {new Date(settings.templateUploadedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleTemplateDownload}
                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </button>
                  <button
                    onClick={handleTemplateDelete}
                    className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-green-200">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleTemplateUpload}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors">
                    <Upload className="w-4 h-4 mr-1" />
                    Replace Template
                  </span>
                </label>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Template Guidelines:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Use a landscape A4 PDF format for best results</li>
              <li>• Include placeholder text where you want data filled (e.g., "[DATE]", "[TIME]", "[ROUTE]")</li>
              <li>• Create a table structure for customer data rows</li>
              <li>• The system will automatically fill in customer information, date, time, and route</li>
              <li>• Maximum file size: 5MB</li>
            </ul>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2" />
            System Information
          </h2>
        </div>

        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600 mb-1">Application Version</h3>
              <p className="text-lg font-bold text-blue-700">v1.0.0</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600 mb-1">Data Storage</h3>
              <p className="text-lg font-bold text-green-700">Cloud Database</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-600 mb-1">Last Backup</h3>
              <p className="text-lg font-bold text-purple-700">Manual</p>
            </div>
          </div>
        </div>

        {/* Connection Status Section */}
        <ConnectionStatus />

      </div>
    </div>
  );
};