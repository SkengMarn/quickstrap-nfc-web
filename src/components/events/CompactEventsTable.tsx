import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, X, ArrowRight, Plus, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight as ChevronRightIcon, Pencil } from 'lucide-react';
import { Event, supabase } from '../../services/supabase';
import SeriesForm from '../series/SeriesForm';
import { toast } from 'react-toastify';

// Scrolling text component for long content
const ScrollingText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        setShouldScroll(textWidth > containerWidth - 10);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        ref={textRef}
        className={`inline-block whitespace-nowrap ${shouldScroll ? 'marquee-scroll' : ''}`}
      >
        {text}
        {shouldScroll && <span className="ml-8">{text}</span>}
      </div>
    </div>
  );
};

interface EnhancedEvent extends Event {
  tickets_sold?: number;
  tickets_remaining?: number;
  checked_in_count?: number;
  created_by_name?: string;
  wristbands_count?: number;
  series?: any[];
}

interface CompactEventsTableProps {
  events: EnhancedEvent[];
  onDelete: (id: string) => void;
  deletingId: string | null;
  onRefresh?: () => void; // Optional callback to refresh data
}

type SortField = 'name' | 'start_date' | 'location' | 'capacity' | 'lifecycle_status';
type SortDirection = 'asc' | 'desc' | null;

