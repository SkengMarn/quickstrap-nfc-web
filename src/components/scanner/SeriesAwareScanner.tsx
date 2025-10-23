import { useState, useEffect } from 'react';
import { Scan, Calendar, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useOrganization } from '../../contexts/OrganizationContext';
import eventSeriesService, { ScannableItem } from '../../services/eventSeriesService';
import { supabase } from '../../services/supabase';

interface SeriesAwareScannerProps {
  onScanComplete?: (result: any) => void;
}

export default function SeriesAwareScanner({ onScanComplete }: SeriesAwareScannerProps) {
  const { currentOrganization } = useOrganization();
  const [scannableItems, setScannableItems] = useState<ScannableItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ScannableItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanMode, setScanMode] = useState<'ready' | 'scanning' | 'processing'>('ready');
  const [nfcId, setNfcId] = useState('');
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  useEffect(() => {
    fetchScannableItems();

    // Refresh every 30 seconds to keep check-in windows up to date
    const interval = setInterval(fetchScannableItems, 30000);
    return () => clearInterval(interval);
  }, [currentOrganization]);

  const fetchScannableItems = async () => {
    setLoading(true);
    const { data, error } = await eventSeriesService.getScannableItems(currentOrganization?.id);

    if (error) {
      console.error('Error fetching scannable items:', error);
      toast.error('Failed to load available events and series');
    } else {
      setScannableItems(data || []);

      // Auto-select if only one item is available
      if (data && data.length === 1 && !selectedItem) {
        setSelectedItem(data[0]);
      }
    }
    setLoading(false);
  };

  const handleScan = async () => {
    if (!selectedItem) {
      toast.error('Please select an event or series to scan for');
      return;
    }

    if (!nfcId.trim()) {
      toast.error('Please enter a wristband ID');
      return;
    }

    setScanMode('processing');

    try {
      // 1. Find the wristband
      const { data: wristbands, error: wristbandError } = await supabase
        .from('wristbands')
        .select('*')
        .eq('nfc_id', nfcId.trim())
        .limit(1);

      if (wristbandError) throw wristbandError;

      if (!wristbands || wristbands.length === 0) {
        setLastScanResult({
          success: false,
          message: 'Wristband not found',
          reason: 'invalid_wristband'
        });
        toast.error('Wristband not found');
        return;
      }

      const wristband = wristbands[0];

      // 2. Verify access
      const verificationParams = selectedItem.item_type === 'series'
        ? { seriesId: selectedItem.item_id }
        : { eventId: selectedItem.item_id };

      const { data: verification, error: verifyError } = await eventSeriesService.verifyWristbandAccess(
        wristband.id,
        verificationParams.eventId,
        verificationParams.seriesId
      );

      if (verifyError) throw verifyError;

      if (!verification || !verification.valid) {
        setLastScanResult({
          success: false,
          message: verification?.message || 'Access denied',
          reason: verification?.reason || 'unknown',
          wristband: wristband
        });
        toast.error(verification?.message || 'Access denied');
        return;
      }

      // 3. Create check-in log
      const { data: user } = await supabase.auth.getUser();

      const checkinData: any = {
        wristband_id: wristband.id,
        staff_id: user.user?.id,
        checked_in_at: new Date().toISOString(),
        app_lat: null,
        app_lon: null,
        is_probation: false
      };

      if (selectedItem.item_type === 'series') {
        checkinData.series_id = selectedItem.item_id;
        // Get one of the events from this series for event_id
        const { data: seriesEvents } = await supabase
          .from('events')
          .select('id')
          .eq('series_id', selectedItem.item_id)
          .limit(1);

        if (seriesEvents && seriesEvents.length > 0) {
          checkinData.event_id = seriesEvents[0].id;
        }
      } else {
        checkinData.event_id = selectedItem.item_id;
      }

      const { error: checkinError } = await supabase
        .from('checkin_logs')
        .insert([checkinData]);

      if (checkinError) throw checkinError;

      // Success!
      const resultMessage = selectedItem.item_type === 'series'
        ? `Access granted to ${selectedItem.item_name} (${selectedItem.main_event_name})`
        : `Access granted to ${selectedItem.item_name}`;

      setLastScanResult({
        success: true,
        message: resultMessage,
        wristband: wristband,
        category: wristband.category,
        seriesName: selectedItem.item_type === 'series' ? selectedItem.item_name : null,
        eventName: selectedItem.main_event_name
      });

      toast.success(resultMessage, { autoClose: 3000 });

      if (onScanComplete) {
        onScanComplete({
          success: true,
          wristband,
          item: selectedItem
        });
      }

      // Clear NFC ID for next scan
      setNfcId('');

    } catch (error: any) {
      console.error('Error processing scan:', error);
      setLastScanResult({
        success: false,
        message: error.message || 'An error occurred',
        reason: 'system_error'
      });
      toast.error('Failed to process scan');
    } finally {
      setScanMode('ready');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const getTimeRemaining = (item: ScannableItem) => {
    const now = new Date();
    const windowEnd = new Date(item.window_end);
    const diffMs = windowEnd.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)} days`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`;
    } else {
      return `${diffMins} minutes`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (scannableItems.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Events or Series</h3>
        <p className="mt-1 text-sm text-gray-500">
          No events or series are currently within their check-in windows.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Event/Series Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Event or Series</h3>
        <div className="space-y-3">
          {scannableItems.map((item) => (
            <button
              key={item.item_id}
              onClick={() => setSelectedItem(item)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedItem?.item_id === item.item_id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.item_type === 'series'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.item_type === 'series' ? 'Series' : 'Event'}
                    </span>
                    <h4 className="text-sm font-semibold text-gray-900">{item.item_name}</h4>
                  </div>
                  {item.item_type === 'series' && (
                    <p className="text-xs text-gray-500 mt-1">Part of: {item.main_event_name}</p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Calendar size={12} className="mr-1" />
                      {new Date(item.start_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <Clock size={12} className="mr-1" />
                      Window closes in {getTimeRemaining(item)}
                    </div>
                  </div>
                </div>
                {selectedItem?.item_id === item.item_id && (
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scanner Interface */}
      {selectedItem && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Scan className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scan Wristband</h3>
              <p className="text-sm text-gray-500">
                Scanning for: {selectedItem.item_name}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wristband NFC ID
              </label>
              <input
                type="text"
                value={nfcId}
                onChange={(e) => setNfcId(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter or scan NFC ID"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                autoFocus
                disabled={scanMode === 'processing'}
              />
            </div>

            <button
              onClick={handleScan}
              disabled={!nfcId.trim() || scanMode === 'processing'}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scanMode === 'processing' ? 'Processing...' : 'Scan & Verify'}
            </button>
          </div>
        </div>
      )}

      {/* Last Scan Result */}
      {lastScanResult && (
        <div className={`rounded-lg border-2 p-6 ${
          lastScanResult.success
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50'
        }`}>
          <div className="flex items-start space-x-3">
            {lastScanResult.success ? (
              <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
            )}
            <div className="flex-1">
              <h4 className={`text-lg font-semibold ${
                lastScanResult.success ? 'text-green-900' : 'text-red-900'
              }`}>
                {lastScanResult.success ? 'Access Granted' : 'Access Denied'}
              </h4>
              <p className={`text-sm mt-1 ${
                lastScanResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {lastScanResult.message}
              </p>
              {lastScanResult.wristband && (
                <div className="mt-3 space-y-1 text-sm">
                  <p><span className="font-medium">NFC ID:</span> {lastScanResult.wristband.nfc_id}</p>
                  {lastScanResult.category && (
                    <p><span className="font-medium">Category:</span> {lastScanResult.category}</p>
                  )}
                  {lastScanResult.success && lastScanResult.seriesName && (
                    <p><span className="font-medium">Series:</span> {lastScanResult.seriesName}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
