import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Type definitions
export type Event = {
  id: string
  name: string
  description: string | null
  location: string | null
  start_date: string
  end_date: string
  capacity: number | null
  is_active: boolean
  is_public: boolean | null
  organization_id: string | null
  lifecycle_status: string
  ticket_linking_mode: string | null
  allow_unlinked_entry: boolean | null
  created_by: string | null
  created_at: string
  updated_at: string
  config?: any
}

export type Wristband = {
  id: string
  event_id: string
  wristband_id: string
  nfc_id: string | null
  category: string | null
  status: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export default supabase
