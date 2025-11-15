import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import organizationService from '../../services/organizationService';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Calendar, Shield, Settings, Users, Clock, Building, ChevronLeft, ChevronRight, MapPin, ChevronDown } from 'lucide-react';

interface EventData {
  organization_id: string;
  organization_name: string;
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  capacity: number | null;
  // iOS NFC App Compatibility
  ticket_linking_mode: 'disabled' | 'optional' | 'required';
  allow_unlinked_entry: boolean;
  config: {
    security_mode: string;
    // iOS NFC App Compatibility (duplicated for backward compatibility with config object)
    ticket_linking_mode?: 'disabled' | 'optional' | 'required';
    allow_unlinked_entry?: boolean;
    gate_settings: {
      auto_create: boolean;
      enforce_categories: boolean;
      scan_mode: string;
    };
    capacity_settings: {
      alerts_enabled: boolean;
      alert_threshold: number;
      max_capacity: number | null;
    };
    checkin_window: {
      enabled: boolean;
      start_offset_value: number;
      start_offset_unit: 'minutes' | 'hours' | 'days';
      end_offset_value: number;
      end_offset_unit: 'minutes' | 'hours' | 'days';
    };
    activation: {
      status: string;
      scheduled_time?: string;
    };
  };
}

const EventCreationWizard: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [existingLocations, setExistingLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [filteredLocations, setFilteredLocations] = useState<string[]>([]);

  const [eventData, setEventData] = useState<EventData>({
    organization_id: '',
    organization_name: '',
    name: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    capacity: null,
    ticket_linking_mode: 'disabled',  // iOS NFC App compatibility
    allow_unlinked_entry: true,        // iOS NFC App compatibility
    config: {
      security_mode: 'optional',  // Legacy - kept for backward compatibility
      ticket_linking_mode: 'disabled',
      allow_unlinked_entry: true,
      gate_settings: {
        auto_create: true,
        enforce_categories: false,
        scan_mode: 'single'
      },
      capacity_settings: {
        alerts_enabled: true,
        alert_threshold: 90,
        max_capacity: null
      },
      checkin_window: {
        enabled: false,
        start_offset_value: 2,
        start_offset_unit: 'hours',
        end_offset_value: 2,
        end_offset_unit: 'hours'
      },
      activation: {
        status: 'draft'
      }
    }
  });

  const steps = [
    { id: 1, title: 'Organization', icon: Building },
    { id: 2, title: 'Basic Information', icon: Calendar },
    { id: 3, title: 'Security Settings', icon: Shield },
    { id: 4, title: 'Gate Configuration', icon: Settings },
    { id: 5, title: 'Capacity & Alerts', icon: Users },
    { id: 6, title: 'Check-in Window', icon: Clock },
    { id: 7, title: 'Activation & Launch', icon: Settings }
  ];

  // Load organizations on component mount
  useEffect(() => {
    loadOrganizations();
    loadExistingLocations();
  }, []);

  const loadExistingLocations = async () => {
    try {
      // Fetch distinct locations from both events and event_series
      const { data: eventLocations } = await supabase
        .from('events')
        .select('location')
        .not('location', 'is', null)
        .not('location', 'eq', '');

      const { data: seriesLocations } = await supabase
        .from('event_series')
        .select('location')
        .not('location', 'is', null)
        .not('location', 'eq', '');

      // Combine and get unique locations
      const allLocations = [
        ...(eventLocations || []).map(e => e.location),
        ...(seriesLocations || []).map(s => s.location)
      ];
      
      const uniqueLocations = Array.from(new Set(allLocations)).sort();
      setExistingLocations(uniqueLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadOrganizations = async () => {
    try {
      // Add timeout to prevent infinite hanging (RLS recursion issue)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Organization load timeout')), 5000)
      );

      const orgs = await Promise.race([
        organizationService.getUserOrganizations(),
        timeoutPromise
      ]) as any[];

      setOrganizations(orgs);

      // If user has a current organization, pre-select it
      if (currentOrganization && !eventData.organization_id) {
        setEventData(prev => ({
          ...prev,
          organization_id: currentOrganization.id,
          organization_name: currentOrganization.name
        }));
      }
    } catch (error) {
      console.error('Error loading organizations:', error);
      // Don't block the UI - set empty array and continue
      setOrganizations([]);

      // If we have currentOrganization from context, use it anyway
      if (currentOrganization) {
        setOrganizations([currentOrganization]);
        setEventData(prev => ({
          ...prev,
          organization_id: currentOrganization.id,
          organization_name: currentOrganization.name
        }));
      }
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    
    try {
      // Generate slug from name
      let slug = newOrgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      // Check if slug already exists
      const existingOrg = organizations.find(org => org.slug === slug);
      if (existingOrg) {
        // Add timestamp to make it unique
        slug = `${slug}-${Date.now()}`;
      }
      
      const newOrg = await organizationService.createOrganization({
        name: newOrgName.trim(),
        slug: slug,
        description: `Organization for ${newOrgName.trim()}`
      });
      
      // Add to organizations list
      setOrganizations(prev => [...prev, newOrg]);
      
      // Auto-select the new organization
      setEventData(prev => ({
        ...prev,
        organization_id: newOrg.id,
        organization_name: newOrg.name
      }));
      
      // Reset form
      setNewOrgName('');
      setShowCreateOrg(false);
      
      alert('Organization created successfully!');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      
      // Handle duplicate slug error specifically
      if (error?.code === '23505' && error?.message?.includes('slug')) {
        alert('An organization with this name already exists. Please choose a different name.');
      } else {
        alert('Error creating organization. Please try again.');
      }
    }
  };

  const handleNext = () => {
    // Validate organization selection on step 1
    if (currentStep === 1) {
      if (!eventData.organization_id) {
        alert('Please select an organization before proceeding.');
        return;
      }
    }
    
    // Validate basic info on step 2
    if (currentStep === 2) {
      if (!eventData.name.trim()) {
        alert('Please enter an event name');
        return;
      }
      if (!eventData.location.trim()) {
        alert('Please enter an event location');
        return;
      }
      if (!eventData.start_date) {
        alert('Please select a start date');
        return;
      }
      if (!eventData.end_date) {
        alert('Please select an end date');
        return;
      }

      // Validate date range using the new validation rules
      const startDate = new Date(eventData.start_date);
      const endDate = new Date(eventData.end_date);
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      // Check if dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        alert('Invalid date format. Please enter valid dates.');
        return;
      }

      // Check if start date is not in the past
      if (startDate < oneMinuteAgo) {
        alert('Start date cannot be in the past');
        return;
      }

      // Note: We no longer enforce:
      // - Minimum 2 hours in the future
      // - End date must be after start date (flexible per specification)
      // - Maximum duration of 365 days

      // The specification allows end date to be before or after start date
    }

    // Validate Step 3: Ticket Linking Configuration
    if (currentStep === 3) {
      if (!eventData.ticket_linking_mode) {
        alert('Please select a ticket linking mode');
        return;
      }

      // Warn about "required" mode implications
      if (eventData.ticket_linking_mode === 'required') {
        const confirmed = window.confirm(
          '⚠️ REQUIRED Ticket Linking Mode:\n\n' +
          '• ALL wristbands MUST be linked to valid tickets\n' +
          '• Unlinked wristbands will be REJECTED at gates during scanning\n' +
          '• iOS NFC app will block entry until ticket is linked\n' +
          '• You must upload/create tickets before check-ins\n\n' +
          (eventData.allow_unlinked_entry ?
            '✓ Emergency override is ENABLED (admins can bypass)\n\n' :
            '⚠️  Emergency override is DISABLED (strict enforcement)\n\n') +
          'Are you sure you want to enforce ticket linking?'
        );
        if (!confirmed) {
          return;
        }
      }
    }

    // Validate Step 5: Capacity & Alerts
    if (currentStep === 5) {
      if (eventData.config.capacity_settings.alerts_enabled) {
        const threshold = eventData.config.capacity_settings.alert_threshold;
        if (!threshold || threshold < 1 || threshold > 100) {
          alert('Alert threshold must be between 1 and 100');
          return;
        }
      }
      if (eventData.capacity && eventData.capacity < 1) {
        alert('Capacity must be at least 1 if specified');
        return;
      }
    }

    // Validate Step 6: Check-in Window
    if (currentStep === 6) {
      if (eventData.config.checkin_window.enabled) {
        const startValue = eventData.config.checkin_window.start_offset_value;
        const endValue = eventData.config.checkin_window.end_offset_value;
        const startUnit = eventData.config.checkin_window.start_offset_unit;
        const endUnit = eventData.config.checkin_window.end_offset_unit;
        
        if (!startValue || startValue < 0) {
          alert('Check-in start offset must be a positive number');
          return;
        }
        
        if (!endValue || endValue < 0) {
          alert('Check-in end offset must be a positive number');
          return;
        }
        
        // Validate minimum of 30 minutes
        if (startUnit === 'minutes' && startValue < 30) {
          alert('Minimum check-in start offset is 30 minutes');
          return;
        }
        
        if (endUnit === 'minutes' && endValue < 30) {
          alert('Minimum check-in end offset is 30 minutes');
          return;
        }
      }
    }

    // Validate Step 7: Activation
    if (currentStep === 7) {
      if (eventData.config.activation.status === 'scheduled') {
        const scheduledTime = eventData.config.activation.scheduled_time;
        if (!scheduledTime) {
          alert('Please specify a scheduled activation time');
          return;
        }

        const scheduledDate = new Date(scheduledTime);
        const now = new Date();
        const eventStart = new Date(eventData.start_date);

        if (scheduledDate < now) {
          alert('Scheduled activation time must be in the future');
          return;
        }

        if (scheduledDate > eventStart) {
          alert('Scheduled activation time must be before the event start date');
          return;
        }
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      console.log('Creating event:', eventData);

      // Validate organization is selected
      if (!eventData.organization_id) {
        throw new Error('Please select an organization for this event.');
      }

      // Submit to Supabase
      const { data, error } = await supabase
        .from('events')
        .insert([{
          name: eventData.name,
          description: eventData.description,
          location: eventData.location,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          capacity: eventData.capacity || null,
          is_active: eventData.config.activation.status === 'active',
          config: eventData.config,
          organization_id: eventData.organization_id,
          lifecycle_status: 'draft',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          // iOS NFC App Compatibility - Top-level ticket linking fields
          ticket_linking_mode: eventData.ticket_linking_mode,
          allow_unlinked_entry: eventData.allow_unlinked_entry
        } as any])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        alert('Error creating event: ' + error.message);
        return;
      }

      console.log('Event created successfully:', data);
      alert('Event created successfully!');
      navigate('/events');

    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Select Organization</h3>
            <p className="text-gray-600">Choose the organization that will manage this event. Organization owners will automatically become event owners.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization *
                </label>
                <select
                  value={eventData.organization_id}
                  onChange={(e) => {
                    const selectedOrg = organizations.find(org => org.id === e.target.value);
                    setEventData({
                      ...eventData, 
                      organization_id: e.target.value,
                      organization_name: selectedOrg?.name || ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an organization...</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateOrg(!showCreateOrg)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Create new organization
                </button>
                
                {showCreateOrg && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-md">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Organization Name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter organization name"
                      />
                      <button
                        type="button"
                        onClick={handleCreateOrganization}
                        disabled={!newOrgName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Event Details</h3>
            
            {/* Event Name - Full Width */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                value={eventData.name}
                onChange={(e) => setEventData({...eventData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter event name"
              />
            </div>

            {/* Location - Full Width with Dropdown */}
            <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location *
                  <span className="text-xs text-gray-500 font-normal">(Type or select from existing)</span>
                </label>
                <div>
                <input
                  type="text"
                  value={eventData.location}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEventData({...eventData, location: value});
                    
                    // Filter locations based on input
                    if (value.trim()) {
                      const filtered = existingLocations.filter(loc => 
                        loc.toLowerCase().includes(value.toLowerCase())
                      );
                      setFilteredLocations(filtered);
                      setShowLocationDropdown(filtered.length > 0);
                    } else {
                      setFilteredLocations(existingLocations);
                      setShowLocationDropdown(existingLocations.length > 0);
                    }
                  }}
                  onFocus={() => {
                    setFilteredLocations(existingLocations);
                    setShowLocationDropdown(existingLocations.length > 0);
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown item
                    setTimeout(() => setShowLocationDropdown(false), 200);
                  }}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type or select existing location"
                />
                
                {/* Dropdown with existing locations */}
                {showLocationDropdown && filteredLocations.length > 0 && (
                  <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-y-auto">
                    <div className="py-1">
                      {filteredLocations.map((location, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setEventData({...eventData, location});
                            setShowLocationDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                </div>
            </div>

            {/* Dates - Two Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={eventData.start_date}
                  onChange={(e) => setEventData({...eventData, start_date: e.target.value})}
                  min={new Date(Date.now() - 60 * 1000).toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Start date cannot be in the past</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={eventData.end_date}
                  onChange={(e) => setEventData({...eventData, end_date: e.target.value})}
                  min={eventData.start_date || new Date(Date.now() - 60 * 1000).toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">End date must be after start date</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={eventData.description}
                onChange={(e) => setEventData({...eventData, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Event description..."
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Ticket Linking Configuration</h3>
            <p className="text-gray-600">Configure ticket linking requirements for your event. This setting applies to all events (standalone, series, parent, and child events).</p>

            <div className="space-y-6">
              {/* Ticket Linking Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Ticket Linking Mode *
                </label>
                <div className="space-y-3">
                  {/* Disabled Option */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" style={{
                    borderColor: eventData.ticket_linking_mode === 'disabled' ? '#0EA5E9' : '#E5E7EB'
                  }}>
                    <input
                      type="radio"
                      name="ticket_linking_mode"
                      value="disabled"
                      checked={eventData.ticket_linking_mode === 'disabled'}
                      onChange={(e) => setEventData({
                        ...eventData,
                        ticket_linking_mode: e.target.value as 'disabled' | 'optional' | 'required',
                        config: { ...eventData.config, ticket_linking_mode: e.target.value as 'disabled' | 'optional' | 'required' }
                      })}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">No Tickets</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Event has no ticketing system. Wristbands work independently.</p>
                    </div>
                  </label>

                  {/* Optional Option */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" style={{
                    borderColor: eventData.ticket_linking_mode === 'optional' ? '#0EA5E9' : '#E5E7EB'
                  }}>
                    <input
                      type="radio"
                      name="ticket_linking_mode"
                      value="optional"
                      checked={eventData.ticket_linking_mode === 'optional'}
                      onChange={(e) => setEventData({
                        ...eventData,
                        ticket_linking_mode: e.target.value as 'disabled' | 'optional' | 'required',
                        config: { ...eventData.config, ticket_linking_mode: e.target.value as 'disabled' | 'optional' | 'required' }
                      })}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Optional Linking</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Tickets exist but linking is not enforced. Allows both linked and unlinked entry.</p>
                    </div>
                  </label>

                  {/* Required Option */}
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors" style={{
                    borderColor: eventData.ticket_linking_mode === 'required' ? '#0EA5E9' : '#E5E7EB'
                  }}>
                    <input
                      type="radio"
                      name="ticket_linking_mode"
                      value="required"
                      checked={eventData.ticket_linking_mode === 'required'}
                      onChange={(e) => setEventData({
                        ...eventData,
                        ticket_linking_mode: e.target.value as 'disabled' | 'optional' | 'required',
                        config: { ...eventData.config, ticket_linking_mode: e.target.value as 'disabled' | 'optional' | 'required' }
                      })}
                      className="mt-1 h-4 w-4 text-blue-600"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">Required Linking</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">All wristbands MUST be linked to valid tickets. Strict enforcement.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Allow Unlinked Entry Toggle - Only show when mode is 'required' */}
              {eventData.ticket_linking_mode === 'required' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="allow_unlinked_entry"
                      checked={eventData.allow_unlinked_entry}
                      onChange={(e) => setEventData({
                        ...eventData,
                        allow_unlinked_entry: e.target.checked,
                        config: { ...eventData.config, allow_unlinked_entry: e.target.checked }
                      })}
                      className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allow_unlinked_entry" className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">Allow Emergency Override</span>
                      <span className="block text-sm text-gray-700 mt-1">
                        When enabled, admins can override ticket linking requirements in emergency situations.
                        Uncheck for strict 1:1 ticket-to-wristband enforcement with no exceptions.
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">📱 iOS NFC App Compatibility</h4>
                <p className="text-sm text-blue-800">
                  These settings are verified on a per-event basis by the iOS NFC scanning app.
                  Each event (standalone, series, parent, or child) has its own configuration.
                </p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Gate Configuration</h3>
            <p className="text-gray-600">Configure how gates are created and managed at your event.</p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="auto_create"
                  checked={eventData.config.gate_settings.auto_create}
                  onChange={(e) => setEventData({
                    ...eventData,
                    config: {
                      ...eventData.config,
                      gate_settings: {
                        ...eventData.config.gate_settings,
                        auto_create: e.target.checked
                      }
                    }
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_create" className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">Auto-Create Gates</span>
                  <span className="block text-sm text-gray-500">Automatically create gates when staff scan from new locations</span>
                </label>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="enforce_categories"
                  checked={eventData.config.gate_settings.enforce_categories}
                  onChange={(e) => setEventData({
                    ...eventData,
                    config: {
                      ...eventData.config,
                      gate_settings: {
                        ...eventData.config.gate_settings,
                        enforce_categories: e.target.checked
                      }
                    }
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="enforce_categories" className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">Enforce Category Bindings</span>
                  <span className="block text-sm text-gray-500">Restrict which wristband categories can check in at specific gates</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scan Mode
                </label>
                <select
                  value={eventData.config.gate_settings.scan_mode}
                  onChange={(e) => setEventData({
                    ...eventData,
                    config: {
                      ...eventData.config,
                      gate_settings: {
                        ...eventData.config.gate_settings,
                        scan_mode: e.target.value
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="single">Single - One check-in per wristband</option>
                  <option value="continuous">Continuous - Multiple check-ins allowed</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Capacity & Alerts</h3>
            <p className="text-gray-600">Set capacity limits and configure automatic alerts.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Capacity
                </label>
                <input
                  type="number"
                  value={eventData.capacity || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : null;
                    setEventData({
                      ...eventData,
                      capacity: value,
                      config: {
                        ...eventData.config,
                        capacity_settings: {
                          ...eventData.config.capacity_settings,
                          max_capacity: value
                        }
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter maximum capacity (optional)"
                  min="0"
                />
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="alerts_enabled"
                  checked={eventData.config.capacity_settings.alerts_enabled}
                  onChange={(e) => setEventData({
                    ...eventData,
                    config: {
                      ...eventData.config,
                      capacity_settings: {
                        ...eventData.config.capacity_settings,
                        alerts_enabled: e.target.checked
                      }
                    }
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="alerts_enabled" className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">Enable Capacity Alerts</span>
                  <span className="block text-sm text-gray-500">Get notified when attendance reaches threshold</span>
                </label>
              </div>

              {eventData.config.capacity_settings.alerts_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    value={eventData.config.capacity_settings.alert_threshold}
                    onChange={(e) => setEventData({
                      ...eventData,
                      config: {
                        ...eventData.config,
                        capacity_settings: {
                          ...eventData.config.capacity_settings,
                          alert_threshold: parseInt(e.target.value)
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="100"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Alert when {eventData.config.capacity_settings.alert_threshold}% capacity is reached (1-100%)
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Check-in Window</h3>
            <p className="text-gray-600">Define when check-ins can start before and end after the event.</p>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="checkin_window_enabled"
                  checked={eventData.config.checkin_window.enabled}
                  onChange={(e) => setEventData({
                    ...eventData,
                    config: {
                      ...eventData.config,
                      checkin_window: {
                        ...eventData.config.checkin_window,
                        enabled: e.target.checked
                      }
                    }
                  })}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="checkin_window_enabled" className="ml-3">
                  <span className="block text-sm font-medium text-gray-700">Enable Check-in Time Window</span>
                  <span className="block text-sm text-gray-500">Control when attendees can check in relative to event times</span>
                </label>
              </div>

              {eventData.config.checkin_window.enabled && (
                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  {/* Event Date Display */}
                  {eventData.start_date && eventData.end_date && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-sm font-medium text-blue-900 mb-1">Event Schedule</p>
                      <div className="text-xs text-blue-700 space-y-1">
                        <div>
                          <span className="font-semibold">Start:</span> {new Date(eventData.start_date).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        <div>
                          <span className="font-semibold">End:</span> {new Date(eventData.end_date).toLocaleString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Check-in Start Offset */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Opens
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min={eventData.config.checkin_window.start_offset_unit === 'minutes' ? 30 : 1}
                        step={eventData.config.checkin_window.start_offset_unit === 'minutes' ? 30 : 1}
                        value={eventData.config.checkin_window.start_offset_value}
                        onChange={(e) => setEventData({
                          ...eventData,
                          config: {
                            ...eventData.config,
                            checkin_window: {
                              ...eventData.config.checkin_window,
                              start_offset_value: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={eventData.config.checkin_window.start_offset_unit}
                        onChange={(e) => {
                          const newUnit = e.target.value as 'minutes' | 'hours' | 'days';
                          let newValue = eventData.config.checkin_window.start_offset_value;
                          // Ensure minimum 30 minutes if switching to minutes
                          if (newUnit === 'minutes' && newValue < 30) {
                            newValue = 30;
                          }
                          setEventData({
                            ...eventData,
                            config: {
                              ...eventData.config,
                              checkin_window: {
                                ...eventData.config.checkin_window,
                                start_offset_unit: newUnit,
                                start_offset_value: newValue
                              }
                            }
                          });
                        }}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        before
                      </span>
                      <div className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
                        {eventData.start_date ? new Date(eventData.start_date).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : 'Event Start'}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {eventData.config.checkin_window.start_offset_unit === 'minutes' ? 'Minimum: 30 minutes' : 'Minimum: 1 ' + eventData.config.checkin_window.start_offset_unit}
                    </p>
                  </div>

                  {/* Check-in End Offset */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Closes
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        min={eventData.config.checkin_window.end_offset_unit === 'minutes' ? 30 : 1}
                        step={eventData.config.checkin_window.end_offset_unit === 'minutes' ? 30 : 1}
                        value={eventData.config.checkin_window.end_offset_value}
                        onChange={(e) => setEventData({
                          ...eventData,
                          config: {
                            ...eventData.config,
                            checkin_window: {
                              ...eventData.config.checkin_window,
                              end_offset_value: parseInt(e.target.value) || 0
                            }
                          }
                        })}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={eventData.config.checkin_window.end_offset_unit}
                        onChange={(e) => {
                          const newUnit = e.target.value as 'minutes' | 'hours' | 'days';
                          let newValue = eventData.config.checkin_window.end_offset_value;
                          // Ensure minimum 30 minutes if switching to minutes
                          if (newUnit === 'minutes' && newValue < 30) {
                            newValue = 30;
                          }
                          setEventData({
                            ...eventData,
                            config: {
                              ...eventData.config,
                              checkin_window: {
                                ...eventData.config.checkin_window,
                                end_offset_unit: newUnit,
                                end_offset_value: newValue
                              }
                            }
                          });
                        }}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        after
                      </span>
                      <div className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700">
                        {eventData.end_date ? new Date(eventData.end_date).toLocaleString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        }) : 'Event End'}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {eventData.config.checkin_window.end_offset_unit === 'minutes' ? 'Minimum: 30 minutes' : 'Minimum: 1 ' + eventData.config.checkin_window.end_offset_unit}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Activation & Launch</h3>
            <p className="text-gray-600">Choose when to activate your event.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Event Status
                </label>
                <div className="space-y-3">
                  <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="activation_status"
                      value="draft"
                      checked={eventData.config.activation.status === 'draft'}
                      onChange={(e) => setEventData({
                        ...eventData,
                        config: {
                          ...eventData.config,
                          activation: {
                            status: e.target.value,
                            scheduled_time: undefined
                          }
                        }
                      })}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">Draft</span>
                      <span className="block text-sm text-gray-500">Save as draft - not visible to attendees</span>
                    </div>
                  </label>

                  <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="activation_status"
                      value="scheduled"
                      checked={eventData.config.activation.status === 'scheduled'}
                      onChange={(e) => setEventData({
                        ...eventData,
                        config: {
                          ...eventData.config,
                          activation: {
                            status: e.target.value,
                            scheduled_time: eventData.start_date
                          }
                        }
                      })}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3 flex-1">
                      <span className="block text-sm font-medium text-gray-900">Scheduled</span>
                      <span className="block text-sm text-gray-500">Automatically activate at specified time</span>
                      {eventData.config.activation.status === 'scheduled' && (
                        <div>
                          <input
                            type="datetime-local"
                            value={eventData.config.activation.scheduled_time || eventData.start_date}
                            onChange={(e) => setEventData({
                              ...eventData,
                              config: {
                                ...eventData.config,
                                activation: {
                                  ...eventData.config.activation,
                                  scheduled_time: e.target.value
                                }
                              }
                            })}
                            min={new Date().toISOString().slice(0, 16)}
                            max={eventData.start_date}
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Must be between now and event start date</p>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="activation_status"
                      value="active"
                      checked={eventData.config.activation.status === 'active'}
                      onChange={(e) => setEventData({
                        ...eventData,
                        config: {
                          ...eventData.config,
                          activation: {
                            status: e.target.value,
                            scheduled_time: undefined
                          }
                        }
                      })}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-900">Active Now</span>
                      <span className="block text-sm text-gray-500">Make event live immediately</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Configuration Summary</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• Organization: {eventData.organization_name}</p>
                  <p>• Event: {eventData.name || 'Not set'}</p>
                  <p>• Location: {eventData.location || 'Not set'}</p>
                  <p>• Security: {eventData.config.security_mode}</p>
                  <p>• Auto-create gates: {eventData.config.gate_settings.auto_create ? 'Yes' : 'No'}</p>
                  <p>• Capacity: {eventData.capacity || 'Unlimited'}</p>
                  <p>• Status: {eventData.config.activation.status}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
          <p className="text-gray-600 mt-1">Set up your event with organization-based access control</p>
        </div>

        {/* Progress Steps - Dynamic Single Step Display */}
        <div className="px-6 py-4 border-b border-gray-200">
          {/* Current Step Info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-semibold">
                {currentStep}
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {steps[currentStep - 1].title}
                </h3>
                <p className="text-sm text-gray-500">
                  Step {currentStep} of {steps.length}
                </p>
              </div>
            </div>
            <div className="text-sm font-medium text-blue-600">
              {Math.round((currentStep / steps.length) * 100)}% Complete
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="px-6 py-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>

          {currentStep === steps.length ? (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCreationWizard;
