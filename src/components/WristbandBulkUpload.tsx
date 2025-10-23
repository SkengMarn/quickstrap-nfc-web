import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, CreditCard } from 'lucide-react';
import { supabase } from '../services/supabase';

interface WristbandData {
  nfc_id: string;
  category: string;
}

interface WristbandBulkUploadProps {
  eventId: string;
  eventName?: string;
  seriesId?: string;
  isSeries?: boolean;
  onUploadComplete?: () => void;
  onClose?: () => void;
  className?: string;
}

const WristbandBulkUpload: React.FC<WristbandBulkUploadProps> = ({ 
  eventId, 
  eventName,
  seriesId,
  isSeries = false,
  onUploadComplete, 
  onClose,
  className 
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewData, setPreviewData] = useState<WristbandData[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [totalWristbands, setTotalWristbands] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const parseCSV = (csvText: string): WristbandData[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Field mapping for wristband data
    const fieldMapping: { [key: string]: string } = {
      'nfc id': 'nfc_id',
      'nfc_id': 'nfc_id',
      'nfcid': 'nfc_id',
      'wristband id': 'nfc_id',
      'wristband_id': 'nfc_id',
      'id': 'nfc_id',
      'category': 'category',
      'type': 'category',
      'access_level': 'category',
      'access level': 'category'
    };
    
    const mappedHeaders = headers.map(h => {
      const normalized = h.toLowerCase().trim();
      return fieldMapping[normalized] || normalized.replace(/\s+/g, '_');
    });
    
    // Validate required fields
    const hasNfcId = mappedHeaders.includes('nfc_id');
    
    if (!hasNfcId) {
      throw new Error('CSV must contain NFC ID field (NFC ID, Wristband ID, or ID)');
    }

    const wristbands: WristbandData[] = [];
    const errors: string[] = [];
    const seenIds = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`);
        continue;
      }

      const wristband: any = {};
      mappedHeaders.forEach((header, index) => {
        wristband[header] = values[index];
      });

      // Validate required fields
      if (!wristband.nfc_id) {
        errors.push(`Row ${i + 1}: Missing NFC ID`);
        continue;
      }

      // Check for duplicates
      if (seenIds.has(wristband.nfc_id)) {
        errors.push(`Row ${i + 1}: Duplicate NFC ID ${wristband.nfc_id}`);
        continue;
      }
      seenIds.add(wristband.nfc_id);
      
      // Set defaults
      if (!wristband.category) {
        wristband.category = 'General';
      }

      wristbands.push(wristband as WristbandData);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    return wristbands;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMessage('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setUploadStatus('idle');
    setErrorMessage('');
    setValidationErrors([]);

    // Preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const parsedData = parseCSV(csvText);
        setPreviewData(parsedData.slice(0, 5));
        setTotalWristbands(parsedData.length);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV');
        setTotalWristbands(0);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          const wristbands = parseCSV(csvText);

          if (validationErrors.length > 0) {
            setErrorMessage('Please fix validation errors before uploading');
            setIsUploading(false);
            return;
          }

          // Store wristband inventory (only fields that exist in schema)
          // For series events: event_id = parent event ID, series_id = series ID
          // For regular events: event_id = event ID, series_id = null
          const wristbandRecords = wristbands.map(wb => {
            const record: any = {
              event_id: eventId, // Always the parent event ID (from events table)
              nfc_id: wb.nfc_id,
              category: wb.category || 'General',
              is_active: true
            };
            
            // If this is a series event, set the series_id field
            if (isSeries && seriesId) {
              record.series_id = seriesId; // Series ID (from event_series table)
            }
            
            return record;
          });

          // Insert wristband records
          const { error } = await supabase
            .from('wristbands')
            .insert(wristbandRecords);

          if (error) {
            // Handle duplicate NFC ID error with a friendly message
            if (error.code === '23505' && error.message.includes('nfc_id')) {
              const match = error.details?.match(/Key \(nfc_id\)=\(([^)]+)\)/);
              const duplicateId = match ? match[1] : 'unknown';
              throw new Error(`Duplicate NFC ID found: "${duplicateId}" already exists in the database. Please remove duplicates from your CSV or check if these wristbands were already uploaded.`);
            }
            // Handle foreign key constraint error
            if (error.code === '23503' && error.message.includes('event_id')) {
              throw new Error(`Invalid event reference. This event may not exist or you may not have permission to add wristbands to it.`);
            }
            throw error;
          }

          setUploadStatus('success');
          setTimeout(() => {
            onUploadComplete?.();
            onClose?.();
          }, 2000);

        } catch (error) {
          console.error('Upload error:', error);
          setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
          setUploadStatus('error');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File read error:', error);
      setErrorMessage('Failed to read file');
      setUploadStatus('error');
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `NFC ID,Category
NFC001,VIP
NFC002,General
NFC003,Staff
NFC004,Press
NFC005,VIP
NFC006,General
NFC007,Staff
NFC008,VIP
NFC009,General
NFC010,Staff`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wristband_inventory_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-800">Wristband Inventory Upload</h3>
              {eventName && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {eventName}
                </span>
              )}
            </div>
            <p className="text-sm text-purple-600 mb-2">
              Upload your physical wristband inventory with NFC IDs. These are the actual wristbands 
              you'll distribute to guests {isSeries ? 'for this series event' : 'at the event'}{eventName ? ` "${eventName}"` : ''}.
            </p>
            <div className="text-xs text-purple-700 bg-purple-100 rounded px-3 py-2">
              <strong>Simple Format:</strong> Only 2 columns required - <code className="bg-purple-200 px-1 rounded">NFC ID</code> and <code className="bg-purple-200 px-1 rounded">Category</code>
            </div>
          </div>

      {/* Template Download & Required Fields - Compact Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-800">Need a template?</h3>
              <p className="text-xs text-gray-600 mt-1">Download template to format data</p>
            </div>
            <button onClick={downloadTemplate} className="btn btn-secondary text-xs px-3 py-1">
              <Download className="h-3 w-3 mr-1" />
              Template
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-medium text-gray-800 mb-1">Required Fields</h3>
          <div className="text-xs text-gray-600">
            <div><strong>NFC ID:</strong> Required</div>
            <div><strong>Category:</strong> Optional (defaults to "General")</div>
          </div>
        </div>
      </div>

      {/* File Upload - Compact */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Wristband Inventory CSV
        </label>
        <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
          <div className="space-y-1 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500"
              >
                <span>Upload CSV file</span>
                <input
                  id="file-upload"
                  ref={fileInputRef}
                  name="file-upload"
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">CSV file with wristband NFC IDs</p>
          </div>
        </div>
        {file && (
          <div className="mt-2 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Selected: <span className="font-medium">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
              </p>
              {totalWristbands > 0 && (
                <p className="text-xs text-purple-600 font-medium mt-1">
                  📦 {totalWristbands} wristband{totalWristbands !== 1 ? 's' : ''} ready to upload
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setFile(null);
                setPreviewData([]);
                setValidationErrors([]);
                setErrorMessage('');
                setTotalWristbands(0);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-gray-400 hover:text-red-600 transition-colors ml-3"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Validation Errors - Compact */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
            <div className="ml-2">
              <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
              <div className="mt-1 text-xs text-red-700 max-h-20 overflow-y-auto">
                <ul className="list-disc pl-4 space-y-0.5">
                  {validationErrors.slice(0, 5).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {validationErrors.length > 5 && (
                    <li>... and {validationErrors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview - Compact */}
      {previewData.length > 0 && validationErrors.length === 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview (first 5 wristbands)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">NFC ID</th>
                  <th className="px-3 py-2 text-left font-semibold">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {previewData.slice(0, 5).map((wb, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-blue-600">{wb.nfc_id}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        {wb.category}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 5 && (
              <p className="text-xs text-gray-500 mt-2">
                ... and {previewData.length - 5} more wristbands
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error/Success Messages - Compact */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
            <div className="ml-2">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-xs text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex">
            <CheckCircle className="h-4 w-4 text-green-400 mt-0.5" />
            <div className="ml-2">
              <h3 className="text-sm font-medium text-green-800">Success!</h3>
              <p className="mt-1 text-xs text-green-700">
                {totalWristbands} wristband{totalWristbands !== 1 ? 's' : ''} uploaded successfully.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions - Compact */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t">
        <button onClick={() => onClose?.()} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleUpload}
          disabled={!file || isUploading || validationErrors.length > 0}
          className="btn btn-primary"
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
              Uploading...
            </>
          ) : (
            'Upload Wristbands'
          )}
        </button>
      </div>
    </div>
  );
};

export default WristbandBulkUpload;
