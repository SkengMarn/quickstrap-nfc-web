-- =====================================================
-- ADAPTIVE LEARNING SYSTEM - AUTO-IMPROVING INTELLIGENCE
-- =====================================================
-- This system learns and improves as more check-ins occur

-- 1. MODEL TRAINING HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.gate_ml_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id text NOT NULL,
  event_id uuid REFERENCES public.events(id),
  model_type text NOT NULL,
  
  -- Model weights and parameters (learned over time)
  model_weights jsonb DEFAULT '{}',
  bias_terms jsonb DEFAULT '{}',
  
  -- Training metrics
  training_samples integer DEFAULT 0,
  accuracy_score decimal DEFAULT 0,
  loss_value decimal DEFAULT 999999,
  
  -- Version control
  model_version integer DEFAULT 1,
  last_trained_at timestamptz DEFAULT now(),
  training_data_count integer DEFAULT 0,
  
  -- Learning rate (adapts over time)
  learning_rate decimal DEFAULT 0.01,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. INCREMENTAL LEARNING TRIGGER
-- This automatically retrains models when new check-ins arrive
CREATE TABLE IF NOT EXISTS public.gate_learning_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id text,
  event_id uuid REFERENCES public.events(id),
  last_checkin_count integer DEFAULT 0,
  retrain_threshold integer DEFAULT 100, -- Retrain every 100 new check-ins
  last_retrain_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. ONLINE LEARNING FUNCTION (Updates model incrementally)
CREATE OR REPLACE FUNCTION online_learning_update(
  p_gate_id text,
  p_event_id uuid,
  p_new_checkin_data jsonb -- New check-in features
)
RETURNS jsonb AS $$
DECLARE
  current_model RECORD;
  updated_weights jsonb;
  prediction decimal;
  actual_value decimal;
  error_val decimal;
  gradient jsonb;
  new_accuracy decimal;
BEGIN
  -- Get current model
  SELECT * INTO current_model
  FROM public.gate_ml_models
  WHERE gate_id = p_gate_id 
    AND event_id = p_event_id
    AND model_type = 'online_predictor'
  ORDER BY model_version DESC
  LIMIT 1;
  
  -- Initialize model if doesn't exist
  IF current_model IS NULL THEN
    INSERT INTO public.gate_ml_models (
      gate_id, event_id, model_type, model_weights, bias_terms
    ) VALUES (
      p_gate_id, 
      p_event_id, 
      'online_predictor',
      jsonb_build_object(
        'activity_weight', 0.5,
        'temporal_weight', 0.3,
        'staff_weight', 0.2
      ),
      jsonb_build_object('bias', 0.0)
    )
    RETURNING * INTO current_model;
  END IF;
  
  -- Make prediction with current weights
  prediction := 
    (p_new_checkin_data->>'activity_count')::decimal * 
      (current_model.model_weights->>'activity_weight')::decimal +
    (p_new_checkin_data->>'hour_of_day')::decimal * 
      (current_model.model_weights->>'temporal_weight')::decimal +
    (p_new_checkin_data->>'unique_staff')::decimal * 
      (current_model.model_weights->>'staff_weight')::decimal +
    (current_model.bias_terms->>'bias')::decimal;
  
  -- Get actual value (for supervised learning)
  actual_value := (p_new_checkin_data->>'actual_delay')::decimal;
  
  -- Calculate error
  error_val := actual_value - prediction;
  
  -- Gradient descent update (SGD - Stochastic Gradient Descent)
  updated_weights := jsonb_build_object(
    'activity_weight', 
      (current_model.model_weights->>'activity_weight')::decimal + 
      current_model.learning_rate * error_val * (p_new_checkin_data->>'activity_count')::decimal,
    'temporal_weight',
      (current_model.model_weights->>'temporal_weight')::decimal + 
      current_model.learning_rate * error_val * (p_new_checkin_data->>'hour_of_day')::decimal,
    'staff_weight',
      (current_model.model_weights->>'staff_weight')::decimal + 
      current_model.learning_rate * error_val * (p_new_checkin_data->>'unique_staff')::decimal
  );
  
  -- Calculate new accuracy (exponential moving average)
  new_accuracy := 0.9 * COALESCE(current_model.accuracy_score, 0) + 
                  0.1 * (1.0 - ABS(error_val) / NULLIF(ABS(actual_value), 0));
  
  -- Update model with new weights
  UPDATE public.gate_ml_models
  SET 
    model_weights = updated_weights,
    bias_terms = jsonb_build_object(
      'bias', (bias_terms->>'bias')::decimal + current_model.learning_rate * error_val
    ),
    training_samples = training_samples + 1,
    accuracy_score = new_accuracy,
    loss_value = ABS(error_val),
    learning_rate = CASE 
      WHEN training_samples % 1000 = 0 THEN learning_rate * 0.95 -- Decay learning rate
      ELSE learning_rate
    END,
    updated_at = now()
  WHERE id = current_model.id;
  
  RETURN jsonb_build_object(
    'prediction', prediction,
    'actual', actual_value,
    'error', error_val,
    'new_accuracy', new_accuracy,
    'samples_trained', current_model.training_samples + 1
  );
