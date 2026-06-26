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
-- 2. FUNÇÃO DE SEGURANÇA (ADMIN)
-- ==========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN (
    auth.jwt() ->> 'email' = 'cps@cps.local'
    OR auth.jwt() ->> 'email' = 'ti@cps.local'
    OR (
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%admin%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%ti%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%suporte%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%coordenador%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%coordenadora%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%secretaria%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%diretor%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%diretoria%' OR
      auth.jwt() -> 'user_metadata' ->> 'role' ILIKE '%vice_diretor%'
    )
  );
END;
$$;

-- ==========================================
-- 3. CRIAÇÃO DAS TABELAS BASE
-- ==========================================

-- Tabela de Configurações da Escola Globais (Substitui localStorage)
CREATE TABLE IF NOT EXISTS school_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select school_settings" ON school_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage school_settings" ON school_settings FOR ALL USING (public.is_admin());

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
  role text DEFAULT 'professor',
  assigned_subjects text[] DEFAULT '{}',
  assigned_classes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Remover restrição de tipo de role para permitir papéis múltiplos e específicos (ex: 'professor,coordenador_fund2')
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

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
  family_portal_status text DEFAULT 'Nao_Enviado',
  family_portal_sent_at timestamptz,
  parent_signature text DEFAULT NULL,
  parent_signature_at timestamptz DEFAULT NULL,
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
CREATE POLICY "Exams access" ON exams FOR ALL USING (public.has_subject_access(subject) OR professor_id = auth.uid());
CREATE POLICY "Exams insert" ON exams FOR INSERT WITH CHECK (public.has_subject_access(subject) OR professor_id = auth.uid());

-- Results (links to Exams)
CREATE POLICY "Results access" ON results FOR ALL USING (
  EXISTS (
    SELECT 1 FROM exams 
    WHERE exams.id = results.exam_id 
    AND public.has_subject_access(exams.subject)
  )
);

-- Student Reports
CREATE POLICY "Reports access" ON student_reports FOR ALL USING (public.has_subject_access(subject) OR professor_id = auth.uid());
CREATE POLICY "Reports insert" ON student_reports FOR INSERT WITH CHECK (public.has_subject_access(subject) OR professor_id = auth.uid());

-- Lessons
CREATE POLICY "Lessons access" ON lessons FOR ALL USING (public.has_subject_access(subject) OR professor_id = auth.uid());
CREATE POLICY "Lessons insert" ON lessons FOR INSERT WITH CHECK (public.has_subject_access(subject) OR professor_id = auth.uid());

-- Attendance
CREATE POLICY "Attendance access" ON attendance FOR ALL USING (
  EXISTS (
    SELECT 1 FROM lessons 
    WHERE lessons.id = attendance.lesson_id 
    AND public.has_subject_access(lessons.subject)
  )
);

-- ==========================================
-- 6. HISTÓRICO DE LOGINS (LOGIN HISTORY)
-- ==========================================

CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uid uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  ip_address text,
  user_agent text,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  failure_reason text,
  attempted_at timestamptz DEFAULT now()
);

ALTER TABLE login_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all login history
CREATE POLICY "Admin view all login history" ON login_history FOR SELECT USING (public.is_admin());
-- Public/Authenticated can insert login history entries
CREATE POLICY "Public insert login history" ON login_history FOR INSERT WITH CHECK (true);

-- Ensure users has last_seen_at column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();

-- ==========================================
-- 7. REGISTRO DE ATIVIDADES (ACTIVITY LOGS)
-- ==========================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_name text NOT NULL,
  actor_email text NOT NULL,
  action_type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins and authenticated users can read all activity logs
CREATE POLICY "View all activity logs" ON activity_logs FOR SELECT USING (true);
CREATE POLICY "Insert activity logs" ON activity_logs FOR INSERT WITH CHECK (true);


-- ==========================================
-- 8. MENSAGENS E ATENDIMENTOS DA AGENDA (AGENDA MESSAGES)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.agenda_messages (
    id text PRIMARY KEY,
    sender_name text NOT NULL,
    receivers_names text[] NOT NULL DEFAULT '{}',
    recipient_type text NOT NULL,
    subject text NOT NULL,
    body text NOT NULL,
    category text,
    requires_signature boolean DEFAULT false,
    signatures jsonb DEFAULT '[]'::jsonb,
    date timestamptz DEFAULT now(),
    teacher_read boolean DEFAULT false,
    is_from_family boolean DEFAULT false,
    attachments jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'approved',
    replies jsonb DEFAULT '[]'::jsonb
);

-- Habilitar Segurança RLS
ALTER TABLE public.agenda_messages ENABLE ROW LEVEL SECURITY;

-- Criar Políticas de Acesso
CREATE POLICY "Public select agenda_messages" ON public.agenda_messages FOR SELECT USING (true);
CREATE POLICY "Public insert agenda_messages" ON public.agenda_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update agenda_messages" ON public.agenda_messages FOR UPDATE USING (true);
CREATE POLICY "Public delete agenda_messages" ON public.agenda_messages FOR DELETE USING (true);

-- ==========================================
-- 9. ÍNDICES DE PERFORMANCE (PERFORMANCE INDEXES)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_exams_professor_id ON public.exams(professor_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON public.exams(subject);
CREATE INDEX IF NOT EXISTS idx_results_exam_id ON public.results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_professor_id ON public.results(professor_id);
CREATE INDEX IF NOT EXISTS idx_student_reports_professor_id ON public.student_reports(professor_id);
CREATE INDEX IF NOT EXISTS idx_lessons_professor_id ON public.lessons(professor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_lesson_id ON public.attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_login_history_uid ON public.login_history(uid);
CREATE INDEX IF NOT EXISTS idx_login_history_email ON public.login_history(email);


