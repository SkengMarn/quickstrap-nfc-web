import { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, Calendar, ChevronRight, ListOrdered, Shield } from 'lucide-react';
import { toast } from 'react-toastify';
import eventSeriesService, { EventSeries } from '../../services/eventSeriesService';
import { supabase } from '../../services/supabase';

interface SeriesFormProps {
  eventId: string;
  organizationId?: string;
  series?: EventSeries | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SeriesForm({ eventId, organizationId, series, onClose, onSuccess }: SeriesFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    sequence_number: '',
    series_type: 'standard' as 'standard' | 'knockout' | 'group_stage' | 'custom',
    checkin_window_start: '2',  // hours
    checkin_window_end: '2',     // hours
    ticket_linking_mode: 'inherit' as 'inherit' | 'disabled' | 'optional' | 'required',
    allow_unlinked_entry: true,
    lifecycle_status: 'draft' as 'draft' | 'scheduled' | 'active',
  });
  const [loading, setLoading] = useState(false);
  const [mainEvent, setMainEvent] = useState<any>(null);
  const [dateWarning, setDateWarning] = useState<string>('');
  const [dateError, setDateError] = useState<string>('');
  const [existingSeries, setExistingSeries] = useState<EventSeries[]>([]);
  const [showSeriesGuide, setShowSeriesGuide] = useState(true);
  const [suggestedDates, setSuggestedDates] = useState<{ start: string; end: string } | null>(null);
  const [autoSequenceNumber, setAutoSequenceNumber] = useState<number | null>(null);

  // Fetch main event details and existing series
  useEffect(() => {
    const fetchMainEvent = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, start_date, end_date')
        .eq('id', eventId)
        .single();
      
      if (!error && data) {
        setMainEvent(data);
      }
    };

    const fetchExistingSeries = async () => {
      const { data } = await eventSeriesService.getSeriesForEvent(eventId);
      if (data) {
        setExistingSeries(data);
      }
    };

    fetchMainEvent();
    fetchExistingSeries();
  }, [eventId]);

  // Calculate automatic sequence number based on start date/time and name
  // Only for active/upcoming series (end_date hasn't passed)
  useEffect(() => {
    if (formData.start_date && formData.name) {
      const now = new Date();
      
      // Filter to only active/upcoming series (end_date >= now)
      const activeSeries = existingSeries.filter(s => {
        const endDate = new Date(s.end_date);
        return endDate >= now;
      });
      
      // If editing, remove the current series from comparison
      if (series) {
        const index = activeSeries.findIndex(s => s.id === series.id);
        if (index !== -1) activeSeries.splice(index, 1);
      }
      
      // Add the current form data as a temporary series
      activeSeries.push({
        id: 'temp',
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date || formData.start_date,
        main_event_id: eventId,
      } as EventSeries);
      
      // Sort by start_date, then by name (alphabetically)
      activeSeries.sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        
        if (dateA !== dateB) {
          return dateA - dateB;
        }
        
        // Same date/time - sort by name alphabetically
        return a.name.localeCompare(b.name);
      });
      
      // Find the position of our temp series
      const position = activeSeries.findIndex(s => s.id === 'temp');
      const calculatedSequence = position + 1;
      
      setAutoSequenceNumber(calculatedSequence);
    } else {
      setAutoSequenceNumber(null);
    }
  }, [formData.start_date, formData.name, formData.end_date, existingSeries, series, eventId]);

  // Auto-suggest dates when creating new series
  useEffect(() => {
    if (!series && existingSeries.length > 0) {
      // Use the last series by date as reference
      const lastSeries = [...existingSeries]
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
      
      if (lastSeries) {
        const lastEndDate = new Date(lastSeries.end_date);
        const suggestedStart = new Date(lastEndDate);
        suggestedStart.setHours(lastEndDate.getHours());
        
        const suggestedEnd = new Date(suggestedStart);
        suggestedEnd.setDate(suggestedEnd.getDate() + 1);
        
        setSuggestedDates({
          start: suggestedStart.toISOString().slice(0, 16),
          end: suggestedEnd.toISOString().slice(0, 16)
        });
        
        // Auto-fill dates if form is empty
        if (!formData.start_date && !formData.end_date) {
          setFormData(prev => ({
            ...prev,
            start_date: suggestedStart.toISOString().slice(0, 16),
            end_date: suggestedEnd.toISOString().slice(0, 16)
          }));
        }
      }
    }
  }, [existingSeries, series]);

  useEffect(() => {
    if (series) {
      setFormData({
        name: series.name,
        description: series.description || '',
        start_date: new Date(series.start_date).toISOString().slice(0, 16),
        end_date: new Date(series.end_date).toISOString().slice(0, 16),
        sequence_number: series.sequence_number?.toString() || '',
        series_type: (series.series_type as any) || 'standard',
        checkin_window_start: series.checkin_window_start_offset || '2',
        checkin_window_end: series.checkin_window_end_offset || '2',
        ticket_linking_mode: (series.config?.ticket_linking_mode as any) || 'inherit',
        allow_unlinked_entry: series.config?.allow_unlinked_entry ?? true,
        lifecycle_status: (series as any).lifecycle_status || 'draft',
      });
    }
  }, [series]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Validate dates on change
    if (name === 'start_date' || name === 'end_date') {
      validateDates(name === 'start_date' ? value : formData.start_date, name === 'end_date' ? value : formData.end_date);
    }

  };

  const validateDates = (startDate: string, endDate: string) => {
    setDateError('');
    setDateWarning('');

    if (!mainEvent || !startDate || !endDate) return;

    const now = new Date();
    const seriesStart = new Date(startDate);
    const seriesEnd = new Date(endDate);
    const mainStart = new Date(mainEvent.start_date);
    const mainEnd = new Date(mainEvent.end_date);

    // Rule 1: Series cannot start in the past
    if (seriesStart < now) {
      setDateError(`Series cannot start in the past. Please select a future date/time.`);
      return;
    }

    // Rule 2: Series end must be after series start
    if (seriesEnd <= seriesStart) {
      setDateError('Series end date must be after start date');
      return;
    }

    // Rule 3: Warning if series starts before main event
    if (seriesStart < mainStart) {
      setDateWarning(`This series starts before the main event. Main event will be automatically adjusted to start on ${seriesStart.toLocaleString()}`);
    }

    // Rule 4: Warning if series extends beyond main event
    if (seriesEnd > mainEnd) {
      setDateWarning(`This series extends beyond the main event end date. Main event will be automatically extended to ${seriesEnd.toLocaleString()}`);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Block submission if there's a date error
    if (dateError) {
      toast.error(dateError);
      return;
    }

    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    const mainEnd = mainEvent ? new Date(mainEvent.end_date) : null;

    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      const seriesData = {
        main_event_id: eventId,
        name: formData.name,
        description: formData.description || undefined,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        sequence_number: autoSequenceNumber || undefined,
        series_type: formData.series_type,
        checkin_window_start_offset: `${formData.checkin_window_start} hours`,
        checkin_window_end_offset: `${formData.checkin_window_end} hours`,
        organization_id: organizationId,
        lifecycle_status: formData.lifecycle_status,
        config: {
          ticket_linking_mode: formData.ticket_linking_mode,
          allow_unlinked_entry: formData.allow_unlinked_entry,
        },
      };

      let result;
      if (series) {
        result = await eventSeriesService.updateSeries(series.id, seriesData);
      } else {
        result = await eventSeriesService.createSeries(seriesData);
      }

      if (result.error) {
        throw result.error;
      }

      // Auto-adjust main event dates if series extends beyond them
      const mainStart = mainEvent ? new Date(mainEvent.start_date) : null;
      const needsStartAdjustment = mainStart && startDate < mainStart;
      const needsEndAdjustment = mainEnd && endDate > mainEnd;
      
      if (needsStartAdjustment || needsEndAdjustment) {
        const updateData: any = {};
        if (needsStartAdjustment) updateData.start_date = startDate.toISOString();
        if (needsEndAdjustment) updateData.end_date = endDate.toISOString();
        
        const { error: updateError } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', eventId);
        
        if (updateError) {
          console.error('Error adjusting main event:', updateError);
          toast.warning('Series created but failed to adjust main event dates');
        } else {
          const messages = [];
          if (needsStartAdjustment) messages.push(`starts ${startDate.toLocaleDateString()}`);
          if (needsEndAdjustment) messages.push(`ends ${endDate.toLocaleDateString()}`);
          toast.success(`Series ${series ? 'updated' : 'created'} successfully! Main event adjusted: ${messages.join(', ')}`);
        }
      } else {
        toast.success(`Series ${series ? 'updated' : 'created'} successfully`);
      }
      
      onSuccess();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${series ? 'update' : 'create'} series`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {series ? 'Edit Series' : 'Create New Series'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>


        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Series Guide */}
          {existingSeries.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg">
              <button
                type="button"
                onClick={() => setShowSeriesGuide(!showSeriesGuide)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-blue-100 transition-colors rounded-t-lg"
              >
                <div className="flex items-center gap-2">
                  <ListOrdered size={16} className="text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    Existing Series Guide ({existingSeries.length})
                  </span>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-blue-600 transition-transform ${
                    showSeriesGuide ? 'rotate-90' : ''
                  }`}
                />
              </button>
              
              {showSeriesGuide && (
                <div className="px-4 pb-3 space-y-2">
                  <div className="p-2 bg-blue-100 rounded text-xs text-blue-800 mb-3">
                    💡 <strong>Auto-Sequencing:</strong> Sequence numbers are automatically assigned based on start date/time. 
                    Series with the same start time are ordered alphabetically by name. Completed series are hidden.
                  </div>
                  
                  {(() => {
                    const now = new Date();
                    const activeSeries = existingSeries.filter(s => {
                      const endDate = new Date(s.end_date);
                      return endDate >= now;
                    });
                    
                    const completedCount = existingSeries.length - activeSeries.length;
                    
                    return (
                      <>
                        {completedCount > 0 && (
                          <div className="p-2 bg-gray-100 rounded text-xs text-gray-600 mb-2 flex items-center justify-between">
                            <span>{completedCount} completed series hidden</span>
                            <span className="text-gray-500">✓ Done</span>
                          </div>
                        )}
                        
                        {activeSeries
                          .sort((a, b) => {
                            const dateA = new Date(a.start_date).getTime();
                            const dateB = new Date(b.start_date).getTime();
                            if (dateA !== dateB) return dateA - dateB;
                            return a.name.localeCompare(b.name);
                          })
                          .map((s, index, array) => {
                            const now = new Date();
                            const startDate = new Date(s.start_date);
                            const endDate = new Date(s.end_date);
                            const isOngoing = startDate <= now && endDate >= now;
                            const isUpcoming = startDate > now;
                            
                            // Recalculate sequence for active series only
                            const activeSequence = index + 1;
                            
                            return (
                              <div
                                key={s.id}
                                className={`flex items-center gap-3 p-2 rounded border ${
                                  isOngoing 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-white border-blue-100'
                                }`}
                              >
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                  isOngoing ? 'bg-green-100' : 'bg-blue-100'
                                }`}>
                                  <span className={`text-xs font-bold ${
                                    isOngoing ? 'text-green-700' : 'text-blue-700'
                                  }`}>
                                    {activeSequence}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {s.name}
                                  </p>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar size={10} />
                                    <span>
                                      {new Date(s.start_date).toLocaleDateString()} - {new Date(s.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                {isOngoing && (
                                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded">
                                    Live Now
                                  </span>
                                )}
                                {isUpcoming && index === 0 && (
                                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                    Next
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </>
                    );
                  })()}
                  
                  {suggestedDates && !series && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-xs font-semibold text-green-900 mb-1">
                        💡 Suggested Next Series:
                      </p>
                      <p className="text-xs text-green-700">
                        Starts: <strong>{new Date(suggestedDates.start).toLocaleString()}</strong>
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Sequence number will be auto-assigned based on date/time
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* Series Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Series Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Matchday 1, Semi-Finals, Day 1"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional description"
            />
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date/Time *
                </label>
                <input
                  type="datetime-local"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    dateError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                {mainEvent && (
                  <p className="text-xs text-gray-500 mt-1">
                    Main event: {new Date(mainEvent.start_date).toLocaleDateString()} - {new Date(mainEvent.end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date/Time *
                </label>
                <input
                  type="datetime-local"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  min={formData.start_date}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    dateError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  required
                />
                {mainEvent && (
                  <p className="text-xs text-gray-500 mt-1">
                    Main event ends: {new Date(mainEvent.end_date).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Date Error Alert */}
            {dateError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Date Constraint Violation</p>
                  <p className="text-sm text-red-700 mt-1">{dateError}</p>
                </div>
              </div>
            )}

            {/* Date Warning Alert */}
            {dateWarning && !dateError && (
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">Main Event Extension</p>
                  <p className="text-sm text-blue-700 mt-1">{dateWarning}</p>
                </div>
              </div>
            )}
          </div>

          {/* Auto Sequence Display and Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Number (Auto)
              </label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center justify-between">
                <span className="text-gray-900 font-medium">
                  {autoSequenceNumber !== null ? `#${autoSequenceNumber}` : '—'}
                </span>
                <span className="text-xs text-gray-500">Auto-assigned</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.start_date && formData.name ? (
                  <span className="text-green-600">✓ Calculated from active series only</span>
                ) : (
                  'Based on start date/time'
                )}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series Type
              </label>
              <select
                name="series_type"
                value={formData.series_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="knockout">Knockout</option>
                <option value="group_stage">Group Stage</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {/* Ticket Linking Configuration */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-700" />
              <h3 className="text-sm font-medium text-gray-900">Ticket Linking Requirement</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ticket Linking Mode
                </label>
                <select
                  name="ticket_linking_mode"
                  value={formData.ticket_linking_mode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="inherit">Inherit from Main Event</option>
                  <option value="disabled">Disabled - No Ticket Required</option>
                  <option value="optional">Optional - Ticket Recommended</option>
                  <option value="required">Required - Ticket Mandatory</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.ticket_linking_mode === 'inherit' && 'Uses the main event\'s ticket linking setting'}
                  {formData.ticket_linking_mode === 'disabled' && 'All wristbands can check in without tickets'}
                  {formData.ticket_linking_mode === 'optional' && 'Wristbands can have tickets but it\'s not required'}
                  {formData.ticket_linking_mode === 'required' && '⚠️ Only wristbands with linked tickets can check in'}
                </p>
              </div>

              {formData.ticket_linking_mode === 'optional' && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="allow_unlinked_entry"
                      checked={formData.allow_unlinked_entry}
                      onChange={(e) => setFormData(prev => ({ ...prev, allow_unlinked_entry: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Allow unlinked wristbands to check in
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-6">
                    When unchecked, wristbands without tickets will be rejected even in optional mode
                  </p>
                </div>
              )}

              {formData.ticket_linking_mode === 'required' && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Strict Mode Enabled</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Only wristbands with valid linked tickets will be allowed to check in to this series.
                        Make sure all attendees have their tickets linked before the series starts.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mainEvent && formData.ticket_linking_mode !== 'inherit' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-blue-700">
                        <strong>Main Event Setting:</strong> {mainEvent.ticket_linking_mode || 'Not configured'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        This series will use its own ticket linking requirement instead of inheriting from the main event.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Check-in Window */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Check-in Window</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Open Before Start (hours)
                </label>
                <input
                  type="number"
                  name="checkin_window_start"
                  value={formData.checkin_window_start}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.5"
                />
                <p className="text-xs text-gray-500 mt-1">How early check-in can start</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Close After End (hours)
                </label>
                <input
                  type="number"
                  name="checkin_window_end"
                  value={formData.checkin_window_end}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.5"
                />
                <p className="text-xs text-gray-500 mt-1">How long after end check-in stays open</p>
              </div>
            </div>
          </div>

          {/* Lifecycle Status */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Series Status</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activation Status
                </label>
                <select
                  name="lifecycle_status"
                  value={formData.lifecycle_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Draft - Not visible, can edit freely</option>
                  <option value="scheduled">Scheduled - Will activate at start time</option>
                  <option value="active">Active Now - Immediately available</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.lifecycle_status === 'draft' && 'Series is saved but not active. You can edit all settings.'}
                  {formData.lifecycle_status === 'scheduled' && 'Series will automatically activate when start time is reached.'}
                  {formData.lifecycle_status === 'active' && 'Series is immediately active and check-ins can begin.'}
                </p>
              </div>

              {formData.lifecycle_status === 'scheduled' && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Auto-Activation Enabled</p>
                      <p className="text-xs text-blue-700 mt-1">
                        This series will automatically transition to "active" status at <strong>{formData.start_date ? new Date(formData.start_date).toLocaleString() : 'the start time'}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {formData.lifecycle_status === 'active' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Series Active</p>
                      <p className="text-xs text-green-700 mt-1">
                        Check-ins can begin immediately if within the check-in window.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Saving...' : series ? 'Update Series' : 'Create Series'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
