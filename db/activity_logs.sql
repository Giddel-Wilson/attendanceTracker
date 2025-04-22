-- Create activity logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    action_type VARCHAR(100) NOT NULL,
    action VARCHAR(100),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
-- Set up RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
-- Create RLS policies
CREATE POLICY "Allow read access to activity_logs" ON public.activity_logs FOR
SELECT USING (true);
CREATE POLICY "Allow insert to activity_logs" ON public.activity_logs FOR
INSERT WITH CHECK (true);
-- Clean up any default fake data that might have been added
DELETE FROM public.activity_logs
WHERE description ILIKE '%test%'
    OR description ILIKE '%demo%'
    OR description ILIKE '%sample%'
    OR description ILIKE '%example%'
    OR user_email ILIKE '%test%'
    OR user_email ILIKE '%demo%'
    OR user_email ILIKE '%example.com%'
    OR entity_id IN (
        'test',
        'demo',
        'sample',
        '0',
        '999',
        'undefined',
        'null'
    );