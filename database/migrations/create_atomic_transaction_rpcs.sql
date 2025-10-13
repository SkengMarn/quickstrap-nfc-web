-- ============================================================================
-- ATOMIC TRANSACTION RPC FUNCTIONS
-- These ensure data consistency for ticket-wristband linking operations
-- Run this migration in Supabase SQL Editor BEFORE deploying the app
-- ============================================================================

-- ============================================================================
-- 1. LINK WRISTBAND TO TICKET (ATOMIC)
-- ============================================================================
-- This function atomically links a wristband to a ticket
-- Both updates succeed or both fail - no partial state

CREATE OR REPLACE FUNCTION link_wristband_to_ticket(
  p_wristband_id uuid,
  p_ticket_id uuid,
  p_attendee_name text,
  p_attendee_email text,
  p_linked_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_wristband_nfc_id text;
  v_ticket_code text;
BEGIN
  -- Start transaction (implicit in function)

  -- Update wristband
  UPDATE public.wristbands
  SET
    linked_ticket_id = p_ticket_id,
    attendee_name = p_attendee_name,
    attendee_email = p_attendee_email,
    linked_at = NOW(),
    linked_by = p_linked_by,
    updated_at = NOW()
  WHERE id = p_wristband_id
  RETURNING nfc_id INTO v_wristband_nfc_id;

  IF v_wristband_nfc_id IS NULL THEN
    RAISE EXCEPTION 'Wristband not found: %', p_wristband_id;
  END IF;

  -- Update ticket
  UPDATE public.tickets
  SET
    linked_wristband_id = p_wristband_id,
    holder_name = p_attendee_name,
    holder_email = p_attendee_email,
    linked_at = NOW(),
    linked_by = p_linked_by,
    updated_at = NOW()
  WHERE id = p_ticket_id
  RETURNING code INTO v_ticket_code;

  IF v_ticket_code IS NULL THEN
    RAISE EXCEPTION 'Ticket not found: %', p_ticket_id;
  END IF;

  -- Build result
  v_result := json_build_object(
    'success', true,
    'wristband_id', p_wristband_id,
    'wristband_nfc_id', v_wristband_nfc_id,
    'ticket_id', p_ticket_id,
    'ticket_code', v_ticket_code,
    'linked_at', NOW()
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Failed to link wristband to ticket: %', SQLERRM;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION link_wristband_to_ticket(uuid, uuid, text, text, uuid) TO authenticated;

-- ============================================================================
-- 2. UNLINK WRISTBAND FROM TICKET (ATOMIC)
-- ============================================================================
-- This function atomically unlinks a wristband from a ticket
-- Both updates succeed or both fail - no partial state

CREATE OR REPLACE FUNCTION unlink_wristband_from_ticket(
  p_wristband_id uuid,
  p_ticket_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
  v_wristband_nfc_id text;
  v_ticket_code text;
BEGIN
  -- Start transaction (implicit in function)

  -- Update wristband
  UPDATE public.wristbands
  SET
    linked_ticket_id = NULL,
    attendee_name = NULL,
    attendee_email = NULL,
    linked_at = NULL,
    linked_by = NULL,
    updated_at = NOW()
  WHERE id = p_wristband_id
  RETURNING nfc_id INTO v_wristband_nfc_id;

  IF v_wristband_nfc_id IS NULL THEN
    RAISE EXCEPTION 'Wristband not found: %', p_wristband_id;
  END IF;

  -- Update ticket
  UPDATE public.tickets
  SET
    linked_wristband_id = NULL,
    linked_at = NULL,
    linked_by = NULL,
    updated_at = NOW()
  WHERE id = p_ticket_id
  RETURNING code INTO v_ticket_code;

  IF v_ticket_code IS NULL THEN
    RAISE EXCEPTION 'Ticket not found: %', p_ticket_id;
  END IF;

  -- Build result
  v_result := json_build_object(
    'success', true,
    'wristband_id', p_wristband_id,
    'wristband_nfc_id', v_wristband_nfc_id,
    'ticket_id', p_ticket_id,
    'ticket_code', v_ticket_code,
    'unlinked_at', NOW()
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Failed to unlink wristband from ticket: %', SQLERRM;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION unlink_wristband_from_ticket(uuid, uuid) TO authenticated;

-- ============================================================================
-- 3. VERIFICATION
-- ============================================================================

-- Verify functions were created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'link_wristband_to_ticket'
  ) THEN
    RAISE EXCEPTION 'Function link_wristband_to_ticket was not created';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'unlink_wristband_from_ticket'
  ) THEN
    RAISE EXCEPTION 'Function unlink_wristband_from_ticket was not created';
  END IF;

  RAISE NOTICE '✅ All atomic transaction RPC functions created successfully';
END $$;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Link wristband to ticket:
-- SELECT * FROM link_wristband_to_ticket(
--   'wristband-uuid',
--   'ticket-uuid',
--   'John Doe',
--   'john@example.com',
--   'user-uuid'
-- );

-- Unlink wristband from ticket:
-- SELECT * FROM unlink_wristband_from_ticket(
--   'wristband-uuid',
--   'ticket-uuid'
-- );

COMMENT ON FUNCTION link_wristband_to_ticket IS 'Atomically link a wristband to a ticket - both updates succeed or both fail';
COMMENT ON FUNCTION unlink_wristband_from_ticket IS 'Atomically unlink a wristband from a ticket - both updates succeed or both fail';
