-- =====================================================
-- ADVANCED GATE INTELLIGENCE & DISCOVERY SYSTEM
-- =====================================================
-- Sophisticated gate discovery with mathematical confidence algorithms

-- 1. GATE INTELLIGENCE CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.gate_intelligence_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  event_id uuid REFERENCES public.events(id),
  discovery_threshold decimal DEFAULT 0.75,
  merge_confidence_threshold decimal DEFAULT 0.85,
  location_radius_meters decimal DEFAULT 50.0,
  time_window_minutes integer DEFAULT 15,
  min_checkins_for_gate integer DEFAULT 5,
  auto_approval_threshold decimal DEFAULT 0.95,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. GATE DISCOVERY ANALYTICS TABLE
CREATE TABLE IF NOT EXISTS public.gate_discovery_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id),
  gate_id text,
  discovery_method text,
  confidence_score decimal,
  location_cluster_size integer,
  time_cluster_density decimal,
  spatial_variance decimal,
  temporal_variance decimal,
  checkin_velocity decimal,
  staff_consistency_score decimal,
  discovered_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- 3. GATE CLUSTERING RESULTS TABLE
CREATE TABLE IF NOT EXISTS public.gate_clustering_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id),
  cluster_id text,
  gate_candidates text[],
  centroid_lat decimal,
  centroid_lng decimal,
  cluster_radius decimal,
  cluster_density decimal,
  confidence_score decimal,
  recommended_action text,
  created_at timestamptz DEFAULT now()
);

-- 4. ADVANCED GATE DISCOVERY FUNCTION WITH VIRTUAL GATE CLUSTERING
CREATE OR REPLACE FUNCTION discover_gates_with_intelligence(p_event_id uuid)
RETURNS TABLE (
  gate_id text,
  confidence_score decimal,
  recommendation text,
  cluster_info jsonb,
  is_virtual_gate boolean,
  parent_cluster_id text
) AS $$
DECLARE
  config_rec RECORD;
  checkin_rec RECORD;
  cluster_rec RECORD;
  gate_confidence decimal;
  location_variance decimal;
  time_variance decimal;
  staff_consistency decimal;
  proximity_threshold decimal := 25.0; -- 25 meters for virtual gate clustering
