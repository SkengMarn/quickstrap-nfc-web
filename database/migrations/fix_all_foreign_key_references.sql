-- =====================================================
-- FOREIGN KEY REFERENCE FIX MIGRATION
-- =====================================================
-- This migration adds ALL missing foreign key constraints
-- and fixes referential integrity issues
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Create missing tables
-- =====================================================

-- Create series table (referenced by checkin_logs.series_id but doesn't exist)
CREATE TABLE IF NOT EXISTS public.series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  order_number integer,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT series_pkey PRIMARY KEY (id),
  CONSTRAINT series_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_series_event_id ON public.series(event_id);

-- =====================================================
-- STEP 2: Clean up orphaned data before adding FKs
-- =====================================================

-- Remove orphaned organization references
UPDATE public.audit_log SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.autonomous_events SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.autonomous_gates SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.events SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.fraud_detections SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.gates SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.predictions SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.predictive_insights SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.profiles SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.security_incidents SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.system_health_logs SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.training_data SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

UPDATE public.wristband_blocks SET organization_id = NULL
WHERE organization_id IS NOT NULL
AND organization_id NOT IN (SELECT id FROM public.organizations);

-- Remove orphaned ticket references
UPDATE public.checkin_logs SET ticket_id = NULL
WHERE ticket_id IS NOT NULL
AND ticket_id NOT IN (SELECT id FROM public.tickets);

UPDATE public.ticket_link_audit SET ticket_id = NULL
WHERE ticket_id IS NOT NULL
AND ticket_id NOT IN (SELECT id FROM public.tickets);

UPDATE public.wristbands SET linked_ticket_id = NULL
WHERE linked_ticket_id IS NOT NULL
AND linked_ticket_id NOT IN (SELECT id FROM public.tickets);

-- Remove orphaned wristband references
UPDATE public.ticket_link_audit SET wristband_id = NULL
WHERE wristband_id IS NOT NULL
AND wristband_id NOT IN (SELECT id FROM public.wristbands);

-- Remove orphaned series references
UPDATE public.checkin_logs SET series_id = NULL
WHERE series_id IS NOT NULL
AND series_id NOT IN (SELECT id FROM public.series);

-- =====================================================
-- STEP 3: Add missing foreign key constraints
-- =====================================================

-- Add organization_id foreign keys (13 tables)
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.autonomous_events
  ADD CONSTRAINT autonomous_events_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.autonomous_gates
  ADD CONSTRAINT autonomous_gates_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.fraud_detections
  ADD CONSTRAINT fraud_detections_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.gates
  ADD CONSTRAINT gates_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.predictive_insights
  ADD CONSTRAINT predictive_insights_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.security_incidents
  ADD CONSTRAINT security_incidents_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.system_health_logs
  ADD CONSTRAINT system_health_logs_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.training_data
  ADD CONSTRAINT training_data_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.wristband_blocks
  ADD CONSTRAINT wristband_blocks_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add ticket/wristband foreign keys
ALTER TABLE public.checkin_logs
  ADD CONSTRAINT checkin_logs_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;

ALTER TABLE public.checkin_logs
  ADD CONSTRAINT checkin_logs_series_id_fkey
  FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE SET NULL;

ALTER TABLE public.ticket_link_audit
  ADD CONSTRAINT ticket_link_audit_ticket_id_fkey
  FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;

ALTER TABLE public.ticket_link_audit
  ADD CONSTRAINT ticket_link_audit_wristband_id_fkey
  FOREIGN KEY (wristband_id) REFERENCES public.wristbands(id) ON DELETE SET NULL;

ALTER TABLE public.wristbands
  ADD CONSTRAINT wristbands_linked_ticket_id_fkey
  FOREIGN KEY (linked_ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;

-- =====================================================
-- STEP 4: Add performance indexes on foreign keys
-- =====================================================

-- Organization ID indexes (critical for multi-tenant queries)
CREATE INDEX IF NOT EXISTS idx_audit_log_organization_id ON public.audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_events_organization_id ON public.autonomous_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_gates_organization_id ON public.autonomous_gates(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_organization_id ON public.events(organization_id);
CREATE INDEX IF NOT EXISTS idx_fraud_detections_organization_id ON public.fraud_detections(organization_id);
CREATE INDEX IF NOT EXISTS idx_gates_organization_id ON public.gates(organization_id);
CREATE INDEX IF NOT EXISTS idx_predictions_organization_id ON public.predictions(organization_id);
CREATE INDEX IF NOT EXISTS idx_predictive_insights_organization_id ON public.predictive_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_organization_id ON public.security_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_health_logs_organization_id ON public.system_health_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_data_organization_id ON public.training_data(organization_id);
CREATE INDEX IF NOT EXISTS idx_wristband_blocks_organization_id ON public.wristband_blocks(organization_id);

-- Ticket/Wristband/Series indexes
CREATE INDEX IF NOT EXISTS idx_checkin_logs_ticket_id ON public.checkin_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_series_id ON public.checkin_logs(series_id);
CREATE INDEX IF NOT EXISTS idx_ticket_link_audit_ticket_id ON public.ticket_link_audit(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_link_audit_wristband_id ON public.ticket_link_audit(wristband_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_linked_ticket_id ON public.wristbands(linked_ticket_id);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_checkin_logs_event_id ON public.checkin_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_wristband_id ON public.checkin_logs(wristband_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_gate_id ON public.checkin_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON public.tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_wristbands_event_id ON public.wristbands(event_id);
CREATE INDEX IF NOT EXISTS idx_gates_event_id ON public.gates(event_id);
CREATE INDEX IF NOT EXISTS idx_gates_gate_id ON public.gates(gate_id);

-- =====================================================
-- STEP 5: Add comments for documentation
-- =====================================================

COMMENT ON TABLE public.series IS 'Multi-event series/tournaments that can span multiple event dates';
COMMENT ON CONSTRAINT events_organization_id_fkey ON public.events IS 'CRITICAL: Links events to their parent organization';
COMMENT ON CONSTRAINT checkin_logs_series_id_fkey ON public.checkin_logs IS 'Links check-ins to event series for tournament tracking';

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the migration worked:
--
-- Check all foreign keys are in place:
-- SELECT
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
-- AND tc.table_schema = 'public'
-- ORDER BY tc.table_name, kcu.column_name;
--
-- Count foreign keys per table:
-- SELECT
--   tc.table_name,
--   COUNT(*) as fk_count
-- FROM information_schema.table_constraints AS tc
-- WHERE tc.constraint_type = 'FOREIGN KEY'
-- AND tc.table_schema = 'public'
-- GROUP BY tc.table_name
-- ORDER BY fk_count DESC;
