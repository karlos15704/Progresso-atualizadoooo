-- ==========================================
-- UPDATE RLS POLICIES FOR DISCIPLINE-BASED ACCESS
-- ==========================================

-- 1. Helper Function to check if user has access to a subject
CREATE OR REPLACE FUNCTION public.has_subject_access(target_subject text)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE uid = auth.uid() 
      AND target_subject = ANY(assigned_subjects)
    )
  );
END;
$$;

-- 2. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Exams select public" ON exams;
DROP POLICY IF EXISTS "Exams manage own" ON exams;
DROP POLICY IF EXISTS "Results insert public" ON results;
DROP POLICY IF EXISTS "Results manage own" ON results;
DROP POLICY IF EXISTS "Reports manage own" ON student_reports;
DROP POLICY IF EXISTS "Lessons manage own" ON lessons;
DROP POLICY IF EXISTS "Attendance manage through lesson" ON attendance;

-- 3. New Policies for Exams
-- Teachers can only see and manage exams of their subjects
CREATE POLICY "Exams access" ON exams
FOR ALL USING (public.has_subject_access(subject));

-- 4. New Policies for Results
-- We need to check the subject in the linked exam
CREATE POLICY "Results access" ON results
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM exams 
    WHERE exams.id = results.exam_id 
    AND public.has_subject_access(exams.subject)
  )
);

-- 5. New Policies for Student Reports
CREATE POLICY "Reports access" ON student_reports
FOR ALL USING (public.has_subject_access(subject));

-- 6. New Policies for Lessons
CREATE POLICY "Lessons access" ON lessons
FOR ALL USING (public.has_subject_access(subject));

-- 7. New Policies for Attendance
CREATE POLICY "Attendance access" ON attendance
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM lessons 
    WHERE lessons.id = attendance.lesson_id 
    AND public.has_subject_access(lessons.subject)
  )
);

-- 8. Users Table
-- Professors should be able to see other professors (for mapping etc) 
-- but maybe we restrict who can edit what.
-- Currently policies allow select public, update self. This is fine.
