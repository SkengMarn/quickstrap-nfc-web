import { createClient } from '@supabase/supabase-js'

// Check if running in browser environment
const isBrowser = typeof window !== 'undefined';

// Get environment variables from Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_REACT_APP_SUPABASE_ANON_KEY || '';

// Log environment status for debugging (non-blocking)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    supabaseUrl: !!supabaseUrl,
    supabaseAnonKey: !!supabaseAnonKey
  });
  console.error('Available env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
}

// Create a single supabase client for the browser (with fallback values to prevent initialization errors)
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: isBrowser,
    }
  }
);

export { supabase };

export type Event = {
  id: string
  name: string
  description: string | null
  location: string | null
  total_capacity: number
  created_by: string | null
  created_at: string
  updated_at: string
  start_date: string
  end_date: string
  is_public: boolean
  ticket_linking_mode: 'disabled' | 'optional' | 'required'
  allow_unlinked_entry: boolean
  config: any
  lifecycle_status: 'draft' | 'planning' | 'active' | 'completed' | 'archived'
  status_changed_at: string
  status_changed_by: string | null
  auto_transition_enabled: boolean
  organization_id: string
}

export type Wristband = {
  id: string
  event_id: string
  nfc_id: string
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CheckinLog = {
  id: string
  event_id: string
  wristband_id: string
  staff_id: string | null
  timestamp: string
  location: string | null
  notes: string | null
}

export type EventAccess = {
  id: string
  user_id: string
  event_id: string
  access_level: 'admin' | 'owner' | 'scanner'
  granted_by: string | null
  created_at: string
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  updated_at: string
  last_sign_in: string | null
}

export type EventWithStats = Event & {
  total_wristbands: number
  checked_in: number
}