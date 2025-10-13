import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, Ticket } from 'lucide-react';
import { supabase } from '../services/supabase';

interface TicketData {
  ticket_number: string;
  ticket_category: string;
  holder_name?: string;
  holder_email?: string;
  holder_phone?: string;
  [key: string]: any;
}

interface TicketUploadProps {
  eventId: string;
  onUploadComplete: () => void;
  onClose: () => void;
}

const TicketUpload: React.FC<TicketUploadProps> = ({
  eventId,
  onUploadComplete,
  onClose
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewData, setPreviewData] = useState<TicketData[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef<boolean>(true);

  // Track component mount state to prevent setState on unmounted component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const parseCSV = (csvText: string): TicketData[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Create a mapping of common field names to our expected format
    const fieldMapping: { [key: string]: string } = {
      'ticket number': 'ticket_number',
      'ticket_number': 'ticket_number',
      'ticketnumber': 'ticket_number',
      'ticket id': 'ticket_number',
      'ticket_id': 'ticket_number',
      'ticket category': 'ticket_category',
      'ticket_category': 'ticket_category',
      'category': 'ticket_category',
      'ticket type': 'ticket_category',
      'ticket_type': 'ticket_category',
      'type': 'ticket_category',
      'holder name': 'holder_name',
      'holder_name': 'holder_name',
      'full name': 'holder_name',
      'full_name': 'holder_name',
      'name': 'holder_name',
      'holder email': 'holder_email',
      'holder_email': 'holder_email',
      'email': 'holder_email',
      'purchaser email': 'holder_email',
      'purchaser_email': 'holder_email',
      'holder phone': 'holder_phone',
      'holder_phone': 'holder_phone',
      'phone': 'holder_phone',
      'cellphone': 'holder_phone'
    };
    
    // Map headers to our field names
    const mappedHeaders = headers.map(h => {
      const normalized = h.toLowerCase().trim();
      return fieldMapping[normalized] || normalized.replace(/\s+/g, '_');
    });
    
    // Check if we have required fields
    const hasTicketNumber = mappedHeaders.includes('ticket_number');
    const hasTicketCategory = mappedHeaders.includes('ticket_category');
    
    if (!hasTicketNumber) {
      throw new Error('CSV must contain a "ticket_number" or "Ticket Number" column');
    }
    if (!hasTicketCategory) {
      throw new Error('CSV must contain a "ticket_category" or "Ticket Category" column');
    }

    const tickets: TicketData[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, '')); // Remove quotes
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }

      const ticket: any = {};
      mappedHeaders.forEach((header, index) => {
        ticket[header] = values[index];
      });

      // Validate required fields
      if (!ticket.ticket_number) {
        errors.push(`Row ${i + 1}: Missing ticket number`);
        continue;
      }
      
      if (!ticket.ticket_category) {
        errors.push(`Row ${i + 1}: Missing ticket category`);
        continue;
      }
      
      // Status is managed by database triggers, not uploaded

      tickets.push(ticket as TicketData);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    return tickets;
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      if (isMountedRef.current) {
        setErrorMessage('Please select a CSV file');
      }
      return;
    }

    if (isMountedRef.current) {
      setFile(selectedFile);
      setUploadStatus('idle');
      setErrorMessage('');
      setValidationErrors([]);
    }

    // Preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!isMountedRef.current) return; // Prevent setState on unmounted component

      try {
        const csvText = e.target?.result as string;
        const parsedData = parseCSV(csvText);
        setPreviewData(parsedData.slice(0, 5)); // Show first 5 rows
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const csvFile = files.find(file => file.name.endsWith('.csv'));
    
    if (!csvFile) {
      setErrorMessage('Please drop a CSV file');
      return;
    }

    if (files.length > 1) {
      setErrorMessage('Please drop only one file at a time');
      return;
    }

    processFile(csvFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    if (isMountedRef.current) {
      setIsUploading(true);
      setUploadStatus('idle');
      setErrorMessage('');
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!isMountedRef.current) return; // Prevent setState on unmounted component

        try {
          const csvText = e.target?.result as string;
          const tickets = parseCSV(csvText);

          if (validationErrors.length > 0) {
            if (isMountedRef.current) {
              setErrorMessage('Please fix validation errors before uploading');
              setIsUploading(false);
            }
            return;
          }

          // Convert tickets to database format
          const ticketRecords = tickets.map(ticket => ({
            event_id: eventId,
            ticket_number: ticket.ticket_number,
            ticket_category: ticket.ticket_category,
            holder_name: ticket.holder_name || null,
            holder_email: ticket.holder_email || null,
            holder_phone: ticket.holder_phone || null
            // status defaults to 'unused' in database
          }));

          // Insert tickets into database
          const { error } = await supabase
            .from('tickets')
            .insert(ticketRecords);

          if (error) {
            throw error;
          }

          if (isMountedRef.current) {
            setUploadStatus('success');
            setTimeout(() => {
              if (isMountedRef.current) {
                onUploadComplete();
                onClose();
              }
            }, 2000);
          }

        } catch (error) {
          console.error('Upload error:', error);
          if (isMountedRef.current) {
            setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
            setUploadStatus('error');
          }
        } finally {
          if (isMountedRef.current) {
            setIsUploading(false);
          }
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('File read error:', error);
      if (isMountedRef.current) {
        setErrorMessage('Failed to read file');
        setUploadStatus('error');
        setIsUploading(false);
      }
    }
  };

  const downloadTemplate = () => {
    const template = `ticket_number,ticket_category,holder_name,holder_email,holder_phone
TICKET001,VIP,John Doe,john@example.com,+256700000000
TICKET002,REGULAR,Jane Smith,jane@example.com,+256700000001
TICKET003,STAFF,Staff Member,staff@company.com,+256700000002`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tickets_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <Ticket className="h-6 w-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Upload Tickets CSV</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-800">Need a template?</h3>
                <p className="text-sm text-blue-600 mt-1">
                  Download our CSV template with the correct format for ticket uploads.
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
              >
                <Download size={16} className="mr-2" />
                Download Template
              </button>
            </div>
          </div>

          {/* Supported Fields Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Required CSV Fields</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <strong>Required:</strong> ticket_number, ticket_category
              </div>
              <div>
                <strong>Optional:</strong> holder_name, holder_email, holder_phone
              </div>
              <div>
                <strong>Note:</strong> Status is automatically set to 'unused'
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The system automatically maps common field names from different ticketing platforms.
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div 
              className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                isDragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <Upload className={`mx-auto h-12 w-12 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
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
                <p className={`text-xs ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
                  {isDragOver ? 'Drop your CSV file here' : 'CSV files only'}
                </p>
              </div>
            </div>
            {file && (
              <p className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Validation Errors
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {validationErrors.length > 10 && (
                        <li>... and {validationErrors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && validationErrors.length === 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Preview (first 5 rows)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Ticket Number
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Holder Name
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Phone
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewData.map((ticket, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.ticket_number}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.ticket_category}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.holder_name || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.holder_email || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.holder_phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success!</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Tickets have been uploaded successfully.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || isUploading || validationErrors.length > 0}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                Uploading...
              </>
            ) : (
              'Upload Tickets'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketUpload;
