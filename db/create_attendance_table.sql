-- Execute this in the Supabase SQL Editor
-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES public.students(id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    class_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN ('present', 'absent', 'late', 'excused')
    ),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_course_code ON public.attendance(course_code);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON public.attendance(class_date);
-- Setup Row Level Security (RLS)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
-- Create policy for public access (since we're not using authentication)
CREATE POLICY "Allow public access to attendance" ON public.attendance USING (true);
-- Create policy for insert/update/delete
CREATE POLICY "Allow public insert to attendance" ON public.attendance FOR
INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to attendance" ON public.attendance FOR
UPDATE USING (true);
CREATE POLICY "Allow public delete from attendance" ON public.attendance FOR DELETE USING (true);