import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Calendar, Shield, Settings, Users, Clock } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';

interface EventConfig {
  security_mode: 'disabled' | 'optional' | 'required';
  gate_settings: {
    auto_create: boolean;
    enforce_categories: boolean;
    scan_mode: 'single' | 'continuous';
  };
  capacity_settings: {
    alerts_enabled: boolean;
    alert_threshold: number;
    max_capacity: number | null;
  };
  checkin_window: {
    enabled: boolean;
    start_time: string | null;
    end_time: string | null;
  };
}

interface EventData {
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  capacity: number | null;
  is_public: boolean;
  config: EventConfig;
}

const EventCreationWizard: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [eventData, setEventData] = useState<EventData>({
    name: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    capacity: null,
    is_public: true,
    config: {
      security_mode: 'optional',
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
        start_time: null,
        end_time: null
      }
    }
  });

  const steps = [
    { id: 1, title: 'Basic Information', icon: Calendar },
    { id: 2, title: 'Security Settings', icon: Shield },
    { id: 3, title: 'Gate Configuration', icon: Settings },
    { id: 4, title: 'Capacity & Alerts', icon: Users },
    { id: 5, title: 'Check-in Window', icon: Clock }
  ];

  const handleNext = () => {
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
      
      // Submit to Supabase - using correct column names from schema
      const { data, error } = await supabase
        .from('events')
        .insert([{
          name: eventData.name,
          description: eventData.description,
          location: eventData.location,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          total_capacity: eventData.capacity || 0,
          is_public: eventData.is_public,
          config: eventData.config,
          organization_id: currentOrganization?.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        alert('Error creating event: ' + error.message);
        return;
      }

      console.log('Event created successfully:', data);
      
      // Show success message and redirect
      alert('Event created successfully!');
      
      // Navigate to the new event's details page
      if (data?.id) {
        window.location.href = `/events/${data.id}`;
      } else {
        // Fallback to events list
        window.location.href = '/events';
      }
      
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
            <h3 className="text-lg font-semibold">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventData.name}
                  onChange={(e) => setEventData({...eventData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="MEATINGS, MEAT, FRIENDS & VIBES"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={eventData.location}
                  onChange={(e) => setEventData({...eventData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Main Venue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="datetime-local"
                  value={eventData.start_date}
                  onChange={(e) => setEventData({...eventData, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="datetime-local"
                  value={eventData.end_date}
                  onChange={(e) => setEventData({...eventData, end_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                checked={eventData.is_public}
                onChange={(e) => setEventData({...eventData, is_public: e.target.checked})}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
                Public Event (visible to all users)
              </label>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Security Configuration</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Ticket Linking Mode
              </label>
              <div className="space-y-3">
                {[
                  { value: 'disabled', label: 'Disabled', desc: 'No ticket validation required' },
                  { value: 'optional', label: 'Optional', desc: 'Ticket linking available but not required' },
                  { value: 'required', label: 'Required', desc: 'All check-ins must link to valid tickets' }
                ].map((option) => (
                  <div key={option.value} className="flex items-start">
                    <input
                      type="radio"
                      id={option.value}
                      name="security_mode"
                      value={option.value}
                      checked={eventData.config.security_mode === option.value}
                      onChange={(e) => setEventData({
                        ...eventData,
                        config: {
                          ...eventData.config,
                          security_mode: e.target.value as 'disabled' | 'optional' | 'required'
                        }
                      })}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <div className="ml-3">
                      <label htmlFor={option.value} className="block text-sm font-medium text-gray-700">
                        {option.label}
                      </label>
                      <p className="text-sm text-gray-500">{option.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Gate Behavior Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Auto-create Gates
                  </label>
                  <p className="text-sm text-gray-500">
                    Automatically create gates from scan patterns
                  </p>
                </div>
                <input
                  type="checkbox"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Enforce Category-Gate Assignments
                  </label>
                  <p className="text-sm text-gray-500">
                    Restrict categories to specific gates
                  </p>
                </div>
                <input
                  type="checkbox"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Scan Mode
                </label>
                <select
                  value={eventData.config.gate_settings.scan_mode}
                  onChange={(e) => setEventData({
                    ...eventData,
                    config: {
                      ...eventData.config,
                      gate_settings: {
                        ...eventData.config.gate_settings,
                        scan_mode: e.target.value as 'single' | 'continuous'
                      }
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="single">Single Tap</option>
                  <option value="continuous">Continuous Scanning</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Capacity & Alerts</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Capacity
                </label>
                <input
                  type="number"
                  value={eventData.capacity || ''}
                  onChange={(e) => {
                    const capacity = e.target.value ? parseInt(e.target.value) : null;
                    setEventData({
                      ...eventData,
                      capacity,
                      config: {
                        ...eventData.config,
                        capacity_settings: {
                          ...eventData.config.capacity_settings,
                          max_capacity: capacity
                        }
                      }
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="500"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Enable Capacity Alerts
                  </label>
                  <p className="text-sm text-gray-500">
                    Get notified when approaching capacity
                  </p>
                </div>
                <input
                  type="checkbox"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {eventData.config.capacity_settings.alerts_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Threshold (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
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
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Check-in Window</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Enable Check-in Window
                  </label>
                  <p className="text-sm text-gray-500">
                    Restrict check-ins to specific time period
                  </p>
                </div>
                <input
                  type="checkbox"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              {eventData.config.checkin_window.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Window Start Time
                    </label>
                    <input
                      type="time"
                      value={eventData.config.checkin_window.start_time || ''}
                      onChange={(e) => setEventData({
                        ...eventData,
                        config: {
                          ...eventData.config,
                          checkin_window: {
                            ...eventData.config.checkin_window,
                            start_time: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Window End Time
                    </label>
                    <input
                      type="time"
                      value={eventData.config.checkin_window.end_time || ''}
                      onChange={(e) => setEventData({
                        ...eventData,
                        config: {
                          ...eventData.config,
                          checkin_window: {
                            ...eventData.config.checkin_window,
                            end_time: e.target.value
                          }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isCompleted ? 'bg-green-500 border-green-500 text-white' :
                  isCurrent ? 'bg-blue-500 border-blue-500 text-white' :
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-96">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
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
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Create Event'
            )}
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
  );
};

export default EventCreationWizard;