END;
$$ LANGUAGE plpgsql;

-- 4. BATCH RETRAINING FUNCTION (Runs periodically)
CREATE OR REPLACE FUNCTION batch_retrain_gate_model(
  p_gate_id text,
  p_event_id uuid,
  p_epochs integer DEFAULT 10
)
RETURNS jsonb AS $$
DECLARE
  training_data RECORD;
  current_weights jsonb;
  current_bias jsonb;
  learning_rate decimal := 0.01;
  epoch integer;
  total_loss decimal := 0;
  sample_count integer := 0;
  final_accuracy decimal;
  prediction decimal;
  error_val decimal;
BEGIN
  -- Initialize or get current model
  SELECT model_weights, bias_terms INTO current_weights, current_bias
  FROM public.gate_ml_models
  WHERE gate_id = p_gate_id AND event_id = p_event_id
  ORDER BY model_version DESC
  LIMIT 1;
  
  IF current_weights IS NULL THEN
    current_weights := jsonb_build_object(
      'activity_weight', random(), 
      'temporal_weight', random(),
      'staff_weight', random()
    );
    current_bias := jsonb_build_object('bias', 0.0);
  END IF;
  
  -- Training loop
  FOR epoch IN 1..p_epochs LOOP
    total_loss := 0;
    sample_count := 0;
    
    -- Iterate through training data
    FOR training_data IN
      SELECT 
        EXTRACT(HOUR FROM checked_in_at) as hour,
        COUNT(*) as activity_count,
        COUNT(DISTINCT staff_id) as unique_staff,
        -- Target: average processing time (in seconds)
        AVG(EXTRACT(EPOCH FROM (
          LEAD(checked_in_at) OVER (PARTITION BY gate_id ORDER BY checked_in_at) - 
          checked_in_at
        ))) as target_delay
      FROM public.checkin_logs
      WHERE gate_id = p_gate_id 
        AND event_id = p_event_id
        AND wristband_id IS NOT NULL  -- Only actual check-ins
        AND is_probation = false      -- Only confirmed check-ins
      GROUP BY EXTRACT(HOUR FROM checked_in_at)
      HAVING AVG(EXTRACT(EPOCH FROM (
        LEAD(checked_in_at) OVER (PARTITION BY gate_id ORDER BY checked_in_at) - 
        checked_in_at
      ))) IS NOT NULL
    LOOP
      -- Forward pass
      prediction := 
        training_data.activity_count * (current_weights->>'activity_weight')::decimal +
        training_data.hour * (current_weights->>'temporal_weight')::decimal +
        training_data.unique_staff * (current_weights->>'staff_weight')::decimal +
        (current_bias->>'bias')::decimal;
      
      error_val := COALESCE(training_data.target_delay, 0) - prediction;
      total_loss := total_loss + error_val * error_val;
      sample_count := sample_count + 1;
      
      -- Backward pass (gradient descent)
      current_weights := jsonb_build_object(
        'activity_weight', 
          (current_weights->>'activity_weight')::decimal + 
          learning_rate * error_val * training_data.activity_count,
        'temporal_weight',
          (current_weights->>'temporal_weight')::decimal + 
          learning_rate * error_val * training_data.hour,
        'staff_weight',
          (current_weights->>'staff_weight')::decimal + 
          learning_rate * error_val * training_data.unique_staff
      );
      
      current_bias := jsonb_build_object(
        'bias', (current_bias->>'bias')::decimal + learning_rate * error_val
      );
    END LOOP;
    
    -- Decay learning rate
    learning_rate := learning_rate * 0.95;
  END LOOP;
  
  -- Calculate final accuracy
  final_accuracy := 1.0 / (1.0 + (total_loss / NULLIF(sample_count, 0)));
  
  -- Save new model version
  INSERT INTO public.gate_ml_models (
    gate_id, event_id, model_type, model_weights, bias_terms,
    training_samples, accuracy_score, loss_value, learning_rate,
    model_version
  )
  SELECT 
    p_gate_id,
    p_event_id,
    'batch_trained',
    current_weights,
    current_bias,
    sample_count,
    final_accuracy,
    total_loss / NULLIF(sample_count, 0),
    learning_rate,
    COALESCE(MAX(model_version), 0) + 1
  FROM public.gate_ml_models
  WHERE gate_id = p_gate_id AND event_id = p_event_id;
  
  RETURN jsonb_build_object(
    'epochs', p_epochs,
    'samples', sample_count,
    'final_loss', total_loss / NULLIF(sample_count, 0),
    'accuracy', final_accuracy,
    'weights', current_weights
  );
