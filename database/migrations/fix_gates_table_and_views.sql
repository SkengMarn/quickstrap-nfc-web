-- ============================================================================
-- FIX GATES TABLE AND CREATE VIEWS
-- This migration adds missing columns and creates all necessary views
-- ============================================================================

-- ============================================================================
-- STEP 1: Add missing columns to gates table
-- ============================================================================

DO $$
BEGIN
  -- Add updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gates'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.gates ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE '✅ Added column: updated_at to gates table';
  ELSE
    RAISE NOTICE '⏭️  Column updated_at already exists';
  END IF;

  -- Add derivation_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gates'
    AND column_name = 'derivation_method'
  ) THEN
    ALTER TABLE public.gates ADD COLUMN derivation_method TEXT DEFAULT 'manual';
    RAISE NOTICE '✅ Added column: derivation_method to gates table';
  ELSE
    RAISE NOTICE '⏭️  Column derivation_method already exists';
  END IF;

  -- Add derivation_confidence column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gates'
    AND column_name = 'derivation_confidence'
  ) THEN
    ALTER TABLE public.gates ADD COLUMN derivation_confidence NUMERIC DEFAULT 1.0;
    RAISE NOTICE '✅ Added column: derivation_confidence to gates table';
  ELSE
    RAISE NOTICE '⏭️  Column derivation_confidence already exists';
  END IF;

  -- Add spatial_variance column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gates'
    AND column_name = 'spatial_variance'
  ) THEN
    ALTER TABLE public.gates ADD COLUMN spatial_variance NUMERIC DEFAULT 0;
    RAISE NOTICE '✅ Added column: spatial_variance to gates table';
  ELSE
    RAISE NOTICE '⏭️  Column spatial_variance already exists';
  END IF;

  -- Add metadata column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'gates'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.gates ADD COLUMN metadata JSONB DEFAULT '{}'::JSONB;
    RAISE NOTICE '✅ Added column: metadata to gates table';
  ELSE
    RAISE NOTICE '⏭️  Column metadata already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_gates_updated_at ON public.gates;

CREATE TRIGGER set_gates_updated_at
  BEFORE UPDATE ON public.gates
  FOR EACH ROW
  EXECUTE FUNCTION update_gates_updated_at();

RAISE NOTICE '✅ Created trigger: set_gates_updated_at';

-- ============================================================================
-- STEP 3: Update existing gates with default values
-- ============================================================================

UPDATE public.gates
SET
  derivation_method = COALESCE(derivation_method, 'manual'),
  derivation_confidence = COALESCE(derivation_confidence, 1.0),
  spatial_variance = COALESCE(spatial_variance, 0),
  metadata = COALESCE(metadata, '{}'::JSONB),
  updated_at = COALESCE(updated_at, created_at)
WHERE derivation_method IS NULL
   OR derivation_confidence IS NULL
   OR spatial_variance IS NULL
   OR metadata IS NULL
   OR updated_at IS NULL;

