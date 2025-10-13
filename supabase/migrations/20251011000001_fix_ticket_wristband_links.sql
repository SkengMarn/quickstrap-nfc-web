-- Fix ticket_wristband_links table to add missing columns

DO $$
BEGIN
  -- Add linked_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_wristband_links'
    AND column_name = 'linked_by'
  ) THEN
    ALTER TABLE public.ticket_wristband_links
    ADD COLUMN linked_by uuid REFERENCES auth.users(id);
  END IF;

  -- Add metadata column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_wristband_links'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.ticket_wristband_links
    ADD COLUMN metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Ensure the UNIQUE constraint on event_category_limits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'event_category_limits_event_id_category_key'
  ) THEN
    ALTER TABLE public.event_category_limits
    ADD CONSTRAINT event_category_limits_event_id_category_key
    UNIQUE (event_id, category);
  END IF;
END $$;

SELECT 'ticket_wristband_links table fixed!' as status;
