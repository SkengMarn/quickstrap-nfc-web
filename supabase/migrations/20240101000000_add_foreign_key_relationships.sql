-- Enable Row Level Security
ALTER TABLE event_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_access_user_id ON public.event_access(user_id);
CREATE INDEX IF NOT EXISTS idx_checkin_logs_staff_id ON public.checkin_logs(staff_id);

-- Set up Row Level Security policies
-- For event_access table
CREATE POLICY "Users can view their own access" 
ON public.event_access FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins and owners can manage all access" 
ON public.event_access 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'owner')
));

-- For checkin_logs table
CREATE POLICY "Scanners can view their own check-ins" 
ON public.checkin_logs FOR SELECT 
USING (auth.uid() = staff_id);

CREATE POLICY "Admins and owners can view all check-ins"
ON public.checkin_logs FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('admin', 'owner')
));

CREATE POLICY "Scanners can create check-ins" 
ON public.checkin_logs FOR INSERT 
WITH CHECK (auth.uid() = staff_id);

-- Add function to check if user has access to an event
CREATE OR REPLACE FUNCTION has_event_access(event_id uuid, user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_access 
    WHERE event_access.event_id = $1 
    AND event_access.user_id = $2
  ) OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = $2
    AND profiles.role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Add policy for event access
CREATE POLICY "Users can view events they have access to"
ON public.events FOR SELECT
USING (has_event_access(events.id, auth.uid()));

-- Add policy for wristbands
CREATE POLICY "Users can view wristbands for events they have access to"
ON public.wristbands FOR SELECT
USING (has_event_access(wristbands.event_id, auth.uid()));
