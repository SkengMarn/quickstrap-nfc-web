import { useState, useEffect } from 'react';
import { X, Users, Tag, Ticket, Upload, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import eventSeriesService, { EventSeries } from '../../services/eventSeriesService';
import { supabase } from '../../services/supabase';

interface SeriesWristbandAssignmentProps {
  series: EventSeries;
  eventId: string;
  onClose: () => void;
}

export default function SeriesWristbandAssignment({ series, eventId, onClose }: SeriesWristbandAssignmentProps) {
  const [assignmentMethod, setAssignmentMethod] = useState<'category' | 'ticket' | 'upload'>('category');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [ticketNumbers, setTicketNumbers] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignedWristbands, setAssignedWristbands] = useState<any[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignedList, setShowAssignedList] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchAssignedWristbands();
  }, [eventId, series.id]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('wristbands')
      .select('category')
      .eq('event_id', eventId);

    if (!error && data) {
      const uniqueCategories = [...new Set(data.map(w => w.category).filter(Boolean))];
      setCategories(uniqueCategories as string[]);
    }
  };

  const fetchAssignedWristbands = async () => {
    const { data } = await eventSeriesService.getSeriesWristbands(series.id);
    if (data) {
      setAssignedWristbands(data);
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setLoading(true);
    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const nfcIdIndex = headers.findIndex(h => 
        h.includes('nfc') || h.includes('id') || h.includes('barcode') || h.includes('ticket')
      );
      const categoryIndex = headers.findIndex(h => 
        h.includes('category') || h.includes('type') || h.includes('tier')
      );

      if (nfcIdIndex === -1) {
        toast.error('CSV must contain an NFC ID or Ticket Number column');
        setLoading(false);
        return;
      }

      const wristbandsToCreate = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const nfcId = values[nfcIdIndex];
        const category = categoryIndex !== -1 ? values[categoryIndex] : 'General';

        if (nfcId) {
          wristbandsToCreate.push({
            event_id: eventId,
            nfc_id: nfcId,
            category: category || 'General',
            series_id: series.id,
            status: 'active'
          });
        }
      }

      const { data, error } = await supabase
        .from('wristbands')
        .insert(wristbandsToCreate)
        .select();

      if (error) throw error;

      toast.success(`Successfully uploaded ${data?.length || 0} wristbands for this series`);
      fetchAssignedWristbands();
      setCsvFile(null);
    } catch (error: any) {
      console.error('Error uploading CSV:', error);
      toast.error(error.message || 'Failed to upload wristbands');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignWristband = async (wristbandId: string) => {
    if (!confirm('Remove this wristband from the series?')) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('wristbands')
        .update({ series_id: null })
        .eq('id', wristbandId);

      if (error) throw error;

      toast.success('Wristband removed from series');
      fetchAssignedWristbands();
    } catch (error) {
      console.error('Error unassigning wristband:', error);
      toast.error('Failed to remove wristband');
    } finally {
      setLoading(false);
    }
  };

  const filteredWristbands = assignedWristbands.filter(w => 
    w.nfc_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleAssignByCategory = async () => {
    if (selectedCategories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await eventSeriesService.bulkAssignByCategory(
        series.id,
        eventId,
        selectedCategories
      );

      if (error) throw error;

      toast.success(`Assigned ${data?.length || 0} wristbands to series`);
      fetchAssignedWristbands();
      setSelectedCategories([]);
    } catch (error) {
      console.error('Error assigning wristbands:', error);
      toast.error('Failed to assign wristbands');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignByTickets = async () => {
    const tickets = ticketNumbers
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(Boolean);

    if (tickets.length === 0) {
      toast.error('Please enter at least one ticket number');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await eventSeriesService.bulkAssignByTickets(
        series.id,
        eventId,
        tickets
      );

      if (error) throw error;

      toast.success(`Assigned ${data?.length || 0} wristbands to series`);
      fetchAssignedWristbands();
      setTicketNumbers('');
    } catch (error) {
      console.error('Error assigning wristbands:', error);
      toast.error('Failed to assign wristbands');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Manage Wristbands</h2>
            <p className="text-sm text-gray-500 mt-1">Series: {series.name}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Assignment Method Tabs */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assignment Method
            </label>
            <div className="flex space-x-2 border-b border-gray-200">
              <button
                onClick={() => setAssignmentMethod('category')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  assignmentMethod === 'category'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Tag size={16} className="inline mr-1.5" />
                By Category
              </button>
              <button
                onClick={() => setAssignmentMethod('ticket')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  assignmentMethod === 'ticket'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Ticket size={16} className="inline mr-1.5" />
                By Ticket Number
              </button>
              <button
                onClick={() => setAssignmentMethod('upload')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  assignmentMethod === 'upload'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload size={16} className="inline mr-1.5" />
                Upload Series Wristbands
              </button>
            </div>
          </div>

          {/* Assignment Form */}
          {assignmentMethod === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Categories
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryToggle(category)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      selectedCategories.includes(category)
                        ? 'bg-blue-100 border-blue-600 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              {selectedCategories.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleAssignByCategory}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Assigning...' : `Assign ${selectedCategories.length} Categories`}
                  </button>
                </div>
              )}
            </div>
          )}

          {assignmentMethod === 'ticket' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ticket Numbers
              </label>
              <textarea
                value={ticketNumbers}
                onChange={(e) => setTicketNumbers(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="Enter ticket numbers separated by commas or new lines:&#10;TKT-001&#10;TKT-002&#10;TKT-003"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter ticket numbers separated by commas or new lines
              </p>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAssignByTickets}
                  disabled={loading || !ticketNumbers.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Assigning...' : 'Assign Wristbands'}
                </button>
              </div>
            </div>
          )}

          {assignmentMethod === 'upload' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Upload Series-Specific Wristbands</h4>
                <p className="text-xs text-blue-700">
                  Upload wristbands that belong ONLY to this series. These will be created as new wristbands 
                  owned by the main event but assigned exclusively to this series.
                </p>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="series-csv-upload"
                />
                <label
                  htmlFor="series-csv-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {csvFile ? csvFile.name : 'Click to upload CSV'}
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    CSV must contain NFC ID/Ticket Number column
                  </span>
                </label>
              </div>

              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Required CSV Format:</p>
                <code className="text-xs text-gray-600 block">
                  NFC ID, Category<br />
                  ABC123, VIP<br />
                  DEF456, General
                </code>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCsvUpload}
                  disabled={loading || !csvFile}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Uploading...' : 'Upload & Assign to Series'}
                </button>
              </div>
            </div>
          )}

          {/* Assigned Wristbands Summary */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center">
                <Users size={16} className="mr-2" />
                Currently Assigned Wristbands
              </h3>
              {assignedWristbands.length > 0 && (
                <button
                  onClick={() => setShowAssignedList(!showAssignedList)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showAssignedList ? 'Hide Details' : 'View Details'}
                </button>
              )}
            </div>
            
            {assignedWristbands.length > 0 ? (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-600">
                    {assignedWristbands.length}
                  </p>
                  <p className="text-sm text-gray-600">wristbands assigned to this series</p>
                </div>

                {showAssignedList && (
                  <div className="border rounded-lg">
                    <div className="p-3 bg-gray-50 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search by NFC ID or category..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredWristbands.length > 0 ? (
                        filteredWristbands.map((wristband) => (
                          <div
                            key={wristband.id}
                            className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-gray-50"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{wristband.nfc_id}</p>
                              <p className="text-xs text-gray-500">
                                {wristband.category} • {wristband.status}
                              </p>
                            </div>
                            <button
                              onClick={() => handleUnassignWristband(wristband.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Remove from series"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-gray-500">
                          No wristbands match your search
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-500">No wristbands assigned yet</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
