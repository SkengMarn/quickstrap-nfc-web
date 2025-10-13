import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import {
  Users,
  Download,
  Upload,
  Search,
  Filter,
  Link as LinkIcon,
  Unlink,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Trash2,
  Eye,
  ArrowLeft,
  LogOut,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import TicketCSVUpload from '../components/TicketCSVUpload';

interface TicketData {
  id: string;
  event_id: string;
  ticket_number: string;
  ticket_category: string;
  holder_name: string | null;
  holder_email: string | null;
  holder_phone: string | null;
  status: 'unused' | 'linked' | 'cancelled';
  linked_wristband_id: string | null;
  linked_at: string | null;
  linked_by: string | null;
  created_at: string;
  updated_at: string;
  event?: {
    id: string;
    name: string;
  };
  wristband?: {
    id: string;
    nfc_id: string;
    category: string;
  };
}

interface Event {
  id: string;
  name: string;
  start_date: string;
  description: string | null;
  location: string | null;
}

export default function TicketsPage() {
  const { currentOrganization } = useOrganization();
  const { eventId } = useParams<{ eventId: string }>();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [columnFilters, setColumnFilters] = useState({
    ticket_number: '',
    ticket_category: '',
    holder_name: '',
    wristband_nfc_id: ''
  });


  useEffect(() => {
    if (currentOrganization && eventId) {
      fetchCurrentEvent();
      fetchTickets();
    }
  }, [currentOrganization, eventId]);

  async function fetchCurrentEvent() {
    if (!eventId) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, description, location')
        .eq('id', eventId)
        .eq('organization_id', currentOrganization?.id)
        .single();

      if (error) throw error;
      setCurrentEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event details');
    }
  }

  async function fetchTickets() {
    if (!eventId) return;
    
    try {
      setLoading(true);
      
      // Fix the relationship error by using explicit foreign key
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          event:events(id, name),
          wristband:wristbands!tickets_linked_wristband_id_fkey(id, nfc_id, category)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load guest list');
    } finally {
      setLoading(false);
    }
  }


  async function handleDeleteTicket(ticketId: string) {
    if (!confirm('Are you sure you want to remove this guest from the list?')) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Guest removed successfully');
      fetchTickets();
    } catch (error) {
      console.error('Error removing guest:', error);
      toast.error('Failed to remove guest');
    }
  }

  async function handleCancelTicket(ticketId: string) {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'cancelled' })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Guest status updated successfully');
      fetchTickets();
    } catch (error) {
      console.error('Error updating guest status:', error);
      toast.error('Failed to update guest status');
    }
  }

  async function handleUnlinkWristband(ticketId: string, wristbandId: string) {
    if (!confirm('Are you sure you want to unlink this wristband from the ticket?')) return;

    try {
      // Update wristband to remove ticket link
      const { error: wristbandError } = await supabase
        .from('wristbands')
        .update({
          linked_ticket_id: null,
          linked_at: null,
          attendee_name: null,
          attendee_email: null
        })
        .eq('id', wristbandId);

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
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      toast.success('Wristband unlinked successfully');
      fetchTickets();
    } catch (error) {
      console.error('Error unlinking wristband:', error);
      toast.error('Failed to unlink wristband');
    }
  }

  async function handleCheckoutWristband(wristbandId: string) {
    if (!confirm('Are you sure you want to check out this wristband? This will remove all check-in records.')) return;

    try {
      // Delete all check-in logs for this wristband
      const { error } = await supabase
        .from('checkin_logs')
        .delete()
        .eq('wristband_id', wristbandId);

      if (error) throw error;

      toast.success('Wristband checked out successfully');
      fetchTickets();
    } catch (error) {
      console.error('Error checking out wristband:', error);
      toast.error('Failed to check out wristband');
    }
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp className="w-4 h-4 text-gray-600" />
      : <ChevronDown className="w-4 h-4 text-gray-600" />;
  };

  const handleColumnFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const filteredTickets = tickets
    .filter(ticket => {
      // Global search filter
      const matchesSearch =
        ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.holder_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.holder_email?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = selectedStatus === 'all' || ticket.status === selectedStatus;

      // Column-specific filters
      const matchesTicketNumber = !columnFilters.ticket_number ||
        ticket.ticket_number.toLowerCase().includes(columnFilters.ticket_number.toLowerCase());

      const matchesCategory = !columnFilters.ticket_category ||
        ticket.ticket_category.toLowerCase().includes(columnFilters.ticket_category.toLowerCase());

      const matchesHolderName = !columnFilters.holder_name ||
        ticket.holder_name?.toLowerCase().includes(columnFilters.holder_name.toLowerCase());

      const matchesWristband = !columnFilters.wristband_nfc_id ||
        ticket.wristband?.nfc_id.toLowerCase().includes(columnFilters.wristband_nfc_id.toLowerCase());

      return matchesSearch && matchesStatus && matchesTicketNumber &&
             matchesCategory && matchesHolderName && matchesWristband;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'ticket_number':
          aValue = a.ticket_number;
          bValue = b.ticket_number;
          break;
        case 'ticket_category':
          aValue = a.ticket_category;
          bValue = b.ticket_category;
          break;
        case 'holder_name':
          aValue = a.holder_name || '';
          bValue = b.holder_name || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'wristband':
          aValue = a.wristband?.nfc_id || '';
          bValue = b.wristband?.nfc_id || '';
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const stats = {
    total: tickets.length,
    unused: tickets.filter(t => t.status === 'unused').length,
    linked: tickets.filter(t => t.status === 'linked').length,
    cancelled: tickets.filter(t => t.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Link
                to="/events"
                className="text-gray-400 hover:text-gray-600 mr-4"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="h-8 w-8 mr-3 text-indigo-600" />
                Guest List
              </h1>
            </div>
            {currentEvent && (
              <div className="text-sm text-gray-600">
                <p className="font-medium text-lg text-gray-900">{currentEvent.name}</p>
                <p>Manage guest list and wristband linking for this event</p>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import Guest List
            </button>
            <button
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Guests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unlinked</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.unused}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Linked</p>
              <p className="text-2xl font-bold text-green-600">{stats.linked}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
              <span className="text-sm text-gray-600">
                Event: {currentEvent?.name || 'Loading...'}
              </span>
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="unused">Unlinked</option>
              <option value="linked">Linked to Wristband</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {/* Sort Headers Row */}
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('ticket_number')}
                    className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                  >
                    <span>Ticket/Reference</span>
                    {getSortIcon('ticket_number')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('ticket_category')}
                    className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                  >
                    <span>Category</span>
                    {getSortIcon('ticket_category')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('holder_name')}
                    className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                  >
                    <span>Guest Details</span>
                    {getSortIcon('holder_name')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                  >
                    <span>Status</span>
                    {getSortIcon('status')}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('wristband')}
                    className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none"
                  >
                    <span>Wristband</span>
                    {getSortIcon('wristband')}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
              {/* Filter Inputs Row */}
              <tr className="bg-gray-100">
                <th className="px-6 py-2">
                  <input
                    type="text"
                    placeholder="Filter ticket..."
                    value={columnFilters.ticket_number}
                    onChange={(e) => handleColumnFilterChange('ticket_number', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </th>
                <th className="px-6 py-2">
                  <input
                    type="text"
                    placeholder="Filter category..."
                    value={columnFilters.ticket_category}
                    onChange={(e) => handleColumnFilterChange('ticket_category', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </th>
                <th className="px-6 py-2">
                  <input
                    type="text"
                    placeholder="Filter holder..."
                    value={columnFilters.holder_name}
                    onChange={(e) => handleColumnFilterChange('holder_name', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </th>
                <th className="px-6 py-2">
                  {/* Status filter is handled by the top-level filter */}
                </th>
                <th className="px-6 py-2">
                  <input
                    type="text"
                    placeholder="Filter wristband..."
                    value={columnFilters.wristband_nfc_id}
                    onChange={(e) => handleColumnFilterChange('wristband_nfc_id', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </th>
                <th className="px-6 py-2">
                  {/* No filter for actions */}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No guests found
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.ticket_number}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {ticket.ticket_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.holder_name || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ticket.holder_email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        ticket.status === 'linked'
                          ? 'bg-green-100 text-green-800'
                          : ticket.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {ticket.wristband ? (
                        <Link
                          to={`/wristbands?eventId=${ticket.event_id}&wristband_id=${ticket.wristband.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded p-1 block transition-colors"
                        >
                          <LinkIcon className="inline h-3 w-3 mr-1 text-green-600" />
                          {ticket.wristband.nfc_id}
                          <div className="text-xs text-gray-500 mt-1">
                            {ticket.wristband.category}
                          </div>
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">Not linked</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActionsMenu(showActionsMenu === ticket.id ? null : ticket.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {showActionsMenu === ticket.id && (
                          <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setShowActionsMenu(null);
                                  // TODO: Implement view details
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </button>
                              {ticket.wristband && (
                                <>
                                  <button
                                    onClick={() => {
                                      if (ticket.wristband?.id) {
                                        handleUnlinkWristband(ticket.id, ticket.wristband.id);
                                      }
                                      setShowActionsMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-purple-700 hover:bg-gray-100 flex items-center"
                                  >
                                    <Unlink className="h-4 w-4 mr-2" />
                                    Unlink Wristband
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (ticket.wristband?.id) {
                                        handleCheckoutWristband(ticket.wristband.id);
                                      }
                                      setShowActionsMenu(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-gray-100 flex items-center"
                                  >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Check Out Wristband
                                  </button>
                                </>
                              )}
                              {ticket.status !== 'cancelled' && (
                                <button
                                  onClick={() => {
                                    handleCancelTicket(ticket.id);
                                    setShowActionsMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Guest
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  handleDeleteTicket(ticket.id);
                                  setShowActionsMenu(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 flex items-center"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove Guest
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Import Guest List from CSV
            </h3>
            {eventId ? (
              <TicketCSVUpload
                eventId={eventId}
                onUploadComplete={() => {
                  setShowUploadModal(false);
                  fetchTickets();
                }}
                onClose={() => setShowUploadModal(false)}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No event selected. Please select an event first.</p>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
