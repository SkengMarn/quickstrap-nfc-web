-- Fix series status updates by creating a function that bypasses RLS
-- This function will handle status updates and state transitions properly

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_series_status(uuid, text, uuid);

-- Create function to update series status with proper permissions
CREATE OR REPLACE FUNCTION update_series_status(
  p_series_id uuid,
  p_new_status text,
  p_changed_by uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_old_status text;
  v_result json;
BEGIN
  -- Get current status
  SELECT lifecycle_status INTO v_old_status
  FROM event_series
  WHERE id = p_series_id;

  -- Update the series status
  UPDATE event_series
  SET
    lifecycle_status = p_new_status,
    status_changed_at = now(),
    status_changed_by = p_changed_by,
    updated_at = now()
  WHERE id = p_series_id;

  -- Insert state transition record (this will bypass RLS due to SECURITY DEFINER)
  INSERT INTO series_state_transitions (
    series_id,
    from_status,
    to_status,
    changed_by,
    automated,
    created_at
  ) VALUES (
    p_series_id,
    v_old_status,
    p_new_status,
    p_changed_by,
    false,
    now()
  );

  -- Return success result
  v_result := json_build_object(
    'success', true,
    'series_id', p_series_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_series_status(uuid, text, uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION update_series_status IS 'Updates series lifecycle status and creates state transition record, bypassing RLS';
