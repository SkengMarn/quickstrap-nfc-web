import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface AccessFormData {
  user_email: string;
  event_id: string;
  role: 'admin' | 'scanner';
}

interface EventOption {
  id: string;
  name: string;
}

const AccessForm: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [formData, setFormData] = useState<AccessFormData>({
    user_email: '',
    event_id: '',
    role: 'scanner',
  });

  useEffect(() => {
    fetchEvents();
    if (isEdit && id) fetchAccess();
    const eventId = new URLSearchParams(location.search).get('event_id');
    if (eventId) setFormData(prev => ({ ...prev, event_id: eventId }));
  }, [id, isEdit, location.search]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    }
  };

  const fetchAccess = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_access')
        .select('*, user:user_id(id, email)')
        .eq('id', id)
        .single();
      if (error) throw error;
      if (data) {
        setFormData({
          user_email: data.user?.email || '',
          event_id: data.event_id,
          role: data.role,
        });
      }
    } catch (error) {
      console.error('Error fetching access:', error);
      toast.error('Failed to load access data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const typedName = name as keyof AccessFormData;
    setFormData(prev => ({ ...prev, [typedName]: value } as AccessFormData));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.user_email || !formData.event_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.user_email.trim())
        .single();

      if (userError || !userData) throw new Error('User not found');

      if (isEdit && id) {
        await updateAccess(userData.id);
      } else {
        await createAccess(userData.id);
      }
      
      navigate(formData.event_id ? `/access?event_id=${formData.event_id}` : '/access');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateAccess = async (userId: string) => {
    const { error } = await supabase
      .from('event_access')
      .update({
        user_id: userId,
        event_id: formData.event_id,
        role: formData.role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
    toast.success('Access updated successfully');
  };

  const createAccess = async (userId: string) => {
    const { error } = await supabase
      .from('event_access')
      .insert([{ 
        user_id: userId,
        event_id: formData.event_id,
        role: formData.role,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      }]);
    if (error) throw error;
    toast.success('Access granted successfully');
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {isEdit ? 'Edit Access' : 'Grant Access'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="user_email" className="block text-sm font-medium text-gray-700 mb-1">
              User Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="user_email"
              name="user_email"
              value={formData.user_email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter user's email"
              required
              disabled={isEdit}
            />
          </div>

          <div>
            <label htmlFor="event_id" className="block text-sm font-medium text-gray-700 mb-1">
              Event <span className="text-red-500">*</span>
            </label>
            <select
              id="event_id"
              name="event_id"
              value={formData.event_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={!!new URLSearchParams(location.search).get('event_id')}
            >
              <option value="">Select an event</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="scanner">Scanner</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Access' : 'Grant Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccessForm;
