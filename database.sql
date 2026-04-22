-- Database Schema for Progresso Santista Fund 2

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
    displayName TEXT,
    role TEXT DEFAULT 'professor', -- 'admin' or 'professor'
    schoolName TEXT DEFAULT 'Colégio Progresso Santista',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Exams Table (Exams and Schedule)
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    questions JSONB DEFAULT '[]'::jsonb,
    answerKey JSONB DEFAULT '{}'::jsonb,
    studyGuide TEXT DEFAULT '',
    professorId UUID REFERENCES auth.users(id),
    examType TEXT,
    examDate DATE,
    examTime TIME,
    classYear TEXT,
    content TEXT,
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Results Table (Exam Submissions)
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    examId UUID REFERENCES exams(id) ON DELETE CASCADE,
    studentName TEXT NOT NULL,
    studentClass TEXT NOT NULL,
    answers JSONB NOT NULL,
    score NUMERIC NOT NULL,
    maxScore NUMERIC NOT NULL,
    correctedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    professorId UUID REFERENCES auth.users(id)
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
        professorId = auth.uid() OR 
        (answerKey->'_metadata'->>'isExternal')::boolean = true OR
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Users can insert exams" ON exams
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners or Admin can update exams" ON exams
    FOR UPDATE USING (
        professorId = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Owners or Admin can delete exams" ON exams
    FOR DELETE USING (
        professorId = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

-- 3. Results Policies
CREATE POLICY "Professors can view results for their exams" ON results
    FOR SELECT USING (
        professorId = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE uid = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Allow public insert for students submitting exams" ON results
    FOR INSERT WITH CHECK (true);

-- 4. Allowed Professors Policies
CREATE POLICY "Allow everyone to select allowed professors" ON allowed_professors
    FOR SELECT USING (true);
