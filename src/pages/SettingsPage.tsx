import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import notification from '../utils/notifications';

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
  const [activeTab, setActiveTab] = useState<'account' | 'password'>('account');
  // User state is managed by formData, but we keep the user reference
  const [, setUser] = useState<UserProfile | null>(null);
  
  // Form state is managed by formData
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: ''
  });
  
  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
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
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'account' ? (
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
          ) : (
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
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
