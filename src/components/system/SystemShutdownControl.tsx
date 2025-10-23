import React, { useState, useEffect } from 'react';
import { AlertTriangle, Power, Shield, Lock, Key, Clock, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { systemShutdownService, ShutdownToken, SystemStatus } from '../../services/systemShutdownService';
import { toast } from 'react-toastify';

interface SystemShutdownControlProps {
  onShutdownComplete?: () => void;
}

const SystemShutdownControl: React.FC<SystemShutdownControlProps> = ({ onShutdownComplete }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Step 1: Generate Token
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const [shutdownToken, setShutdownToken] = useState<ShutdownToken | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);

  // Step 2: Verify Credentials
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [enteredToken, setEnteredToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [credentialsVerified, setCredentialsVerified] = useState(false);

  // Step 3: Execute Shutdown
  const [shutdownReason, setShutdownReason] = useState('');
  const [executing, setExecuting] = useState(false);
  const [shutdownComplete, setShutdownComplete] = useState(false);

  // Check admin status and system status on mount
  useEffect(() => {
    checkAdminStatus();
    loadSystemStatus();
  }, []);

  // Subscribe to system status changes
  useEffect(() => {
    const unsubscribe = systemShutdownService.subscribeToSystemStatus((status) => {
      setSystemStatus(status);
      if (status.status === 'shutdown' || status.status === 'shutting_down') {
        toast.error(`🚨 ${status.message}`, { autoClose: false });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Update token expiry countdown
  useEffect(() => {
    if (!tokenExpiry) return;

    const interval = setInterval(() => {
      const now = new Date();
      if (now >= tokenExpiry) {
        setTokenGenerated(false);
        setShutdownToken(null);
        setTokenExpiry(null);
        toast.warning('Shutdown token has expired. Please generate a new one.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [tokenExpiry]);

  const checkAdminStatus = async () => {
    try {
      const adminStatus = await systemShutdownService.isAdmin();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const status = await systemShutdownService.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Error loading system status:', error);
    }
  };

  const handleGenerateToken = async () => {
    setGeneratingToken(true);
    try {
      const token = await systemShutdownService.generateShutdownToken(30);
      setShutdownToken(token);
      setTokenGenerated(true);
      setTokenExpiry(new Date(token.expires_at));
      toast.success('Shutdown token generated successfully');
    } catch (error: any) {
      console.error('Error generating token:', error);
      toast.error(error.message || 'Failed to generate shutdown token');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleVerifyCredentials = async () => {
    if (!password || !enteredToken) {
      toast.error('Please enter both password and token');
      return;
    }

    setVerifying(true);
    try {
      const result = await systemShutdownService.verifyCredentials(enteredToken, password);

      if (result.verified) {
        setCredentialsVerified(true);
        toast.success('Credentials verified successfully');
      } else {
        toast.error(result.message);
        setPassword('');
        setEnteredToken('');
      }
    } catch (error: any) {
      console.error('Error verifying credentials:', error);
      toast.error(error.message || 'Failed to verify credentials');
      setPassword('');
      setEnteredToken('');
    } finally {
      setVerifying(false);
    }
  };

  const handleExecuteShutdown = async () => {
    if (!shutdownReason.trim()) {
      toast.error('Please provide a reason for shutdown');
      return;
    }

    if (!window.confirm(
      '⚠️ CRITICAL ACTION\n\n' +
      'This will shut down the entire system including the portal and mobile app.\n' +
      'All users will be disconnected.\n\n' +
      'Are you absolutely sure you want to proceed?'
    )) {
      return;
    }

    setExecuting(true);
    try {
      const result = await systemShutdownService.executeShutdown(
        enteredToken || shutdownToken?.token || '',
        shutdownReason
      );

      if (result.success) {
        setShutdownComplete(true);
        toast.success('System shutdown initiated', { autoClose: false });

        // Call completion callback after 3 seconds
        setTimeout(() => {
          if (onShutdownComplete) {
            onShutdownComplete();
          }
        }, 3000);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      console.error('Error executing shutdown:', error);
      toast.error(error.message || 'Failed to execute shutdown');
    } finally {
      setExecuting(false);
    }
  };

  const getTimeRemaining = (): string => {
    if (!tokenExpiry) return '';
    const now = new Date();
    const diff = tokenExpiry.getTime() - now.getTime();
    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You must be an administrator to access system shutdown controls.</p>
      </div>
    );
  }

  if (shutdownComplete) {
    return (
      <div className="p-8 text-center">
        <CheckCircle className="w-20 h-20 text-red-500 mx-auto mb-4 animate-pulse" />
        <h2 className="text-3xl font-bold text-red-600 mb-2">System Shutdown Initiated</h2>
        <p className="text-gray-600 mb-4">The system is now shutting down...</p>
        <div className="text-sm text-gray-500">All users have been notified.</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Warning Header */}
      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <AlertTriangle className="w-12 h-12 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Emergency System Shutdown</h1>
            <p className="text-red-800">
              This will immediately shut down the entire system including the portal and all mobile applications.
              All users will be disconnected. This action should only be used in emergencies.
            </p>
          </div>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className={`p-4 rounded-lg border-2 ${
          systemStatus.status === 'operational' ? 'bg-green-50 border-green-500' :
          systemStatus.status === 'maintenance' ? 'bg-yellow-50 border-yellow-500' :
          'bg-red-50 border-red-500'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Current Status: {systemStatus.status.toUpperCase()}</h3>
              <p className="text-sm">{systemStatus.message}</p>
            </div>
            <div className={`w-4 h-4 rounded-full ${
              systemStatus.status === 'operational' ? 'bg-green-500' :
              systemStatus.status === 'maintenance' ? 'bg-yellow-500' :
              'bg-red-500 animate-pulse'
            }`} />
          </div>
        </div>
      )}

      {/* Step 1: Generate Token */}
      <div className={`bg-white rounded-lg shadow-lg border-2 ${tokenGenerated ? 'border-green-500' : 'border-gray-300'} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
              tokenGenerated ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {tokenGenerated ? (
                <CheckCircle className="w-6 h-6 text-white" />
              ) : (
                <span className="text-white font-bold">1</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Generate Shutdown Token</h2>
              <p className="text-sm text-gray-600">Generate a one-time security token</p>
            </div>
          </div>
          {tokenGenerated && tokenExpiry && (
            <div className="flex items-center space-x-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-mono font-bold">{getTimeRemaining()}</span>
            </div>
          )}
        </div>

        {!tokenGenerated ? (
          <button
            onClick={handleGenerateToken}
            disabled={generatingToken}
            className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {generatingToken ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Key className="w-5 h-5" />
                <span>Generate Token</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">Your Shutdown Token:</p>
              <div className="font-mono text-lg font-bold text-green-700 break-all bg-white p-3 rounded border border-green-300">
                {shutdownToken?.token}
              </div>
              <p className="text-xs text-green-700 mt-2">
                ⚠️ Store this token securely. You will need it in the next step.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Verify Credentials */}
      <div className={`bg-white rounded-lg shadow-lg border-2 ${
        credentialsVerified ? 'border-green-500' :
        tokenGenerated ? 'border-gray-300' : 'border-gray-200 opacity-50'
      } p-6`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            credentialsVerified ? 'bg-green-500' :
            tokenGenerated ? 'bg-gray-300' : 'bg-gray-200'
          }`}>
            {credentialsVerified ? (
              <CheckCircle className="w-6 h-6 text-white" />
            ) : (
              <span className="text-white font-bold">2</span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Verify Credentials</h2>
            <p className="text-sm text-gray-600">Enter your password and the shutdown token</p>
          </div>
        </div>

        {tokenGenerated && !credentialsVerified && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Administrator Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                  disabled={verifying}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shutdown Token
              </label>
              <input
                type="text"
                value={enteredToken}
                onChange={(e) => setEnteredToken(e.target.value)}
                placeholder="Paste the shutdown token"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                disabled={verifying}
              />
            </div>

            <button
              onClick={handleVerifyCredentials}
              disabled={verifying || !password || !enteredToken}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {verifying ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Verify Credentials</span>
                </>
              )}
            </button>
          </div>
        )}

        {credentialsVerified && (
          <div className="p-4 bg-green-50 border border-green-300 rounded-lg flex items-center space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <span className="text-green-800 font-medium">Credentials verified successfully</span>
          </div>
        )}
      </div>

      {/* Step 3: Execute Shutdown */}
      <div className={`bg-white rounded-lg shadow-lg border-2 ${
        credentialsVerified ? 'border-red-500' : 'border-gray-200 opacity-50'
      } p-6`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            credentialsVerified ? 'bg-red-500' : 'bg-gray-200'
          }`}>
            <span className="text-white font-bold">3</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Execute Shutdown</h2>
            <p className="text-sm text-gray-600">Provide a reason and confirm shutdown</p>
          </div>
        </div>

        {credentialsVerified && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shutdown Reason *
              </label>
              <textarea
                value={shutdownReason}
                onChange={(e) => setShutdownReason(e.target.value)}
                placeholder="Enter the reason for system shutdown..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                disabled={executing}
              />
            </div>

            <div className="bg-red-50 border border-red-300 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="text-sm text-red-800">
                  <p className="font-bold mb-2">⚠️ WARNING: This action cannot be undone!</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All portal and app users will be immediately disconnected</li>
                    <li>All active sessions will be terminated</li>
                    <li>All check-in operations will be stopped</li>
                    <li>System will require manual restart to resume operations</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={handleExecuteShutdown}
              disabled={executing || !shutdownReason.trim()}
              className="w-full px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg font-bold"
            >
              {executing ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>SHUTTING DOWN...</span>
                </>
              ) : (
                <>
                  <Power className="w-6 h-6" />
                  <span>EXECUTE SYSTEM SHUTDOWN</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemShutdownControl;
