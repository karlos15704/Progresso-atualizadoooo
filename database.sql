-- SCRIPT DEFINITIVO DE RESET DO BANCO DE DADOS
-- ATENÇÃO: Issep apagará todos os dados existentes!

-- 0. APAGAR TUDO (CASCADE garante que as dependências sejam removidas)
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS student_reports CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS allowed_professors CASCADE;

-- 1. Professores Autorizados (Whitelist para novos cadastros)
CREATE TABLE allowed_professors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Perfis de Usuários (Extensão do Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid UUID UNIQUE NOT NULL, -- Relaciona com auth.users.id
    email TEXT UNIQUE NOT NULL,
    professional_name TEXT,
    role TEXT DEFAULT 'professor' CHECK (role IN ('professor', 'admin')),
    assigned_subjects JSONB DEFAULT '[]'::jsonb,
    assigned_classes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Provas (Exames e Agendamentos)
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    questions JSONB NOT NULL,
    answer_key JSONB,
    bimester TEXT DEFAULT '1º Bimestre',
    content TEXT,
    class_year TEXT,
    study_guide TEXT,
    exam_date DATE,
    exam_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Resultados (Tentativas e Correções)
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    professor_id UUID REFERENCES auth.users(id),
    student_name TEXT NOT NULL,
    student_class TEXT NOT NULL,
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    answers JSONB,
    processed_image TEXT,
    manually_reviewed BOOLEAN DEFAULT FALSE,
    bimester TEXT DEFAULT '1º Bimestre',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Relatórios por Aluno
CREATE TABLE student_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    student_class TEXT NOT NULL,
    content TEXT NOT NULL,
    bimester TEXT DEFAULT '1º Bimestre',
    professor_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Diário Escolar (Aulas)
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professor_id UUID REFERENCES auth.users(id),
    class_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    bimester TEXT NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    lesson_count INTEGER DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Frequência (Chamada)
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    status TEXT CHECK (status IN ('present', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ATIVAR SEGURANÇA DE NÍVEL DE LINHA (RLS)
ALTER TABLE allowed_professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACESSO (SEM RECURSÃO)

-- Função para contornar recursão infinita (Security Definer ignora as políticas na tabela ao checar admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT role = 'admin' FROM public.users WHERE uid = auth.uid() LIMIT 1;
$$;

-- Allowed Professors
CREATE POLICY "Visualização pública de professores autorizados" ON allowed_professors FOR SELECT USING (true);
CREATE POLICY "Gestão total de autorizados para admins" ON allowed_professors FOR ALL USING (
    public.is_admin()
);

-- Users
CREATE POLICY "Visualização de perfis por todos" ON users FOR SELECT USING (true);
CREATE POLICY "Usuários atualizam próprio perfil" ON users FOR UPDATE USING (uid = auth.uid());
CREATE POLICY "Admins excluem usuários" ON users FOR DELETE USING (
    public.is_admin()
);
CREATE POLICY "Admins atualizam usuários" ON users FOR UPDATE USING (
    public.is_admin()
);
CREATE POLICY "Inserção inicial pública para registro" ON users FOR INSERT WITH CHECK (true);

-- Exams
CREATE POLICY "Gestão de provas pelo dono ou admin" ON exams FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "Leitura pública de provas agendadas" ON exams FOR SELECT USING (true);

-- Results
CREATE POLICY "Gestão de resultados pelo dono ou admin" ON results FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);
CREATE POLICY "Inserção pública para alunos" ON results FOR INSERT WITH CHECK (true);

-- Student Reports
CREATE POLICY "Gestão de relatórios pelo dono ou admin" ON student_reports FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);

-- Lessons
CREATE POLICY "Gestão de aulas pelo dono ou admin" ON lessons FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);

-- Attendance
CREATE POLICY "Gestão de frequência baseada na aula" ON attendance FOR ALL USING (
    EXISTS (
        SELECT 1 FROM lessons 
        WHERE lessons.id = attendance.lesson_id 
        AND (lessons.professor_id = auth.uid() OR public.is_admin())
    )
);

-- BOOTSTRAP: PROFESSOR ADMIN INICIAL
-- Substitua se desejar outro usuário master inicial
INSERT INTO allowed_professors (email, username) VALUES ('cps@cps.local', 'cps');
