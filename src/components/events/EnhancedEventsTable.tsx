import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Clock, Edit, Trash2, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, XCircle, Eye, EyeOff, Link as LinkIcon,
  Unlink, Shield, Activity, TrendingUp, BarChart3
} from 'lucide-react';
import { Event } from '../../services/supabase';

interface EnhancedEvent extends Event {
  tickets_sold?: number;
  tickets_remaining?: number;
  checked_in_count?: number;
  status_changed_at?: string;
  created_by_name?: string;
  updated_by_name?: string;
  status_changed_by_name?: string;
}

interface EnhancedEventsTableProps {
  events: EnhancedEvent[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}

type SortField = 'name' | 'start_date' | 'location' | 'capacity' | 'status' | 'tickets_sold';
type SortDirection = 'asc' | 'desc';

const EnhancedEventsTable: React.FC<EnhancedEventsTableProps> = ({ events, onDelete, deletingId }) => {
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Toggle row expansion
  const toggleExpand = (eventId: string) => {
    setExpandedRowId(expandedRowId === eventId ? null : eventId);
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort events
  const sortedEvents = [...events].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      case 'start_date':
        aVal = new Date(a.start_date).getTime();
        bVal = new Date(b.start_date).getTime();
        break;
      case 'location':
        aVal = (a.location || '').toLowerCase();
        bVal = (b.location || '').toLowerCase();
        break;
      case 'capacity':
        aVal = a.capacity || 0;
        bVal = b.capacity || 0;
        break;
      case 'tickets_sold':
        aVal = a.tickets_sold || 0;
        bVal = b.tickets_sold || 0;
        break;
      case 'status':
        aVal = getEventStatus(a);
        bVal = getEventStatus(b);
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Helper functions
  const getEventStatus = (event: Event) => {
    const now = new Date();
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);

    if (now >= startDate && now <= endDate) return 'active';
    if (now > endDate) return 'past';
    return 'upcoming';
  };

  const getLifecycleStatus = (event: Event) => {
    return event.lifecycle_status || 'draft';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'past': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getLifecycleStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border border-green-200';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      case 'archived': return 'bg-purple-100 text-purple-800 border border-purple-200';
      default: return 'bg-gray-100 text-gray-600 border border-gray-200';
    }
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (hours < 24) return `${hours}h ${mins}m`;

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  const calculateTimeToEvent = (startDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const diffMs = start.getTime() - now.getTime();

    if (diffMs < 0) return 'Started';

    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `In ${diffMins}m`;

    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `In ${hours}h`;

    const days = Math.floor(hours / 24);
    return `In ${days}d`;
  };

  const calculateOccupancy = (ticketsSold: number, capacity: number | null) => {
    if (!capacity || capacity === 0) return null;
    return Math.round((ticketsSold / capacity) * 100);
  };

  const calculateCheckinProgress = (checkedIn: number, ticketsSold: number) => {
    if (ticketsSold === 0) return 0;
    return Math.round((checkedIn / ticketsSold) * 100);
  };

  const getCheckinWindow = (event: Event) => {
    const config = event.config as any;
    if (!config?.checkin_window?.enabled) return null;

    const startOffset = config.checkin_window.start_offset_value || 0;
    const startUnit = config.checkin_window.start_offset_unit || 'hours';
    const endOffset = config.checkin_window.end_offset_value || 0;
    const endUnit = config.checkin_window.end_offset_unit || 'hours';

    return `${startOffset}${startUnit[0]} before - ${endOffset}${endUnit[0]} after`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-gray-400" />;
    return sortDirection === 'asc' ?
      <ChevronUp className="h-3 w-3 text-blue-600" /> :
      <ChevronDown className="h-3 w-3 text-blue-600" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}>
              <div className="flex items-center space-x-1">
                <span>Event</span>
                <SortIcon field="name" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('start_date')}>
              <div className="flex items-center space-x-1">
                <span>Date & Time</span>
                <SortIcon field="start_date" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('location')}>
              <div className="flex items-center space-x-1">
                <span>Location</span>
                <SortIcon field="location" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('capacity')}>
              <div className="flex items-center space-x-1">
                <span>Capacity</span>
                <SortIcon field="capacity" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('tickets_sold')}>
              <div className="flex items-center space-x-1">
                <span>Tickets</span>
                <SortIcon field="tickets_sold" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}>
              <div className="flex items-center space-x-1">
                <span>Status</span>
                <SortIcon field="status" />
              </div>
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedEvents.map((event) => {
            const status = getEventStatus(event);
            const lifecycleStatus = getLifecycleStatus(event);
            const startDate = new Date(event.start_date);
            const endDate = new Date(event.end_date);
            const duration = calculateDuration(event.start_date, event.end_date);
            const timeToEvent = calculateTimeToEvent(event.start_date);
            const ticketsSold = event.tickets_sold || 0;
            const capacity = event.capacity || null;
            const occupancy = capacity ? calculateOccupancy(ticketsSold, capacity) : null;
            const checkedIn = event.checked_in_count || 0;
            const checkinProgress = calculateCheckinProgress(checkedIn, ticketsSold);
            const isExpanded = expandedRowId === event.id;
            const checkinWindow = getCheckinWindow(event);

            return (
              <React.Fragment key={event.id}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-start space-x-3">
                      <button
                        onClick={() => toggleExpand(event.id)}
                        className="mt-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/events/${event.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {event.name}
                        </Link>
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center mt-1 space-x-2">
                          {event.is_public ? (
                            <span className="inline-flex items-center text-xs text-green-600">
                              <Eye className="h-3 w-3 mr-1" />
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-gray-500">
                              <EyeOff className="h-3 w-3 mr-1" />
                              Private
                            </span>
                          )}
                          {event.ticket_linking_mode && event.ticket_linking_mode !== 'disabled' && (
                            <span className="inline-flex items-center text-xs text-blue-600">
                              <LinkIcon className="h-3 w-3 mr-1" />
                              {event.ticket_linking_mode === 'required' ? 'Tickets Required' : 'Tickets Optional'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                        {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Duration: {duration}
                    </div>
                    {status === 'upcoming' && (
                      <div className="text-xs text-blue-600 mt-1">
                        {timeToEvent}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      {event.location ? (
                        <>
                          <MapPin className="h-3 w-3 mr-1 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-xs">{event.location}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Users className="h-3 w-3 mr-1 text-gray-400" />
                      {capacity ? capacity.toLocaleString() : 'Unlimited'}
                    </div>
                    {occupancy !== null && (
                      <div className="mt-1">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              occupancy >= 90 ? 'bg-red-500' :
                              occupancy >= 75 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(occupancy, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{occupancy}% full</p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Activity className="h-3 w-3 mr-1 text-gray-400" />
                        {ticketsSold.toLocaleString()}
                        {capacity && (
                          <span className="text-gray-500 ml-1">/ {capacity.toLocaleString()}</span>
                        )}
                      </div>
                      {event.tickets_remaining !== undefined && (
                        <div className="text-xs text-gray-500 mt-1">
                          {event.tickets_remaining} remaining
                        </div>
                      )}
                      {ticketsSold > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          {checkedIn} checked in ({checkinProgress}%)
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                        {status === 'active' && <Activity className="h-3 w-3 mr-1" />}
                        {status === 'upcoming' && <Clock className="h-3 w-3 mr-1" />}
                        {status === 'past' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getLifecycleStatusColor(lifecycleStatus)}`}>
                          {lifecycleStatus.charAt(0).toUpperCase() + lifecycleStatus.slice(1)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/events/${event.id}`}
                        className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                        title="View details"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/events/${event.id}/edit`}
                        className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Edit event"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => onDelete(event.id)}
                        disabled={deletingId === event.id}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete event"
                      >
                        {deletingId === event.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded Row - Detailed Information */}
                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Configuration Details */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                            <Shield className="h-4 w-4 mr-2 text-blue-600" />
                            Configuration
                          </h4>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Ticket Linking:</span>
                              <span className="font-medium text-gray-900">
                                {event.ticket_linking_mode ?
                                  event.ticket_linking_mode.charAt(0).toUpperCase() + event.ticket_linking_mode.slice(1)
                                  : 'Disabled'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Unlinked Entry:</span>
                              <span className="font-medium text-gray-900">
                                {event.allow_unlinked_entry ? 'Allowed' : 'Not Allowed'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Active Status:</span>
                              <span className="font-medium text-gray-900">
                                {event.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            {checkinWindow && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Check-in Window:</span>
                                <span className="font-medium text-gray-900">{checkinWindow}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-blue-600" />
                            Metadata
                          </h4>
                          <div className="text-xs space-y-1">
                            {event.created_at && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Created:</span>
                                <span className="font-medium text-gray-900">
                                  {new Date(event.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {event.created_by_name && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Created By:</span>
                                <span className="font-medium text-gray-900">{event.created_by_name}</span>
                              </div>
                            )}
                            {event.updated_at && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Last Updated:</span>
                                <span className="font-medium text-gray-900">
                                  {new Date(event.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {event.status_changed_at && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Status Changed:</span>
                                <span className="font-medium text-gray-900">
                                  {new Date(event.status_changed_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Metrics */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                            Metrics
                          </h4>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Duration:</span>
                              <span className="font-medium text-gray-900">{duration}</span>
                            </div>
                            {status === 'upcoming' && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Starts In:</span>
                                <span className="font-medium text-blue-600">{timeToEvent}</span>
                              </div>
                            )}
                            {occupancy !== null && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Occupancy:</span>
                                <span className={`font-medium ${
                                  occupancy >= 90 ? 'text-red-600' :
                                  occupancy >= 75 ? 'text-yellow-600' :
                                  'text-green-600'
                                }`}>
                                  {occupancy}%
                                </span>
                              </div>
                            )}
                            {ticketsSold > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Check-in Rate:</span>
                                <span className="font-medium text-green-600">{checkinProgress}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Full Description (if exists) */}
                      {event.description && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Description</h4>
                          <p className="text-xs text-gray-600">{event.description}</p>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-3">
                        <Link
                          to={`/events/${event.id}/tickets`}
                          className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                        >
                          Manage Tickets
                        </Link>
                        <Link
                          to={`/events/${event.id}/checkins`}
                          className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors"
                        >
                          View Check-ins
                        </Link>
                        <Link
                          to={`/events/${event.id}/analytics`}
                          className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                        >
                          Analytics
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EnhancedEventsTable;
