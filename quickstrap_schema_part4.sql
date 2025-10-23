-- =====================================================
-- QUICKSTRAP COMPLETE SCHEMA RECONSTRUCTION - PART 4
-- =====================================================
-- Triggers, RLS policies, and final setup

-- CREATE TRIGGERS
DROP TRIGGER IF EXISTS sync_ticket_linking ON public.events;
CREATE TRIGGER sync_ticket_linking
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION sync_ticket_linking_columns();

DROP TRIGGER IF EXISTS update_staff_performance_trigger ON public.checkin_logs;
CREATE TRIGGER update_staff_performance_trigger
  AFTER INSERT ON public.checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_performance();

DROP TRIGGER IF EXISTS auto_discover_gates_trigger ON public.checkin_logs;
CREATE TRIGGER auto_discover_gates_trigger
  AFTER INSERT ON public.checkin_logs
  FOR EACH ROW
  WHEN (NEW.gate_id IS NOT NULL)
  EXECUTE FUNCTION auto_discover_gates();

DROP TRIGGER IF EXISTS update_category_limits_trigger ON public.checkin_logs;
CREATE TRIGGER update_category_limits_trigger
  AFTER INSERT ON public.checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_category_limits();

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wristbands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_wristband_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_menu_state ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES FOR PROFILES
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS POLICIES FOR EVENTS
CREATE POLICY "Users can view events for their organization" ON public.events
  FOR SELECT USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    OR public = true
  );

CREATE POLICY "Users can create events for their organization" ON public.events
  FOR INSERT WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Event owners and admins can update events" ON public.events
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.event_access 
      WHERE event_id = events.id 
      AND user_id = auth.uid() 
      AND access_level = 'admin'
    )
  );

-- RLS POLICIES FOR WRISTBANDS
CREATE POLICY "Users can view wristbands for their organization events" ON public.wristbands
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage wristbands for their organization events" ON public.wristbands
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- RLS POLICIES FOR CHECKIN_LOGS
CREATE POLICY "Users can view checkin logs for their organization events" ON public.checkin_logs
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create checkin logs for their organization events" ON public.checkin_logs
  FOR INSERT WITH CHECK (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- RLS POLICIES FOR EVENT_ACCESS
CREATE POLICY "Users can view event access for their organization" ON public.event_access
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Event owners and admins can manage access" ON public.event_access
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE created_by = auth.uid() OR
      organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- CREATE VERIFICATION FUNCTION
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

  -- If no direct access, return access denied
  RETURN QUERY
  SELECT 
    false as access_granted,
    'none' as access_type,
    NULL::uuid as wristband_id,
    NULL::uuid as series_id,
    NULL::text as series_name;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_wristband_access TO authenticated;
