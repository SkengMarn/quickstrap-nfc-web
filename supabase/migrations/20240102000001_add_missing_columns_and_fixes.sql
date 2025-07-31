-- Migration to add missing columns and fix relationships

-- First, drop all policies that might depend on profiles.role
-- We'll recreate them after making our changes

-- Event access policies
DROP POLICY IF EXISTS "Users can view their own access" ON public.event_access;
DROP POLICY IF EXISTS "Admins and owners can manage all access" ON public.event_access;
DROP POLICY IF EXISTS "Admins can view all event access" ON public.event_access;
DROP POLICY IF EXISTS "Only admins can manage event access" ON public.event_access;

-- Checkin logs policies
DROP POLICY IF EXISTS "Scanners can view their own check-ins" ON public.checkin_logs;
DROP POLICY IF EXISTS "Admins and owners can view all check-ins" ON public.checkin_logs;
DROP POLICY IF EXISTS "Admins and owners can view checkin logs" ON public.checkin_logs;
DROP POLICY IF EXISTS "Scanners can create check-ins" ON public.checkin_logs;

-- Events policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.events;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.events;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.events;
DROP POLICY IF EXISTS "Admins and owners can view events" ON public.events;
DROP POLICY IF EXISTS "Only admins can manage events" ON public.events;

-- Wristbands policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.wristbands;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.wristbands;
DROP POLICY IF EXISTS "Only admins can manage wristbands" ON public.wristbands;

-- Add is_public column to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Fix the profiles.role type if needed (in case it's using a custom type)
-- First check if the column exists and is of the wrong type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role' 
        AND data_type = 'USER-DEFINED'
    ) THEN
        -- Convert from enum to text with check constraint
        ALTER TABLE public.profiles 
        ALTER COLUMN role TYPE text 
        USING role::text;
    END IF;
END $$;

-- Ensure the check constraint exists for the role column
DO $$
BEGIN
    -- First drop the constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_role_check' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
    END IF;
    
    -- Now add the constraint
    EXECUTE 'ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role = ANY (ARRAY[''admin''::text, ''owner''::text, ''scanner''::text]))';
    
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Error adding constraint: %', SQLERRM;
END $$;

-- Recreate all policies we dropped earlier

-- 1. Event access policies
CREATE POLICY "Users can view their own access" 
ON public.event_access 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can manage all access" 
ON public.event_access 
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 2. Checkin logs policies
CREATE POLICY "Scanners can view their own check-ins" 
ON public.checkin_logs 
FOR SELECT 
USING (auth.uid() = staff_id);

CREATE POLICY "Admins and owners can view all check-ins"
ON public.checkin_logs 
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

CREATE POLICY "Scanners can create check-ins" 
ON public.checkin_logs 
FOR INSERT 
WITH CHECK (auth.uid() = staff_id);

-- 3. Events policies
CREATE POLICY "Enable read access for all users"
ON public.events
FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users only"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for users based on user_id"
ON public.events
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

CREATE POLICY "Enable delete for users based on user_id"
ON public.events
FOR DELETE
TO authenticated
USING (
    created_by = auth.uid() OR
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role IN ('admin', 'owner')
    )
);

-- 4. Wristbands policies
CREATE POLICY "Enable read access for all users"
ON public.wristbands
FOR SELECT
USING (true);

CREATE POLICY "Enable insert for authenticated users only"
ON public.wristbands
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create any missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_is_public ON public.events(is_public);
CREATE INDEX IF NOT EXISTS idx_wristbands_nfc_id ON public.wristbands(nfc_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_event_id ON public.wristbands(event_id);

-- Ensure the foreign key between event_access and profiles exists
-- This should be handled by the existing foreign key to auth.users, but we'll verify
DO $$
BEGIN
    -- Check if the foreign key to profiles exists but is invalid
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'event_access' 
        AND constraint_name = 'event_access_user_id_fkey'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.event_access
        ADD CONSTRAINT event_access_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;
