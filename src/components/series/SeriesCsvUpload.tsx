import { useState } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import eventSeriesService from '../../services/eventSeriesService';

interface SeriesCsvUploadProps {
  eventId: string;
  organizationId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SeriesCsvUpload({ eventId, organizationId, onClose, onSuccess }: SeriesCsvUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const downloadTemplate = () => {
    const template = `name,description,start_date,end_date,sequence_number,series_type
Matchday 1,Opening match,2025-01-15 19:00,2025-01-15 21:00,1,standard
Matchday 2,Second round,2025-01-22 19:00,2025-01-22 21:00,2,standard
Semi-Final 1,First semi-final,2025-02-01 18:00,2025-02-01 20:00,3,knockout
Semi-Final 2,Second semi-final,2025-02-02 18:00,2025-02-02 20:00,4,knockout
Final,Championship final,2025-02-10 20:00,2025-02-10 22:30,5,knockout`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'series_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);

    // Preview the file
    const text = await selectedFile.text();
    try {
      const parsedSeries = eventSeriesService.parseCsvForSeries(text);
      setPreview(parsedSeries.slice(0, 5)); // Show first 5 rows
    } catch (error: any) {
      toast.error(error.message || 'Failed to parse CSV file');
      setFile(null);
      setPreview([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setLoading(true);

    try {
      const text = await file.text();
      const parsedSeries = eventSeriesService.parseCsvForSeries(text);

      // Add organization_id to each series
      const seriesWithOrg = parsedSeries.map(s => ({
        ...s,
        organization_id: organizationId
      }));

      const { data, error } = await eventSeriesService.bulkCreateSeries(eventId, seriesWithOrg);

      if (error) {
        throw error;
      }

      toast.success(`Successfully created ${data?.length || 0} series`);
      onSuccess();
    } catch (error: any) {
      console.error('Error uploading series:', error);
      toast.error(error.message || 'Failed to upload series');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Series via CSV</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-200 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-2">CSV Format Requirements:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>name</strong> (required): Series name</li>
                  <li><strong>description</strong> (optional): Series description</li>
                  <li><strong>start_date</strong> (required): Format: YYYY-MM-DD HH:MM</li>
                  <li><strong>end_date</strong> (required): Format: YYYY-MM-DD HH:MM</li>
                  <li><strong>sequence_number</strong> (optional): Numeric value for ordering</li>
                  <li><strong>series_type</strong> (optional): standard, knockout, group_stage, or custom</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Download Template */}
          <div className="flex justify-center">
            <button
              onClick={downloadTemplate}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download size={16} className="mr-2" />
              Download CSV Template
            </button>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <div className="flex items-center space-x-4">
              <label className="flex-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-400 transition-colors">
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="text-sm text-gray-600">
                    {file ? (
                      <span className="font-medium text-blue-600">{file.name}</span>
                    ) : (
                      <>
                        <span className="font-medium text-blue-600 hover:text-blue-500">
                          Click to upload
                        </span>
                        <span> or drag and drop</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">CSV file only</p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Preview (first 5 rows)
              </h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Start Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        End Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Sequence
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((series, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-sm text-gray-900">{series.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {new Date(series.start_date).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {new Date(series.end_date).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {series.sequence_number || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {series.series_type || 'standard'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              onClick={handleUpload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || !file}
            >
              {loading ? 'Uploading...' : `Upload ${preview.length} Series`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
