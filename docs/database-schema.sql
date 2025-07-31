-- Database Schema Reference for Quickstrap NFC Web
-- This file is for reference only - do not execute directly

-- Enable Row Level Security on sensitive tables
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_access_user_id ON public.event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_staff_id ON public.checkin_logs(staff_id);

-- Check-in Logs Table
CREATE TABLE public.checkin_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  wristband_id uuid NOT NULL,
  staff_id uuid,
  timestamp timestamp with time zone DEFAULT now(),
  location text,
  notes text,
  CONSTRAINT checkin_logs_pkey PRIMARY KEY (id),
  CONSTRAINT checkin_logs_wristband_id_fkey FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id),
  CONSTRAINT checkin_logs_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES auth.users(id),
  CONSTRAINT checkin_logs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);

-- Event Access Control Table
CREATE TABLE public.event_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  access_level text DEFAULT 'scanner'::text CHECK (access_level = ANY (ARRAY['admin'::text, 'owner'::text, 'scanner'::text])),
  granted_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_access_pkey PRIMARY KEY (id),
  CONSTRAINT event_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id),
  CONSTRAINT event_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT event_access_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);

-- Events Table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  location text,
  total_capacity integer DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL DEFAULT now(),
  is_public boolean DEFAULT false,  -- Added to fix the missing column error
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- User Profiles Table
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  role text DEFAULT 'scanner' CHECK (role = ANY (ARRAY['admin', 'owner', 'scanner'])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_sign_in timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Wristbands Table
CREATE TABLE public.wristbands (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  nfc_id text NOT NULL UNIQUE,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wristbands_pkey PRIMARY KEY (id),
  CONSTRAINT wristbands_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);

-- Row Level Security Policies
-- For event_access table
CREATE POLICY "Users can view their own access" 
ON public.event_access FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can manage all access" 
ON public.event_access 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'owner')
));

-- For checkin_logs table
CREATE POLICY "Scanners can view their own check-ins" 
ON public.checkin_logs FOR SELECT 
USING (auth.uid() = staff_id);

CREATE POLICY "Admins and owners can view all check-ins"
ON public.checkin_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'owner')
));

CREATE POLICY "Scanners can create check-ins" 
ON public.checkin_logs FOR INSERT 
WITH CHECK (auth.uid() = staff_id);

-- Function to check if user has access to an event
CREATE OR REPLACE FUNCTION has_event_access(event_id uuid, user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_access 
    WHERE event_access.event_id = $1 
    AND event_access.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = $2
    AND profiles.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;
