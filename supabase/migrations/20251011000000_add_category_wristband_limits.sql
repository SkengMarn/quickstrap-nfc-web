-- ============================================================================
-- CATEGORY-BASED WRISTBAND LINKING LIMITS
-- ============================================================================
-- This migration implements:
-- 1. Event category limits configuration per event
-- 2. Ticket-to-wristband many-to-many linking
-- 3. Per-category limit enforcement via triggers
-- 4. Data migration from old schema
-- ============================================================================

-- ============================================================================
-- 1. EVENT CATEGORY LIMITS TABLE
-- ============================================================================
-- Stores the maximum number of wristbands that can be linked to a ticket
-- based on the wristband's category for each event

CREATE TABLE IF NOT EXISTS public.event_category_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  category text NOT NULL,
  max_wristbands integer DEFAULT 1 CHECK (max_wristbands > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (event_id, category)
);

CREATE INDEX idx_event_category_limits_event ON public.event_category_limits(event_id);
CREATE INDEX idx_event_category_limits_category ON public.event_category_limits(category);

COMMENT ON TABLE public.event_category_limits IS 'Per-event, per-category limits for wristband linking';
COMMENT ON COLUMN public.event_category_limits.max_wristbands IS 'Maximum number of wristbands of this category that can be linked to a single ticket';

-- ============================================================================
-- 2. TICKET-WRISTBAND JUNCTION TABLE
-- ============================================================================
-- Many-to-many relationship between tickets and wristbands
-- Replaces the tickets.linked_wristband_id column

CREATE TABLE IF NOT EXISTS public.ticket_wristband_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  wristband_id uuid NOT NULL REFERENCES public.wristbands(id) ON DELETE CASCADE,
  linked_at timestamptz DEFAULT now(),
  linked_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  UNIQUE (wristband_id) -- Each wristband can only be linked to one ticket
);

CREATE INDEX idx_ticket_wristband_links_ticket ON public.ticket_wristband_links(ticket_id);
CREATE INDEX idx_ticket_wristband_links_wristband ON public.ticket_wristband_links(wristband_id);
CREATE INDEX idx_ticket_wristband_links_linked_at ON public.ticket_wristband_links(linked_at);

COMMENT ON TABLE public.ticket_wristband_links IS 'Junction table linking tickets to wristbands with category-based limits';

-- ============================================================================
-- 3. TRIGGER FUNCTION TO ENFORCE CATEGORY LIMITS
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_wristband_category_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count integer;
  max_allowed integer;
  category_name text;
  event_id_val uuid;
  lock_key bigint;
BEGIN
  -- Get category and event from wristband being linked
  SELECT w.category, w.event_id
  INTO category_name, event_id_val
  FROM public.wristbands w
  WHERE w.id = NEW.wristband_id;

  -- Acquire advisory lock to prevent race conditions
  -- Create deterministic lock key from event_id + ticket_id + category
  -- This ensures concurrent inserts for the same ticket+category are serialized
  lock_key := hashtext(event_id_val::text || '-' || NEW.ticket_id::text || '-' || category_name);
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Get the limit for this event + category combination
  SELECT ecl.max_wristbands
  INTO max_allowed
  FROM public.event_category_limits ecl
  WHERE ecl.event_id = event_id_val
    AND ecl.category = category_name;

  -- If no limit is defined for this category, default to 1
  IF max_allowed IS NULL THEN
    max_allowed := 1;
  END IF;

  -- Count how many wristbands of this category are already linked to this ticket
  -- This count is now protected by the advisory lock
  SELECT COUNT(*)
  INTO current_count
  FROM public.ticket_wristband_links twl
  INNER JOIN public.wristbands w ON w.id = twl.wristband_id
  WHERE twl.ticket_id = NEW.ticket_id
    AND w.category = category_name;

  -- Check if we're at or over the limit
  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Ticket already has maximum allowed wristbands (% of %) for category "%"',
      current_count, max_allowed, category_name
      USING HINT = 'Remove an existing wristband before adding a new one, or increase the category limit';
  END IF;

  -- Lock is automatically released at end of transaction
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT
CREATE TRIGGER trg_enforce_wristband_category_limit
  BEFORE INSERT ON public.ticket_wristband_links
  FOR EACH ROW
  EXECUTE FUNCTION enforce_wristband_category_limit();

