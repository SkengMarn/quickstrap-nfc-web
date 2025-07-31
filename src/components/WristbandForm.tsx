import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface WristbandFormData {
  nfc_id: string;
  category: string;
  is_active: boolean;
  event_id: string;
  notes?: string;
}

interface EventOption {
  id: string;
  name: string;
}

const WristbandForm: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [formData, setFormData] = useState<WristbandFormData>({
    nfc_id: '',
    category: 'general',
    is_active: true,
    event_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchEvents();
    if (isEdit && id) {
      fetchWristband();
    } else {
      // If coming from an event page, pre-select that event
      const queryParams = new URLSearchParams(location.search);
      const eventId = queryParams.get('event_id');
      if (eventId) {
        setFormData(prev => ({ ...prev, event_id: eventId }));
      }
    }
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

  const fetchWristband = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wristbands')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          nfc_id: data.nfc_id,
          category: data.category || 'general',
          is_active: data.is_active,
          event_id: data.event_id,
          notes: data.notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching wristband:', error);
      toast.error('Failed to load wristband data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.nfc_id.trim()) {
      toast.error('NFC ID is required');
      return false;
    }
    if (!formData.event_id) {
      toast.error('Event is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEdit && id) {
        const { error } = await supabase
          .from('wristbands')
          .update(formData)
          .eq('id', id);
        
        if (error) throw error;
        toast.success('Wristband updated successfully');
      } else {
        const { error } = await supabase
          .from('wristbands')
          .insert([{ 
            ...formData,
            created_by: (await supabase.auth.getUser()).data.user?.id 
          }]);
        
        if (error) throw error;
        toast.success('Wristband created successfully');
      }
      
      navigate(formData.event_id ? `/wristbands?event_id=${formData.event_id}` : '/wristbands');
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} wristband:`, error);
      toast.error(`Failed to ${isEdit ? 'update' : 'create'} wristband`);
    } finally {
      setLoading(false);
    }
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
            {isEdit ? 'Edit Wristband' : 'Register New Wristband'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="nfc_id" className="block text-sm font-medium text-gray-700 mb-1">
              NFC ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="nfc_id"
              name="nfc_id"
              value={formData.nfc_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
              placeholder="Enter NFC ID"
              required
              disabled={isEdit}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="general">General</option>
                <option value="vip">VIP</option>
                <option value="staff">Staff</option>
                <option value="media">Media</option>
                <option value="vendor">Vendor</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional notes"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Active (can be used for check-ins)
            </label>
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
              {loading ? 'Saving...' : isEdit ? 'Update Wristband' : 'Register Wristband'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WristbandForm;
