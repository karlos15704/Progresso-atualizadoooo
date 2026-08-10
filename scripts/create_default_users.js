// scripts/create_default_users.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env');
  process.exit(1);
}

const supabase = createClient(url, key);

const defaultPassword = '15704_cpsAuth'; // O frontend adiciona '_cpsAuth' automaticamente ao password digitado

const adminUsers = [
  {
    username: 'ti',
    email: 'ti@cps.local',
    fullName: 'TI Escolar',
    role: 'admin, ti',
    assignedSubjects: [],
    assignedClasses: []
  },
  {
    username: 'cps',
    email: 'cps@cps.local',
    fullName: 'Administrador CPS',
    role: 'admin',
    assignedSubjects: [],
    assignedClasses: []
  }
];

const SEED_PROFESSORS = [
  {
    username: "cristiane",
    email: "cristiane@cps.local",
    full_name: "Cristiane",
    assigned_subjects: ["Robótica"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "virgilio",
    email: "virgilio@cps.local",
    full_name: "Virgílio",
    assigned_subjects: ["Matemática"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B"]
  },
  {
    username: "andre",
    email: "andre@cps.local",
    full_name: "André",
    assigned_subjects: ["Matemática"],
    assigned_classes: ["8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "daniela",
    email: "daniela@cps.local",
    full_name: "Daniela",
    assigned_subjects: ["Língua Portuguesa"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B"]
  },
  {
    username: "carmen",
    email: "carmen@cps.local",
    full_name: "Carmen",
    assigned_subjects: ["Língua Portuguesa"],
    assigned_classes: ["8º A", "8º B"]
  },
  {
    username: "thais",
    email: "thais@cps.local",
    full_name: "Thaís",
    assigned_subjects: ["Língua Portuguesa"],
    assigned_classes: ["9º A", "9º B"]
  },
  {
    username: "antonio",
    email: "antonio@cps.local",
    full_name: "Antônio",
    assigned_subjects: ["Língua Inglesa"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "eduardo",
    email: "eduardo@cps.local",
    full_name: "Eduardo",
    assigned_subjects: ["Ciências da Natureza", "Biologia, Química e Física"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "natasha",
    email: "natasha@cps.local",
    full_name: "Natasha",
    assigned_subjects: ["Geografia"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B"]
  },
  {
    username: "edineia",
    email: "edineia@cps.local",
    full_name: "Edineia",
    assigned_subjects: ["Geografia"],
    assigned_classes: ["8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "joselia",
    email: "joselia@cps.local",
    full_name: "Josélia",
    assigned_subjects: ["História"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "melanie",
    email: "melanie@cps.local",
    full_name: "Melanie",
    assigned_subjects: ["Educação Física"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "mayard",
    email: "mayard@cps.local",
    full_name: "Mayard",
    assigned_subjects: ["Ciências Sociais", "Artes"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "ana.aparecida",
    email: "ana.aparecida@cps.local",
    full_name: "Ana Aparecida",
    assigned_subjects: ["Artes"],
    assigned_classes: ["6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  },
  {
    username: "julimar",
    email: "julimar@cps.local",
    full_name: "Julimar",
    assigned_subjects: ["Espanhol"],
    assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
  }
];

async function createOrUpdateUser(email, password, username, fullName, role, assignedSubjects, assignedClasses) {
  console.log(`Processando usuário: ${email}`);
  
  // 1. Check if user already exists in auth
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Erro ao listar usuários do auth:', listError.message);
    return;
  }
  
  let authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  
  if (!authUser) {
    // Create new auth user (confirmed by default)
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { displayName: fullName, role: role }
    });
    
    if (createError) {
      console.error(`Erro ao criar ${email} no Auth:`, createError.message);
      return;
    }
    authUser = createData.user;
    console.log(`  Conta Auth criada com sucesso! UID: ${authUser.id}`);
  } else {
    // Reset password/metadata to ensure they are correct
    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      user_metadata: { displayName: fullName, role: role }
    });
    if (updateError) {
      console.error(`Erro ao atualizar dados de ${email} no Auth:`, updateError.message);
    } else {
      console.log(`  Conta Auth existente redefinida (senha e metadados atualizados).`);
    }
  }

  // 2. Insert/Update public profile
  const dbRole = role.includes('admin') ? 'admin' : 'professor';
  
  const { data: profile } = await supabase
    .from('users')
    .select('uid')
    .eq('email', email)
    .maybeSingle();

  if (profile) {
    const { error: dbErr } = await supabase
      .from('users')
      .update({
        uid: authUser.id,
        username,
        professional_name: fullName,
        role: dbRole,
        assigned_subjects: assignedSubjects,
        assigned_classes: assignedClasses
      })
      .eq('email', email);
    if (dbErr) console.error(`  Erro ao atualizar perfil users no banco:`, dbErr.message);
  } else {
    const { error: dbErr } = await supabase
      .from('users')
      .insert([{
        uid: authUser.id,
        email,
        username,
        professional_name: fullName,
        role: dbRole,
        assigned_subjects: assignedSubjects,
        assigned_classes: assignedClasses
      }]);
    if (dbErr) console.error(`  Erro ao inserir perfil users no banco:`, dbErr.message);
  }

  // 3. Upsert into allowed_professors
  const { data: allowed } = await supabase
    .from('allowed_professors')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (allowed) {
    await supabase
      .from('allowed_professors')
      .update({ username, full_name: fullName, assigned_subjects: assignedSubjects })
      .eq('email', email);
  } else {
    await supabase
      .from('allowed_professors')
      .insert([{ email, username, full_name: fullName, assigned_subjects: assignedSubjects }]);
  }
}

async function run() {
  console.log('Iniciando provisionamento de usuários e administradores padrão...');
  
  // 1. Criar administradores
  for (const admin of adminUsers) {
    await createOrUpdateUser(
      admin.email,
      defaultPassword,
      admin.username,
      admin.fullName,
      admin.role,
      admin.assignedSubjects,
      admin.assignedClasses
    );
  }

  // 2. Criar professores
  for (const prof of SEED_PROFESSORS) {
    await createOrUpdateUser(
      prof.email,
      defaultPassword,
      prof.username,
      prof.full_name,
      'professor',
      prof.assigned_subjects,
      prof.assigned_classes
    );
  }

  console.log('\nTodos os usuários padrão foram provisionados e confirmados!');
  console.log('Senha de acesso online para todos: 15704');
}

run();
