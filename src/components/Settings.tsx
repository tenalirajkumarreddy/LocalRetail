import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Building, 
  Phone, 
  Mail, 
  MapPin,
  Save
} from 'lucide-react';
import { getCompanySettings, saveCompanySettings, initializeDefaultData } from '../utils/supabase-storage';
import { CompanySettings } from '../types';
import { GoogleBackup } from './GoogleBackup';
import { SimpleGoogleTest } from './SimpleGoogleTest';
import { GoogleAuthAlternative } from './GoogleAuthAlternative';
import { GoogleAPIRecovery } from './GoogleAPIRecovery';
import { OAuthConfigHelper } from './OAuthConfigHelper';
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

        {/* Google Backup Section */}
        <GoogleBackup />

        {/* Google Authentication Tests */}
        <div className="border-t border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Google Authentication Tests</h3>
            <p className="text-sm text-gray-600 mt-1">Use these tools to test and troubleshoot Google authentication issues</p>
          </div>
          
          <div className="px-6 py-6 space-y-6">
            {/* OAuth Configuration Helper */}
            <OAuthConfigHelper />
            
            {/* Google API Recovery Tool */}
            <GoogleAPIRecovery />
            
            {/* Simple Test */}
            <SimpleGoogleTest />
            
            {/* Alternative Methods for COOP Issues */}
            <GoogleAuthAlternative />
          </div>
        </div>
      </div>
    </div>
  );
};