-- =====================================================
-- QUICKSTRAP COMPLETE SCHEMA RECONSTRUCTION - PART 1
-- =====================================================
-- Core tables and basic structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PROFILES TABLE (Supabase Auth integration)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE,
  full_name text,
  organization_id uuid,
  access_level text DEFAULT 'user',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. EVENTS TABLE (Core event management)
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  start_date timestamptz,
  end_date timestamptz,
  capacity integer,
  organization_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  public boolean DEFAULT false,
  allow_unlinked_entry boolean DEFAULT false,
  ticket_linking_mode text DEFAULT 'optional',
  has_series boolean DEFAULT false,
  lifecycle_status text DEFAULT 'planning'
);

-- 3. WRISTBANDS TABLE (NFC wristband management)
CREATE TABLE IF NOT EXISTS public.wristbands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nfc_id text UNIQUE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  category text DEFAULT 'General',
  is_active boolean DEFAULT true,
  is_blocked boolean DEFAULT false,
  linked_ticket_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  checked_out_at timestamptz,
  checked_out_by uuid REFERENCES auth.users(id)
);

-- 4. CHECKIN_LOGS TABLE (Check-in tracking)
CREATE TABLE IF NOT EXISTS public.checkin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wristband_id uuid REFERENCES public.wristbands(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  gate_id text,
  staff_id uuid REFERENCES auth.users(id),
  checked_in_at timestamptz DEFAULT now(),
  location_lat decimal,
  location_lng decimal,
  is_probation boolean DEFAULT false,
  ticket_id uuid,
  series_id uuid
);

-- 5. EVENT_ACCESS TABLE (Staff access control)
CREATE TABLE IF NOT EXISTS public.event_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'scanner',
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(user_id, event_id)
);

-- 6. TICKETS TABLE (Ticket management)
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  category text DEFAULT 'General',
  purchaser_email text,
  price_paid decimal,
  order_number text,
  purchase_date timestamptz,
  seat_number text,
  team_name text,
  status text DEFAULT 'active',
  linked_wristband_id uuid REFERENCES public.wristbands(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, ticket_number)
);

-- 7. TICKET_WRISTBAND_LINKS TABLE (Linking system)
CREATE TABLE IF NOT EXISTS public.ticket_wristband_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE,
  wristband_id uuid UNIQUE REFERENCES public.wristbands(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES auth.users(id),
  linked_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 8. AUTONOMOUS_GATES TABLE (Auto-discovered gates)
CREATE TABLE IF NOT EXISTS public.autonomous_gates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id text UNIQUE NOT NULL,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  organization_id uuid,
  discovered_at timestamptz DEFAULT now(),
  last_activity timestamptz,
  status text DEFAULT 'pending',
  location_lat decimal,
  location_lng decimal,
  total_checkins integer DEFAULT 0,
  approval_status text DEFAULT 'pending'
);

-- 9. AUTONOMOUS_EVENTS TABLE (Auto-event creation)
CREATE TABLE IF NOT EXISTS public.autonomous_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id),
  organization_id uuid,
  trigger_type text NOT NULL,
  threshold_value integer,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  metadata jsonb
);