const CompactEventsTable: React.FC<CompactEventsTableProps> = ({ events, onDelete, deletingId, onRefresh }) => {
  const [sortField, setSortField] = useState<SortField>('start_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [selectedEventForSeries, setSelectedEventForSeries] = useState<EnhancedEvent | null>(null);

  // Track expanded events (showing their series)
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  
  // Removed statusMenuOpen - now using inline editing for status too
  
  // Track inline editing
  const [editingField, setEditingField] = useState<{ id: string; field: string; type: 'event' | 'series' } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [originalValue, setOriginalValue] = useState<string>(''); // Track original value to detect changes
  const [hoveredName, setHoveredName] = useState<string | null>(null); // Track which name is being hovered

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dense mode toggle
  const [dense, setDense] = useState(false);

  // Column filters - inline search for each column
  const [filters, setFilters] = useState({
    name: '',
    location: '',
    lifecycle_status: 'all',
    timeStatus: 'all',
    capacity: '',
  });

  const handleAddSeries = (event: EnhancedEvent) => {
    setSelectedEventForSeries(event);
    setShowSeriesForm(true);
  };

  const handleSeriesFormClose = () => {
    setShowSeriesForm(false);
    setSelectedEventForSeries(null);
  };

  const handleSeriesFormSuccess = () => {
    setShowSeriesForm(false);
    setSelectedEventForSeries(null);
    // Trigger a refresh of the events list
    window.location.reload();
  };

  const handleStatusChange = async (id: string, newStatus: string, type: 'event' | 'series' = 'event') => {
    try {
      // VALIDATION: If updating a series to 'active', check parent event status
      if (type === 'series' && newStatus === 'active') {
        // Find the series in the events data
        let parentEvent: EnhancedEvent | null = null;
        let seriesData: any = null;
        
        for (const event of events) {
          if (event.series && event.series.length > 0) {
            const foundSeries = event.series.find((s: any) => s.id === id);
            if (foundSeries) {
              parentEvent = event;
              seriesData = foundSeries;
              break;
            }
          }
        }

        if (parentEvent) {
          // Check if parent event is active
          if (parentEvent.lifecycle_status !== 'active') {
            toast.error(`Cannot activate series: Parent event "${parentEvent.name}" must be active first`);
            return;
          }
        } else {
          // If we can't find parent in current data, fetch from database
          const { data: seriesInfo, error: fetchError } = await supabase
            .from('event_series')
            .select('parent_event_id, events!inner(name, lifecycle_status)')
            .eq('id', id)
            .single();

          if (fetchError) {
            console.error('Error fetching series parent:', fetchError);
            toast.error('Failed to validate parent event status');
            return;
          }

          if (seriesInfo && (seriesInfo as any).events.lifecycle_status !== 'active') {
            toast.error(`Cannot activate series: Parent event "${(seriesInfo as any).events.name}" must be active first`);
            return;
          }
        }
      }

      // Proceed with update
      if (type === 'series') {
        // Use RPC function for series to handle state transitions properly
        const { data, error } = await supabase.rpc('update_series_status', {
          p_series_id: id,
          p_new_status: newStatus
        });

        if (error) throw error;
      } else {
        // Direct update for events
        const updateData: any = {
          lifecycle_status: newStatus,
          status_changed_at: new Date().toISOString(),
          is_active: newStatus === 'active'
        };
        
        const { error } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
      }

      const itemType = type === 'event' ? 'Event' : 'Series';
      toast.success(`${itemType} status updated to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}!`);
      
      // Trigger refresh if callback provided
      if (onRefresh) {
        setTimeout(() => onRefresh(), 300);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Get possible status transitions from current status
  const getNextStatuses = (currentStatus: string) => {
    const allStatuses = ['draft', 'active', 'completed', 'cancelled'];
    return allStatuses.filter(s => s !== currentStatus);
  };

  // Handle inline field updates
  const handleFieldUpdate = async (id: string, field: string, value: string, type: 'event' | 'series') => {
    // Check if value actually changed
    if (value === originalValue) {
      // No change, just cancel editing
      setEditingField(null);
      setEditingValue('');
      setOriginalValue('');
      return;
    }

    try {
      // Special handling for lifecycle_status - use handleStatusChange instead
      if (field === 'lifecycle_status') {
        setEditingField(null);
        setEditingValue('');
        setOriginalValue('');
        await handleStatusChange(id, value, type);
        return;
      }

      const table = type === 'event' ? 'events' : 'event_series';
      const updateData: any = { [field]: value };
      
      // Add updated_at timestamp
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
      setEditingField(null);
      setEditingValue('');
      setOriginalValue('');
      
      // Trigger refresh if callback provided
      if (onRefresh) {
        setTimeout(() => onRefresh(), 300);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
      setEditingField(null);
      setEditingValue('');
      setOriginalValue('');
    }
  };

  // Start editing a field
  const startEditing = (id: string, field: string, currentValue: string, type: 'event' | 'series') => {
    setEditingField({ id, field, type });
    setEditingValue(currentValue || '');
    setOriginalValue(currentValue || ''); // Store original value for comparison
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingField(null);
    setEditingValue('');
    setOriginalValue('');
  };

  // Save on Enter, cancel on Escape
  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string, type: 'event' | 'series') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFieldUpdate(id, field, editingValue, type);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Toggle expand/collapse of series
  const toggleEventExpanded = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      name: '',
      location: '',
      lifecycle_status: 'all',
      timeStatus: 'all',
      capacity: '',
    });
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3 text-blue-600" />;
    if (sortDirection === 'desc') return <ArrowDown className="h-3 w-3 text-blue-600" />;
    return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
  };

  // Filter and sort events
  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    // Apply filters
    if (filters.name) {
      filtered = filtered.filter(e => e.name.toLowerCase().includes(filters.name.toLowerCase()));
    }
    if (filters.location) {
      filtered = filtered.filter(e => e.location?.toLowerCase().includes(filters.location.toLowerCase()));
    }
    if (filters.lifecycle_status !== 'all') {
      filtered = filtered.filter(e => e.lifecycle_status === filters.lifecycle_status);
    }
    if (filters.timeStatus !== 'all') {
      const now = new Date();
      filtered = filtered.filter(event => {
        const start = new Date(event.start_date);
        const end = new Date(event.end_date);

        switch (filters.timeStatus) {
          case 'active': return now >= start && now <= end;
          case 'upcoming': return now < start;
          case 'past': return now > end;
          default: return true;
        }
      });
    }
    if (filters.capacity) {
      const cap = parseInt(filters.capacity);
      filtered = filtered.filter(e => (e.capacity || 0) >= cap);
    }

    // Apply sorting
    if (sortDirection) {
      filtered.sort((a, b) => {
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
          case 'lifecycle_status':
            aVal = a.lifecycle_status || '';
            bVal = b.lifecycle_status || '';
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [events, filters, sortField, sortDirection]);

  // Pagination calculations
  const totalEvents = filteredAndSortedEvents.length;
  const totalPages = Math.ceil(totalEvents / rowsPerPage);
  const paginatedEvents = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedEvents.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedEvents, page, rowsPerPage]);

  // Reset to first page when filters change
  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(0);
  };

  // Expand/collapse all
  const handleExpandAll = () => {
    const eventsWithSeries = paginatedEvents
      .filter(e => e.series && e.series.length > 0)
      .map(e => e.id);
    setExpandedEvents(new Set(eventsWithSeries));
  };

  const handleCollapseAll = () => {
    setExpandedEvents(new Set());
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Series Form Modal */}
      {showSeriesForm && selectedEventForSeries && (
        <SeriesForm
          eventId={selectedEventForSeries.id}
          organizationId={selectedEventForSeries.organization_id ?? undefined}
          onClose={handleSeriesFormClose}
          onSuccess={handleSeriesFormSuccess}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white px-3 py-2 border border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">{totalEvents}</span> events found
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExpandAll}
              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={paginatedEvents.filter(e => e.series && e.series.length > 0).length === 0}
            >
              Expand All
            </button>
            <button
              onClick={handleCollapseAll}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={expandedEvents.size === 0}
            >
              Collapse All
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={dense}
              onChange={(e) => setDense(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            Dense
          </label>
        </div>
      </div>

      <div className="overflow-x-auto bg-white border-x border-gray-200" style={{ maxHeight: '70vh' }}>
      <table className="min-w-full table-auto">
        <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200">
          {/* Header Row with Sort */}
          <tr>
            <th className="px-3 py-2 text-left border-b border-gray-200 w-auto max-w-xs">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900"
              >
                Event Name
                {getSortIcon('name')}
              </button>
            </th>
            <th className="px-3 py-2 text-left border-b border-gray-200 w-auto">
              <button
                onClick={() => handleSort('location')}
                className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900"
              >
                Location
                {getSortIcon('location')}
              </button>
            </th>
            <th className="px-3 py-2 text-left border-b border-gray-200">
              <button
                onClick={() => handleSort('start_date')}
                className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900"
              >
                Start Date
                {getSortIcon('start_date')}
              </button>
            </th>
            <th className="px-3 py-2 text-left border-b border-gray-200">
              <button
                onClick={() => handleSort('capacity')}
                className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900"
              >
                Capacity
                {getSortIcon('capacity')}
              </button>
            </th>
            <th className="px-3 py-2 text-left border-b border-gray-200">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                Wristbands
              </span>
            </th>
            <th className="px-3 py-2 text-left border-b border-gray-200">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                Tickets
              </span>
            </th>
            <th className="px-3 py-2 text-left border-b border-gray-200">
              <button
                onClick={() => handleSort('lifecycle_status')}
                className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 uppercase tracking-wide hover:text-gray-900"
              >
                Status
                {getSortIcon('lifecycle_status')}
              </button>
            </th>
            <th className="px-3 py-2 text-left border-b border-gray-200">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                Time Status
              </span>
            </th>
            <th className="px-3 py-2 text-right border-b border-gray-200">
              <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                Actions
              </span>
            </th>
          </tr>

          {/* Filter Row - Inline under headers */}
          <tr className="bg-gray-50">
            <th className="px-3 py-1.5">
              <input
                type="text"
                placeholder="Search..."
                value={filters.name}
                onChange={(e) => handleFilterChange({...filters, name: e.target.value})}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </th>
            <th className="px-3 py-1.5">
              <input
                type="text"
                placeholder="Search..."
                value={filters.location}
                onChange={(e) => handleFilterChange({...filters, location: e.target.value})}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </th>
            <th className="px-3 py-1.5">
              <select
                value={filters.timeStatus}
                onChange={(e) => handleFilterChange({...filters, timeStatus: e.target.value})}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="past">Past</option>
              </select>
            </th>
            <th className="px-3 py-1.5">
              <input
                type="number"
                placeholder="Min..."
                value={filters.capacity}
                onChange={(e) => handleFilterChange({...filters, capacity: e.target.value})}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </th>
            <th className="px-3 py-1.5">
              {/* No filter */}
            </th>
            <th className="px-3 py-1.5">
              {/* No filter */}
            </th>
            <th className="px-3 py-1.5">
              <select
                value={filters.lifecycle_status}
                onChange={(e) => handleFilterChange({...filters, lifecycle_status: e.target.value})}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </th>
            <th className="px-3 py-1.5">
              {/* No filter */}
            </th>
            <th className="px-3 py-1.5 text-right">
              <button
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                title="Clear all filters"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </th>
          </tr>
        </thead>
        
        <tbody className="bg-white">
          {paginatedEvents.map((event) => {
            const now = new Date();
            const start = new Date(event.start_date);
            const end = new Date(event.end_date);
            const isActive = now >= start && now <= end;
            const isPast = now > end;
            const isUpcoming = now < start;

            const cellPadding = dense ? 'px-3 py-1' : 'px-3 py-2';

            return (
              <React.Fragment key={event.id}>
                {/* Main Event Row */}
                <tr className="hover:bg-gray-50 border-b border-gray-100 transition-colors">
                  <td className={`${cellPadding} text-sm font-medium text-gray-900`}>
                    <div className="flex items-center gap-2">
                      {event.series && event.series.length > 0 ? (
                        <button
                          onClick={() => toggleEventExpanded(event.id)}
                          className="p-0.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                          title={expandedEvents.has(event.id) ? "Collapse series" : "Expand series"}
                        >
                          {expandedEvents.has(event.id) ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </button>
                      ) : (
                        <div className="w-4" />
                      )}
                      {editingField?.id === event.id && editingField?.field === 'name' ? (
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onBlur={() => handleFieldUpdate(event.id, 'name', editingValue, 'event')}
                          onKeyDown={(e) => handleKeyDown(e, event.id, 'name', 'event')}
                          className="px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="flex items-center gap-1 group"
                          onMouseEnter={() => setHoveredName(event.id)}
                          onMouseLeave={() => setHoveredName(null)}
                        >
                          <Link 
                            to={`/events/${event.id}`}
                            className="hover:text-blue-600 font-medium"
                          >
                            {event.name}
                          </Link>
                          {hoveredName === event.id && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                startEditing(event.id, 'name', event.name, 'event');
                              }}
                              className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                              title="Edit name"
                            >
                              <Pencil className="h-3 w-3 text-blue-600" />
                            </button>
                          )}
                        </div>
                      )}
                      {event.series && event.series.length > 0 && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded font-medium">
                          {event.series.length} {event.series.length === 1 ? 'series' : 'series'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`${cellPadding} text-xs text-gray-600`}>
                    {editingField?.id === event.id && editingField?.field === 'location' ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleFieldUpdate(event.id, 'location', editingValue, 'event')}
                        onKeyDown={(e) => handleKeyDown(e, event.id, 'location', 'event')}
                        className="px-2 py-1 text-xs border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                        autoFocus
                      />
                    ) : (
                      <span
                        onDoubleClick={() => startEditing(event.id, 'location', event.location || '', 'event')}
                        className="cursor-pointer hover:text-blue-600 hover:underline"
                        title="Double-click to edit"
                      >
                        {event.location || '-'}
                      </span>
                    )}
                  </td>
                  <td className={`${cellPadding} text-xs text-gray-600`}>
                    {editingField?.id === event.id && editingField?.field === 'start_date' ? (
                      <input
                        type="datetime-local"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleFieldUpdate(event.id, 'start_date', editingValue, 'event')}
                        onKeyDown={(e) => handleKeyDown(e, event.id, 'start_date', 'event')}
                        className="px-2 py-1 text-xs border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <span
                        onDoubleClick={() => {
                          const isoDate = new Date(event.start_date).toISOString().slice(0, 16);
                          startEditing(event.id, 'start_date', isoDate, 'event');
                        }}
                        className="cursor-pointer hover:text-blue-600 hover:underline"
                        title="Double-click to edit"
                      >
                        {formatDate(event.start_date)}
                      </span>
                    )}
                  </td>
                  <td className={`${cellPadding} text-xs text-gray-600`}>
                    {editingField?.id === event.id && editingField?.field === 'capacity' ? (
                      <input
                        type="number"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleFieldUpdate(event.id, 'capacity', editingValue, 'event')}
                        onKeyDown={(e) => handleKeyDown(e, event.id, 'capacity', 'event')}
                        className="px-2 py-1 text-xs border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                        autoFocus
                        min="0"
                      />
                    ) : (
                      <span
                        onDoubleClick={() => startEditing(event.id, 'capacity', String(event.capacity || 0), 'event')}
                        className="cursor-pointer hover:text-blue-600 hover:underline"
                        title="Double-click to edit"
                      >
                        {event.capacity && event.capacity > 0 ? event.capacity.toLocaleString() : 'Unlimited'}
                      </span>
                    )}
                  </td>
                  <td className={`${cellPadding} text-xs text-gray-600`}>
                    {event.wristbands_count?.toLocaleString() || 0}
                  </td>
                  <td className={`${cellPadding} text-xs text-gray-600`}>
                    {event.tickets_sold || 0} / {event.checked_in_count || 0}
                  </td>
                  <td className={cellPadding}>
                    {editingField?.id === event.id && editingField?.field === 'lifecycle_status' ? (
                      <select
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => handleFieldUpdate(event.id, 'lifecycle_status', editingValue, 'event')}
                        onKeyDown={(e) => handleKeyDown(e, event.id, 'lifecycle_status', 'event')}
                        className="px-2 py-1 text-xs border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <span 
                        onDoubleClick={() => startEditing(event.id, 'lifecycle_status', event.lifecycle_status || 'draft', 'event')}
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${getLifecycleStatusColor(event.lifecycle_status || 'draft')}`}
                        title="Double-click to edit"
                      >
                        {(event.lifecycle_status || 'draft').charAt(0).toUpperCase() + (event.lifecycle_status || 'draft').slice(1)}
                      </span>
                    )}
                  </td>
                  <td className={cellPadding}>
                    {isActive && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                        Upcoming
                      </span>
                    )}
                    {isUpcoming && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">
                        Upcoming
                      </span>
                    )}
                    {isPast && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700">
                        Past
                      </span>
                    )}
                  </td>
                  <td className={`${cellPadding} text-right`}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleAddSeries(event)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        title="Add Series"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                      <Link
                        to={`/events/${event.id}/edit`}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit Event"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => onDelete(event.id)}
                        disabled={deletingId === event.id}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Delete Event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Series Rows - Only show when expanded */}
                {expandedEvents.has(event.id) && event.series && event.series.length > 0 && event.series.map((series: any) => {
                  const seriesStart = new Date(series.start_date);
                  const seriesEnd = new Date(series.end_date);
                  const seriesIsActive = now >= seriesStart && now <= seriesEnd;
                  const seriesIsPast = now > seriesEnd;
                  const seriesIsUpcoming = now < seriesStart;

                  const seriesPadding = dense ? 'px-3 py-0.5' : 'px-3 py-1.5';

                  return (
                    <tr key={series.id} className="bg-blue-50/20 hover:bg-blue-50/40 border-b border-blue-100 border-l-2 border-l-blue-400">
                      <td className={`${seriesPadding} text-xs text-gray-700`}>
                        <div className="flex items-center gap-1.5 pl-5">
                          <ArrowRight className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          {editingField?.id === series.id && editingField?.field === 'name' ? (
                            <input
                              type="text"
                              value={editingValue}
                              onChange={(e) => setEditingValue(e.target.value)}
                              onBlur={() => handleFieldUpdate(series.id, 'name', editingValue, 'series')}
                              onKeyDown={(e) => handleKeyDown(e, series.id, 'name', 'series')}
                              className="px-2 py-1 text-xs border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <div 
                              className="flex items-center gap-1 group"
                              onMouseEnter={() => setHoveredName(series.id)}
                              onMouseLeave={() => setHoveredName(null)}
                            >
                              <Link 
                                to={`/events/${series.id}`}
                                className="italic font-medium hover:text-blue-600 transition-colors"
                              >
                                {series.name}
                              </Link>
                              {hoveredName === series.id && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    startEditing(series.id, 'name', series.name, 'series');
                                  }}
                                  className="p-0.5 hover:bg-blue-100 rounded transition-colors"
                                  title="Edit name"
                                >
                                  <Pencil className="h-3 w-3 text-blue-600" />
                                </button>
                              )}
                            </div>
                          )}
                          {series.sequence_number && (
                            <span className="px-1 py-0.5 bg-blue-200 text-blue-800 text-[9px] rounded font-semibold">
                              #{series.sequence_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${seriesPadding} text-[10px] text-gray-500`}>
                        {editingField?.id === series.id && editingField?.field === 'location' ? (
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleFieldUpdate(series.id, 'location', editingValue, 'series')}
                            onKeyDown={(e) => handleKeyDown(e, series.id, 'location', 'series')}
                            className="px-2 py-1 text-[10px] border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                            autoFocus
                          />
                        ) : (
                          <span
                            onDoubleClick={() => startEditing(series.id, 'location', series.location || event.location || '', 'series')}
                            className="cursor-pointer hover:text-blue-600 hover:underline"
                            title="Double-click to edit"
                          >
                            {series.location || event.location || '-'}
                          </span>
                        )}
                      </td>
                      <td className={`${seriesPadding} text-[10px] text-gray-500`}>
                        {editingField?.id === series.id && editingField?.field === 'start_date' ? (
                          <input
                            type="datetime-local"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleFieldUpdate(series.id, 'start_date', editingValue, 'series')}
                            onKeyDown={(e) => handleKeyDown(e, series.id, 'start_date', 'series')}
                            className="px-2 py-1 text-[10px] border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          />
                        ) : (
                          <span
                            onDoubleClick={() => {
                              const isoDate = new Date(series.start_date).toISOString().slice(0, 16);
                              startEditing(series.id, 'start_date', isoDate, 'series');
                            }}
                            className="cursor-pointer hover:text-blue-600 hover:underline"
                            title="Double-click to edit"
                          >
                            {formatDate(series.start_date)}
                          </span>
                        )}
                      </td>
                      <td className={`${seriesPadding} text-[10px] text-gray-500`}>
                        {editingField?.id === series.id && editingField?.field === 'capacity' ? (
                          <input
                            type="number"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleFieldUpdate(series.id, 'capacity', editingValue, 'series')}
                            onKeyDown={(e) => handleKeyDown(e, series.id, 'capacity', 'series')}
                            className="px-2 py-1 text-[10px] border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 w-20"
                            autoFocus
                            min="0"
                          />
                        ) : (
                          <span
                            onDoubleClick={() => startEditing(series.id, 'capacity', String(series.capacity || 0), 'series')}
                            className="cursor-pointer hover:text-blue-600 hover:underline"
                            title="Double-click to edit"
                          >
                            {series.capacity && series.capacity > 0 ? series.capacity.toLocaleString() : '-'}
                          </span>
                        )}
                      </td>
                      <td className={`${seriesPadding} text-[10px] text-gray-600`}>
                        {series.wristbands_count?.toLocaleString() || 0}
                      </td>
                      <td className={`${seriesPadding} text-[10px] text-gray-600`}>
                        {series.tickets_count || 0} / {series.checked_in_count || 0}
                      </td>
                      <td className={seriesPadding}>
                        {editingField?.id === series.id && editingField?.field === 'lifecycle_status' ? (
                          <select
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleFieldUpdate(series.id, 'lifecycle_status', editingValue, 'series')}
                            onKeyDown={(e) => handleKeyDown(e, series.id, 'lifecycle_status', 'series')}
                            className="px-2 py-1 text-[9px] border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            autoFocus
                          >
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <span 
                            onDoubleClick={() => startEditing(series.id, 'lifecycle_status', series.lifecycle_status || 'draft', 'series')}
                            className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium cursor-pointer hover:opacity-80 transition-opacity ${getLifecycleStatusColor(series.lifecycle_status || 'draft')}`}
                            title="Double-click to edit"
                          >
                            {(series.lifecycle_status || 'draft').charAt(0).toUpperCase() + (series.lifecycle_status || 'draft').slice(1)}
                          </span>
                        )}
                      </td>
                      <td className={seriesPadding}>
                        {seriesIsActive && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        )}
                        {seriesIsUpcoming && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700">
                            Upcoming
                          </span>
                        )}
                        {seriesIsPast && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600">
                            Past
                          </span>
                        )}
                      </td>
                      <td className={`${seriesPadding} text-right`}>
                        <Link
                          to={`/series/${series.id}`}
                          className="text-[10px] text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {filteredAndSortedEvents.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Filter className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No events match your filters</p>
        </div>
      )}
    </div>

    {/* Pagination Footer */}
    {filteredAndSortedEvents.length > 0 && (
      <div className="bg-white px-3 py-2 flex items-center justify-between border border-t-0 border-gray-200 rounded-b-lg">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="ml-3 relative inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-600">
              <span className="font-semibold text-gray-900">{page * rowsPerPage + 1}</span>-<span className="font-semibold text-gray-900">{Math.min((page + 1) * rowsPerPage, totalEvents)}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalEvents}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="rows-per-page" className="text-xs text-gray-600">
                Rows:
              </label>
              <select
                id="rows-per-page"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                className="px-1.5 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="relative inline-flex items-center px-1.5 py-1 rounded-l border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="First page"
              >
                <ChevronsLeft className="h-3 w-3" />
              </button>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="relative inline-flex items-center px-1.5 py-1 border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Previous page"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(pageNum => {
                  // Show first page, last page, current page, and pages around current
                  return (
                    pageNum === 0 ||
                    pageNum === totalPages - 1 ||
                    (pageNum >= page - 1 && pageNum <= page + 1)
                  );
                })
                .map((pageNum, idx, arr) => {
                  // Add ellipsis if there's a gap
                  const prevPageNum = arr[idx - 1];
                  const showEllipsis = prevPageNum !== undefined && pageNum - prevPageNum > 1;

                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && (
                        <span className="relative inline-flex items-center px-2 py-1 border border-gray-300 bg-white text-xs font-medium text-gray-500">
                          ...
                        </span>
                      )}
                      <button
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-2.5 py-1 border text-xs font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-600 border-blue-600 text-white'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="relative inline-flex items-center px-1.5 py-1 border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Next page"
              >
                <ChevronRightIcon className="h-3 w-3" />
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="relative inline-flex items-center px-1.5 py-1 rounded-r border border-gray-300 bg-white text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Last page"
              >
                <ChevronsRight className="h-3 w-3" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default CompactEventsTable;