END;
$$ LANGUAGE plpgsql;

-- 5. AUTO-TRIGGER: Retrain when threshold reached
CREATE OR REPLACE FUNCTION auto_retrain_trigger()
RETURNS TRIGGER AS $$
DECLARE
  trigger_rec RECORD;
  current_count integer;
  retrain_result jsonb;
BEGIN
  -- Only process actual check-ins, not scans
  IF NEW.wristband_id IS NULL OR NEW.is_probation = true THEN
    RETURN NEW;
  END IF;
  
  -- Check if this gate needs retraining
  SELECT * INTO trigger_rec
  FROM public.gate_learning_triggers
  WHERE gate_id = NEW.gate_id 
    AND event_id = NEW.event_id
    AND is_active = true;
  
  IF trigger_rec IS NULL THEN
    -- Create new trigger record
    INSERT INTO public.gate_learning_triggers (gate_id, event_id, last_checkin_count)
    VALUES (NEW.gate_id, NEW.event_id, 1);
    RETURN NEW;
  END IF;
  
  -- Count current check-ins (only actual check-ins)
  SELECT COUNT(*) INTO current_count
  FROM public.checkin_logs
  WHERE gate_id = NEW.gate_id 
    AND event_id = NEW.event_id
    AND wristband_id IS NOT NULL
    AND is_probation = false;
  
  -- Check if we've hit the threshold
  IF current_count - trigger_rec.last_checkin_count >= trigger_rec.retrain_threshold THEN
    -- Trigger retraining
    SELECT batch_retrain_gate_model(NEW.gate_id, NEW.event_id, 5) INTO retrain_result;
    
    -- Update trigger record
    UPDATE public.gate_learning_triggers
    SET 
      last_checkin_count = current_count,
      last_retrain_at = now()
    WHERE id = trigger_rec.id;
    
    -- Log the retraining
    RAISE NOTICE 'Auto-retrained model for gate % - Result: %', NEW.gate_id, retrain_result;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to checkin_logs table
DROP TRIGGER IF EXISTS trigger_auto_retrain ON public.checkin_logs;
CREATE TRIGGER trigger_auto_retrain
  AFTER INSERT ON public.checkin_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_retrain_trigger();

-- 6. ADAPTIVE ANOMALY DETECTION (Learns normal patterns)
CREATE OR REPLACE FUNCTION adaptive_anomaly_detection(
  p_gate_id text,
  p_event_id uuid
)
RETURNS TABLE (
  hour integer,
  expected_checkins decimal,
  actual_checkins integer,
  anomaly_score decimal,
  is_anomaly boolean,
  confidence decimal
) AS $$
DECLARE
  model_rec RECORD;
BEGIN
  -- Get latest trained model
  SELECT * INTO model_rec
  FROM public.gate_ml_models
  WHERE gate_id = p_gate_id 
    AND event_id = p_event_id
  ORDER BY model_version DESC
  LIMIT 1;
  
  -- If no model exists, train one first
  IF model_rec IS NULL THEN
    PERFORM batch_retrain_gate_model(p_gate_id, p_event_id, 10);
    SELECT * INTO model_rec
    FROM public.gate_ml_models
    WHERE gate_id = p_gate_id AND event_id = p_event_id
    ORDER BY model_version DESC
    LIMIT 1;
  END IF;
  
  -- Use learned model to detect anomalies
  RETURN QUERY
  WITH hourly_actual AS (
    SELECT 
      EXTRACT(HOUR FROM checked_in_at)::integer as hr,
      COUNT(*) as actual_count,
      COUNT(DISTINCT staff_id) as staff_count
    FROM public.checkin_logs
    WHERE gate_id = p_gate_id 
      AND event_id = p_event_id
      AND wristband_id IS NOT NULL  -- Only actual check-ins
      AND is_probation = false      -- Only confirmed check-ins
    GROUP BY EXTRACT(HOUR FROM checked_in_at)
  )
  SELECT 
    ha.hr,
    -- Prediction using learned weights
    (ha.staff_count * COALESCE((model_rec.model_weights->>'staff_weight')::decimal, 0.2) +
     ha.hr * COALESCE((model_rec.model_weights->>'temporal_weight')::decimal, 0.3) +
     COALESCE((model_rec.bias_terms->>'bias')::decimal, 0.0)) as expected,
    ha.actual_count,
    -- Anomaly score (normalized difference)
    ABS(ha.actual_count - 
      (ha.staff_count * COALESCE((model_rec.model_weights->>'staff_weight')::decimal, 0.2) +
       ha.hr * COALESCE((model_rec.model_weights->>'temporal_weight')::decimal, 0.3) +
       COALESCE((model_rec.bias_terms->>'bias')::decimal, 0.0))
    ) / NULLIF(ha.actual_count, 0) as score,
    -- Flag as anomaly if score > 0.5
    ABS(ha.actual_count - 
      (ha.staff_count * COALESCE((model_rec.model_weights->>'staff_weight')::decimal, 0.2) +
       ha.hr * COALESCE((model_rec.model_weights->>'temporal_weight')::decimal, 0.3) +
       COALESCE((model_rec.bias_terms->>'bias')::decimal, 0.0))
    ) / NULLIF(ha.actual_count, 0) > 0.5 as is_anom,
    -- Confidence based on model accuracy
    COALESCE(model_rec.accuracy_score, 0.0) as conf
  FROM hourly_actual ha;
