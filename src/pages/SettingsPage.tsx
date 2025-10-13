import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import notification from '../utils/notifications';
import InteractiveTour from '../components/onboarding/InteractiveTour';
import { 
  BookOpen, 
  Settings, 
  User, 
  Lock, 
  Bell, 
  Shield, 
  Database, 
  Palette,
  Globe,
  Smartphone,
  Mail,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  updated_at?: string;
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'password' | 'notifications' | 'security' | 'system' | 'help'>('account');
  const [showOnboarding, setShowOnboarding] = useState(false);
  // User state is managed by formData, but we keep the user reference
  const [, setUser] = useState<UserProfile | null>(null);
  
  // Form state is managed by formData
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: ''
  });

  // Additional settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    telegramNotifications: true,
    capacityAlerts: true,
    securityAlerts: true,
    staffUpdates: false,
    systemMaintenance: true,
    weeklyReports: true
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    loginNotifications: true,
    ipWhitelist: '',
    apiKeyRotation: 'monthly'
  });

  const [systemSettings, setSystemSettings] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    autoSave: true,
    debugMode: false,
    analyticsEnabled: true
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      setUser(data);
      setFormData({
        full_name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      const errorMessage = 'Failed to load profile';
      notification.error(errorMessage, {
        operation: 'read',
        severity: 'error',
        technicalDetails: 'Failed to fetch profile data',
        context: {
          component: 'SettingsPage',
          action: 'fetchProfile',
          error: error instanceof Error ? error : new Error('Unknown error fetching profile')
        },
        toastOptions: {
          autoClose: 10000
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      // Update email if changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser(
          { email: formData.email },
          { emailRedirectTo: `${window.location.origin}/settings` }
        );
        
        if (emailError) throw emailError;
      }
      
      // Refresh profile data
      await fetchProfile();
      // Show success message
      notification.success('Profile updated successfully', {
        origin: 'app',
        context: {}
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = 'Could not update profile';
      notification.error(errorMessage, undefined, {
        origin: 'app',
        context: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notification.error('New password and confirmation do not match', {
        origin: 'app',
        context: {}
      });
      return;
    }
    
    // Validate password strength
    if (passwordData.newPassword.length < 8) {
      notification.error('Password must be at least 8 characters long', {
        origin: 'app',
        context: {}
      });
      return;
    }
    
    try {
      setPasswordLoading(true);
      
      // First reauthenticate before changing password
      if (passwordData.currentPassword) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email || '',
          password: passwordData.currentPassword
        });
        
        if (signInError) throw new Error('Current password is incorrect');
      }
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });
      
      if (error) throw error;
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      // Handle sign out
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      // Show success message
      notification.success('Successfully signed out', {
        origin: 'app',
        context: {}
      });
    } catch (error) {
      notification.error('Failed to update password', {
        origin: 'settings',
        context: {
          entity: 'user',
          operation: 'update_password',
          error: error instanceof Error ? error : new Error(String(error))
        }
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  // Settings save functions
  const saveNotificationSettings = async () => {
    try {
      setLoading(true);
      // In real app, save to database
      notification.success('Notification settings saved successfully', { origin: 'app', context: {} });
    } catch (error) {
      notification.error('Failed to save notification settings', { origin: 'app', context: {} });
    } finally {
      setLoading(false);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      setLoading(true);
      // In real app, save to database
      notification.success('Security settings saved successfully', { origin: 'app', context: {} });
    } catch (error) {
      notification.error('Failed to save security settings', { origin: 'app', context: {} });
    } finally {
      setLoading(false);
    }
  };

  const saveSystemSettings = async () => {
    try {
      setLoading(true);
      // In real app, save to database
      notification.success('System settings saved successfully', { origin: 'app', context: {} });
    } catch (error) {
      notification.error('Failed to save system settings', { origin: 'app', context: {} });
    } finally {
      setLoading(false);
    }
  };

  const exportSettings = () => {
    const settings = {
      notifications: notificationSettings,
      security: securitySettings,
      system: systemSettings,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quickstrap-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);
        if (settings.notifications) setNotificationSettings(settings.notifications);
        if (settings.security) setSecuritySettings(settings.security);
        if (settings.system) setSystemSettings(settings.system);
        notification.success('Settings imported successfully', { origin: 'app', context: {} });
      } catch (error) {
        notification.error('Invalid settings file', { origin: 'app', context: {} });
      }
    };
    reader.readAsText(file);
  };

  if (loading && !formData.email) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('account')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'account' 
                  ? 'border-blue-500 text-blue-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              type="button"
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              type="button"
            >
              Change Password
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === 'help'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              type="button"
            >
              Help & Onboarding
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'account' && (
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  id="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={(e) => {
              e.preventDefault();
              handlePasswordUpdate(e);
            }} className="space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  id="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={passwordLoading}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={passwordLoading}
                  minLength={8}
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters long
                </p>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${
                    passwordData.newPassword && 
                    passwordData.confirmPassword && 
                    passwordData.newPassword !== passwordData.confirmPassword
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }`}
                  disabled={passwordLoading}
                  required
                />
                {passwordData.newPassword && 
                 passwordData.confirmPassword && 
                 passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    Passwords do not match
                  </p>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={
                    passwordLoading || 
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword ||
                    passwordData.newPassword !== passwordData.confirmPassword
                  }
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'help' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center mb-4">
                  <BookOpen className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Getting Started Guide</h3>
                    <p className="text-sm text-gray-600">Learn how to use all portal features</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-2">🎓 Interactive Onboarding Wizard</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Take a guided tour through the portal's key features. Perfect for new users or as a refresher.
                    </p>
                    <button
                      onClick={() => setShowOnboarding(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Start Onboarding Wizard
                    </button>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <h4 className="font-semibold text-gray-900 mb-2">📚 Quick Reference Guide</h4>
                    <p className="text-sm text-gray-700 mb-3">
                      Access the complete feature documentation with step-by-step instructions.
                    </p>
                    <a
                      href="/FEATURE_ACCESS_GUIDE.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50 transition"
                    >
                      View Documentation
                    </a>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-2">🎯 Quick Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Go to <strong>Events</strong> → Open any event to see 10 feature tabs</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Use <strong>Command Center</strong> tab during live events for real-time monitoring</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Bulk upload wristbands via CSV in the <strong>Wristbands</strong> tab</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Monitor fraud detection in real-time with the <strong>Fraud Detection</strong> tab</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-600 mr-2">✓</span>
                        <span>Generate reports in multiple formats using the <strong>Export</strong> tab</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tips</h4>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">💡</span>
                        <span>Run pre-event tests in the <strong>Testing</strong> tab before going live</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">💡</span>
                        <span>Set up automated reports to be emailed daily/weekly</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">💡</span>
                        <span>Use <strong>Emergency Controls</strong> for quick response during incidents</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-yellow-600 mr-2">💡</span>
                        <span>Check <strong>Autonomous Operations</strong> in sidebar for AI-powered features</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Interactive Tour */}
      {showOnboarding && (
        <InteractiveTour
          onClose={handleOnboardingComplete}
          onComplete={handleOnboardingComplete}
        />
      )}
    </div>
  );
};

export default SettingsPage;