-- ============================================================================
-- STEP 4: Create gate_performance_cache table if not exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gate_performance_cache (
  gate_id UUID NOT NULL,
  event_id UUID NOT NULL,
  total_scans INTEGER DEFAULT 0,
  successful_scans INTEGER DEFAULT 0,
  failed_scans INTEGER DEFAULT 0,
  category_breakdown JSONB DEFAULT '{}'::JSONB,
  last_scan_at TIMESTAMP WITH TIME ZONE,
  last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (gate_id, event_id),
  CONSTRAINT fk_gate_performance_gate FOREIGN KEY (gate_id) REFERENCES public.gates(id) ON DELETE CASCADE,
  CONSTRAINT fk_gate_performance_event FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gate_performance_event
ON public.gate_performance_cache (event_id, gate_id, last_scan_at);

-- ============================================================================
-- STEP 5: Create helpful views for gate management
-- ============================================================================

-- Drop existing views if they exist
DROP VIEW IF EXISTS v_gates_with_stats CASCADE;
DROP VIEW IF EXISTS v_event_gate_summary CASCADE;

-- View: Gates with comprehensive statistics
CREATE OR REPLACE VIEW v_gates_with_stats AS
SELECT
  g.id as gate_id,
  g.event_id,
  e.name as event_name,
  g.name as gate_name,
  g.status as gate_status,
  g.latitude,
  g.longitude,
  g.location_description,
  g.health_score,
  g.derivation_method,
  g.derivation_confidence,
  g.spatial_variance,
  g.metadata,
  g.created_at,
  g.updated_at,

  -- Performance stats
  COALESCE(gpc.total_scans, 0) as total_scans,
  COALESCE(gpc.successful_scans, 0) as successful_scans,
  COALESCE(gpc.failed_scans, 0) as failed_scans,
  COALESCE(gpc.category_breakdown, '{}'::JSONB) as category_breakdown,
  gpc.last_scan_at,

  -- Calculate success rate
  CASE
    WHEN COALESCE(gpc.total_scans, 0) > 0
    THEN ROUND((gpc.successful_scans::NUMERIC / gpc.total_scans::NUMERIC) * 100, 2)
    ELSE 0
  END as success_rate_percentage,

  -- Gate health status
  CASE
    WHEN g.status = 'inactive' THEN 'inactive'
    WHEN g.status = 'maintenance' THEN 'maintenance'
    WHEN g.health_score < 50 THEN 'critical'
    WHEN g.health_score < 70 THEN 'warning'
    WHEN COALESCE(gpc.total_scans, 0) = 0 THEN 'no_activity'
    WHEN COALESCE(gpc.total_scans, 0) < 10 THEN 'low_activity'
    ELSE 'healthy'
  END as health_status,

  -- Autonomous learning info (if enabled)
  ag.status as learning_status,
  ag.confidence_score as learning_confidence,
  ag.total_processed as learning_samples,
  ag.last_decision_at as last_learning_update

FROM public.gates g
JOIN public.events e ON g.event_id = e.id
LEFT JOIN public.gate_performance_cache gpc ON g.id = gpc.gate_id AND g.event_id = gpc.event_id
LEFT JOIN public.autonomous_gates ag ON g.id = ag.gate_id
ORDER BY e.name, g.name;

-- View: Event-level gate summary
CREATE OR REPLACE VIEW v_event_gate_summary AS
SELECT
  e.id as event_id,
  e.name as event_name,
  e.lifecycle_status as event_status,

  -- Gate counts
  COUNT(DISTINCT g.id) as total_gates,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'active') as active_gates,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'inactive') as inactive_gates,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'maintenance') as maintenance_gates,

  -- Performance aggregates
  COALESCE(SUM(gpc.total_scans), 0) as total_scans_all_gates,
  COALESCE(SUM(gpc.successful_scans), 0) as successful_scans_all_gates,
  COALESCE(SUM(gpc.failed_scans), 0) as failed_scans_all_gates,

  -- Health metrics
  ROUND(AVG(g.health_score), 2) as avg_health_score,
  MIN(g.health_score) as min_health_score,
  MAX(g.health_score) as max_health_score,

  -- Timestamps
  MAX(gpc.last_scan_at) as last_scan_at,
  MAX(g.updated_at) as last_gate_updated_at,

  -- Overall event gate health
  CASE
    WHEN COUNT(DISTINCT g.id) = 0 THEN 'no_gates'
    WHEN COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'active') = 0 THEN 'no_active_gates'
    WHEN AVG(g.health_score) < 50 THEN 'critical'
    WHEN AVG(g.health_score) < 70 THEN 'needs_attention'
    WHEN COALESCE(SUM(gpc.total_scans), 0) = 0 THEN 'no_activity'
    ELSE 'healthy'
  END as overall_health_status

FROM public.events e
LEFT JOIN public.gates g ON e.id = g.event_id
LEFT JOIN public.gate_performance_cache gpc ON g.id = gpc.gate_id AND e.id = gpc.event_id
GROUP BY e.id, e.name, e.lifecycle_status
ORDER BY e.name;

-- ============================================================================
-- STEP 6: Create function to refresh gate performance cache
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_gate_performance_cache(p_event_id UUID DEFAULT NULL)
RETURNS TABLE(gates_updated INTEGER) AS $$
DECLARE
  v_gates_updated INTEGER := 0;
