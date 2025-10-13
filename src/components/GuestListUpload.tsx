import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X, Users } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../services/supabase';

interface TicketData {
  ticket_number: string;
  ticket_category: string;
  holder_name?: string;
  holder_email?: string;
  holder_phone?: string;
  [key: string]: any;
}

interface GuestListUploadProps {
  eventId: string;
  onUploadComplete: () => void;
  onClose: () => void;
}

const GuestListUpload: React.FC<GuestListUploadProps> = ({
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

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const parseCSV = (csvText: string): TicketData[] => {
    // Use papaparse for RFC 4180 compliant CSV parsing
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim()
    });

    if (parseResult.errors.length > 0) {
      const errorMessages = parseResult.errors.map(err =>
        `Row ${err.row}: ${err.message}`
      ).join('; ');
      throw new Error(`CSV parsing errors: ${errorMessages}`);
    }

    const rawData = parseResult.data as any[];
    const headers = (parseResult.meta as any).fields || [];
    
    // Field mapping for common ticketing platforms
    const fieldMapping: { [key: string]: string } = {
      'ticket number': 'ticket_number',
      'ticket_number': 'ticket_number',
      'ticketnumber': 'ticket_number',
      'ticket id': 'ticket_number',
      'ticket_id': 'ticket_number',
      'ticket barcode': 'ticket_number',
      'barcode': 'ticket_number',
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
      'attendee name': 'holder_name',
      'first name': 'first_name',
      'firstname': 'first_name',
      'last name': 'last_name',
      'lastname': 'last_name',
      'surname': 'last_name',
      'holder email': 'holder_email',
      'holder_email': 'holder_email',
      'email': 'holder_email',
      'email address': 'holder_email',
      'purchaser email': 'holder_email',
      'holder phone': 'holder_phone',
      'holder_phone': 'holder_phone',
      'phone': 'holder_phone',
      'phone number': 'holder_phone',
      'cellphone': 'holder_phone'
    };
    
    // Create a mapping from CSV headers to our field names
    const headerMapping: { [key: string]: string } = {};
    headers.forEach((header: string) => {
      const normalized = header.toLowerCase().trim();
      headerMapping[header] = fieldMapping[normalized] || normalized.replace(/\s+/g, '_');
    });

    // Validate required fields exist in headers
    const mappedHeaders = Object.values(headerMapping);
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

    // Process each row from papaparse output
    rawData.forEach((row, index) => {
      const ticket: any = {};

      // Map CSV fields to our field names
      Object.keys(row).forEach(originalHeader => {
        const mappedHeader = headerMapping[originalHeader];
        ticket[mappedHeader] = row[originalHeader] || '';
      });

      // Combine first and last name if needed
      if (!ticket.holder_name && (ticket.first_name || ticket.last_name)) {
        const firstName = ticket.first_name || '';
        const lastName = ticket.last_name || '';
        ticket.holder_name = `${firstName} ${lastName}`.trim();
      }

      // Validate required fields
      if (!ticket.ticket_number) {
        errors.push(`Row ${index + 2}: Missing ticket number`);
        return;
      }
      if (!ticket.ticket_category) {
        errors.push(`Row ${index + 2}: Missing ticket category`);
        return;
      }

      tickets.push(ticket as TicketData);
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    return tickets;
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMessage('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    setErrorMessage('');
    setUploadStatus('idle');
    setValidationErrors([]);

    // Parse and preview the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const tickets = parseCSV(csvText);
        setPreviewData(tickets.slice(0, 5)); // Show first 5 for preview
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV file');
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

    setIsUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const csvText = e.target?.result as string;
          const tickets = parseCSV(csvText);

          if (validationErrors.length > 0) {
            setErrorMessage('Please fix validation errors before uploading');
            setIsUploading(false);
            return;
          }

          // Store ticket data in tickets table
          const ticketRecords = tickets.map(ticket => ({
            event_id: eventId,
            ticket_number: ticket.ticket_number,
            ticket_category: ticket.ticket_category,
            holder_name: ticket.holder_name || null,
            holder_email: ticket.holder_email || null,
            holder_phone: ticket.holder_phone || null
            // status defaults to 'unused' in database
          }));

          // Insert ticket records
          const { error } = await supabase
            .from('tickets')
            .insert(ticketRecords);

          if (error) {
            throw error;
          }

          setUploadStatus('success');
          setTimeout(() => {
            onUploadComplete();
            onClose();
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
    const template = `ticket_number,ticket_category,holder_name,holder_email,holder_phone
TICKET001,VIP,John Smith,john@example.com,+256700000000
TICKET002,REGULAR,Jane Doe,jane@example.com,+256700000001
TICKET003,STAFF,Bob Johnson,bob@company.com,+256700000002
TICKET004,PRESS,Alice Brown,alice@media.com,+256700000003
TICKET005,VIP,Charlie Wilson,charlie@example.com,+256700000004`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guest_list_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Upload Guest List</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Ticket Upload</h3>
            <p className="text-sm text-blue-600">Upload your tickets from ticketing platforms (Quicket, Eventbrite, etc.). These tickets will be stored in your tickets table and can be linked to wristbands later.</p>
          </div>

          {/* Template Download */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-800">Need a template?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Download our template or use exports from your ticketing platform.
                </p>
              </div>
              <button
                onClick={downloadTemplate}
                className="btn btn-secondary"
              >
                <Download className="h-4 w-4 mr-2" />
                Template
              </button>
            </div>
          </div>

          {/* Required Fields */}
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
              Select Guest List CSV
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
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500"
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
                <p className={`text-xs ${isDragOver ? 'text-blue-600' : 'text-gray-500'}`}>
                  {isDragOver ? 'Drop your CSV file here' : 'CSV files from ticketing platforms'}
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
                  <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewData.length > 0 && validationErrors.length === 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Preview (first 5 tickets)</h3>
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Ticket Number</th>
                      <th>Category</th>
                      <th>Holder Name</th>
                      <th>Holder Email</th>
                      <th>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((ticket, index) => (
                      <tr key={index}>
                        <td>{ticket.ticket_number}</td>
                        <td>{ticket.ticket_category}</td>
                        <td>{ticket.holder_name || '—'}</td>
                        <td>{ticket.holder_email || '—'}</td>
                        <td>{ticket.holder_phone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
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

          {uploadStatus === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">Success!</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Tickets uploaded successfully. You can now link wristbands to tickets.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
          <button onClick={onClose} className="btn btn-secondary">
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
              'Upload Tickets'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestListUpload;
