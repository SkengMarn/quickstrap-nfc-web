import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Export commonly used types
export type Event = Database['public']['Tables']['events']['Row'];
export type Wristband = Database['public']['Tables']['wristbands']['Row'];
export type Ticket = Database['public']['Tables']['tickets']['Row'];
export type Gate = Database['public']['Tables']['gates']['Row'];
export type CheckinLog = Database['public']['Tables']['checkin_logs']['Row'];
