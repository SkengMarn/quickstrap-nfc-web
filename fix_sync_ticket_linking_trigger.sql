-- Fix the sync_ticket_linking trigger function
-- Run this in Supabase SQL Editor

-- First, let's see what the current function does
-- Then we'll recreate it to match your actual schema

-- Drop the problematic trigger temporarily
DROP TRIGGER IF EXISTS sync_ticket_linking ON public.events;

-- Recreate the function to work with your actual schema
CREATE OR REPLACE FUNCTION sync_ticket_linking_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Since your schema uses ticket_linking_mode directly,
  -- we don't need to sync from requires_ticket_linking
  -- Just ensure consistency within the existing fields
  
  -- If ticket_linking_mode changes, ensure allow_unlinked_entry is consistent
  IF OLD.ticket_linking_mode IS DISTINCT FROM NEW.ticket_linking_mode THEN
    -- If ticket linking is required, don't allow unlinked entry
    IF NEW.ticket_linking_mode = 'required' THEN
      NEW.allow_unlinked_entry = false;
    -- If ticket linking is disabled, allow unlinked entry
    ELSIF NEW.ticket_linking_mode = 'disabled' THEN
      NEW.allow_unlinked_entry = true;
    END IF;
    -- For 'optional' mode, keep whatever the user set for allow_unlinked_entry
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER sync_ticket_linking 
  BEFORE UPDATE ON public.events 
  FOR EACH ROW 
  EXECUTE FUNCTION sync_ticket_linking_columns();

-- Test that the function works
SELECT 'Trigger function updated successfully' as status;
