import React, { useState, useEffect } from 'react';
import { Plus, Calendar, MapPin, Users, Clock, Eye, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { enhancedSeriesService } from '../../services/enhancedSeriesService';
import type { EventSeries, SeriesOverview } from '../../types/series';
import { formatDistanceToNow, format } from 'date-fns';

interface SeriesManagementProps {
  eventId: string;
  eventName: string;
  onCreateSeries?: () => void;
}

export const SeriesManagement: React.FC<SeriesManagementProps> = ({
  eventId,
  eventName,
  onCreateSeries,
}) => {
  const [series, setSeries] = useState<EventSeries[]>([]);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeries();
  }, [eventId]);

  const loadSeries = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await enhancedSeriesService.getSeriesForEvent(eventId, {
        lifecycle_status: ['draft', 'scheduled', 'active', 'completed'],
      });

      if (result.error) {
        throw result.error;
      }

      setSeries(result.data || []);
    } catch (err) {
      console.error('Error loading series:', err);
      setError('Failed to load series');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (seriesId: string) => {
    const newExpanded = new Set(expandedSeries);
    if (newExpanded.has(seriesId)) {
      newExpanded.delete(seriesId);
    } else {
      newExpanded.add(seriesId);
    }
    setExpandedSeries(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeriesTypeLabel = (type: string) => {
    switch (type) {
      case 'standard':
        return 'Standard';
      case 'knockout':
        return 'Knockout';
      case 'group_stage':
        return 'Group Stage';
      case 'round_robin':
        return 'Round Robin';
      case 'custom':
        return 'Custom';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="text-red-600">{error}</div>
        <button
          onClick={loadSeries}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Event Series</h3>
          <p className="text-sm text-gray-500 mt-1">
            {series.length === 0
              ? 'No series created yet'
              : `${series.length} series for this event`}
          </p>
        </div>
        <button
          onClick={onCreateSeries}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Series
        </button>
      </div>

      {/* Series List */}
      {series.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Series Yet</h4>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Create series to organize your event into multiple sessions, days, or stages.
            Each series can have its own gates, capacity, and check-in windows.
          </p>
          <button
            onClick={onCreateSeries}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Series
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {series.map((s) => (
            <SeriesRow
              key={s.id}
              series={s}
              expanded={expandedSeries.has(s.id)}
              onToggleExpanded={() => toggleExpanded(s.id)}
              onEdit={() => {
                // TODO: Open edit modal
                console.log('Edit series:', s.id);
              }}
              onDelete={async () => {
                if (confirm(`Delete series "${s.name}"?`)) {
                  const result = await enhancedSeriesService.deleteSeries(s.id);
                  if (!result.error) {
                    loadSeries();
                  }
                }
              }}
              onViewDetails={() => {
                // TODO: Navigate to series details
                console.log('View series:', s.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface SeriesRowProps {
  series: EventSeries;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetails: () => void;
}

const SeriesRow: React.FC<SeriesRowProps> = ({
  series,
  expanded,
  onToggleExpanded,
  onEdit,
  onDelete,
  onViewDetails,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'completed':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeriesTypeLabel = (type: string) => {
    switch (type) {
      case 'standard':
        return 'Standard';
      case 'knockout':
        return 'Knockout';
      case 'group_stage':
        return 'Group Stage';
      case 'round_robin':
        return 'Round Robin';
      case 'custom':
        return 'Custom';
      default:
        return type;
    }
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Expand/Collapse Button */}
        <button
          onClick={onToggleExpanded}
          className="mt-1 p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </button>

        {/* Series Info */}
        <div className="flex-1 min-w-0">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                {series.sequence_number && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    #{series.sequence_number}
                  </span>
                )}
                <h4 className="text-base font-medium text-gray-900 truncate">
                  {series.name}
                </h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(
                    series.lifecycle_status
                  )}`}
                >
                  {series.lifecycle_status}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {getSeriesTypeLabel(series.series_type)}
                </span>
              </div>
              {series.description && (
                <p className="text-sm text-gray-600 line-clamp-1">{series.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={onViewDetails}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="View Details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={onEdit}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Edit"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={onDelete}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {format(new Date(series.start_date), 'MMM d, yyyy h:mm a')} -{' '}
                {format(new Date(series.end_date), 'h:mm a')}
              </span>
            </div>
            {series.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{series.location}</span>
              </div>
            )}
            {series.capacity && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Capacity: {series.capacity.toLocaleString()}</span>
              </div>
            )}
            {series.is_recurring && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full font-medium">
                Recurring
              </span>
            )}
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-500 mb-1">Check-in Window</div>
                  <div className="font-medium text-gray-900">
                    {series.checkin_window_start_offset || '2 hours'} before
                    <br />
                    {series.checkin_window_end_offset || '2 hours'} after
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Status Changed</div>
                  <div className="font-medium text-gray-900">
                    {formatDistanceToNow(new Date(series.status_changed_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Visibility</div>
                  <div className="font-medium text-gray-900">
                    {series.is_public ? 'Public' : 'Private'}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 mb-1">Separate Ticket</div>
                  <div className="font-medium text-gray-900">
                    {series.requires_separate_ticket ? 'Required' : 'Not Required'}
                  </div>
                </div>
              </div>

              {/* Additional actions */}
              <div className="mt-4 flex gap-2">
                <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  Manage Gates
                </button>
                <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  Manage Categories
                </button>
                <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  Assign Wristbands
                </button>
                <button className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                  View Analytics
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeriesManagement;