BEGIN
  -- Get configuration for this event
  SELECT * INTO config_rec 
  FROM public.gate_intelligence_config 
  WHERE event_id = p_event_id OR (event_id IS NULL AND organization_id = (
    SELECT organization_id FROM public.events WHERE id = p_event_id
  ))
  ORDER BY event_id NULLS LAST
  LIMIT 1;

  -- If no config, use defaults
  IF config_rec IS NULL THEN
    config_rec.discovery_threshold := 0.75;
    config_rec.merge_confidence_threshold := 0.85;
    config_rec.location_radius_meters := 50.0;
    config_rec.time_window_minutes := 15;
    config_rec.min_checkins_for_gate := 5;
    config_rec.auto_approval_threshold := 0.95;
  END IF;

  -- CRITICAL: Only analyze CHECK-INS, not scans - only check-ins enforce gates
  -- Scans are irrelevant for gate discovery
  FOR checkin_rec IN 
    SELECT 
      cl.gate_id,
      COUNT(*) as checkin_count,
      AVG(cl.location_lat) as avg_lat,
      AVG(cl.location_lng) as avg_lng,
      STDDEV(cl.location_lat) as lat_variance,
      STDDEV(cl.location_lng) as lng_variance,
      COUNT(DISTINCT cl.staff_id) as unique_staff,
      COUNT(DISTINCT DATE(cl.checked_in_at)) as active_days,
      MIN(cl.checked_in_at) as first_checkin,
      MAX(cl.checked_in_at) as last_checkin,
      EXTRACT(EPOCH FROM (MAX(cl.checked_in_at) - MIN(cl.checked_in_at))) / 3600 as duration_hours
    FROM public.checkin_logs cl
    WHERE cl.event_id = p_event_id 
      AND cl.gate_id IS NOT NULL
      AND cl.location_lat IS NOT NULL 
      AND cl.location_lng IS NOT NULL
      -- ONLY CHECK-INS COUNT - exclude scans/other operations
      AND cl.is_probation = false  -- Only confirmed check-ins
      AND cl.wristband_id IS NOT NULL  -- Must have actual wristband check-in
    GROUP BY cl.gate_id
    HAVING COUNT(*) >= config_rec.min_checkins_for_gate
  LOOP
    -- Calculate location variance (spatial consistency)
    location_variance := COALESCE(
      SQRT(POWER(COALESCE(checkin_rec.lat_variance, 0), 2) + POWER(COALESCE(checkin_rec.lng_variance, 0), 2)),
      0
    );
    
    -- Calculate temporal consistency
    time_variance := CASE 
      WHEN checkin_rec.duration_hours > 0 THEN
        checkin_rec.checkin_count / checkin_rec.duration_hours
      ELSE 1
    END;
    
    -- Calculate staff consistency (how many different staff use this gate)
    staff_consistency := CASE 
      WHEN checkin_rec.unique_staff > 0 THEN
        LEAST(checkin_rec.checkin_count::decimal / checkin_rec.unique_staff, 10) / 10
      ELSE 0
    END;
    
    -- Calculate overall confidence score using weighted algorithm
    gate_confidence := (
      -- Spatial consistency (40% weight)
      (CASE WHEN location_variance < 0.001 THEN 1.0 
            WHEN location_variance < 0.01 THEN 0.8
            WHEN location_variance < 0.1 THEN 0.6
            ELSE 0.3 END) * 0.4 +
      
      -- Temporal consistency (30% weight)  
      (CASE WHEN time_variance > 5 THEN 1.0
            WHEN time_variance > 2 THEN 0.8
            WHEN time_variance > 1 THEN 0.6
            ELSE 0.4 END) * 0.3 +
      
      -- Staff consistency (20% weight)
      staff_consistency * 0.2 +
      
      -- Volume consistency (10% weight)
      (CASE WHEN checkin_rec.checkin_count > 50 THEN 1.0
            WHEN checkin_rec.checkin_count > 20 THEN 0.8
            WHEN checkin_rec.checkin_count > 10 THEN 0.6
            ELSE 0.4 END) * 0.1
    );
    
    -- Store analytics
    INSERT INTO public.gate_discovery_analytics (
      event_id, gate_id, discovery_method, confidence_score,
      location_cluster_size, spatial_variance, temporal_variance,
      checkin_velocity, staff_consistency_score, metadata
    ) VALUES (
      p_event_id, checkin_rec.gate_id, 'mathematical_analysis', gate_confidence,
      checkin_rec.checkin_count, location_variance, time_variance,
      time_variance, staff_consistency,
      jsonb_build_object(
        'checkin_count', checkin_rec.checkin_count,
        'unique_staff', checkin_rec.unique_staff,
        'active_days', checkin_rec.active_days,
        'avg_location', jsonb_build_object('lat', checkin_rec.avg_lat, 'lng', checkin_rec.avg_lng)
      )
    );
    
    -- Check for proximity to existing gates (virtual gate detection)
    DECLARE
      nearby_gates RECORD;
      is_virtual boolean := false;
      cluster_id text := null;
      distance_to_nearest decimal;
    BEGIN
      -- Find nearby gates within proximity threshold
      SELECT g.gate_id, 
             111320 * SQRT(
               POWER(g.avg_lat - checkin_rec.avg_lat, 2) + 
               POWER((g.avg_lng - checkin_rec.avg_lng) * COS(RADIANS((g.avg_lat + checkin_rec.avg_lat) / 2)), 2)
             ) as distance
      INTO nearby_gates
      FROM (
        SELECT 
          cl2.gate_id,
          AVG(cl2.location_lat) as avg_lat,
          AVG(cl2.location_lng) as avg_lng
        FROM public.checkin_logs cl2
        WHERE cl2.event_id = p_event_id 
          AND cl2.gate_id != checkin_rec.gate_id
          AND cl2.gate_id IS NOT NULL
          AND cl2.is_probation = false
          AND cl2.wristband_id IS NOT NULL
        GROUP BY cl2.gate_id
      ) g
      ORDER BY 111320 * SQRT(
        POWER(g.avg_lat - checkin_rec.avg_lat, 2) + 
        POWER((g.avg_lng - checkin_rec.avg_lng) * COS(RADIANS((g.avg_lat + checkin_rec.avg_lat) / 2)), 2)
      )
      LIMIT 1;
      
      -- Determine if this is a virtual gate
      IF nearby_gates.distance IS NOT NULL AND nearby_gates.distance <= proximity_threshold THEN
        is_virtual := true;
        cluster_id := 'cluster_' || nearby_gates.gate_id;
        distance_to_nearest := nearby_gates.distance;
        
        -- Store clustering result
        INSERT INTO public.gate_clustering_results (
          event_id, cluster_id, gate_candidates, 
          centroid_lat, centroid_lng, cluster_radius,
          cluster_density, confidence_score, recommended_action
        ) VALUES (
          p_event_id, cluster_id, 
          ARRAY[nearby_gates.gate_id, checkin_rec.gate_id],
          (checkin_rec.avg_lat + (SELECT AVG(location_lat) FROM public.checkin_logs WHERE gate_id = nearby_gates.gate_id AND event_id = p_event_id)) / 2,
          (checkin_rec.avg_lng + (SELECT AVG(location_lng) FROM public.checkin_logs WHERE gate_id = nearby_gates.gate_id AND event_id = p_event_id)) / 2,
          distance_to_nearest,
          checkin_rec.checkin_count + COALESCE((SELECT COUNT(*) FROM public.checkin_logs WHERE gate_id = nearby_gates.gate_id AND event_id = p_event_id), 0),
          gate_confidence,
          CASE WHEN distance_to_nearest <= 10 THEN 'MERGE_GATES' 
               WHEN distance_to_nearest <= 25 THEN 'CREATE_VIRTUAL_GATE'
               ELSE 'SEPARATE_GATES' END
        ) ON CONFLICT DO NOTHING;
      END IF;
    END;
    
    -- Return results with virtual gate information
    RETURN QUERY SELECT 
      checkin_rec.gate_id,
      gate_confidence,
      CASE 
        WHEN is_virtual AND distance_to_nearest <= 10 THEN 'MERGE_WITH_NEARBY'
        WHEN is_virtual AND distance_to_nearest <= 25 THEN 'CREATE_VIRTUAL_GATE'
        WHEN gate_confidence >= config_rec.auto_approval_threshold THEN 'AUTO_APPROVE'
        WHEN gate_confidence >= config_rec.discovery_threshold THEN 'RECOMMEND_APPROVE'
        WHEN gate_confidence >= 0.5 THEN 'MANUAL_REVIEW'
        ELSE 'REJECT'
      END,
      jsonb_build_object(
        'confidence', gate_confidence,
        'location_variance', location_variance,
        'staff_consistency', staff_consistency,
        'checkin_velocity', time_variance,
        'is_virtual', is_virtual,
        'distance_to_nearest', COALESCE(distance_to_nearest, 0),
        'cluster_id', cluster_id,
        'recommendation_reason', 
          CASE 
            WHEN is_virtual AND distance_to_nearest <= 10 THEN 'Too close to existing gate - merge recommended'
            WHEN is_virtual AND distance_to_nearest <= 25 THEN 'Virtual gate - close proximity detected'
            WHEN gate_confidence >= config_rec.auto_approval_threshold THEN 'High confidence - all metrics excellent'
            WHEN gate_confidence >= config_rec.discovery_threshold THEN 'Good confidence - meets discovery threshold'
            WHEN gate_confidence >= 0.5 THEN 'Moderate confidence - requires manual review'
            ELSE 'Low confidence - likely false positive'
          END
      ),
      is_virtual,
      cluster_id;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 5. GATE MERGE DETECTION FUNCTION
