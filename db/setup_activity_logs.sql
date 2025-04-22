-- Setup script for activity logs table
-- Create the activity logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    user_email VARCHAR(255),
    action_type VARCHAR(100) NOT NULL,
    action VARCHAR(100),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50)
);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
-- Enable RLS but allow all operations for now
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow select on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow insert on activity_logs" ON public.activity_logs;
-- Create RLS policies
CREATE POLICY "Allow select on activity_logs" ON public.activity_logs FOR
SELECT USING (true);
CREATE POLICY "Allow insert on activity_logs" ON public.activity_logs FOR
INSERT WITH CHECK (true);
-- Insert a test activity to verify everything works
INSERT INTO public.activity_logs (
        action_type,
        entity_type,
        description,
        user_email
    )
VALUES (
        'system_initialization',
        'system',
        'Activity logging system initialized',
        'system'
    );
-- Output success message
SELECT 'Activity logs table setup complete!' AS result;