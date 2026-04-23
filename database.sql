-- 0. APAGA AS TABELAS ANTIGAS PARA RECRIAR CORRETAMENTE E RESOLVER PROBLEMAS COM CACHE. Zera o banco.
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS allowed_professors CASCADE;

-- 1. Allowed Professors Table (Whitelist for registration)
CREATE TABLE allowed_professors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Extension of Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid UUID UNIQUE NOT NULL, -- This matches auth.users.id
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    professional_name TEXT,
    role TEXT DEFAULT 'professor', -- 'admin' or 'professor'
    school_name TEXT DEFAULT 'Colégio Progresso Santista',
    assigned_subjects JSONB DEFAULT '[]'::jsonb,
    assigned_classes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Exams Table (Exams and Schedule)
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    questions JSONB DEFAULT '[]'::jsonb,
    answer_key JSONB DEFAULT '{}'::jsonb,
    study_guide TEXT DEFAULT '',
    professor_id UUID REFERENCES auth.users(id),
    exam_type TEXT,
    exam_date DATE,
    exam_time TIME,
    class_year TEXT,
    bimester TEXT DEFAULT '1º Bimestre',
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Results Table (Exam Submissions)
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    student_class TEXT NOT NULL,
    bimester TEXT DEFAULT '1º Bimestre',
    answers JSONB NOT NULL,
    score NUMERIC NOT NULL,
    max_score NUMERIC NOT NULL,
    corrected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    professor_id UUID REFERENCES auth.users(id)
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE allowed_professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- 1. Users Policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Admin can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Allow public insert for first time registration" ON users
    FOR INSERT WITH CHECK (true);

-- 2. Exams Policies
CREATE POLICY "Professors can see their own exams OR global schedule items" ON exams
    FOR SELECT USING (
        professor_id = auth.uid() OR 
        (answer_key->'_metadata'->>'isExternal')::boolean = true OR
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can insert exams" ON exams
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners or Admin can update exams" ON exams
    FOR UPDATE USING (
        professor_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Owners or Admin can delete exams" ON exams
    FOR DELETE USING (
        professor_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

-- 3. Results Policies
CREATE POLICY "Professors can view results for their exams" ON results
    FOR SELECT USING (
        professor_id = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Allow public insert for students submitting exams" ON results
    FOR INSERT WITH CHECK (true);

-- 4. Allowed Professors Policies
CREATE POLICY "Allow everyone to select allowed professors" ON allowed_professors
    FOR SELECT USING (true);
