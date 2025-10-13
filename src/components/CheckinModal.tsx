import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { X, Clock, User, MapPin, LogIn, LogOut, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';

// Status constants
const CHECKIN_STATUS = {
  SUCCESS: 'success',
  DENIED: 'denied',
  FRAUD: 'fraud',
  ERROR: 'error'
} as const;

const WRISTBAND_STATUS = {
  ACTIVATED: 'activated',
  CHECKED_IN: 'checked-in',
  INACTIVE: 'inactive',
  FLAGGED: 'flagged'
} as const;

interface Gate {
  id: string;
  name: string;
  location_description: string | null;
  status?: string;
}

interface CheckinLog {
  id: string;
  timestamp: string;
  location: string | null;
  notes: string | null;
  status: 'success' | 'denied' | 'fraud' | 'error';
  staff: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
  gate: {
    id: string;
    name: string;
    location_description: string | null;
  } | null;
}

interface CheckinModalProps {
  wristbandId: string;
  wristbandNfcId: string;
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CheckinModal({
  wristbandId,
  wristbandNfcId,
  eventId,
  isOpen,
  onClose,
  onUpdate
}: CheckinModalProps) {
  const [checkinLogs, setCheckinLogs] = useState<CheckinLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedGate, setSelectedGate] = useState<string>('');

  useEffect(() => {
    if (isOpen && eventId) {
      fetchCheckinLogs();
      fetchGates();
    }
  }, [isOpen, wristbandId, eventId]);

  const fetchCheckinLogs = async () => {
    try {
      setLoading(true);

      // First, get check-in logs
      const { data: logs, error: logsError } = await supabase
        .from('checkin_logs')
        .select('id, timestamp, location, notes, status, staff_id, gate_id')
        .eq('wristband_id', wristbandId)
        .order('timestamp', { ascending: false });

      if (logsError) throw logsError;

      // Then, fetch staff profiles and gate information
      const staffIds = [...new Set(logs?.map(log => log.staff_id).filter(Boolean) || [])];
      const gateIds = [...new Set(logs?.map(log => log.gate_id).filter(Boolean) || [])];

      const results = await Promise.allSettled([
        staffIds.length > 0
          ? supabase.from('profiles').select('id, email, full_name').in('id', staffIds)
          : Promise.resolve({ data: [] }),
        gateIds.length > 0
          ? supabase.from('gates').select('id, name, location_description').in('id', gateIds)
          : Promise.resolve({ data: [] })
      ]);

      const staffResult = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
      const gateResult = results[1].status === 'fulfilled' ? results[1].value : { data: [] };

      if (results[0].status === 'rejected') {
        console.error('Failed to fetch staff profiles:', results[0].reason);
      }
      if (results[1].status === 'rejected') {
        console.error('Failed to fetch gates:', results[1].reason);
      }

      // Map the data together
      const enrichedLogs = logs?.map(log => ({
        ...log,
        staff: log.staff_id ? staffResult.data?.find(s => s.id === log.staff_id) || null : null,
        gate: log.gate_id ? gateResult.data?.find(g => g.id === log.gate_id) || null : null
      })) || [];

      setCheckinLogs(enrichedLogs as CheckinLog[]);
    } catch (error) {
      console.error('Error fetching check-in logs:', error);
      toast.error('Failed to load check-in details');
    } finally {
      setLoading(false);
    }
  };

  const fetchGates = async () => {
    try {
      const { data, error } = await supabase
        .from('gates')
        .select('id, name, location_description')
        .eq('event_id', eventId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setGates(data || []);
      if (data && data.length > 0) {
        setSelectedGate(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching gates:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedGate) {
      toast.error('Please select a gate');
      return;
    }

    try {
      setActionLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: checkinData, error: checkinError } = await supabase
        .from('checkin_logs')
        .insert({
          event_id: eventId,
          wristband_id: wristbandId,
          staff_id: user.id,
          gate_id: selectedGate,
          timestamp: new Date().toISOString(),
          status: CHECKIN_STATUS.SUCCESS,
          notes: 'Manual check-in from portal'
        })
        .select()
        .single();

      if (checkinError) throw checkinError;

      const { error: updateError } = await supabase
        .from('wristbands')
        .update({ status: WRISTBAND_STATUS.CHECKED_IN })
        .eq('id', wristbandId);

      if (updateError) {
        console.error('Failed to update wristband status:', updateError);
        // Attempt rollback: delete the checkin log we just created
        if (checkinData?.id) {
          await supabase.from('checkin_logs').delete().eq('id', checkinData.id);
        }
        toast.error('Failed to update wristband status. Check-in rolled back.');
        throw updateError;
      }

      toast.success('Wristband checked in successfully');
      fetchCheckinLogs();
      onUpdate();
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to check in wristband');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!window.confirm('Are you sure you want to check out this wristband? This will remove all check-in records.')) {
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from('checkin_logs')
        .delete()
        .eq('wristband_id', wristbandId);

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('wristbands')
        .update({ status: WRISTBAND_STATUS.ACTIVATED })
        .eq('id', wristbandId);

      if (updateError) {
        console.error('Failed to update wristband status on checkout:', updateError);
        toast.error('Failed to update wristband status. Please refresh and try again.');
        throw updateError;
      }

      toast.success('Wristband checked out successfully');
      fetchCheckinLogs();
      onUpdate();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out wristband');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCheckedIn = checkinLogs.length > 0;
  const latestCheckin = checkinLogs[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Check-in Management</h2>
              <p className="text-xs text-gray-500">
                Wristband <span className="font-mono font-medium text-gray-700">{wristbandNfcId}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Split into two columns */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 p-6">

              {/* Left Column - Status & Actions (1/3 width) */}
              <div className="col-span-1 space-y-4">

                {/* Current Status Card */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="text-center">
                    <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                      isCheckedIn
                        ? 'bg-blue-600'
                        : 'bg-gray-400'
                    }`}>
                      {isCheckedIn ? (
                        <CheckCircle className="w-8 h-8 text-white" />
                      ) : (
                        <XCircle className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {isCheckedIn ? 'Checked In' : 'Not Checked In'}
                    </h3>
                    {isCheckedIn && latestCheckin && (
                      <p className="text-xs text-gray-500">
                        {new Date(latestCheckin.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>

                  {/* Latest Check-in Details */}
                  {isCheckedIn && latestCheckin && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">Staff</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 ml-5">
                          {latestCheckin.staff?.full_name || latestCheckin.staff?.email || 'Unknown'}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs font-medium text-gray-500">Gate</span>
                        </div>
                        <p className="text-sm font-medium text-gray-900 ml-5">
                          {latestCheckin.gate?.name || 'Unknown Gate'}
                        </p>
                        {latestCheckin.gate?.location_description && (
                          <p className="text-xs text-gray-500 ml-5 mt-0.5">
                            {latestCheckin.gate.location_description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Card */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">Actions</h4>

                  {isCheckedIn ? (
                    <button
                      onClick={handleCheckOut}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>{actionLoading ? 'Processing...' : 'Check Out'}</span>
                    </button>
                  ) : (
                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">
                          Select Gate
                        </label>
                        <select
                          value={selectedGate}
                          onChange={(e) => setSelectedGate(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        >
                          {gates.map((gate) => (
                            <option key={gate.id} value={gate.id}>
                              {gate.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={handleCheckIn}
                        disabled={actionLoading || !selectedGate}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>{actionLoading ? 'Processing...' : 'Check In Now'}</span>
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column - Check-in History (2/3 width) */}
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Check-in History</span>
                  </h3>
                  {checkinLogs.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {checkinLogs.length} {checkinLogs.length === 1 ? 'Entry' : 'Entries'}
                    </span>
                  )}
                </div>

                {checkinLogs.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                    {checkinLogs.map((log, index) => (
                      <div
                        key={log.id}
                        className={`bg-white rounded-lg border p-3 transition-all hover:border-blue-300 ${
                          index === 0 ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              log.status === 'success'
                                ? 'bg-blue-100 text-blue-700'
                                : log.status === 'denied'
                                ? 'bg-red-100 text-red-700'
                                : log.status === 'fraud'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {log.status}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-medium">
                                Latest
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-900">
                              {new Date(log.timestamp).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })} at {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-start space-x-2">
                            <User className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 mb-0.5">
                                Staff
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {log.staff?.full_name || log.staff?.email || 'Unknown'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500 mb-0.5">
                                Gate
                              </p>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {log.gate?.name || 'Unknown Gate'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {log.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500 mb-0.5">Notes</p>
                            <p className="text-sm text-gray-700">{log.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-gray-400" />
                    </div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">No Check-in History</h4>
                    <p className="text-xs text-gray-500">
                      This wristband hasn't been checked in yet
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
