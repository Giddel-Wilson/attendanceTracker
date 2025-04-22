-- Create activity_logs table for tracking system events
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT
);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Set up RLS policies
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Allow public access for now
CREATE POLICY "Allow public select on activity_logs" 
    ON public.activity_logs FOR SELECT USING (true);
    
CREATE POLICY "Allow public insert to activity_logs" 
    ON public.activity_logs FOR INSERT WITH CHECK (true);