CREATE OR REPLACE FUNCTION detect_gate_merges(p_event_id uuid)
RETURNS TABLE (
  primary_gate text,
  merge_candidate text,
  merge_confidence decimal,
  distance_meters decimal,
  overlap_score decimal
) AS $$
DECLARE
  gate1_rec RECORD;
  gate2_rec RECORD;
  distance_m decimal;
  time_overlap decimal;
  staff_overlap decimal;
  merge_score decimal;
BEGIN
  -- Compare all gate pairs for potential merges
  FOR gate1_rec IN 
    SELECT gate_id, AVG(location_lat) as lat, AVG(location_lng) as lng,
           COUNT(*) as checkins, COUNT(DISTINCT staff_id) as staff_count,
           MIN(checked_in_at) as start_time, MAX(checked_in_at) as end_time
    FROM public.checkin_logs 
    WHERE event_id = p_event_id AND gate_id IS NOT NULL
    GROUP BY gate_id
  LOOP
    FOR gate2_rec IN 
      SELECT gate_id, AVG(location_lat) as lat, AVG(location_lng) as lng,
             COUNT(*) as checkins, COUNT(DISTINCT staff_id) as staff_count,
             MIN(checked_in_at) as start_time, MAX(checked_in_at) as end_time
      FROM public.checkin_logs 
      WHERE event_id = p_event_id AND gate_id IS NOT NULL AND gate_id > gate1_rec.gate_id
      GROUP BY gate_id
    LOOP
      -- Calculate distance between gates (Haversine formula approximation)
      distance_m := 111320 * SQRT(
        POWER(gate2_rec.lat - gate1_rec.lat, 2) + 
        POWER((gate2_rec.lng - gate1_rec.lng) * COS(RADIANS((gate1_rec.lat + gate2_rec.lat) / 2)), 2)
      );
      
      -- Calculate time overlap
      time_overlap := CASE 
        WHEN gate1_rec.end_time < gate2_rec.start_time OR gate2_rec.end_time < gate1_rec.start_time THEN 0
        ELSE EXTRACT(EPOCH FROM (
          LEAST(gate1_rec.end_time, gate2_rec.end_time) - 
          GREATEST(gate1_rec.start_time, gate2_rec.start_time)
        )) / EXTRACT(EPOCH FROM (
          GREATEST(gate1_rec.end_time, gate2_rec.end_time) - 
          LEAST(gate1_rec.start_time, gate2_rec.start_time)
        ))
      END;
      
      -- Calculate staff overlap (simplified)
      staff_overlap := CASE 
        WHEN gate1_rec.staff_count + gate2_rec.staff_count > 0 THEN
          (SELECT COUNT(DISTINCT staff_id)::decimal 
           FROM public.checkin_logs 
           WHERE event_id = p_event_id 
             AND gate_id IN (gate1_rec.gate_id, gate2_rec.gate_id)
          ) / (gate1_rec.staff_count + gate2_rec.staff_count)
        ELSE 0
      END;
      
      -- Calculate merge confidence
      merge_score := (
        -- Distance factor (closer = higher score)
        (CASE WHEN distance_m < 10 THEN 1.0
              WHEN distance_m < 25 THEN 0.8
              WHEN distance_m < 50 THEN 0.6
              WHEN distance_m < 100 THEN 0.4
              ELSE 0.1 END) * 0.5 +
        
        -- Time overlap factor
        time_overlap * 0.3 +
        
        -- Staff overlap factor  
        staff_overlap * 0.2
      );
      
      -- Only return high-confidence merges
      IF merge_score >= 0.7 THEN
        -- Store merge suggestion
        INSERT INTO public.gate_merge_suggestions (
          event_id, primary_gate_id, suggested_gate_id, 
          confidence_score, status
        ) VALUES (
          p_event_id, gate1_rec.gate_id, gate2_rec.gate_id,
          merge_score, 'pending'
        ) ON CONFLICT DO NOTHING;
        
        RETURN QUERY SELECT 
          gate1_rec.gate_id,
          gate2_rec.gate_id,
          merge_score,
          distance_m,
          time_overlap;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 6. AUTOMATED GATE ENFORCEMENT TRIGGER
