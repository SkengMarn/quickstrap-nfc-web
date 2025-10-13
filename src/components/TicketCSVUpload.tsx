import React, { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../services/supabase';

interface TicketData {
  ticket_id: string;
  category: string;
  holder_name?: string;
  purchaser_email?: string;
  holder_phone?: string;
  price_paid?: number;
  ticket_barcode?: string;
  order_number?: string;
  purchase_date?: string;
  seat_number?: string;
  team_name?: string;
  checked_in?: string;
  [key: string]: any; // Allow any additional fields
}

interface TicketCSVUploadProps {
  eventId: string;
  onUploadComplete: () => void;
  onClose: () => void;
}

const TicketCSVUpload: React.FC<TicketCSVUploadProps> = ({
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): TicketData[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Create a mapping of common field names to our expected format
    const fieldMapping: { [key: string]: string } = {
      // Primary ticket identifier fields
      'ticket_number': 'ticket_id',
      'ticket number': 'ticket_id',
      'ticket_id': 'ticket_id',
      'ticketnumber': 'ticket_id',
      'ticket barcode': 'ticket_barcode',
      'ticketbarcode': 'ticket_barcode',
      
      // Category/Type fields
      'ticket_category': 'category',
      'ticket category': 'category',
      'ticket type': 'category',
      'tickettype': 'category',
      'category': 'category',
      'type': 'category',
      
      // Holder/Purchaser information
      'holder_name': 'holder_name',
      'holder name': 'holder_name',
      'purchaser_name': 'holder_name',
      'purchaser name': 'holder_name',
      'name': 'holder_name',
      
      'holder_email': 'purchaser_email',
      'holder email': 'purchaser_email',
      'purchaser_email': 'purchaser_email',
      'purchaser email': 'purchaser_email',
      'email': 'purchaser_email',
      
      'holder_phone': 'holder_phone',
      'holder phone': 'holder_phone',
      'phone': 'holder_phone',
      'phone_number': 'holder_phone',
      
      // Optional fields
      'price paid': 'price_paid',
      'pricepaid': 'price_paid',
      'price': 'price_paid',
      'order number': 'order_number',
      'ordernumber': 'order_number',
      'purchase date': 'purchase_date',
      'purchasedate': 'purchase_date',
      'seat number': 'seat_number',
      'seatnumber': 'seat_number',
      'teamname': 'team_name',
      'team name': 'team_name',
      'checked in': 'checked_in',
      'checkedin': 'checked_in'
    };
    
    // Map headers to our field names
    const mappedHeaders = headers.map(h => {
      const normalized = h.toLowerCase().trim();
      return fieldMapping[normalized] || normalized.replace(/\s+/g, '_');
    });
    
    // Check if we have at least one identifier field
    const hasTicketId = mappedHeaders.includes('ticket_id') || mappedHeaders.includes('ticket_barcode');
    if (!hasTicketId) {
      throw new Error('CSV must contain at least one ticket identifier field (Ticket Number, Ticket ID, or Ticket Barcode)');
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

      // Use ticket_id or ticket_barcode as the primary identifier
      if (!ticket.ticket_id && ticket.ticket_barcode) {
        ticket.ticket_id = ticket.ticket_barcode;
      }
      
      // Validate required fields
      if (!ticket.ticket_id) {
        errors.push(`Row ${i + 1}: Missing ticket identifier`);
        continue;
      }
      
      // Set default category if missing
      if (!ticket.category) {
        ticket.category = 'General';
      }
      
      // Convert price to number if present
      if (ticket.price_paid) {
        const price = parseFloat(ticket.price_paid.toString().replace(/[^\d.-]/g, ''));
        if (!isNaN(price)) {
          ticket.price_paid = price;
        }
      }

      tickets.push(ticket as TicketData);
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
    }

    return tickets;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    processFile(selectedFile);
  };

  const processFile = (selectedFile: File) => {
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
        setPreviewData(parsedData.slice(0, 5)); // Show first 5 rows
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to parse CSV');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      processFile(droppedFile);
    }
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

          // Convert parsed data to tickets format for the database
          const ticketRecords = tickets.map(ticket => ({
            event_id: eventId,
            ticket_number: ticket.ticket_id,
            ticket_category: ticket.category,
            holder_name: ticket.holder_name || null,
            holder_email: ticket.purchaser_email || null,
            holder_phone: ticket.holder_phone || null,
            status: 'unused'
          }));

          // Insert tickets into database
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
          
          // Handle specific error types
          let errorMsg = 'Upload failed';
          if (error && typeof error === 'object' && 'code' in error) {
            switch (error.code) {
              case '23505':
                errorMsg = 'Duplicate ticket numbers detected. Some tickets already exist in the system. Please check your data or remove duplicates.';
                break;
              case '23502':
                errorMsg = 'Missing required fields. Please ensure all required columns are present.';
                break;
              case '23503':
                errorMsg = 'Invalid event reference. Please check the event ID.';
                break;
              default:
                errorMsg = (error as any).message || 'Database error occurred during upload';
            }
          } else if (error instanceof Error) {
            errorMsg = error.message;
          }
          
          setErrorMessage(errorMsg);
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
44932055,DIE HARD,Selector Jay,selectorj@gmail.com,+256772443657
44960573,DIE HARD,Aminah Nalubega,aminahnlbg@gmail.com,+256741741789
44982011,DIE HARD,stephen ruhinda,stephenruhinda@gmail.com,+256780527960
44991434,DIE HARD,Moses Moses,namaramss@yahoo.co.uk,+13014672967
44991435,VIP,Sample User,sample@example.com,+256700000000`;

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
          <h2 className="text-xl font-semibold text-gray-900">Upload Tickets CSV</h2>
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
                  Download our CSV template or use your existing ticketing system export. 
                  Supports common formats from Quicket, Eventbrite, and other platforms.
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
            <h3 className="text-sm font-medium text-gray-800 mb-2">Supported CSV Fields</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <strong>Required:</strong> ticket_number (or Ticket Number/ID)
              </div>
              <div>
                <strong>Required:</strong> ticket_category (or Ticket Type)
              </div>
              <div>
                <strong>Optional:</strong> holder_name, holder_email, holder_phone
              </div>
              <div>
                <strong>Optional:</strong> Purchase Date, Seat Number, Order Number
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              The system automatically maps field names like "ticket_number" or "Ticket Number" to the correct format.
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div 
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
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
                <p className="text-xs text-gray-500">CSV files only</p>
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
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.ticket_id}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.category}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.holder_name || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{ticket.purchaser_email || '-'}</td>
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

export default TicketCSVUpload;
