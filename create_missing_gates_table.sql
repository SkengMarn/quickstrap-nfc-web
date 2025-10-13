-- Create missing gates table and fix relationships
-- Run this in Supabase SQL Editor

-- Create gates table
CREATE TABLE IF NOT EXISTS public.gates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    gate_type VARCHAR(50) DEFAULT 'entry' CHECK (gate_type IN ('entry', 'exit', 'vip', 'staff')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scan_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    is_auto_discovered BOOLEAN DEFAULT false,
    approval_status VARCHAR(50) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add RLS policies for gates
ALTER TABLE public.gates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view gates for their events" ON public.gates
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

CREATE POLICY "Users can manage gates for their events" ON public.gates
    FOR ALL USING (
        event_id IN (
            SELECT id FROM public.events 
            WHERE created_by = auth.uid()
        )
    );

-- Add gate_id column to checkin_logs if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'checkin_logs' AND column_name = 'gate_id') THEN
        ALTER TABLE public.checkin_logs 
        ADD COLUMN gate_id UUID REFERENCES public.gates(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create some sample gates for existing events
INSERT INTO public.gates (event_id, name, location, gate_type, status)
SELECT 
    id as event_id,
    'Main Entry' as name,
    'Front Entrance' as location,
    'entry' as gate_type,
    'active' as status
FROM public.events
WHERE NOT EXISTS (
    SELECT 1 FROM public.gates WHERE gates.event_id = events.id
)
ON CONFLICT DO NOTHING;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_gates_event_id ON public.gates(event_id);
CREATE INDEX IF NOT EXISTS idx_gates_status ON public.gates(status);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_gate_id ON public.checkin_logs(gate_id);

-- Verify the table was created
SELECT 'Gates table created successfully' as status;
