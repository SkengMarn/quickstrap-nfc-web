import { SupabaseClient } from '@supabase/supabase-js'

interface AccessRecord {
  id: string
  user_id: string
  event_id: string
  access_level: string
  granted_by: string
  created_at: string
  is_active: boolean
}

interface Profile {
  id: string
  email: string
  full_name: string | null
}

interface EnrichedAccessRecord extends AccessRecord {
  user?: Profile
  grantedBy?: Profile
}

export async function enrichAccessWithProfiles(
  supabase: SupabaseClient,
  accessData: AccessRecord[]
): Promise<EnrichedAccessRecord[]> {
  if (!accessData || accessData.length === 0) {
    return []
  }

  // Get unique user IDs from both user_id and granted_by fields
  const userIds = [...new Set([
    ...accessData.map(access => access.user_id),
    ...accessData.map(access => access.granted_by)
  ])].filter(Boolean)

  if (userIds.length === 0) {
    return accessData
  }

  try {
    // Fetch all profiles for the user IDs
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)

    if (error) {
      console.error('Error fetching profiles:', error)
      return accessData
    }

    // Create a map for quick profile lookup
    const profileMap = new Map<string, Profile>()
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile)
    })

    // Enrich access data with profile information
    return accessData.map(access => ({
      ...access,
      user: profileMap.get(access.user_id),
      grantedBy: profileMap.get(access.granted_by)
    }))
  } catch (error) {
    console.error('Error enriching access data with profiles:', error)
    return accessData
  }
}
