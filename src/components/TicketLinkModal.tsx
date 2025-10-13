import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, Link2, Unlink, User, Mail, Ticket, Search } from 'lucide-react';
import { toast } from 'react-toastify';

interface TicketInfo {
  id: string;
  ticket_number: string;
  ticket_category: string;
  holder_name: string | null;
  holder_email: string | null;
  holder_phone: string | null;
  status: string;
  linked_at: string | null;
}

interface CategoryLimit {
  category: string;
  max_wristbands: number;
}

interface TicketWithLinkCount extends TicketInfo {
  linked_wristbands_count: number;
  max_allowed: number;
  can_link: boolean;
}

interface TicketLinkModalProps {
  wristbandId: string;
  wristbandNfcId: string;
  wristbandCategory: string;
  eventId: string;
  currentTicket: TicketInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function TicketLinkModal({
  wristbandId,
  wristbandNfcId,
  wristbandCategory,
  eventId,
  currentTicket,
  isOpen,
  onClose,
  onUpdate
}: TicketLinkModalProps) {
  const [availableTickets, setAvailableTickets] = useState<TicketWithLinkCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryLimits, setCategoryLimits] = useState<CategoryLimit[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTickets();
    }
  }, [isOpen, eventId]);

  const fetchAvailableTickets = async () => {
    try {
      setLoading(true);

      // Fetch category limits for the event
      const { data: limits, error: limitsError } = await supabase
        .from('event_category_limits')
        .select('category, max_wristbands')
        .eq('event_id', eventId);

      if (limitsError) throw limitsError;
      setCategoryLimits(limits || []);

      // Get the limit for this wristband's category (default to 1 if not set)
      const categoryLimit = limits?.find(l => l.category === wristbandCategory);
      const maxAllowed = categoryLimit?.max_wristbands || 1;

      // Fetch all tickets and their linked wristbands count
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select(`
          id,
          ticket_number,
          ticket_category,
          holder_name,
          holder_email,
          holder_phone,
          status,
          linked_at
        `)
        .eq('event_id', eventId)
        .order('ticket_number');

      if (ticketsError) throw ticketsError;

      // For each ticket, count linked wristbands of the current category
      const ticketsWithCounts = await Promise.all(
        (tickets || []).map(async (ticket) => {
          // Count how many wristbands of this category are already linked to this ticket
          const { count, error: countError } = await supabase
            .from('wristbands')
            .select('id', { count: 'exact', head: true })
            .eq('linked_ticket_id', ticket.id)
            .eq('category', wristbandCategory);

          if (countError) {
            console.error('Error counting linked wristbands:', countError);
            return {
              ...ticket,
              linked_wristbands_count: 0,
              max_allowed: maxAllowed,
              can_link: true
            };
          }

          const linkedCount = count || 0;
          const canLink = linkedCount < maxAllowed;

          return {
            ...ticket,
            linked_wristbands_count: linkedCount,
            max_allowed: maxAllowed,
            can_link: canLink
          };
        })
      );

      // Only show tickets that can accept more wristbands of this category
      const availableTicketsFiltered = ticketsWithCounts.filter(t => t.can_link);
      setAvailableTickets(availableTicketsFiltered);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load available tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!currentTicket) return;

    if (!window.confirm('Are you sure you want to unlink this ticket from the wristband?')) {
      return;
    }

    try {
      setActionLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update wristband
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

      // Update ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          status: 'unused',
          linked_wristband_id: null,
          linked_at: null,
          linked_by: null
        })
        .eq('id', currentTicket.id);

      if (ticketError) throw ticketError;

      toast.success('Ticket unlinked successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error unlinking ticket:', error);
      toast.error('Failed to unlink ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLink = async (ticketId: string) => {
    try {
      setActionLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get ticket details
      const ticket = availableTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      // Update wristband
      const { error: wristbandError } = await supabase
        .from('wristbands')
        .update({
          linked_ticket_id: ticketId,
          linked_at: new Date().toISOString(),
          attendee_name: ticket.holder_name,
          attendee_email: ticket.holder_email
        })
        .eq('id', wristbandId);

      if (wristbandError) throw wristbandError;

      // Update ticket
      const { error: ticketError } = await supabase
        .from('tickets')
        .update({
          status: 'linked',
          linked_wristband_id: wristbandId,
          linked_at: new Date().toISOString(),
          linked_by: user.id
        })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      toast.success('Ticket linked successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error linking ticket:', error);
      toast.error('Failed to link ticket');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const isLinked = currentTicket !== null;

  const filteredTickets = availableTickets.filter(ticket =>
    ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticket_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.holder_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.holder_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ticket Linking</h2>
              <p className="text-xs text-gray-500">
                Wristband <span className="font-mono font-medium text-gray-700">{wristbandNfcId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-6">

              {/* Left Column - Current Status & Actions (1/3 width) */}
              <div className="col-span-1 space-y-4">

                {/* Current Status Card */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                      isLinked ? 'bg-blue-600' : 'bg-gray-400'
                    }`}>
                      {isLinked ? (
                        <Link2 className="w-8 h-8 text-white" />
                      ) : (
                        <Unlink className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {isLinked ? 'Ticket Linked' : 'No Ticket Linked'}
                    </h3>
                    {isLinked && currentTicket && (
                      <p className="text-xs text-gray-500">
                        Linked {new Date(currentTicket.linked_at || '').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  {/* Current Ticket Details */}
                  {isLinked && currentTicket && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Ticket className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">Ticket #</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 ml-5">
                          {currentTicket.ticket_number}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <Ticket className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">Category</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 ml-5">
                          {currentTicket.ticket_category}
                        </p>
                      </div>

                      {currentTicket.holder_name && (
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">Holder</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 ml-5">
                            {currentTicket.holder_name}
                          </p>
                        </div>
                      )}

                      {currentTicket.holder_email && (
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-xs font-medium text-gray-500">Email</span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 ml-5 truncate">
                            {currentTicket.holder_email}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions Card */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Actions</h4>

                  {isLinked ? (
                    <button
                      onClick={handleUnlink}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      <Unlink className="w-4 h-4" />
                      <span>{actionLoading ? 'Processing...' : 'Unlink Ticket'}</span>
                    </button>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Select a ticket from the available list to link to this wristband.
                    </p>
                  )}
                </div>

                {/* Category Limit Info */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="text-xs font-semibold text-blue-900 mb-2 uppercase">Category Limit</h4>
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">{wristbandCategory}</span> category can link up to{' '}
                    <span className="font-semibold">
                      {categoryLimits.find(l => l.category === wristbandCategory)?.max_wristbands || 1}
                    </span>{' '}
                    wristband{(categoryLimits.find(l => l.category === wristbandCategory)?.max_wristbands || 1) > 1 ? 's' : ''} per ticket
                  </p>
                </div>

              </div>

              {/* Right Column - Available Tickets (2/3 width) */}
              <div className="col-span-2">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                      <Ticket className="w-4 h-4 text-gray-400" />
                      <span>Available Tickets</span>
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {filteredTickets.length} Available
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tickets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {filteredTickets.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {filteredTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="bg-white rounded-lg border border-gray-200 p-3 transition-all hover:border-blue-300"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              #{ticket.ticket_number}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {ticket.ticket_category}
                            </p>
                            {ticket.max_allowed > 1 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {ticket.linked_wristbands_count} of {ticket.max_allowed} slots used
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => handleLink(ticket.id)}
                            disabled={actionLoading || isLinked}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Link</span>
                          </button>
                        </div>

                        {(ticket.holder_name || ticket.holder_email) && (
                          <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-gray-100">
                            {ticket.holder_name && (
                              <div className="flex items-start space-x-2">
                                <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">Holder</p>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {ticket.holder_name}
                                  </p>
                                </div>
                              </div>
                            )}

                            {ticket.holder_email && (
                              <div className="flex items-start space-x-2">
                                <Mail className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">Email</p>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {ticket.holder_email}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Ticket className="w-6 h-6 text-gray-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">No Available Tickets</h4>
                    <p className="text-xs text-gray-500">
                      {searchQuery ? 'No tickets match your search' : 'All tickets are already linked'}
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
