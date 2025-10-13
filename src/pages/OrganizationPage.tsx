import { useState, useEffect } from 'react';
import { Building, Users, Settings, Mail, Trash2, Shield, Plus, UserPlus } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';
import organizationService from '../services/organizationService';
import { OrganizationMember, OrgRole } from '../types/phase1';
import { toast } from 'react-toastify';

export default function OrganizationPage() {
  const { currentOrganization, userMembership, refreshOrganization } = useOrganization();

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');

  // Organization edit state
  const [isEditing, setIsEditing] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  useEffect(() => {
    if (currentOrganization) {
      fetchMembers();
      setOrgName(currentOrganization.name);
      setOrgDescription(currentOrganization.description || '');
    }
  }, [currentOrganization]);

  async function fetchMembers() {
    if (!currentOrganization) return;

    try {
      const data = await organizationService.getOrganizationMembers(currentOrganization.id);
      setMembers(data);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateOrganization() {
    if (!currentOrganization) return;

    try {
      await organizationService.updateOrganization(currentOrganization.id, {
        name: orgName,
        description: orgDescription
      });

      toast.success('Organization updated successfully');
      setIsEditing(false);
      await refreshOrganization();
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    }
  }

  async function handleInviteMember() {
    if (!currentOrganization || !inviteEmail) return;

    try {
      await organizationService.inviteMember({
        organization_id: currentOrganization.id,
        email: inviteEmail,
        role: inviteRole
      });

      toast.success(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      await fetchMembers();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error.message || 'Failed to invite member');
    }
  }

  async function handleUpdateMemberRole(userId: string, newRole: OrgRole) {
    if (!currentOrganization) return;

    try {
      await organizationService.updateMemberRole(currentOrganization.id, userId, newRole);
      toast.success('Member role updated');
      await fetchMembers();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!currentOrganization) return;
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      await organizationService.removeMember(currentOrganization.id, userId);
      toast.success('Member removed');
      await fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  }

  const isAdmin = userMembership?.role === 'owner' || userMembership?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No Organization</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't belong to any organization yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Organization</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your organization settings and team members
        </p>
      </div>

      {/* Organization Profile */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Building className="h-5 w-5 mr-2" />
              Organization Profile
            </h2>
            {isAdmin && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={orgDescription}
                  onChange={(e) => setOrgDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <button
                onClick={handleUpdateOrganization}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Save Changes
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="text-lg font-medium text-gray-900">{currentOrganization.name}</p>
              </div>

              {currentOrganization.description && (
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="text-gray-900">{currentOrganization.description}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500">Subscription Tier</p>
                <p className="text-gray-900">{currentOrganization.subscription_tier || 'Free'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">
                  {new Date(currentOrganization.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Team Members ({members.length})
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </button>
            )}
          </div>
        </div>

        <div className="px-6 py-4">
          {members.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No team members yet</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {member.user?.full_name || member.user?.email || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">{member.user?.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          member.status === 'active' ? 'bg-green-100 text-green-800' :
                          member.status === 'invited' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {member.status}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                          member.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isAdmin && member.role !== 'owner' && (
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateMemberRole(member.user_id, e.target.value as OrgRole)}
                        className="text-sm border-gray-300 rounded-md"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        {userMembership?.role === 'owner' && <option value="owner">Owner</option>}
                      </select>

                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="p-2 text-red-600 hover:text-red-700"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Mail className="inline h-5 w-5 mr-2" />
              Invite Team Member
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="mt-1 text-xs text-gray-500">
                  User must have an account already
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  {userMembership?.role === 'owner' && <option value="owner">Owner</option>}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteMember}
                disabled={!inviteEmail}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400"
              >
                Send Invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