BEGIN
  -- Delete existing cache for the event(s)
  IF p_event_id IS NOT NULL THEN
    DELETE FROM public.gate_performance_cache WHERE event_id = p_event_id;
  ELSE
    DELETE FROM public.gate_performance_cache;
  END IF;

  -- Rebuild cache from checkin_logs
  WITH gate_stats AS (
    SELECT
      cl.gate_id,
      cl.event_id,
      COUNT(*) as total_scans,
      COUNT(*) FILTER (WHERE cl.status = 'success') as successful_scans,
      COUNT(*) FILTER (WHERE cl.status != 'success') as failed_scans,
      MAX(cl.timestamp) as last_scan_at
    FROM public.checkin_logs cl
    WHERE cl.gate_id IS NOT NULL
      AND (p_event_id IS NULL OR cl.event_id = p_event_id)
    GROUP BY cl.gate_id, cl.event_id
  ),
  category_stats AS (
    SELECT
      cl.gate_id,
      cl.event_id,
      JSONB_OBJECT_AGG(
        COALESCE(w.category, 'General'),
        COUNT(*)
      ) as category_breakdown
    FROM public.checkin_logs cl
    LEFT JOIN public.wristbands w ON cl.wristband_id = w.id
    WHERE cl.gate_id IS NOT NULL
      AND (p_event_id IS NULL OR cl.event_id = p_event_id)
    GROUP BY cl.gate_id, cl.event_id
  )
  INSERT INTO public.gate_performance_cache (
    gate_id,
    event_id,
    total_scans,
    successful_scans,
    failed_scans,
    category_breakdown,
    last_scan_at,
    last_computed_at
  )
  SELECT
    gs.gate_id,
    gs.event_id,
    gs.total_scans,
    gs.successful_scans,
    gs.failed_scans,
    COALESCE(cs.category_breakdown, '{}'::JSONB),
    gs.last_scan_at,
    NOW()
  FROM gate_stats gs
  LEFT JOIN category_stats cs ON gs.gate_id = cs.gate_id AND gs.event_id = cs.event_id;

  GET DIAGNOSTICS v_gates_updated = ROW_COUNT;

  RETURN QUERY SELECT v_gates_updated;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Backfill performance cache with existing data
-- ============================================================================

DO $$
DECLARE
  v_rows_inserted INTEGER;
BEGIN
  SELECT * INTO v_rows_inserted FROM refresh_gate_performance_cache();
  RAISE NOTICE '✅ Backfilled gate_performance_cache with % rows', v_rows_inserted;
END $$;

-- ============================================================================
-- STEP 8: Create trigger to auto-update cache on new checkins
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gate_performance_on_checkin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gate_id IS NOT NULL THEN
    INSERT INTO public.gate_performance_cache (
      gate_id,
      event_id,
      total_scans,
      successful_scans,
      failed_scans,
      last_scan_at,
      last_computed_at
    )
    VALUES (
      NEW.gate_id,
      NEW.event_id,
      1,
      CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status != 'success' THEN 1 ELSE 0 END,
      NEW.timestamp,
      NOW()
    )
    ON CONFLICT (gate_id, event_id)
    DO UPDATE SET
      total_scans = gate_performance_cache.total_scans + 1,
      successful_scans = gate_performance_cache.successful_scans +
        CASE WHEN NEW.status = 'success' THEN 1 ELSE 0 END,
      failed_scans = gate_performance_cache.failed_scans +
        CASE WHEN NEW.status != 'success' THEN 1 ELSE 0 END,
      last_scan_at = NEW.timestamp,
      last_computed_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_gate_cache_on_checkin ON public.checkin_logs;

CREATE TRIGGER update_gate_cache_on_checkin
  AFTER INSERT OR UPDATE OF gate_id ON public.checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_gate_performance_on_checkin();

-- ============================================================================
-- STEP 9: Verification
-- ============================================================================

DO $$
DECLARE
  v_gates_count INTEGER;
  v_cache_count INTEGER;
  v_views_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check gates
  SELECT COUNT(*) INTO v_gates_count FROM public.gates;
  RAISE NOTICE '📍 Total gates: %', v_gates_count;

  -- Check cache
  SELECT COUNT(*) INTO v_cache_count FROM public.gate_performance_cache;
  RAISE NOTICE '📊 Performance cache entries: %', v_cache_count;

  -- Check views
  SELECT COUNT(*) INTO v_views_count
  FROM information_schema.views
  WHERE table_schema = 'public'
  AND table_name IN ('v_gates_with_stats', 'v_event_gate_summary');
  RAISE NOTICE '👁️  Views created: %', v_views_count;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Available views:';
  RAISE NOTICE '  • v_gates_with_stats - Detailed gate statistics';
  RAISE NOTICE '  • v_event_gate_summary - Event-level gate summary';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Available functions:';
  RAISE NOTICE '  • refresh_gate_performance_cache() - Manual cache refresh';
  RAISE NOTICE '';
  RAISE NOTICE 'Example queries:';
  RAISE NOTICE '  SELECT * FROM v_gates_with_stats;';
  RAISE NOTICE '  SELECT * FROM v_event_gate_summary;';
  RAISE NOTICE '  SELECT * FROM refresh_gate_performance_cache();';
  RAISE NOTICE '';
END $$;