CREATE OR REPLACE FUNCTION enforce_gate_intelligence()
RETURNS TRIGGER AS $$
DECLARE
  gate_analysis RECORD;
  config_rec RECORD;
BEGIN
  -- Get configuration
  SELECT * INTO config_rec 
  FROM public.gate_intelligence_config 
  WHERE event_id = NEW.event_id
  LIMIT 1;
  
  -- Run intelligence analysis for this gate
  SELECT * INTO gate_analysis
  FROM discover_gates_with_intelligence(NEW.event_id)
  WHERE gate_id = NEW.gate_id
  LIMIT 1;
  
  -- Auto-approve high-confidence gates
  IF gate_analysis.confidence_score >= COALESCE(config_rec.auto_approval_threshold, 0.95) THEN
    UPDATE public.autonomous_gates 
    SET status = 'approved', approval_status = 'auto_approved'
    WHERE gate_id = NEW.gate_id AND event_id = NEW.event_id;
  END IF;
  
  -- Check for merge opportunities
  PERFORM detect_gate_merges(NEW.event_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. CREATE INTELLIGENCE TRIGGER - ONLY FOR CHECK-INS, NOT SCANS
DROP TRIGGER IF EXISTS gate_intelligence_trigger ON public.checkin_logs;
CREATE TRIGGER gate_intelligence_trigger
  AFTER INSERT ON public.checkin_logs
  FOR EACH ROW
  WHEN (
    NEW.gate_id IS NOT NULL 
    AND NEW.wristband_id IS NOT NULL  -- Must be actual check-in with wristband
    AND NEW.is_probation = false      -- Only confirmed check-ins
    AND NEW.location_lat IS NOT NULL  -- Must have location data
    AND NEW.location_lng IS NOT NULL
  )
  EXECUTE FUNCTION enforce_gate_intelligence();

-- 8. GRANT PERMISSIONS
GRANT ALL ON public.gate_intelligence_config TO authenticated;
GRANT ALL ON public.gate_discovery_analytics TO authenticated;
GRANT ALL ON public.gate_clustering_results TO authenticated;
GRANT EXECUTE ON FUNCTION discover_gates_with_intelligence TO authenticated;
GRANT EXECUTE ON FUNCTION detect_gate_merges TO authenticated;

-- 9. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_gate_discovery_analytics_event ON public.gate_discovery_analytics(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_discovery_analytics_confidence ON public.gate_discovery_analytics(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_gate_clustering_results_event ON public.gate_clustering_results(event_id);
CREATE INDEX IF NOT EXISTS idx_gate_intelligence_config_event ON public.gate_intelligence_config(event_id);

-- 10. ENABLE RLS
ALTER TABLE public.gate_intelligence_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_discovery_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_clustering_results ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users can manage gate intelligence for their organization" ON public.gate_intelligence_config
  FOR ALL USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can view gate analytics for their organization" ON public.gate_discovery_analytics
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view gate clustering for their organization" ON public.gate_clustering_results
  FOR SELECT USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );
