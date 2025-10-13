import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { CheckCircle, XCircle, AlertTriangle, Merge, Edit, Eye, Plus } from 'lucide-react';

interface Gate {
  id: string;
  name: string;
  status: 'probation' | 'approved' | 'rejected' | 'active' | 'inactive';
  location_lat?: number;
  location_lng?: number;
  location_description?: string;
  auto_created: boolean;
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  config: any;
  metadata: any;
  checkin_count?: number;
  confidence_score?: number;
}

interface GateBinding {
  id: string;
  gate_id: string;
  category: string;
  binding_type: 'allowed' | 'preferred' | 'restricted';
}

interface GateManagementInterfaceProps {
  eventId: string;
}

const GateManagementInterface: React.FC<GateManagementInterfaceProps> = ({ eventId }) => {
  const [gates, setGates] = useState<Gate[]>([]);
  const [bindings, setBindings] = useState<GateBinding[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedGate, setSelectedGate] = useState<Gate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [pendingApprovals, setPendingApprovals] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGates();
    fetchCategories();
    fetchBindings();
    setupRealtimeSubscription();
  }, [eventId]);

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel(`gates_${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gates',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            handleNewGateDetected(payload.new as Gate);
          }
          fetchGates(); // Refresh gates list
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  };

  const fetchGates = async () => {
    try {
      const { data, error } = await supabase
        .from('gates')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enhance gates with check-in counts and confidence scores
      const enhancedGates = await Promise.all(
        (data || []).map(async (gate) => {
          const { data: checkins } = await supabase
            .from('checkin_logs')
            .select('id')
            .eq('event_id', eventId)
            .eq('location', gate.name);

          return {
            ...gate,
            checkin_count: checkins?.length || 0,
            confidence_score: calculateConfidenceScore(gate, checkins?.length || 0)
          };
        })
      );

      setGates(enhancedGates);
      setPendingApprovals(enhancedGates.filter(g => g.status === 'probation'));
    } catch (error) {
      console.error('Error fetching gates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchBindings = async () => {
    try {
      const { data, error } = await supabase
        .from('gate_bindings')
        .select('*')
        .in('gate_id', gates.map(g => g.id));

      if (error) throw error;
      setBindings(data || []);
    } catch (error) {
      console.error('Error fetching bindings:', error);
    }
  };

  const calculateConfidenceScore = (gate: Gate, checkinCount: number): number => {
    let score = 50; // Base score

    // Increase score based on check-in volume
    if (checkinCount > 100) score += 30;
    else if (checkinCount > 50) score += 20;
    else if (checkinCount > 10) score += 10;

    // Increase score if location data is available
    if (gate.location_lat && gate.location_lng) score += 15;

    // Increase score based on time since creation
    const hoursSinceCreation = (Date.now() - new Date(gate.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) score += 10;
    else if (hoursSinceCreation > 6) score += 5;

    // Decrease score if auto-created without much activity
    if (gate.auto_created && checkinCount < 5) score -= 20;

    return Math.max(0, Math.min(100, score));
  };

  const handleNewGateDetected = (gate: Gate) => {
    // Show notification for new gate detection
    if (gate.status === 'probation') {
      showNotification(`New gate detected: ${gate.name}`, 'info');
    }
  };

  const approveGate = async (gateId: string) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gates')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: currentUser.user?.id
        })
        .eq('id', gateId);

      if (error) throw error;
      
      await fetchGates();
      showNotification('Gate approved successfully', 'success');
    } catch (error) {
      console.error('Error approving gate:', error);
      showNotification('Error approving gate', 'error');
    }
  };

  const rejectGate = async (gateId: string) => {
    if (!confirm('Are you sure you want to reject this gate? This will delete it permanently.')) return;

    try {
      const { error } = await supabase
        .from('gates')
        .delete()
        .eq('id', gateId);

      if (error) throw error;
      
      await fetchGates();
      showNotification('Gate rejected and deleted', 'success');
    } catch (error) {
      console.error('Error rejecting gate:', error);
      showNotification('Error rejecting gate', 'error');
    }
  };

  const renameGate = async (gateId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('gates')
        .update({ name: newName })
        .eq('id', gateId);

      if (error) throw error;
      
      await fetchGates();
      showNotification('Gate renamed successfully', 'success');
    } catch (error) {
      console.error('Error renaming gate:', error);
      showNotification('Error renaming gate', 'error');
    }
  };

  const createManualGate = async (gateData: any) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('gates')
        .insert({
          event_id: eventId,
          name: gateData.name,
          location_description: gateData.location_description,
          location_lat: gateData.location_lat,
          location_lng: gateData.location_lng,
          status: 'approved',
          auto_created: false,
          created_by: currentUser.user?.id,
          approved_at: new Date().toISOString(),
          approved_by: currentUser.user?.id,
          config: gateData.config || {}
        });

      if (error) throw error;
      
      await fetchGates();
      setShowCreateModal(false);
      showNotification('Gate created successfully', 'success');
    } catch (error) {
      console.error('Error creating gate:', error);
      showNotification('Error creating gate', 'error');
    }
  };

  const mergeGates = async (sourceGateId: string, targetGateId: string) => {
    try {
      // Update all check-ins from source gate to target gate
      const sourceGate = gates.find(g => g.id === sourceGateId);
      const targetGate = gates.find(g => g.id === targetGateId);

      if (!sourceGate || !targetGate) return;

      const { error: updateError } = await supabase
        .from('checkin_logs')
        .update({ location: targetGate.name })
        .eq('event_id', eventId)
        .eq('location', sourceGate.name);

      if (updateError) throw updateError;

      // Delete source gate
      const { error: deleteError } = await supabase
        .from('gates')
        .delete()
        .eq('id', sourceGateId);

      if (deleteError) throw deleteError;

      await fetchGates();
      setShowMergeModal(false);
      showNotification('Gates merged successfully', 'success');
    } catch (error) {
      console.error('Error merging gates:', error);
      showNotification('Error merging gates', 'error');
    }
  };

  const updateGateBinding = async (gateId: string, category: string, bindingType: 'allowed' | 'preferred' | 'restricted') => {
    try {
      // Check if binding exists
      const existingBinding = bindings.find(b => b.gate_id === gateId && b.category === category);

      if (existingBinding) {
        const { error } = await supabase
          .from('gate_bindings')
          .update({ binding_type: bindingType })
          .eq('id', existingBinding.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gate_bindings')
          .insert({
            gate_id: gateId,
            category,
            binding_type: bindingType
          });

        if (error) throw error;
      }

      await fetchBindings();
      showNotification('Gate binding updated', 'success');
    } catch (error) {
      console.error('Error updating gate binding:', error);
      showNotification('Error updating gate binding', 'error');
    }
  };

  const detectDuplicateGates = (): { gate1: Gate; gate2: Gate; distance: number }[] => {
    const duplicates: { gate1: Gate; gate2: Gate; distance: number }[] = [];

    for (let i = 0; i < gates.length; i++) {
      for (let j = i + 1; j < gates.length; j++) {
        const gate1 = gates[i];
        const gate2 = gates[j];

        // Check name similarity
        const nameSimilarity = calculateStringSimilarity(gate1.name, gate2.name);
        
        // Check location proximity (if coordinates available)
        let locationDistance = Infinity;
        if (gate1.location_lat && gate1.location_lng && gate2.location_lat && gate2.location_lng) {
          locationDistance = calculateDistance(
            gate1.location_lat, gate1.location_lng,
            gate2.location_lat, gate2.location_lng
          );
        }

        // Consider as duplicate if names are similar or locations are close
        if (nameSimilarity > 0.8 || locationDistance < 30) { // 30 meters
          duplicates.push({ gate1, gate2, distance: locationDistance });
        }
      }
    }

    return duplicates;
  };

  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    // Simple notification implementation
    alert(message);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'probation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredGates = gates.filter(gate => {
    if (filterStatus === 'all') return true;
    return gate.status === filterStatus;
  });

  const duplicateGates = detectDuplicateGates();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gate Management</h3>
          <p className="text-sm text-gray-600">
            {gates.length} total gates • {pendingApprovals.length} pending approval
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Gates</option>
            <option value="probation">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Gate
          </button>
        </div>
      </div>

      {/* Pending Approvals Alert */}
      {pendingApprovals.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
            <div>
              <p className="font-medium text-yellow-800">
                {pendingApprovals.length} gates awaiting approval
              </p>
              <p className="text-sm text-yellow-700">
                Review auto-detected gates and approve or reject them
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Detection */}
      {duplicateGates.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Merge className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="font-medium text-orange-800">
                  {duplicateGates.length} potential duplicate gates detected
                </p>
                <p className="text-sm text-orange-700">
                  Consider merging similar gates to avoid confusion
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMergeModal(true)}
              className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Review Duplicates
            </button>
          </div>
        </div>
      )}

      {/* Gates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGates.map(gate => (
          <div key={gate.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">{gate.name}</h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(gate.status)}`}>
                {gate.status}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Check-ins:</span>
                <span className="font-medium">{gate.checkin_count}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Confidence:</span>
                <span className={`font-medium ${getConfidenceColor(gate.confidence_score || 0)}`}>
                  {gate.confidence_score}%
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(gate.created_at).toLocaleDateString()}
                </span>
              </div>
              
              {gate.location_description && (
                <div className="flex items-start justify-between">
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium text-right flex-1 ml-2">
                    {gate.location_description}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-medium">
                  {gate.auto_created ? 'Auto-detected' : 'Manual'}
                </span>
              </div>
            </div>

            {/* Gate Actions */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              {gate.status === 'probation' && (
                <div className="flex space-x-2 mb-3">
                  <button
                    onClick={() => approveGate(gate.id)}
                    className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectGate(gate.id)}
                    className="flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Reject
                  </button>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedGate(gate)}
                  className="flex items-center px-2 py-1 text-blue-600 text-sm hover:bg-blue-50 rounded"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Details
                </button>
                <button
                  onClick={() => {
                    const newName = prompt('Enter new gate name:', gate.name);
                    if (newName && newName !== gate.name) {
                      renameGate(gate.id, newName);
                    }
                  }}
                  className="flex items-center px-2 py-1 text-gray-600 text-sm hover:bg-gray-50 rounded"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Rename
                </button>
              </div>
            </div>

            {/* Category Bindings */}
            {gate.status === 'approved' && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-600 mb-2">Category Access:</p>
                <div className="flex flex-wrap gap-1">
                  {categories.slice(0, 3).map(category => {
                    const binding = bindings.find(b => b.gate_id === gate.id && b.category === category.name);
                    return (
                      <button
                        key={category.id}
                        onClick={() => updateGateBinding(
                          gate.id, 
                          category.name, 
                          binding?.binding_type === 'allowed' ? 'preferred' : 'allowed'
                        )}
                        className={`px-2 py-1 text-xs rounded ${
                          binding?.binding_type === 'preferred' 
                            ? 'bg-blue-100 text-blue-800' 
                            : binding?.binding_type === 'allowed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Gate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Manual Gate</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createManualGate({
                name: formData.get('name'),
                location_description: formData.get('location_description'),
                location_lat: formData.get('location_lat') ? parseFloat(formData.get('location_lat') as string) : null,
                location_lng: formData.get('location_lng') ? parseFloat(formData.get('location_lng') as string) : null
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gate Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Main Entrance"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Description
                  </label>
                  <input
                    type="text"
                    name="location_description"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Near the main parking area"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      name="location_lat"
                      step="any"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="40.7128"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      name="location_lng"
                      step="any"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="-74.0060"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Gate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GateManagementInterface;
