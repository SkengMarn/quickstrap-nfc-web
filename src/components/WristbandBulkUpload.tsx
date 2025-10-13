import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, CreditCard } from 'lucide-react';
import { supabase } from '../services/supabase';

interface WristbandData {
  nfc_id: string;
  wristband_number?: string;
  category: string;
  color?: string;
  batch_number?: string;
  [key: string]: any;
}

interface WristbandBulkUploadProps {
  eventId: string;
  eventName?: string;
  onUploadComplete?: () => void;
  onClose?: () => void;
  className?: string;
}

const WristbandBulkUpload: React.FC<WristbandBulkUploadProps> = ({ 
  eventId, 
  eventName,
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
      'wristband number': 'wristband_number',
      'wristband_number': 'wristband_number',
      'number': 'wristband_number',
      'category': 'category',
      'type': 'category',
      'access_level': 'category',
      'color': 'color',
      'batch': 'batch_number',
      'batch_number': 'batch_number',
      'batch number': 'batch_number'
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
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV');
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

          // Store wristband inventory
          const wristbandRecords = wristbands.map(wb => ({
            event_id: eventId,
            nfc_id: wb.nfc_id,
            wristband_number: wb.wristband_number,
            category: wb.category,
            color: wb.color,
            batch_number: wb.batch_number,
            status: 'available', // available, assigned, lost, damaged
            is_active: true,
            metadata: {
              // Store any additional fields
              ...Object.keys(wb).reduce((acc, key) => {
                if (!['nfc_id', 'wristband_number', 'category', 'color', 'batch_number'].includes(key)) {
                  acc[key] = wb[key];
                }
                return acc;
              }, {} as any)
            }
          }));

          // Insert wristband records
          const { error } = await supabase
            .from('wristbands')
            .insert(wristbandRecords);

          if (error) {
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
    const template = `NFC ID,Wristband Number,Category,Color,Batch Number
NFC001,WB001,VIP,Gold,BATCH001
NFC002,WB002,Regular,Blue,BATCH001
NFC003,WB003,Staff,Green,BATCH002
NFC004,WB004,Press,Red,BATCH002
NFC005,WB005,VIP,Gold,BATCH001`;

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
            <p className="text-sm text-purple-600">
              Upload your physical wristband inventory with NFC IDs. These are the actual wristbands 
              you'll distribute to guests at the event{eventName ? ` "${eventName}"` : ''}.
            </p>
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
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
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
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 wristbands)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">NFC ID</th>
                  <th className="px-2 py-1 text-left">Category</th>
                  <th className="px-2 py-1 text-left">Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {previewData.slice(0, 3).map((wb, index) => (
                  <tr key={index}>
                    <td className="px-2 py-1 font-mono">{wb.nfc_id}</td>
                    <td className="px-2 py-1">{wb.category}</td>
                    <td className="px-2 py-1">{wb.color || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                Wristband inventory uploaded successfully.
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
