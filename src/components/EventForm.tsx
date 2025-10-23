import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../services/supabase';
import { csrfProtection } from '../utils/csrfProtection';
import notification from '../utils/notifications';

interface EventFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_public: boolean;
  capacity: number;
  ticket_linking_mode: 'disabled' | 'optional' | 'required';
  allow_unlinked_entry: boolean;
  is_active: boolean;
  lifecycle_status: 'draft' | 'active' | 'completed' | 'cancelled' | 'archived';
}

const EventForm: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [originalData, setOriginalData] = useState<EventFormData | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    is_public: false,
    capacity: 0,
    ticket_linking_mode: 'disabled',
    allow_unlinked_entry: true,
    is_active: false,
    lifecycle_status: 'draft',
  });

  useEffect(() => {
    if (isEdit && id) fetchEvent();
  }, [id, isEdit]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data) {
        const loadedData = {
          name: data.name || '',
          description: data.description || '',
          location: data.location || '',
          is_public: data.is_public || false,
          capacity: data.capacity || 0,
          ticket_linking_mode: data.ticket_linking_mode || 'disabled',
          allow_unlinked_entry: data.allow_unlinked_entry !== false,
          is_active: data.is_active || false,
          lifecycle_status: data.lifecycle_status || 'draft',
          start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '',
          end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : ''
        };
        setFormData(loadedData);
        setOriginalData(loadedData); // Store original for comparison
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!isEdit || !originalData) return true;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    let newValue = type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : type === 'number'
        ? parseInt(value) || 0
        : value;

    setFormData(prev => {
      const updated = { ...prev, [name]: newValue };

      // Handle ticket linking mode logic to prevent conflicts
      if (name === 'ticket_linking_mode') {
        if (value === 'disabled') {
          // When disabled, allow_unlinked_entry doesn't matter
          updated.allow_unlinked_entry = true;
        } else if (value === 'required') {
          // When required, must NOT allow unlinked entry
          updated.allow_unlinked_entry = false;
        }
        // For 'optional', leave allow_unlinked_entry as user preference
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // CSRF Protection
    const csrfToken = csrfProtection.getToken();
    if (!csrfToken) {
      notification.error('Security token missing. Please refresh the page and try again.');
      return;
    }

    // Validate required fields with notifications
    if (!formData.name) {
      notification.error('Please provide a name for the event', undefined, {
        origin: 'app',
        context: {
          entity: 'event',
          operation: 'create',
          validation: 'required_field',
          field: 'name',
          technicalDetails: 'Validation failed: Event name is required'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }

    if (!formData.start_date) {
      notification.error('Please select a start date for the event', undefined, {
        origin: 'app',
        context: {
          entity: 'event',
          operation: 'create',
          validation: 'required_field',
          field: 'start_date',
          technicalDetails: 'Validation failed: Start date is required'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }

    if (!formData.end_date) {
      notification.error('Please select an end date for the event', undefined, {
        origin: 'app',
        context: {
          entity: 'event',
          operation: 'create',
          validation: 'required_field',
          technicalDetails: 'Validation failed: End date is required',
          field: 'end_date'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }

    // Validate date range using the new validation rules
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      notification.error('Invalid date format', undefined, {
        origin: 'app',
        context: {
          entity: 'event',
          operation: isEdit ? 'update' : 'create',
          validation: 'date_format',
          technicalDetails: 'Validation failed: Invalid date format'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }

    // Start date cannot be in the past (only for new events)
    if (!isEdit) {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

      if (startDate < oneMinuteAgo) {
        notification.error('Start date cannot be in the past', undefined, {
          origin: 'app',
          context: {
            entity: 'event',
            operation: 'create',
            validation: 'past_date',
            technicalDetails: 'Validation failed: Start date is in the past',
            showInUI: true,
            logToConsole: true
          },
          toastOptions: {
            autoClose: 5000
          }
        });
        return;
      }
    }

    // Note: We no longer enforce that end_date must be after start_date
    // This is intentionally flexible per the specification

    setLoading(true);
    try {
      const eventData = {
        ...formData,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      const { data, error } = isEdit && id
        ? await supabase.from('events').update(eventData).eq('id', id).select()
        : await supabase.from('events').insert([{
            ...eventData,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            organization_id: currentOrganization?.id
          }]).select();

      if (error) {
        // Handle specific Supabase errors
        if (error.code === '23505') {
          throw new Error('An event with this name already exists');
        } else if (error.code === '42501') {
          throw new Error('You do not have permission to perform this action');
        } else if (error.code === 'PGRST116') {
          throw new Error('Required fields are missing');
        } else {
          throw error;
        }
      }

      // Only proceed with navigation if the operation was successful
      if (data && data.length > 0) {
        if (isEdit) {
          notification.success(`Event "${formData.name}" updated successfully`, {
            origin: 'app',
            context: {
              entity: 'event',
              operation: 'update'
            }
          });
        } else {
          notification.success(`Event "${formData.name}" created successfully`, {
            origin: 'app',
            context: {
              entity: 'event',
              operation: 'create'
            }
          });
        }
        // Add a small delay to ensure the notification is visible before navigating
        setTimeout(() => {
          navigate('/events', {
            state: {
              message: `Event "${formData.name}" successfully ${isEdit ? 'updated' : 'created'}`,
              timestamp: Date.now()
            }
          });
        }, 500);
      } else {
        throw new Error('No data returned from the server');
      }
    } catch (error: unknown) {
      let errorMessage = 'An unknown error occurred';
      let errorCode = '';
      let errorStack: string | undefined;

      if (error instanceof Error) {
        errorMessage = error.message;
        errorStack = process.env.NODE_ENV === 'development' ? error.stack : undefined;

        // Handle specific Supabase errors
        if ('code' in error) {
          errorCode = String(error.code);
          switch(error.code) {
            case '23505': // Unique violation
              errorMessage = 'An event with this name already exists';
              break;
            case '42501': // Insufficient privilege
              errorMessage = 'You do not have permission to perform this action';
              break;
            case 'PGRST116': // Missing required fields
              errorMessage = 'Required fields are missing';
              break;
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }

      // Log detailed error to console in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Event operation error:', {
          error,
          message: errorMessage,
          code: errorCode,
          stack: errorStack
        });
      }

      // Show user-friendly error notification
      const errorMessageText = `Could not ${isEdit ? 'update' : 'create'} event: ${errorMessage}`;
      notification.error(errorMessageText, {
        'data-entity': 'event',
        'data-operation': isEdit ? 'update' : 'create',
        autoClose: 5000,
        context: {
          errorCode,
          errorStack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
          formData: process.env.NODE_ENV === 'development' ? formData : undefined
        }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold">{isEdit ? 'Edit Event' : 'New Event'}</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Event Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date/Time *</label>
            <input
              type="datetime-local"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              min={!isEdit ? new Date(Date.now() - 60 * 1000).toISOString().slice(0, 16) : undefined}
              className="w-full p-2 border rounded"
              required
            />
            {!isEdit && (
              <p className="text-xs text-gray-500 mt-1">Start date cannot be in the past</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date/Time *</label>
            <input
              type="datetime-local"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
            <p className="text-xs text-gray-500 mt-1">End date can be before or after start date (flexible)</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            name="is_public"
            checked={formData.is_public}
            onChange={handleChange}
            className="h-4 w-4 rounded"
          />
          <label className="ml-2 text-sm">Make event public</label>
        </div>

        {/* Advanced Configuration Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Event Configuration</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity || 0}
                onChange={handleChange}
                className="w-full p-2 border rounded"
                min="0"
                placeholder="0 = unlimited"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.capacity > 0 ? `Capacity: ${formData.capacity.toLocaleString()}` : 'Unlimited capacity'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ticket Linking Mode</label>
              <select
                name="ticket_linking_mode"
                value={formData.ticket_linking_mode}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="disabled">Disabled - Anyone with wristband can enter</option>
                <option value="optional">Optional - Ticket linking available, entry flexible</option>
                <option value="required">Required - Only linked tickets can enter</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.ticket_linking_mode === 'disabled' && 'No guest list validation - any wristband works'}
                {formData.ticket_linking_mode === 'optional' && 'Guest list available but not enforced - you control entry policy below'}
                {formData.ticket_linking_mode === 'required' && 'Strict guest list enforcement - only valid tickets can enter'}
              </p>
            </div>
          </div>

          {formData.ticket_linking_mode === 'optional' && (
            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="allow_unlinked_entry"
                  checked={formData.allow_unlinked_entry}
                  onChange={handleChange}
                  className="h-4 w-4 rounded"
                />
                <label className="ml-2 text-sm">Allow entry without linked tickets</label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, attendees can check in even if their wristband isn't linked to a ticket
              </p>
            </div>
          )}
        </div>

        {/* Event Status Section */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-4">Event Status</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lifecycle Status</label>
              <select
                name="lifecycle_status"
                value={formData.lifecycle_status}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                <option value="draft">Draft - Not visible to public</option>
                <option value="active">Active - Event is live</option>
                <option value="completed">Completed - Event has ended</option>
                <option value="cancelled">Cancelled - Event cancelled</option>
                <option value="archived">Archived - Historical record</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Current: <span className="font-semibold capitalize">{formData.lifecycle_status}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Active Status</label>
              <div className="flex items-center space-x-4 p-3 border rounded bg-gray-50">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === true}
                    onChange={() => setFormData(prev => ({ ...prev, is_active: true }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === false}
                    onChange={() => setFormData(prev => ({ ...prev, is_active: false }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Inactive</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.is_active ? '✅ Event is currently active' : '⏸️ Event is currently inactive'}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> Changing status to "Active" and enabling "is_active" will make the event visible and operational.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {/* CSRF Token */}
          <input type="hidden" name="csrf_token" value={csrfProtection.getToken()} />

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border rounded"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={loading || (isEdit && !hasChanges())}
          >
            {loading ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
