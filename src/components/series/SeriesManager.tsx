import { useState, useEffect } from 'react';
import { Plus, Calendar, Upload, Edit, Trash2, Users, Clock, Grid3x3 } from 'lucide-react';
import { toast } from 'react-toastify';
import eventSeriesService, { EventSeries } from '../../services/eventSeriesService';
import SeriesForm from './SeriesForm';
import SeriesCsvUpload from './SeriesCsvUpload';
import SeriesWristbandAssignment from './SeriesWristbandAssignment';
import SeriesCalendarView from './SeriesCalendarView';

interface SeriesManagerProps {
  eventId: string;
  eventName: string;
  organizationId?: string;
}

export default function SeriesManager({ eventId, eventName, organizationId }: SeriesManagerProps) {
  const [series, setSeries] = useState<EventSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<EventSeries | null>(null);
  const [showWristbandAssignment, setShowWristbandAssignment] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'calendar'>('grid');
  const [showCompletedEvents, setShowCompletedEvents] = useState(false);

  useEffect(() => {
    fetchSeries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchSeries = async () => {
    setLoading(true);
    const { data, error } = await eventSeriesService.getSeriesForEvent(eventId);
    if (error) {
      toast.error('Failed to load event series');
      console.error(error);
    } else {
      setSeries(data || []);
    }
    setLoading(false);
  };

  const handleCreateSeries = () => {
    setSelectedSeries(null);
    setShowForm(true);
  };

  const handleEditSeries = (s: EventSeries) => {
    setSelectedSeries(s);
    setShowForm(true);
  };

  const handleDeleteSeries = async (seriesId: string) => {
    if (!confirm('Are you sure you want to delete this series? This will remove all associated check-ins.')) {
      return;
    }

    const { error } = await eventSeriesService.deleteSeries(seriesId);
    if (error) {
      toast.error('Failed to delete series');
      console.error(error);
    } else {
      toast.success('Series deleted successfully');
      fetchSeries();
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setSelectedSeries(null);
    fetchSeries();
  };

  const handleCsvUploadSuccess = () => {
    setShowCsvUpload(false);
    fetchSeries();
  };

  const handleManageWristbands = (s: EventSeries) => {
    setSelectedSeries(s);
    setShowWristbandAssignment(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Event Series</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage series for {eventName}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Show Completed Events Toggle */}
          <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showCompletedEvents}
              onChange={(e) => setShowCompletedEvents(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Show past events</span>
          </label>
          
          {/* View Toggle */}
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium border ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-l-md`}
            >
              <Grid3x3 size={16} className="inline mr-1.5" />
              Grid
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-sm font-medium border-t border-b border-r ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              } rounded-r-md`}
            >
              <Calendar size={16} className="inline mr-1.5" />
              Calendar
            </button>
          </div>
          <button
            onClick={() => setShowCsvUpload(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Upload size={16} className="mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={handleCreateSeries}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus size={16} className="mr-2" />
            Add Series
          </button>
        </div>
      </div>

      {/* Series List/Calendar */}
      {series.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No series yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new series or uploading multiple via CSV.
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <button
              onClick={handleCreateSeries}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={16} className="mr-2" />
              Add Series
            </button>
            <button
              onClick={() => setShowCsvUpload(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Upload size={16} className="mr-2" />
              Upload CSV
            </button>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <SeriesCalendarView
          series={series}
          eventName={eventName}
          onEditSeries={handleEditSeries}
          showCompletedEvents={showCompletedEvents}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(() => {
            const now = new Date();
            
            // Filter series based on showCompletedEvents toggle
            const activeSeries = showCompletedEvents 
              ? series 
              : series.filter(s => {
                  const endDate = new Date(s.end_date);
                  return endDate >= now;
                });
            
            // Sort by start_date, then by name
            const sortedSeries = activeSeries.sort((a, b) => {
              const dateA = new Date(a.start_date).getTime();
              const dateB = new Date(b.start_date).getTime();
              
              if (dateA !== dateB) {
                return dateA - dateB;
              }
              
              return a.name.localeCompare(b.name);
            });
            
            return sortedSeries.map((s, index) => {
              const dynamicSequence = index + 1;
              const startDate = new Date(s.start_date);
              const endDate = new Date(s.end_date);
              const isOngoing = startDate <= now && endDate >= now;
              const isPast = endDate < now;
              
              return (
                <div
                  key={s.id}
                  className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${
                    isPast 
                      ? 'bg-gray-50 border-gray-200 opacity-75' 
                      : isOngoing 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">{s.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          isPast
                            ? 'bg-gray-200 text-gray-600'
                            : isOngoing 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          #{dynamicSequence}
                        </span>
                        {isPast && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-400 text-white">
                            Completed
                          </span>
                        )}
                        {isOngoing && !isPast && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-600 text-white">
                            Live Now
                          </span>
                        )}
                      </div>
                    </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEditSeries(s)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit series"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteSeries(s.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete series"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {s.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{s.description}</p>
              )}

              <div className="space-y-2 text-xs text-gray-500">
                <div className="flex items-center">
                  <Calendar size={12} className="mr-1.5" />
                  <span>
                    {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock size={12} className="mr-1.5" />
                  <span className="text-xs">
                    Check-in: {s.checkin_window_start_offset || '2 hours'} before
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleManageWristbands(s)}
                  className="w-full inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Users size={12} className="mr-1.5" />
                  Manage Wristbands
                </button>
              </div>
            </div>
              );
            });
          })()}
        </div>
      )}

      {/* Series Form Modal */}
      {showForm && (
        <SeriesForm
          eventId={eventId}
          organizationId={organizationId}
          series={selectedSeries}
          onClose={() => {
            setShowForm(false);
            setSelectedSeries(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* CSV Upload Modal */}
      {showCsvUpload && (
        <SeriesCsvUpload
          eventId={eventId}
          organizationId={organizationId}
          onClose={() => setShowCsvUpload(false)}
          onSuccess={handleCsvUploadSuccess}
        />
      )}

      {/* Wristband Assignment Modal */}
      {showWristbandAssignment && selectedSeries && (
        <SeriesWristbandAssignment
          series={selectedSeries}
          eventId={eventId}
          onClose={() => {
            setShowWristbandAssignment(false);
            setSelectedSeries(null);
          }}
        />
      )}
    </div>
  );
}
