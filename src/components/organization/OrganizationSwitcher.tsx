import React, { useState } from 'react';
import { Building, ChevronDown, Check, Plus } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';

const OrganizationSwitcher: React.FC = () => {
  const { currentOrganization, allOrganizations, switchOrganization, loading } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md animate-pulse">
        <Building className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
        <Building className="w-4 h-4 text-yellow-600" />
        <span className="text-sm text-yellow-600">No Organization</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors min-w-[200px]"
      >
        <div className="flex items-center gap-2 flex-1">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: currentOrganization.primary_color }}
          >
            {currentOrganization.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-gray-900 truncate">
              {currentOrganization.name}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {currentOrganization.subscription_tier}
            </div>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute top-full left-0 mt-2 w-[280px] bg-white border border-gray-200 rounded-lg shadow-lg z-20">
            {/* Current Organization Section */}
            <div className="p-2 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
                Current Organization
              </div>
            </div>

            {/* Organizations List */}
            <div className="p-2 max-h-[300px] overflow-y-auto">
              {allOrganizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrganization(org.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    org.id === currentOrganization.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: org.primary_color }}
                  >
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium truncate">
                      {org.name}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                      {org.subscription_tier}
                    </div>
                  </div>
                  {org.id === currentOrganization.id && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="p-2 border-t border-gray-100">
              <button
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                onClick={() => {
                  setIsOpen(false);
                  // TODO: Open create organization modal
                  console.log('Create new organization');
                }}
              >
                <Plus className="w-4 h-4" />
                Create Organization
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OrganizationSwitcher;
