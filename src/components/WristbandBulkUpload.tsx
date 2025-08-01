import { useState, useRef } from 'react';
import { Button, Card, Alert, Spinner } from 'react-bootstrap';
import { supabase } from '../services/supabase';
import { toast } from 'react-toastify';

type WristbandCSV = { nfc_id: string; category: string };

interface WristbandBulkUploadProps {
  eventId: string;
  onUploadComplete?: () => void;
  className?: string;
}

export const WristbandBulkUpload = ({ eventId, onUploadComplete, className }: WristbandBulkUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/wristbands_template.csv';
    link.download = 'wristbands_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSV = (text: string): WristbandCSV[] => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nfcIdIndex = headers.findIndex(h => h === 'nfc_id');
    const categoryIndex = headers.findIndex(h => h === 'category');

    if (nfcIdIndex === -1 || categoryIndex === -1) {
      throw new Error('Invalid CSV format. Must contain nfc_id and category columns');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return { nfc_id: values[nfcIdIndex], category: values[categoryIndex] };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const text = await file.text();
      const wristbands = parseCSV(text);
      
      if (wristbands.length === 0) {
        throw new Error('No valid wristbands found in the file');
      }

      const wristbandsData = wristbands.map(wristband => ({
        ...wristband,
        event_id: eventId,
        is_active: true
      }));

      const { error: insertError } = await supabase
        .from('wristbands')
        .insert(wristbandsData);

      if (insertError) throw insertError;

      toast.success(`Successfully uploaded ${wristbands.length} wristbands`);
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      console.error('Error uploading wristbands:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload wristbands');
      toast.error('Failed to upload wristbands');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Card className={`mb-4 ${className || ''}`}>
      <Card.Header>Bulk Upload Wristbands</Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="mb-3">
          <p>Download the template, fill in your wristband details, and upload the CSV file.</p>
          <div className="d-flex gap-2">
            <Button variant="outline-primary" onClick={downloadTemplate} disabled={isUploading}>
              Download Template
            </Button>
            <Button variant="primary" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              {isUploading ? <Spinner size="sm" className="me-2" /> : null}
              {isUploading ? 'Uploading...' : 'Upload CSV'}
            </Button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="d-none" />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default WristbandBulkUpload;
