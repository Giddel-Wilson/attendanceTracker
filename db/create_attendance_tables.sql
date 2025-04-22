-- Create attendance_sessions table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES public.courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_students INTEGER DEFAULT 0,
    present_students INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (
        status IN ('present', 'absent', 'late', 'excused')
    ),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course_id ON public.attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student_id ON public.attendance_records(student_id);
-- Set up RLS policies (Row Level Security)
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
-- Create policies for public access (since we're not using authentication)
CREATE POLICY "Allow public read access to attendance_sessions" ON public.attendance_sessions FOR
SELECT USING (true);
CREATE POLICY "Allow public insert to attendance_sessions" ON public.attendance_sessions FOR
INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to attendance_sessions" ON public.attendance_sessions FOR
UPDATE USING (true);
CREATE POLICY "Allow public delete from attendance_sessions" ON public.attendance_sessions FOR DELETE USING (true);
CREATE POLICY "Allow public read access to attendance_records" ON public.attendance_records FOR
SELECT USING (true);
CREATE POLICY "Allow public insert to attendance_records" ON public.attendance_records FOR
INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to attendance_records" ON public.attendance_records FOR
UPDATE USING (true);
CREATE POLICY "Allow public delete from attendance_records" ON public.attendance_records FOR DELETE USING (true);