COMMENT ON FUNCTION enforce_wristband_category_limit() IS 'Enforces per-category wristband linking limits on tickets';

-- ============================================================================
-- 4. HELPER FUNCTION: Auto-populate category limits for new events
-- ============================================================================
-- When wristbands are created/uploaded, auto-create category limit entries

CREATE OR REPLACE FUNCTION auto_create_category_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert category limit if it doesn't exist for this event+category
  INSERT INTO public.event_category_limits (event_id, category, max_wristbands)
  VALUES (NEW.event_id, NEW.category, 1)
  ON CONFLICT (event_id, category) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_create_category_limits
  AFTER INSERT ON public.wristbands
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_category_limits();

COMMENT ON FUNCTION auto_create_category_limits() IS 'Automatically creates default category limits when new wristband categories are detected';

-- ============================================================================
-- 5. DATA MIGRATION: Move existing links to new table
-- ============================================================================

DO $$
DECLARE
  migrated_count integer := 0;
BEGIN
  -- Migrate existing ticket-wristband links from tickets.linked_wristband_id
  -- to ticket_wristband_links table
  INSERT INTO public.ticket_wristband_links (ticket_id, wristband_id, linked_at, linked_by)
  SELECT
    t.id as ticket_id,
    t.linked_wristband_id as wristband_id,
    COALESCE(t.linked_at, t.updated_at) as linked_at,
    t.linked_by
  FROM public.tickets t
  WHERE t.linked_wristband_id IS NOT NULL
  ON CONFLICT (wristband_id) DO NOTHING; -- Skip if already migrated

  GET DIAGNOSTICS migrated_count = ROW_COUNT;

  RAISE NOTICE 'Migrated % existing ticket-wristband links', migrated_count;
END $$;

-- ============================================================================
-- 6. POPULATE DEFAULT CATEGORY LIMITS FOR EXISTING EVENTS
-- ============================================================================

DO $$
DECLARE
  category_count integer := 0;
BEGIN
  -- For each existing event, create default limits based on existing wristband categories
  INSERT INTO public.event_category_limits (event_id, category, max_wristbands)
  SELECT DISTINCT
    w.event_id,
    w.category,
    1 as max_wristbands
  FROM public.wristbands w
  WHERE w.category IS NOT NULL
  ON CONFLICT (event_id, category) DO NOTHING;

  GET DIAGNOSTICS category_count = ROW_COUNT;

  RAISE NOTICE 'Created % default category limits for existing events', category_count;
END $$;

-- ============================================================================
-- 7. UPDATE WRISTBAND STATUS ON LINK/UNLINK
-- ============================================================================

CREATE OR REPLACE FUNCTION update_wristband_status_on_link()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- When linked, update wristband status to 'linked'
    UPDATE public.wristbands
    SET status = 'activated',
        updated_at = now()
    WHERE id = NEW.wristband_id;

    -- Update ticket status to 'linked'
    UPDATE public.tickets
    SET status = 'linked',
        updated_at = now()
    WHERE id = NEW.ticket_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- When unlinked, check if wristband has other links
    IF NOT EXISTS (
      SELECT 1 FROM public.ticket_wristband_links
      WHERE wristband_id = OLD.wristband_id
    ) THEN
      UPDATE public.wristbands
      SET status = 'activated',
          updated_at = now()
      WHERE id = OLD.wristband_id;
    END IF;

    -- Update ticket status if no more wristbands linked
    IF NOT EXISTS (
      SELECT 1 FROM public.ticket_wristband_links
      WHERE ticket_id = OLD.ticket_id
    ) THEN
      UPDATE public.tickets
      SET status = 'unused',
          updated_at = now()
      WHERE id = OLD.ticket_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wristband_status_on_link
  AFTER INSERT OR DELETE ON public.ticket_wristband_links
  FOR EACH ROW
  EXECUTE FUNCTION update_wristband_status_on_link();

