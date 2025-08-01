import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import notification from '../utils/notifications';

interface EventFormData {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  is_public: boolean;
}

const EventForm: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    is_public: false,
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
      if (data) setFormData(prev => ({
        ...prev,
        ...data,
        start_date: data.start_date ? new Date(data.start_date).toISOString().slice(0, 16) : '',
        end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : ''
      }));
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields with notifications
    if (!formData.name) {
      notification.error('Please provide a name for the event', undefined, {
        entity: 'event',
        operation: 'create',
        severity: 'error',
        technicalDetails: 'Validation failed: Event name is required',
        context: {
          validation: 'required_field',
          field: 'name'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }

    if (!formData.start_date) {
      notification.error('Please select a start date for the event', undefined, {
        entity: 'event',
        operation: 'create',
        severity: 'error',
        technicalDetails: 'Validation failed: Start date is required',
        context: {
          validation: 'required_field',
          field: 'start_date'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }

    if (!formData.end_date) {
      notification.error('Please select an end date for the event', undefined, {
        entity: 'event',
        operation: 'create',
        severity: 'error',
        technicalDetails: 'Validation failed: End date is required',
        context: {
          validation: 'required_field',
          field: 'end_date'
        },
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }

    // Validate date range
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      notification.error('Please enter valid dates in the correct format', undefined, {
        entity: 'event',
        operation: 'create',
        severity: 'error',
        technicalDetails: 'Validation failed: Invalid date format',
        toastOptions: {
          autoClose: 5000
        }
      });
      return;
    }
    
    if (endDate <= startDate) {
      notification.error('End date must be after the start date', {
        entity: 'event',
        operation: 'create',
        technicalDetails: 'Validation failed: Invalid date range',
        showInUI: true,
        logToConsole: true
      });
      return;
    }

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
            created_by: (await supabase.auth.getUser()).data.user?.id 
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
            entity: 'event',
            operation: 'update',
            severity: 'success'
          });
        } else {
          notification.success(`Event "${formData.name}" created successfully`, {
            entity: 'event',
            operation: 'create',
            severity: 'success'
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
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date/Time *</label>
            <input
              type="datetime-local"
              name="end_date"
              value={formData.end_date}
              min={formData.start_date}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              required
            />
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

        <div className="flex justify-end space-x-3 pt-4">
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
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Event'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;
