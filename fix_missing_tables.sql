-- ============================================================================
-- FIX MISSING TABLES - event_access and categories
-- Resolves database schema errors in console
-- ============================================================================

-- ============================================================================
-- 1. CREATE event_access TABLE
-- ============================================================================

-- Drop existing table if it exists to recreate with proper foreign keys
DROP TABLE IF EXISTS public.event_access CASCADE;

CREATE TABLE public.event_access (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid NOT NULL,
  access_level text NOT NULL DEFAULT 'scanner' CHECK (access_level IN ('admin', 'scanner', 'read_only')),
  granted_by uuid,
  granted_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_access_pkey PRIMARY KEY (id),
  CONSTRAINT event_access_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE,
  CONSTRAINT event_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT event_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES auth.users(id),
  CONSTRAINT event_access_unique UNIQUE (event_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_access_event_id ON public.event_access(event_id);
CREATE INDEX IF NOT EXISTS idx_event_access_user_id ON public.event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_event_access_is_active ON public.event_access(is_active);

-- ============================================================================
-- 2. CREATE categories TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#10B981',
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_name_unique UNIQUE (name)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);

-- Insert default categories
INSERT INTO public.categories (name, description, color, sort_order) VALUES 
  ('General', 'General admission tickets', '#10B981', 1),
  ('VIP', 'VIP access tickets', '#F59E0B', 2),
  ('Staff', 'Staff access wristbands', '#3B82F6', 3),
  ('Press', 'Media and press access', '#8B5CF6', 4),
  ('Vendor', 'Vendor and exhibitor access', '#EF4444', 5)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================

-- event_access policies
CREATE POLICY event_access_select ON public.event_access
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level IN ('admin')
    )
  );

CREATE POLICY event_access_insert ON public.event_access
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    )
  );

CREATE POLICY event_access_update ON public.event_access
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    )
  );

CREATE POLICY event_access_delete ON public.event_access
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.event_access ea
      WHERE ea.event_id = event_access.event_id
      AND ea.user_id = auth.uid()
      AND ea.access_level = 'admin'
    )
  );

-- categories policies (allow all authenticated users to read)
CREATE POLICY categories_select ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY categories_insert ON public.categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY categories_update ON public.categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.categories TO authenticated;

-- ============================================================================
-- 6. ENSURE PROFILES TABLE EXISTS AND HAS PROPER STRUCTURE
-- ============================================================================

-- Ensure profiles table exists (it should be created by Supabase Auth)
DO $$
BEGIN
  -- Check if profiles table exists, if not create a basic one
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE public.profiles (
      id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      email text,
      full_name text,
      phone text,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now(),
      CONSTRAINT profiles_pkey PRIMARY KEY (id)
    );
    
    -- Enable RLS
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create basic policy
    CREATE POLICY profiles_select ON public.profiles
      FOR SELECT USING (auth.uid() = id);
      
    GRANT SELECT, UPDATE ON public.profiles TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- 7. VERIFY FOREIGN KEY RELATIONSHIPS
-- ============================================================================

-- Verify that the foreign key relationships exist
DO $$
BEGIN
  -- Check if the foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'event_access_user_id_fkey' 
    AND table_name = 'event_access'
  ) THEN
    RAISE EXCEPTION 'Foreign key event_access_user_id_fkey was not created properly';
  END IF;
  
  RAISE NOTICE 'All foreign key relationships verified successfully';
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE public.event_access IS 'Staff access control for events';
COMMENT ON TABLE public.categories IS 'Wristband categories for classification';

SELECT 'Missing tables (event_access, categories) created successfully!' as status;