-- ============================================================================
-- 8. HELPER VIEWS FOR EASY QUERYING
-- ============================================================================

-- View to see all ticket links with category info
CREATE OR REPLACE VIEW public.ticket_wristband_links_with_details AS
SELECT
  twl.id as link_id,
  twl.ticket_id,
  twl.wristband_id,
  twl.linked_at,
  t.ticket_number,
  t.ticket_category,
  t.holder_name,
  t.event_id,
  w.nfc_id,
  w.category as wristband_category,
  w.status as wristband_status,
  ecl.max_wristbands as category_limit
FROM public.ticket_wristband_links twl
INNER JOIN public.tickets t ON t.id = twl.ticket_id
INNER JOIN public.wristbands w ON w.id = twl.wristband_id
LEFT JOIN public.event_category_limits ecl ON ecl.event_id = t.event_id AND ecl.category = w.category;

COMMENT ON VIEW public.ticket_wristband_links_with_details IS 'Denormalized view of ticket-wristband links with full details';

-- View to see current link counts per ticket
CREATE OR REPLACE VIEW public.ticket_link_counts AS
SELECT
  t.id as ticket_id,
  t.event_id,
  t.ticket_number,
  w.category as wristband_category,
  COUNT(twl.id) as linked_count,
  ecl.max_wristbands as category_limit,
  ecl.max_wristbands - COUNT(twl.id) as remaining_slots
FROM public.tickets t
LEFT JOIN public.ticket_wristband_links twl ON twl.ticket_id = t.id
LEFT JOIN public.wristbands w ON w.id = twl.wristband_id
LEFT JOIN public.event_category_limits ecl ON ecl.event_id = t.event_id AND ecl.category = w.category
GROUP BY t.id, t.event_id, t.ticket_number, w.category, ecl.max_wristbands;

COMMENT ON VIEW public.ticket_link_counts IS 'Shows how many wristbands are linked to each ticket per category';

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.event_category_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_wristband_links ENABLE ROW LEVEL SECURITY;

-- Event category limits: Users can view/manage limits for events in their organization
CREATE POLICY "Users can view event category limits"
  ON public.event_category_limits FOR SELECT
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      INNER JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Admins can manage event category limits"
  ON public.event_category_limits FOR ALL
  USING (
    event_id IN (
      SELECT e.id FROM public.events e
      INNER JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.role IN ('owner', 'admin', 'manager')
    )
  );

-- Ticket-wristband links: Users can view/manage links for events in their organization
CREATE POLICY "Users can view ticket wristband links"
  ON public.ticket_wristband_links FOR SELECT
  USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      INNER JOIN public.events e ON e.id = t.event_id
      INNER JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

CREATE POLICY "Staff can manage ticket wristband links"
  ON public.ticket_wristband_links FOR ALL
  USING (
    ticket_id IN (
      SELECT t.id FROM public.tickets t
      INNER JOIN public.events e ON e.id = t.event_id
      INNER JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE om.user_id = auth.uid() AND om.status = 'active'
    )
  );

-- ============================================================================
-- 10. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_category_limits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_wristband_links TO authenticated;
GRANT SELECT ON public.ticket_wristband_links_with_details TO authenticated;
GRANT SELECT ON public.ticket_link_counts TO authenticated;

-- ============================================================================
-- 11. DEPRECATED COLUMNS (Optional - uncomment after verifying migration)
-- ============================================================================
-- After verifying that the migration works correctly, you can drop the old columns:
--
-- ALTER TABLE public.tickets DROP COLUMN IF EXISTS linked_wristband_id;
-- ALTER TABLE public.tickets DROP COLUMN IF EXISTS linked_at;
-- ALTER TABLE public.tickets DROP COLUMN IF EXISTS linked_by;
--
-- For now, we'll keep them for backwards compatibility and verification

-- ============================================================================
-- COMPLETE
-- ============================================================================

SELECT 'Category-based wristband linking limits migration completed successfully!' as status;
