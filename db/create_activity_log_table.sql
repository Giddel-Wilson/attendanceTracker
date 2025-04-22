CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    user_email VARCHAR(255),
    entity_id VARCHAR(50),
    entity_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50)
);
-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
-- Set up RLS policy
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
-- Allow public read access (for admin users)
CREATE POLICY "Allow public read access to activity_logs" ON public.activity_logs FOR
SELECT USING (true);
-- Allow public insert access
CREATE POLICY "Allow public insert to activity_logs" ON public.activity_logs FOR
INSERT WITH CHECK (true);
-- Comment on table and columns
COMMENT ON TABLE public.activity_logs IS 'Stores system activity logs for auditing and monitoring';
COMMENT ON COLUMN public.activity_logs.action_type IS 'Type of action performed (course_created, attendance_taken, etc.)';
COMMENT ON COLUMN public.activity_logs.description IS 'Human-readable description of the activity';
COMMENT ON COLUMN public.activity_logs.user_email IS 'Email of the user who performed the action';
COMMENT ON COLUMN public.activity_logs.entity_id IS 'ID of the related entity (course ID, student ID, etc.)';
COMMENT ON COLUMN public.activity_logs.entity_type IS 'Type of entity (course, student, attendance)';