import React, { useState } from 'react';
import { Activity, Users, Monitor, Smartphone, Globe, TrendingUp } from 'lucide-react';
import ActiveSessionsTable from '../components/events/ActiveSessionsTable';
import { useOrganization } from '../contexts/OrganizationContext';

const LoggedInDevicesPage: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Logged In Devices</h1>
        <p className="text-gray-600 mt-1">
          Monitor active user sessions across the web portal and mobile apps
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Web Portal</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mobile Apps</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">--</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
          </label>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Refresh interval:</label>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Sessions Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <ActiveSessionsTable
          organizationId={currentOrganization?.id}
          autoRefresh={autoRefresh}
          refreshInterval={refreshInterval}
        />
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
          <Activity className="h-4 w-4 mr-2" />
          About Active Sessions
        </h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>Status Indicators:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li><span className="font-semibold text-green-600">Active</span> - Last activity within 5 minutes</li>
            <li><span className="font-semibold text-yellow-600">Idle</span> - Last activity 5-15 minutes ago</li>
            <li><span className="font-semibold text-gray-600">Inactive</span> - Last activity more than 15 minutes ago</li>
          </ul>
          <p className="mt-4">
            <strong>Session Information:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>View user details including name, email, role, and phone number</li>
            <li>See device type (desktop, mobile, tablet) and operating system</li>
            <li>Track which app they're using (Web Portal or iOS NFC App)</li>
            <li>Monitor their current activity and location in the app</li>
            <li>View IP address and network information</li>
            <li>See session duration and last activity time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoggedInDevicesPage;
