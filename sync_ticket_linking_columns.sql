-- ============================================================================
-- SYNC TICKET LINKING COLUMNS (If keeping both for backward compatibility)
-- ============================================================================

-- Create a trigger to keep both columns in sync
CREATE OR REPLACE FUNCTION sync_ticket_linking_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- When ticket_linking_mode changes, update requires_ticket_linking
  IF OLD.ticket_linking_mode IS DISTINCT FROM NEW.ticket_linking_mode THEN
    NEW.requires_ticket_linking = CASE 
      WHEN NEW.ticket_linking_mode IN ('optional', 'required') THEN true
      WHEN NEW.ticket_linking_mode = 'disabled' THEN false
      ELSE NEW.requires_ticket_linking
    END;
  END IF;
  
  -- When requires_ticket_linking changes, update ticket_linking_mode
  IF OLD.requires_ticket_linking IS DISTINCT FROM NEW.requires_ticket_linking THEN
    NEW.ticket_linking_mode = CASE 
      WHEN NEW.requires_ticket_linking = true THEN 'required'
      WHEN NEW.requires_ticket_linking = false THEN 'disabled'
      ELSE NEW.ticket_linking_mode
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger
DROP TRIGGER IF EXISTS sync_ticket_linking ON events;
CREATE TRIGGER sync_ticket_linking
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION sync_ticket_linking_columns();

-- ============================================================================
-- BIDIRECTIONAL SYNC: tickets.linked_wristband_id ↔ ticket_wristband_links
-- ============================================================================
-- Maintains backward compatibility by keeping both old column and new table in sync

-- Function to sync from ticket_wristband_links → tickets.linked_wristband_id
-- NOTE: The legacy column only stores the primary/first link, not all links
CREATE OR REPLACE FUNCTION sync_ticket_wristband_to_legacy()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if tickets.linked_wristband_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'tickets'
    AND column_name = 'linked_wristband_id'
  ) THEN
    IF TG_OP = 'INSERT' THEN
      -- Only set linked_wristband_id if it's currently NULL (first/primary link only)
      UPDATE public.tickets
      SET
        linked_wristband_id = NEW.wristband_id,
        linked_at = NEW.linked_at,
        linked_by = NEW.linked_by
      WHERE id = NEW.ticket_id AND linked_wristband_id IS NULL;

    ELSIF TG_OP = 'DELETE' THEN
      -- Clear tickets.linked_wristband_id only if this was the linked wristband
      -- Then promote the next link if one exists
      IF EXISTS (SELECT 1 FROM public.tickets WHERE id = OLD.ticket_id AND linked_wristband_id = OLD.wristband_id) THEN
        -- Find the next link to promote (oldest by created_at)
        WITH next_link AS (
          SELECT wristband_id, linked_at, linked_by
          FROM public.ticket_wristband_links
          WHERE ticket_id = OLD.ticket_id AND id != OLD.id
          ORDER BY created_at ASC
          LIMIT 1
        )
        UPDATE public.tickets
        SET
          linked_wristband_id = (SELECT wristband_id FROM next_link),
          linked_at = (SELECT linked_at FROM next_link),
          linked_by = (SELECT linked_by FROM next_link)
        WHERE id = OLD.ticket_id;
      END IF;

    ELSIF TG_OP = 'UPDATE' THEN
      -- Only update if this is the currently linked wristband
      UPDATE public.tickets
      SET
        linked_wristband_id = NEW.wristband_id,
        linked_at = NEW.linked_at,
        linked_by = NEW.linked_by
      WHERE id = NEW.ticket_id AND linked_wristband_id = OLD.wristband_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to sync from tickets.linked_wristband_id → ticket_wristband_links
CREATE OR REPLACE FUNCTION sync_legacy_to_ticket_wristband()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if going from NULL to a value or changing value
  IF NEW.linked_wristband_id IS NOT NULL AND
     (OLD.linked_wristband_id IS NULL OR OLD.linked_wristband_id != NEW.linked_wristband_id) THEN

    -- Remove old link if it exists
    IF OLD.linked_wristband_id IS NOT NULL THEN
      DELETE FROM public.ticket_wristband_links
      WHERE ticket_id = NEW.id AND wristband_id = OLD.linked_wristband_id;
    END IF;

    -- Create new link
    INSERT INTO public.ticket_wristband_links (ticket_id, wristband_id, linked_at, linked_by)
    VALUES (NEW.id, NEW.linked_wristband_id, NEW.linked_at, NEW.linked_by)
    ON CONFLICT (wristband_id) DO UPDATE
    SET
      linked_at = EXCLUDED.linked_at,
      linked_by = EXCLUDED.linked_by
    WHERE public.ticket_wristband_links.ticket_id = EXCLUDED.ticket_id;

  ELSIF NEW.linked_wristband_id IS NULL AND OLD.linked_wristband_id IS NOT NULL THEN
    -- Clear link when set to NULL
    DELETE FROM public.ticket_wristband_links
    WHERE ticket_id = NEW.id AND wristband_id = OLD.linked_wristband_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers (only if legacy column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'tickets'
    AND column_name = 'linked_wristband_id'
  ) THEN
    -- Trigger on ticket_wristband_links to update tickets.linked_wristband_id
    DROP TRIGGER IF EXISTS sync_to_legacy_wristband ON public.ticket_wristband_links;
    CREATE TRIGGER sync_to_legacy_wristband
      AFTER INSERT OR UPDATE OR DELETE ON public.ticket_wristband_links
      FOR EACH ROW
      EXECUTE FUNCTION sync_ticket_wristband_to_legacy();

    -- Trigger on tickets to update ticket_wristband_links
    DROP TRIGGER IF EXISTS sync_from_legacy_wristband ON public.tickets;
    CREATE TRIGGER sync_from_legacy_wristband
      AFTER UPDATE OF linked_wristband_id ON public.tickets
      FOR EACH ROW
      EXECUTE FUNCTION sync_legacy_to_ticket_wristband();

    RAISE NOTICE 'Bidirectional ticket-wristband sync triggers created successfully';
  ELSE
    RAISE NOTICE 'Legacy column tickets.linked_wristband_id does not exist - sync triggers not needed';
  END IF;
END $$;

-- ============================================================================
-- NOTE: This approach maintains backward compatibility but adds complexity
-- Recommendation: Use Option 1 (remove legacy column) for cleaner schema
-- ============================================================================