END;
$$ LANGUAGE plpgsql;

-- 7. MODEL PERFORMANCE DASHBOARD VIEW
CREATE OR REPLACE VIEW public.gate_ml_performance AS
SELECT 
  m.gate_id,
  m.event_id,
  m.model_type,
  m.model_version,
  m.training_samples,
  m.accuracy_score,
  m.loss_value,
  m.learning_rate,
  m.last_trained_at,
  m.updated_at,
  -- Performance trend (comparing to previous version)
  m.accuracy_score - LAG(m.accuracy_score) OVER (
    PARTITION BY m.gate_id, m.event_id, m.model_type 
    ORDER BY m.model_version
  ) as accuracy_improvement,
  -- Training velocity (samples per day)
  m.training_samples / NULLIF(
    EXTRACT(EPOCH FROM (now() - m.created_at)) / 86400, 0
  ) as samples_per_day
FROM public.gate_ml_models m
ORDER BY m.gate_id, m.model_version DESC;

-- 8. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION online_learning_update TO authenticated;
GRANT EXECUTE ON FUNCTION batch_retrain_gate_model TO authenticated;
GRANT EXECUTE ON FUNCTION adaptive_anomaly_detection TO authenticated;
GRANT ALL ON public.gate_ml_models TO authenticated;
GRANT ALL ON public.gate_learning_triggers TO authenticated;
GRANT SELECT ON public.gate_ml_performance TO authenticated;

-- 9. ENABLE RLS
ALTER TABLE public.gate_ml_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_learning_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage ML models for their events" ON public.gate_ml_models
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage learning triggers for their events" ON public.gate_learning_triggers
  FOR ALL USING (
    event_id IN (
      SELECT id FROM public.events 
      WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_gate_ml_models_gate_event ON public.gate_ml_models(gate_id, event_id, model_version DESC);
CREATE INDEX IF NOT EXISTS idx_gate_ml_models_updated ON public.gate_ml_models(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_triggers_active ON public.gate_learning_triggers(gate_id, event_id, is_active);

-- 11. NEURAL NETWORK LAYER SIMULATION (BONUS)
CREATE OR REPLACE FUNCTION neural_network_prediction(
  p_gate_id text,
  p_event_id uuid,
  p_input_features decimal[]
)
RETURNS decimal AS $$
DECLARE
  model_rec RECORD;
  hidden_layer decimal[];
  output_val decimal;
  i integer;
BEGIN
  -- Get trained model weights
  SELECT * INTO model_rec
  FROM public.gate_ml_models
  WHERE gate_id = p_gate_id AND event_id = p_event_id
  ORDER BY model_version DESC
  LIMIT 1;
  
  IF model_rec IS NULL THEN
    RETURN 0.0;
  END IF;
  
  -- Simulate hidden layer (3 neurons)
  hidden_layer := ARRAY[0.0, 0.0, 0.0];
  
  -- Hidden layer computation (ReLU activation)
  FOR i IN 1..3 LOOP
    hidden_layer[i] := GREATEST(0, 
      p_input_features[1] * COALESCE((model_rec.model_weights->>'activity_weight')::decimal, 0.5) +
      p_input_features[2] * COALESCE((model_rec.model_weights->>'temporal_weight')::decimal, 0.3) +
      p_input_features[3] * COALESCE((model_rec.model_weights->>'staff_weight')::decimal, 0.2) +
      COALESCE((model_rec.bias_terms->>'bias')::decimal, 0.0)
    );
  END LOOP;
  
  -- Output layer (linear combination)
  output_val := (hidden_layer[1] + hidden_layer[2] + hidden_layer[3]) / 3.0;
  
  RETURN output_val;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION neural_network_prediction TO authenticated;
