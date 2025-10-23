-- =====================================================
-- QUICKSTRAP COMPLETE SCHEMA RECONSTRUCTION - PART 3
-- =====================================================
-- Indexes, triggers, and functions

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_date_range ON public.events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_wristbands_event_id ON public.wristbands(event_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_nfc_id ON public.wristbands(nfc_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_active ON public.wristbands(is_active);
CREATE INDEX IF NOT EXISTS idx_wristbands_linked_ticket ON public.wristbands(linked_ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_wristband_id ON public.checkin_logs(wristband_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_staff_id ON public.checkin_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_probation ON public.checkin_logs(is_probation);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_ticket ON public.checkin_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_event_access_user_id ON public.event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_event_access_event_id ON public.event_access(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_tickets_linked_wristband ON public.tickets(linked_wristband_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_number ON public.tickets(event_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_ticket_wristband_links_ticket ON public.ticket_wristband_links(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_wristband_links_wristband ON public.ticket_wristband_links(wristband_id);
CREATE INDEX IF NOT EXISTS idx_ticket_wristband_links_linked_at ON public.ticket_wristband_links(linked_at);
CREATE INDEX IF NOT EXISTS idx_autonomous_gates_gate ON public.autonomous_gates(gate_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_gates_event ON public.autonomous_gates(event_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_gates_org ON public.autonomous_gates(organization_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_gates_status ON public.autonomous_gates(status);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_org ON public.autonomous_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_event ON public.autonomous_events(event_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_type ON public.autonomous_events(trigger_type);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_created ON public.autonomous_events(created_at);

-- TRIGGER FUNCTIONS

-- 1. Update event has_series flag
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

-- 2. Sync ticket linking columns
CREATE OR REPLACE FUNCTION sync_ticket_linking_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure consistency between ticket_linking_mode and allow_unlinked_entry
  IF NEW.ticket_linking_mode = 'required' THEN
    NEW.allow_unlinked_entry = false;
  ELSIF NEW.ticket_linking_mode = 'disabled' THEN
    NEW.allow_unlinked_entry = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Update staff performance
CREATE OR REPLACE FUNCTION update_staff_performance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.staff_performance (staff_id, event_id, checkins_processed, last_activity)
  VALUES (NEW.staff_id, NEW.event_id, 1, NEW.checked_in_at)
  ON CONFLICT (staff_id, event_id, date)
  DO UPDATE SET
    checkins_processed = staff_performance.checkins_processed + 1,
    last_activity = NEW.checked_in_at;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Auto-discover gates
CREATE OR REPLACE FUNCTION auto_discover_gates()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-create gate if it doesn't exist
  INSERT INTO public.autonomous_gates (gate_id, event_id, organization_id, last_activity, total_checkins)
  SELECT 
    NEW.gate_id, 
    NEW.event_id, 
    e.organization_id,
    NEW.checked_in_at,
    1
  FROM public.events e
  WHERE e.id = NEW.event_id
  ON CONFLICT (gate_id) 
  DO UPDATE SET
    last_activity = NEW.checked_in_at,
    total_checkins = autonomous_gates.total_checkins + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Update category limits
CREATE OR REPLACE FUNCTION update_category_limits()
RETURNS TRIGGER AS $$
DECLARE
  wristband_category text;
BEGIN
  -- Get wristband category
  SELECT category INTO wristband_category
  FROM public.wristbands
  WHERE id = NEW.wristband_id;
  
  -- Update category count
  INSERT INTO public.event_category_limits (event_id, category, current_count)
  VALUES (NEW.event_id, wristband_category, 1)
  ON CONFLICT (event_id, category)
  DO UPDATE SET
    current_count = event_category_limits.current_count + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
