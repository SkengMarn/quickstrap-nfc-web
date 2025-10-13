-- ============================================================================
-- CHECKOUT WRISTBAND TRANSACTION FUNCTION
-- Atomic operation to checkout wristband and unlink all tickets
-- ============================================================================

CREATE OR REPLACE FUNCTION checkout_wristband_transaction(p_nfc_id TEXT)
RETURNS TABLE (
  wristband_id UUID,
  nfc_id TEXT,
  category TEXT,
  tickets_unlinked INTEGER,
  ticket_codes TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_wristband_id UUID;
  v_nfc_id TEXT;
  v_category TEXT;
  v_tickets_unlinked INTEGER;
  v_ticket_codes TEXT[];
BEGIN
  -- Start transaction (implicit in function)

  -- Step 1: Find and validate wristband
  SELECT id, nfc_id, category
  INTO v_wristband_id, v_nfc_id, v_category
  FROM wristbands
  WHERE nfc_id = p_nfc_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wristband with NFC ID % not found', p_nfc_id;
  END IF;

  -- Step 2: Unlink all tickets and capture ticket codes
  WITH unlinked AS (
    UPDATE tickets
    SET
      wristband_id = NULL,
      unlinked_at = NOW()
    WHERE wristband_id = v_wristband_id
    RETURNING code
  )
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(code)
  INTO v_tickets_unlinked, v_ticket_codes
  FROM unlinked;

  -- Handle case where no tickets were linked
  IF v_tickets_unlinked IS NULL THEN
    v_tickets_unlinked := 0;
    v_ticket_codes := ARRAY[]::TEXT[];
  END IF;

  -- Step 3: Deactivate the wristband
  UPDATE wristbands
  SET
    is_active = FALSE,
    deactivated_at = NOW()
  WHERE id = v_wristband_id;

  -- Return results
  RETURN QUERY SELECT
    v_wristband_id,
    v_nfc_id,
    v_category,
    v_tickets_unlinked,
    COALESCE(v_ticket_codes, ARRAY[]::TEXT[]);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION checkout_wristband_transaction(TEXT) TO authenticated;

COMMENT ON FUNCTION checkout_wristband_transaction IS 'Atomically checkout a wristband by deactivating it and unlinking all tickets in a single transaction';
