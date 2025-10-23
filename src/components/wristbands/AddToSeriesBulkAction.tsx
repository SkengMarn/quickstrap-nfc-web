import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { enhancedSeriesService } from '../../services/enhancedSeriesService';
import type { EventSeries } from '../../types/series';

interface AddToSeriesBulkActionProps {
  eventId: string;
  selectedWristbandIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddToSeriesBulkAction: React.FC<AddToSeriesBulkActionProps> = ({
  eventId,
  selectedWristbandIds,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [series, setSeries] = useState<EventSeries[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSeries();
    }
  }, [isOpen, eventId]);

  const loadSeries = async () => {
    setLoadingSeries(true);
    setError(null);

    try {
      const result = await enhancedSeriesService.getSeriesForEvent(eventId, {
        lifecycle_status: ['draft', 'scheduled', 'active'],
      });

      if (result.error) {
        throw result.error;
      }

      setSeries(result.data || []);

      // Auto-select first series if only one
      if (result.data && result.data.length === 1) {
        setSelectedSeriesId(result.data[0].id);
      }
    } catch (err: any) {
      console.error('Error loading series:', err);
      setError(err.message || 'Failed to load series');
    } finally {
      setLoadingSeries(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSeriesId) {
      setError('Please select a series');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await enhancedSeriesService.assignWristbandsToSeries({
        series_id: selectedSeriesId,
        wristband_ids: selectedWristbandIds,
      });

      if (result.error) {
        throw result.error;
      }

      setSuccess(true);

      // Close and notify parent after short delay
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Error assigning wristbands:', err);
      setError(err.message || 'Failed to assign wristbands to series');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setSelectedSeriesId('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedSeries = series.find((s) => s.id === selectedSeriesId);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Add to Series</h2>
              <p className="text-sm text-gray-500 mt-1">
                Assign {selectedWristbandIds.length} wristband{selectedWristbandIds.length !== 1 ? 's' : ''} to a series
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loadingSeries ? (
              <div className="py-8 text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-600">Loading series...</p>
              </div>
            ) : series.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-base font-medium text-gray-900 mb-2">No Series Available</h4>
                <p className="text-sm text-gray-600">
                  This event doesn't have any active series yet.
                  <br />
                  Create a series first to assign wristbands to it.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Success Message */}
                {success && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-green-800">Success!</h4>
                      <p className="text-sm text-green-700 mt-1">
                        {selectedWristbandIds.length} wristband{selectedWristbandIds.length !== 1 ? 's' : ''} assigned to series
                      </p>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800">Error</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {/* Series Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Series <span className="text-red-500">*</span>
                  </label>

                  <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    {series.map((s) => (
                      <label
                        key={s.id}
                        className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedSeriesId === s.id ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="series"
                          value={s.id}
                          checked={selectedSeriesId === s.id}
                          onChange={(e) => setSelectedSeriesId(e.target.value)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {s.sequence_number && (
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                #{s.sequence_number}
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-900">{s.name}</span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                s.lifecycle_status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : s.lifecycle_status === 'scheduled'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {s.lifecycle_status}
                            </span>
                          </div>
                          {s.description && (
                            <p className="text-xs text-gray-600 line-clamp-2">{s.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(s.start_date).toLocaleDateString()}
                            </span>
                            {s.capacity && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Cap: {s.capacity.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Selected Series Summary */}
                {selectedSeries && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">You're assigning to:</h4>
                    <p className="text-sm text-blue-800 font-medium">{selectedSeries.name}</p>
                    {selectedSeries.description && (
                      <p className="text-xs text-blue-700 mt-1">{selectedSeries.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-blue-700">
                      <Users className="w-3.5 h-3.5" />
                      <span>
                        {selectedWristbandIds.length} wristband{selectedWristbandIds.length !== 1 ? 's' : ''} will be assigned
                      </span>
                    </div>
                  </div>
                )}

                {/* Info Note */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Assigning wristbands to a series grants them access to check in
                    during that series' check-in window. They won't automatically have access to other series.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !selectedSeriesId || success}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Assigning...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Assigned!
                      </>
                    ) : (
                      `Assign to Series`
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddToSeriesBulkAction;
