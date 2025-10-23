-- =====================================================
-- MULTI-SERIES EVENTS SQL - RUN IN SUPABASE SQL EDITOR
-- =====================================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- This adds multi-series events support with backwards compatibility

-- 1. Create event_series table
CREATE TABLE IF NOT EXISTS public.event_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Create event_series_wristbands table (access grants)
CREATE TABLE IF NOT EXISTS public.event_series_wristbands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid REFERENCES public.event_series(id) ON DELETE CASCADE NOT NULL,
  wristband_id uuid REFERENCES public.wristbands(id) ON DELETE CASCADE NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  UNIQUE(series_id, wristband_id)
);

-- 3. Add has_series flag to events table (performance optimization)
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS has_series boolean DEFAULT false;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_series_event_id ON public.event_series(event_id);
CREATE INDEX IF NOT EXISTS idx_event_series_active ON public.event_series(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_event_series_dates ON public.event_series(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_event_series_wristbands_series_id ON public.event_series_wristbands(series_id);
CREATE INDEX IF NOT EXISTS idx_event_series_wristbands_wristband_id ON public.event_series_wristbands(wristband_id);
CREATE INDEX IF NOT EXISTS idx_event_series_wristbands_active ON public.event_series_wristbands(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_event_series_wristbands_expires ON public.event_series_wristbands(expires_at) WHERE expires_at IS NOT NULL;

-- 5. Add series_id to checkin_logs for tracking
ALTER TABLE public.checkin_logs 
ADD COLUMN IF NOT EXISTS series_id uuid REFERENCES public.event_series(id);

CREATE INDEX IF NOT EXISTS idx_checkin_logs_series_id ON public.checkin_logs(series_id) WHERE series_id IS NOT NULL;

-- 6. Create function to automatically update has_series flag
CREATE OR REPLACE FUNCTION update_event_has_series()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.events 
  SET has_series = EXISTS(
    SELECT 1 FROM public.event_series 
    WHERE event_id = COALESCE(NEW.event_id, OLD.event_id) 
    AND is_active = true
  )
  WHERE id = COALESCE(NEW.event_id, OLD.event_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers to maintain has_series flag
DROP TRIGGER IF EXISTS trigger_update_event_has_series_insert ON public.event_series;
CREATE TRIGGER trigger_update_event_has_series_insert
  AFTER INSERT ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION update_event_has_series();

DROP TRIGGER IF EXISTS trigger_update_event_has_series_update ON public.event_series;
CREATE TRIGGER trigger_update_event_has_series_update
  AFTER UPDATE ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION update_event_has_series();

DROP TRIGGER IF EXISTS trigger_update_event_has_series_delete ON public.event_series;
CREATE TRIGGER trigger_update_event_has_series_delete
  AFTER DELETE ON public.event_series
  FOR EACH ROW
  EXECUTE FUNCTION update_event_has_series();

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_series_wristbands ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for event_series
CREATE POLICY "Users can view event series for their organization events" ON public.event_series
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create event series for their organization events" ON public.event_series
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update event series for their organization events" ON public.event_series
  FOR UPDATE USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete event series for their organization events" ON public.event_series
  FOR DELETE USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- 10. Create RLS policies for event_series_wristbands
CREATE POLICY "Users can view series wristbands for their organization" ON public.event_series_wristbands
  FOR SELECT USING (
    series_id IN (
      SELECT es.id FROM public.event_series es
      JOIN public.events e ON es.event_id = e.id
      WHERE e.organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create series wristbands for their organization" ON public.event_series_wristbands
  FOR INSERT WITH CHECK (
    series_id IN (
      SELECT es.id FROM public.event_series es
      JOIN public.events e ON es.event_id = e.id
      WHERE e.organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update series wristbands for their organization" ON public.event_series_wristbands
  FOR UPDATE USING (
    series_id IN (
      SELECT es.id FROM public.event_series es
      JOIN public.events e ON es.event_id = e.id
      WHERE e.organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete series wristbands for their organization" ON public.event_series_wristbands
  FOR DELETE USING (
    series_id IN (
      SELECT es.id FROM public.event_series es
      JOIN public.events e ON es.event_id = e.id
      WHERE e.organization_id = (
        SELECT organization_id FROM public.profiles 
        WHERE id = auth.uid()
      )
    )
  );

-- 11. Create verification function for backwards compatibility
CREATE OR REPLACE FUNCTION verify_wristband_access(
  p_nfc_id text,
  p_event_id uuid
)
RETURNS TABLE (
  access_granted boolean,
  access_type text,
  wristband_id uuid,
  series_id uuid,
  series_name text
) AS $$
BEGIN
  -- First, try direct access (existing logic)
  RETURN QUERY
  SELECT 
    true as access_granted,
    'direct' as access_type,
    w.id as wristband_id,
    NULL::uuid as series_id,
    NULL::text as series_name
  FROM public.wristbands w
  WHERE w.nfc_id = p_nfc_id 
    AND w.event_id = p_event_id
    AND w.is_active = true
  LIMIT 1;

  -- If direct access found, return early
  IF FOUND THEN
    RETURN;
  END IF;

  -- Check if event has series (performance optimization)
  IF NOT EXISTS(SELECT 1 FROM public.events WHERE id = p_event_id AND has_series = true) THEN
    -- No series for this event, return access denied
    RETURN QUERY
    SELECT 
      false as access_granted,
      'none' as access_type,
      NULL::uuid as wristband_id,
      NULL::uuid as series_id,
      NULL::text as series_name;
    RETURN;
  END IF;

  -- Check series access
  RETURN QUERY
  SELECT 
    true as access_granted,
    'series' as access_type,
    w.id as wristband_id,
    es.id as series_id,
    es.name as series_name
  FROM public.wristbands w
  JOIN public.event_series_wristbands esw ON w.id = esw.wristband_id
  JOIN public.event_series es ON esw.series_id = es.id
  WHERE w.nfc_id = p_nfc_id 
    AND es.event_id = p_event_id
    AND w.is_active = true
    AND esw.is_active = true
    AND es.is_active = true
    AND (esw.expires_at IS NULL OR esw.expires_at > now())
    AND (es.start_date IS NULL OR es.start_date <= now())
    AND (es.end_date IS NULL OR es.end_date >= now())
  LIMIT 1;

  -- If no series access found either, return access denied
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false as access_granted,
      'none' as access_type,
      NULL::uuid as wristband_id,
      NULL::uuid as series_id,
      NULL::text as series_name;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.event_series TO authenticated;
GRANT ALL ON public.event_series_wristbands TO authenticated;
GRANT EXECUTE ON FUNCTION verify_wristband_access TO authenticated;

-- 13. Create view for easy series access checking
CREATE OR REPLACE VIEW public.wristband_series_access AS
SELECT 
  w.nfc_id,
  w.id as wristband_id,
  w.event_id as wristband_event_id,
  es.id as series_id,
  es.name as series_name,
  es.event_id as series_event_id,
  esw.granted_at,
  esw.expires_at,
  esw.granted_by,
  CASE 
    WHEN esw.expires_at IS NULL OR esw.expires_at > now() THEN true
    ELSE false
  END as is_valid
FROM public.wristbands w
JOIN public.event_series_wristbands esw ON w.id = esw.wristband_id
JOIN public.event_series es ON esw.series_id = es.id
WHERE w.is_active = true 
  AND esw.is_active = true 
  AND es.is_active = true;

-- Grant access to the view
GRANT SELECT ON public.wristband_series_access TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES (Optional - for testing)
-- =====================================================

-- Test 1: Check if tables were created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('event_series', 'event_series_wristbands');

-- Test 2: Check if has_series column was added
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'events' AND column_name = 'has_series';

-- Test 3: Test the verification function (replace with real values)
-- SELECT * FROM verify_wristband_access('your_nfc_id', 'your_event_id');

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
-- Your QuickStrap system now supports multi-series events
-- Existing events work exactly the same (backwards compatible)
-- New events can use series for advanced access control
