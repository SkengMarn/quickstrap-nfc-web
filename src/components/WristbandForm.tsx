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
  attendee_name?: string;
  attendee_email?: string;
  status: string;
  linked_ticket_id?: string;
}

interface CheckinLog {
  id: string;
  timestamp: string;
  location?: string;
  notes?: string;
}

interface EventOption {
  id: string;
  name: string;
}

interface LinkedTicket {
  id: string;
  ticket_number: string;
  ticket_category: string;
  holder_name?: string;
  holder_email?: string;
  status: string;
}

interface AvailableTicket {
  id: string;
  ticket_number: string;
  ticket_category: string;
  holder_name?: string;
  holder_email?: string;
}

const WristbandForm: React.FC<{ isEdit?: boolean }> = ({ isEdit = false }) => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [linkedTicket, setLinkedTicket] = useState<LinkedTicket | null>(null);
  const [availableTickets, setAvailableTickets] = useState<AvailableTicket[]>([]);
  const [showTicketLinking, setShowTicketLinking] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);
  const [formData, setFormData] = useState<WristbandFormData>({
    nfc_id: '',
    category: 'general',
    is_active: true,
    event_id: '',
    notes: '',
    attendee_name: '',
    attendee_email: '',
    status: 'activated',
    linked_ticket_id: undefined,
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
        .select(`
          *,
          linked_ticket:tickets(id, ticket_number, ticket_category, holder_name, holder_email, status)
        `)
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
          attendee_name: data.attendee_name || '',
          attendee_email: data.attendee_email || '',
          status: data.status || 'activated',
          linked_ticket_id: data.linked_ticket_id,
        });
        
        // Set linked ticket if exists
        if (data.linked_ticket) {
          setLinkedTicket(data.linked_ticket);
        }
        
        // Fetch check-in logs for this wristband
        await fetchCheckinLogs(data.id);
        
        // Fetch available tickets for linking (will be called after function is defined)
        setTimeout(() => fetchAvailableTickets(data.event_id), 0);
      }
    } catch (error) {
      console.error('Error fetching wristband:', error);
      toast.error('Failed to load wristband data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckinLogs = async (wristbandId: string) => {
    try {
      const { data, error } = await supabase
        .from('checkin_logs')
        .select('id, timestamp, location, notes')
        .eq('wristband_id', wristbandId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      setCheckinLogs(data || []);
    } catch (error) {
      console.error('Error fetching check-in logs:', error);
    }
  };

  const fetchAvailableTickets = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, ticket_number, ticket_category, holder_name, holder_email')
        .eq('event_id', eventId)
        .eq('status', 'unused')
        .is('linked_wristband_id', null)
        .order('ticket_number');

      if (error) throw error;
      setAvailableTickets(data || []);
    } catch (error) {
      console.error('Error fetching available tickets:', error);
    }
  };

  const handleCheckout = async () => {
    if (!id || checkinLogs.length === 0) return;

    if (!confirm('Are you sure you want to check out this wristband? This will remove all check-in records.')) {
      return;
    }

    setCheckoutLoading(true);
    try {
      // Delete all check-in logs for this wristband
      const { error } = await supabase
        .from('checkin_logs')
        .delete()
        .eq('wristband_id', id);

      if (error) throw error;

      toast.success('Wristband checked out successfully');
      // Refresh check-in logs
      await fetchCheckinLogs(id);
    } catch (error) {
      console.error('Error checking out wristband:', error);
      toast.error('Failed to check out wristband');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleUnlinkTicket = async () => {
    if (!id || !linkedTicket) return;

    if (!confirm('Are you sure you want to unlink this ticket from the wristband?')) {
      return;
    }

    setUnlinkLoading(true);
    try {
      // Update wristband to remove ticket link
      const { error: wristbandError } = await supabase
        .from('wristbands')
        .update({ 
          linked_ticket_id: null,
          attendee_name: null,
          attendee_email: null 
        })
        .eq('id', id);

      if (wristbandError) throw wristbandError;

      // Update ticket status back to unused
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          status: 'unused',
          linked_wristband_id: null,
          linked_at: null,
          linked_by: null
        })
        .eq('id', linkedTicket.id);

      if (ticketError) throw ticketError;

      toast.success('Ticket unlinked successfully');
      setLinkedTicket(null);
      setFormData(prev => ({ 
        ...prev, 
        linked_ticket_id: undefined,
        attendee_name: '',
        attendee_email: ''
      }));
      
      // Refresh available tickets
      await fetchAvailableTickets(formData.event_id);
    } catch (error) {
      console.error('Error unlinking ticket:', error);
      toast.error('Failed to unlink ticket');
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handleLinkTicket = async (ticketId: string) => {
    if (!id) return;

    try {
      const ticket = availableTickets.find(t => t.id === ticketId);
      if (!ticket) return;

      // Update wristband with ticket link
      const { error: wristbandError } = await supabase
        .from('wristbands')
        .update({ 
          linked_ticket_id: ticketId,
          attendee_name: ticket.holder_name,
          attendee_email: ticket.holder_email
        })
        .eq('id', id);

      if (wristbandError) throw wristbandError;

      // Update ticket status to linked
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ 
          status: 'linked',
          linked_wristband_id: id,
          linked_at: new Date().toISOString(),
          linked_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      toast.success('Ticket linked successfully');
      setLinkedTicket({
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        ticket_category: ticket.ticket_category,
        holder_name: ticket.holder_name,
        holder_email: ticket.holder_email,
        status: 'linked'
      });
      
      setFormData(prev => ({ 
        ...prev, 
        linked_ticket_id: ticketId,
        attendee_name: ticket.holder_name || '',
        attendee_email: ticket.holder_email || ''
      }));
      
      setShowTicketLinking(false);
      await fetchAvailableTickets(formData.event_id);
    } catch (error) {
      console.error('Error linking ticket:', error);
      toast.error('Failed to link ticket');
    }
  };

  const handleBlockWristband = async () => {
    if (!id) return;

    const reason = prompt('Please provide a reason for blocking this wristband:');
    if (!reason) return;

    setBlockLoading(true);
    try {
      // Insert block record
      const { error: blockError } = await supabase
        .from('wristband_blocks')
        .insert({
          wristband_id: id,
          event_id: formData.event_id,
          reason: reason,
          blocked_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (blockError) throw blockError;

      // Update wristband status
      const { error: updateError } = await supabase
        .from('wristbands')
        .update({ 
          status: 'blocked',
          is_active: false 
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Wristband blocked successfully');
      setFormData(prev => ({ 
        ...prev, 
        status: 'blocked',
        is_active: false
      }));
    } catch (error) {
      console.error('Error blocking wristband:', error);
      toast.error('Failed to block wristband');
    } finally {
      setBlockLoading(false);
    }
  };

  const handleUnblockWristband = async () => {
    if (!id) return;

    if (!confirm('Are you sure you want to unblock this wristband?')) {
      return;
    }

    setBlockLoading(true);
    try {
      // Update block record
      const { error: blockError } = await supabase
        .from('wristband_blocks')
        .update({
          unblocked_at: new Date().toISOString(),
          unblocked_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('wristband_id', id)
        .is('unblocked_at', null);

      if (blockError) throw blockError;

      // Update wristband status
      const { error: updateError } = await supabase
        .from('wristbands')
        .update({ 
          status: 'activated',
          is_active: true 
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Wristband unblocked successfully');
      setFormData(prev => ({ 
        ...prev, 
        status: 'activated',
        is_active: true
      }));
    } catch (error) {
      console.error('Error unblocking wristband:', error);
      toast.error('Failed to unblock wristband');
    } finally {
      setBlockLoading(false);
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

          {/* Attendee Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="attendee_name" className="block text-sm font-medium text-gray-700 mb-1">
                Attendee Name
              </label>
              <input
                type="text"
                id="attendee_name"
                name="attendee_name"
                value={formData.attendee_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter attendee name"
                disabled={!!linkedTicket}
              />
              {linkedTicket && (
                <p className="text-xs text-gray-500 mt-1">Populated from linked ticket</p>
              )}
            </div>

            <div>
              <label htmlFor="attendee_email" className="block text-sm font-medium text-gray-700 mb-1">
                Attendee Email
              </label>
              <input
                type="email"
                id="attendee_email"
                name="attendee_email"
                value={formData.attendee_email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter attendee email"
                disabled={!!linkedTicket}
              />
              {linkedTicket && (
                <p className="text-xs text-gray-500 mt-1">Populated from linked ticket</p>
              )}
            </div>
          </div>

          {/* Status and Active State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                disabled={isEdit}
              >
                <option value="pending">Pending</option>
                <option value="activated">Activated</option>
                <option value="checked-in">Checked In</option>
                <option value="deactivated">Deactivated</option>
                <option value="blocked">Blocked</option>
              </select>
              {isEdit && (
                <p className="text-xs text-gray-500 mt-1">Status is managed by system actions</p>
              )}
            </div>

            <div className="flex items-center pt-6">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={formData.status === 'blocked'}
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                Active (can be used for check-ins)
              </label>
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

          {/* Ticket Linking Section - Only show in edit mode */}
          {isEdit && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Management</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                {linkedTicket ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3 bg-blue-500"></div>
                        <span className="text-sm font-medium">Linked to Ticket</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleUnlinkTicket}
                        disabled={unlinkLoading}
                        className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {unlinkLoading ? 'Unlinking...' : 'Unlink Ticket'}
                      </button>
                    </div>
                    
                    <div className="bg-white rounded-md p-3 border">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Ticket Number:</span>
                          <span className="ml-2">{linkedTicket.ticket_number}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Category:</span>
                          <span className="ml-2">{linkedTicket.ticket_category}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Holder:</span>
                          <span className="ml-2">{linkedTicket.holder_name || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Email:</span>
                          <span className="ml-2">{linkedTicket.holder_email || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3 bg-gray-400"></div>
                        <span className="text-sm font-medium">No Ticket Linked</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowTicketLinking(!showTicketLinking)}
                        className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {showTicketLinking ? 'Cancel' : 'Link Ticket'}
                      </button>
                    </div>
                    
                    {showTicketLinking && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">Available Tickets:</h4>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {availableTickets.length > 0 ? (
                            availableTickets.map((ticket) => (
                              <div key={ticket.id} className="bg-white rounded-md p-3 border hover:border-blue-300 cursor-pointer" onClick={() => handleLinkTicket(ticket.id)}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-medium">{ticket.ticket_number}</span>
                                    <span className="ml-2 text-gray-500">({ticket.ticket_category})</span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {ticket.holder_name || 'No name'}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No available tickets to link</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wristband Actions Section - Only show in edit mode */}
          {isEdit && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Wristband Actions</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.status === 'blocked' ? (
                  <button
                    type="button"
                    onClick={handleUnblockWristband}
                    disabled={blockLoading}
                    className="inline-flex items-center justify-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {blockLoading ? 'Unblocking...' : 'Unblock Wristband'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleBlockWristband}
                    disabled={blockLoading}
                    className="inline-flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {blockLoading ? 'Blocking...' : 'Block Wristband'}
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to deactivate this wristband? It will no longer be usable for check-ins.')) {
                      setFormData(prev => ({ ...prev, is_active: false, status: 'deactivated' }));
                    }
                  }}
                  disabled={!formData.is_active}
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Deactivate Wristband
                </button>
              </div>
            </div>
          )}

          {/* Check-in Status Section - Only show in edit mode */}
          {isEdit && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Check-in Status</h3>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${checkinLogs.length > 0 ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <span className="text-sm font-medium">
                      {checkinLogs.length > 0 ? `Checked In (${checkinLogs.length} entries)` : 'Not Checked In'}
                    </span>
                  </div>
                  
                  {checkinLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      {checkoutLoading ? 'Checking Out...' : 'Check Out'}
                    </button>
                  )}
                </div>

                {checkinLogs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Recent Check-ins:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {checkinLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="text-xs text-gray-600 py-1 border-b border-gray-200 last:border-b-0">
                          <div className="flex justify-between">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            {log.location && <span className="text-gray-500">{log.location}</span>}
                          </div>
                          {log.notes && <div className="text-gray-500 mt-1">{log.notes}</div>}
                        </div>
                      ))}
                    </div>
                    {checkinLogs.length > 5 && (
                      <p className="text-xs text-gray-500">... and {checkinLogs.length - 5} more entries</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

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
