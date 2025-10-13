import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { notificationService } from '../../services/notificationService';
import { Clock, MapPin, User, Zap } from 'lucide-react';

interface CheckinEvent {
  id: string;
  timestamp: string;
  wristband_id: string;
  location?: string;
  event_name?: string;
  staff_name?: string;
  status?: 'success' | 'failed' | 'duplicate';
  wristbands?: {
    nfc_id: string;
    category: string;
  };
  events?: {
    name: string;
  };
}

const LiveCheckinFeed: React.FC = () => {
  const [checkins, setCheckins] = useState<CheckinEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Fetch initial recent check-ins
    const fetchRecentCheckins = async () => {
      const { data, error } = await supabase
        .from('checkin_logs')
        .select(`
          *,
          wristbands(nfc_id, category),
          events(name)
        `)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (data && !error) {
        setCheckins(data);
      }
    };

    fetchRecentCheckins();

    // Set up real-time subscription
    const subscription = supabase
      .channel('checkin_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'checkin_logs'
        },
        async (payload) => {
          console.log('New check-in:', payload);
          const newCheckin = payload.new as CheckinEvent;
          
          setCheckins(prev => [newCheckin, ...prev.slice(0, 19)]);
          
          // Flash effect for new check-in
          const element = document.getElementById('checkin-feed');
          if (element) {
            element.classList.add('animate-pulse');
            setTimeout(() => element.classList.remove('animate-pulse'), 1000);
          }

          // Trigger notification for new check-in
          try {
            await notificationService.notifyCheckin({
              wristband_id: newCheckin.wristband_id,
              gate_name: newCheckin.location || 'Unknown Gate',
              event_id: newCheckin.event_name || 'Unknown Event',
              event_name: newCheckin.events?.name || 'Unknown Event',
              timestamp: newCheckin.timestamp,
              staff_member: newCheckin.staff_name || 'System',
              status: newCheckin.status || 'success',
              category: newCheckin.wristbands?.category || 'General'
            });
          } catch (error) {
            console.warn('Failed to send check-in notification:', error);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const checkinTime = new Date(timestamp);
    const diffMs = now.getTime() - checkinTime.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    return checkinTime.toLocaleTimeString();
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'failed': return 'text-red-600 bg-red-50';
      case 'duplicate': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'staff': return 'bg-blue-100 text-blue-800';
      case 'regular': return 'bg-gray-100 text-gray-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Live Check-in Feed</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-500">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
      
      <div id="checkin-feed" className="max-h-96 overflow-y-auto">
        {checkins.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Waiting for check-ins...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {checkins.map((checkin) => (
              <div key={checkin.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">
                        {checkin.wristbands?.nfc_id || checkin.wristband_id}
                      </span>
                      {checkin.wristbands?.category && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(checkin.wristbands.category)}`}>
                          {checkin.wristbands.category}
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(checkin.status)}`}>
                        {checkin.status || 'success'}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {checkin.events?.name && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{checkin.events.name}</span>
                        </div>
                      )}
                      
                      {checkin.location && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{checkin.location}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimeAgo(checkin.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Real-time updates from field operations • Last {checkins.length} check-ins
        </p>
      </div>
    </div>
  );
};

export default LiveCheckinFeed;
