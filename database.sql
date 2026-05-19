-- ==========================================
-- 1. LIMPEZA TOTAL (OPCIONAL - USAR SE QUISER ZERAR)
-- ==========================================
-- DROP TABLE IF EXISTS attendance CASCADE;
-- DROP TABLE IF EXISTS lessons CASCADE;
-- DROP TABLE IF EXISTS student_reports CASCADE;
-- DROP TABLE IF EXISTS results CASCADE;
-- DROP TABLE IF EXISTS exams CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TABLE IF EXISTS allowed_professors CASCADE;
-- DROP FUNCTION IF EXISTS public.is_admin CASCADE;

-- ==========================================
-- 2. CRIAÇÃO DAS TABELAS BASE
-- ==========================================

-- Tabela de Professores Autorizados (Filtro de Cadastro)
CREATE TABLE IF NOT EXISTS allowed_professors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  assigned_subjects text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Tabela de Perfis de Usuários (Extensão do Auth.Users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text NOT NULL,
  professional_name text NOT NULL,
  role text DEFAULT 'professor' CHECK (role IN ('admin', 'professor')),
  assigned_subjects text[] DEFAULT '{}',
  assigned_classes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. FUNÇÃO DE SEGURANÇA (ADMIN)
-- ==========================================
-- Criada após a tabela users para evitar erro de relação inexistente
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid() AND role = 'admin')
    OR (auth.jwt() ->> 'email' = 'cps@cps.local')
  );
END;
$$;

-- ==========================================
-- 4. CRIAÇÃO DAS TABELAS DE CONTEÚDO
-- ==========================================

-- Tabela de Provas (Exams)
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL,
  exam_type text NOT NULL, -- PII, PIII, Provão, etc.
  exam_date date,
  exam_time text,
  class_year text,
  bimester text,
  content text,
  questions jsonb DEFAULT '[]',
  answer_key jsonb DEFAULT '{}',
  study_guide text DEFAULT '',
  font_size integer DEFAULT 12,
  font_family text DEFAULT 'Inter',
  created_at timestamptz DEFAULT now()
);

-- Tabela de Resultados (Correções)
CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  student_class text NOT NULL,
  answers jsonb DEFAULT '{}',
  points float DEFAULT 0,
  total_points float DEFAULT 0,
  corrected_at timestamptz DEFAULT now()
);

-- Tabela de Relatórios Individualizados dos Alunos
CREATE TABLE IF NOT EXISTS student_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  bimester text NOT NULL,
  report_text text NOT NULL,
  grade float,
  attendance_percentage float,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Aulas (Cronograma/Diário)
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id text NOT NULL,
  subject text NOT NULL,
  bimester text NOT NULL,
  date date NOT NULL,
  content text NOT NULL,
  lesson_count integer DEFAULT 2,
  created_at timestamptz DEFAULT now()
);

-- Tabela de Frequência (Presença)
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('present', 'absent')),
  created_at timestamptz DEFAULT now()
);

-- ==========================================
-- 5. POLÍTICAS DE SEGURANÇA (RLS) - REVISADAS
-- ==========================================

ALTER TABLE allowed_professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Helper Function to check if user has access to a subject
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

-- Allowed Professors
CREATE POLICY "Public select" ON allowed_professors FOR SELECT USING (true);
CREATE POLICY "Admin manage" ON allowed_professors FOR ALL USING (public.is_admin());

-- Users
CREATE POLICY "Users view all" ON users FOR SELECT USING (true);
CREATE POLICY "Users update self" ON users FOR UPDATE USING (uid = auth.uid());
CREATE POLICY "Admin manage all users" ON users FOR ALL USING (public.is_admin());
CREATE POLICY "Public insert users" ON users FOR INSERT WITH CHECK (true);

-- Exams
CREATE POLICY "Exams access" ON exams FOR ALL USING (public.has_subject_access(subject));

-- Results (links to Exams)
CREATE POLICY "Results access" ON results FOR ALL USING (
  EXISTS (
    SELECT 1 FROM exams 
    WHERE exams.id = results.exam_id 
    AND public.has_subject_access(exams.subject)
  )
);

-- Student Reports
CREATE POLICY "Reports access" ON student_reports FOR ALL USING (public.has_subject_access(subject));

-- Lessons
CREATE POLICY "Lessons access" ON lessons FOR ALL USING (public.has_subject_access(subject));

-- Attendance
CREATE POLICY "Attendance access" ON attendance FOR ALL USING (
  EXISTS (
    SELECT 1 FROM lessons 
    WHERE lessons.id = attendance.lesson_id 
    AND public.has_subject_access(lessons.subject)
  )
);
