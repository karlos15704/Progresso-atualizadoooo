-- Função para checar admin com SECURITY DEFINER
-- Isso diz ao PostgreSQL para rodar esta função ignorando o RLS,
-- evitando assim o loop infinito de recursão na tabela users.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT role = 'admin' FROM public.users WHERE uid = auth.uid() LIMIT 1;
$$;

-- ATUALIZAR POLÍTICAS DA TABELA EXAMS
DROP POLICY IF EXISTS "Gestão de provas pelo dono ou admin" ON exams;
CREATE POLICY "Gestão de provas pelo dono ou admin" ON exams FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);

-- ATUALIZAR POLÍTICAS DA TABELA RESULTS
DROP POLICY IF EXISTS "Gestão de resultados pelo dono ou admin" ON results;
CREATE POLICY "Gestão de resultados pelo dono ou admin" ON results FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);

-- ATUALIZAR POLÍTICAS DA TABELA STUDENT_REPORTS
DROP POLICY IF EXISTS "Gestão de relatórios pelo dono ou admin" ON student_reports;
CREATE POLICY "Gestão de relatórios pelo dono ou admin" ON student_reports FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);

-- ATUALIZAR POLÍTICAS DA TABELA LESSONS
DROP POLICY IF EXISTS "Gestão de aulas pelo dono ou admin" ON lessons;
CREATE POLICY "Gestão de aulas pelo dono ou admin" ON lessons FOR ALL USING (
    professor_id = auth.uid() OR public.is_admin()
);

-- ATUALIZAR POLÍTICAS DA TABELA ATTENDANCE
DROP POLICY IF EXISTS "Gestão de frequência baseada na aula" ON attendance;
CREATE POLICY "Gestão de frequência baseada na aula" ON attendance FOR ALL USING (
    EXISTS (
        SELECT 1 FROM lessons 
        WHERE lessons.id = attendance.lesson_id 
        AND (lessons.professor_id = auth.uid() OR public.is_admin())
    )
);

-- ATUALIZAR POLÍTICAS DA TABELA USERS
DROP POLICY IF EXISTS "Admins excluem usuários" ON users;
CREATE POLICY "Admins excluem usuários" ON users FOR DELETE USING (
    public.is_admin()
);

DROP POLICY IF EXISTS "Admins atualizam usuários" ON users;
CREATE POLICY "Admins atualizam usuários" ON users FOR UPDATE USING (
    public.is_admin()
);

-- ATUALIZAR POLÍTICAS DA TABELA ALLOWED_PROFESSORS
DROP POLICY IF EXISTS "Gestão total de autorizados para admins" ON allowed_professors;
CREATE POLICY "Gestão total de autorizados para admins" ON allowed_professors FOR ALL USING (
    public.is_admin() OR auth.jwt() ->> 'email' = 'cps@cps.local'
);

-- ATUALIZAR POLÍTICAS DA TABELA USERS
DROP POLICY IF EXISTS "Admin manage users" ON users;
CREATE POLICY "Admin manage users" ON users FOR ALL USING (
    public.is_admin() OR auth.jwt() ->> 'email' = 'cps@cps.local'
);
