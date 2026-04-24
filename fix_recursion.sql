-- Correção de erro de recursão infinita (infinite recursion) na tabela users
-- Execute este script no SQL Editor do Supabase

-- Primeiro exclua a política que está causando o loop infinito:
DROP POLICY IF EXISTS "Admins gerenciam tudo" ON users;

-- Substitua com políticas divididas e específicas
CREATE POLICY "Admins excluem usuários" ON users FOR DELETE USING (
    (SELECT role FROM users WHERE uid = auth.uid() LIMIT 1) = 'admin'
);

CREATE POLICY "Admins atualizam usuários" ON users FOR UPDATE USING (
    (SELECT role FROM users WHERE uid = auth.uid() LIMIT 1) = 'admin'
);

-- Nota: não crie uma política FOR ALL baseada na própria tabela com SELECT para evitar recursão.
-- As outras políticas continuam funcionando com UPDATE / SELECT padrão.
