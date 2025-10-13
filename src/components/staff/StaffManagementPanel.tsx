import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabase'
import { Users, Plus, Mail, Shield, Trash2 } from 'lucide-react'

interface StaffManagementPanelProps {
  eventId: string
  eventName: string
}

interface StaffMember {
  id: string
  user_id: string
  access_level: 'owner' | 'admin' | 'scanner'
  created_at: string
  profiles?: {
    email: string
    full_name: string | null
  } | null
}

const StaffManagementPanel = ({ eventId, eventName }: StaffManagementPanelProps) => {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<'admin' | 'scanner'>('scanner')
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    fetchStaffData()
  }, [eventId])

  const fetchStaffData = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('event_access')
        .select(`
          id,
          user_id,
          access_level,
          created_at,
          profiles (
            email,
            full_name
          )
        `)
        .eq('event_id', eventId)

      if (error) throw error
      
      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      }))
      
      setStaff(transformedData as StaffMember[])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  const inviteStaff = async () => {
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      // In a real implementation, you would:
      // 1. Check if user exists by email
      // 2. Create user if they don't exist
      // 3. Send invitation email
      // 4. Add to event_access table
      
      // For now, we'll just show a placeholder
      alert(`Invitation would be sent to ${inviteEmail} for ${eventName} with ${selectedAccessLevel} access`)
      
      setInviteEmail('')
      await fetchStaffData()
    } catch (error) {
      console.error('Error inviting staff:', error)
      alert('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const removeStaff = async (staffId: string) => {
    if (!confirm('Remove this staff member from the event?')) return

    try {
      const { error } = await supabase
        .from('event_access')
        .delete()
        .eq('id', staffId)

      if (error) throw error
      await fetchStaffData()
    } catch (error) {
      console.error('Error removing staff:', error)
      alert('Failed to remove staff member')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Staff Management</h2>
          <p className="text-gray-600 text-sm">Manage team access for {eventName}</p>
        </div>
      </div>

      {/* Invite Staff */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Invite Staff Member</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="email"
                placeholder="Enter email address"
                className="form-input"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-40">
              <select
                className="form-input form-select"
                value={selectedAccessLevel}
                onChange={(e) => setSelectedAccessLevel(e.target.value as 'admin' | 'scanner')}
              >
                <option value="scanner">Scanner</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              onClick={inviteStaff}
              disabled={inviting || !inviteEmail.trim()}
              className="btn btn-primary"
            >
              {inviting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Current Staff</h3>
        </div>
        <div className="card-body">
          {staff.length > 0 ? (
            <div className="space-y-4">
              {staff.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.profiles?.full_name || 'Unknown User'}
                      </p>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        <span>{member.profiles?.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`status-badge ${
                      member.access_level === 'owner' ? 'status-success' :
                      member.access_level === 'admin' ? 'status-warning' :
                      'status-neutral'
                    }`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {member.access_level}
                    </span>
                    {member.access_level !== 'owner' && (
                      <button
                        onClick={() => removeStaff(member.id)}
                        className="btn-ghost btn-sm p-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove staff member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No staff members assigned yet</p>
              <p className="text-gray-500 text-sm">Invite team members to help manage this event</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StaffManagementPanel
