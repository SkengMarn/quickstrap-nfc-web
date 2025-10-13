-- Reporting and Scheduling Tables
-- Run this in your Supabase SQL editor

-- Create scheduled_reports table
CREATE TABLE IF NOT EXISTS scheduled_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    schedule TEXT CHECK (schedule IN ('daily', 'weekly', 'monthly')) NOT NULL,
    recipients TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create report_jobs table for tracking export jobs
CREATE TABLE IF NOT EXISTS report_jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    template_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    file_path TEXT,
    download_url TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_event_id ON scheduled_reports(event_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_report_jobs_event_id ON report_jobs(event_id);
CREATE INDEX IF NOT EXISTS idx_report_jobs_status ON report_jobs(status);

-- Enable RLS
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Event admins can manage scheduled reports" ON scheduled_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = scheduled_reports.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('admin')
        )
    );

CREATE POLICY "Event staff can view report jobs" ON report_jobs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = report_jobs.event_id 
            AND ea.user_id = auth.uid()
        )
    );

CREATE POLICY "Event admins can create report jobs" ON report_jobs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM event_access ea 
            WHERE ea.event_id = report_jobs.event_id 
            AND ea.user_id = auth.uid() 
            AND ea.access_level IN ('admin')
        )
    );
