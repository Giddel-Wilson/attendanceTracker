-- Execute this in the Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.students (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    student_id TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    courses JSONB DEFAULT '[]',
    attendance NUMERIC DEFAULT 0,
    last_attended TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Grant permissions to the anon/authenticated roles
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
-- Create policy for reading students
CREATE POLICY "Anyone can read students" ON public.students FOR
SELECT USING (true);
-- Create policy for inserting students (authenticated users only)
CREATE POLICY "Authenticated users can insert students" ON public.students FOR
INSERT TO authenticated WITH CHECK (true);
-- Create policy for updating students (authenticated users only)
CREATE POLICY "Authenticated users can update students" ON public.students FOR
UPDATE TO authenticated USING (true);