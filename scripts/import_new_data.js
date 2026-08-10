// scripts/import_new_data.js
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar configurados no .env');
  process.exit(1);
}

const supabase = createClient(url, key);
const backupDir = path.join(process.cwd(), 'backup');

// Helper to read backup file
function readBackup(filename) {
  const filePath = path.join(backupDir, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function run() {
  console.log('Iniciando importação de dados no novo Supabase via HTTP API...');

  // 1. Load users backup
  const authUsers = readBackup('auth_users.json');
  if (!authUsers) {
    console.error('Erro: backup/auth_users.json não localizado. Rode o export_old_data.js primeiro.');
    process.exit(1);
  }

  // Get current users in the new Auth to prevent duplicates and build the mapping
  const { data: { users: currentNewUsers }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error('Erro ao ler usuários atuais da nova instância:', listErr.message);
    process.exit(1);
  }

  const emailToNewUidMap = new Map();
  currentNewUsers.forEach(u => {
    if (u.email) emailToNewUidMap.set(u.email.toLowerCase(), u.id);
  });

  const oldUidToNewUidMap = new Map();

  // Create users in the new Auth if they don't exist
  console.log('\n--- 1. Provisionando Contas de Autenticação ---');
  for (const oldUser of authUsers) {
    const email = oldUser.email?.toLowerCase();
    if (!email) continue;

    let newUid = emailToNewUidMap.get(email);
    if (!newUid) {
      // Create user
      const metadata = oldUser.raw_user_meta_data || {};
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: '15704_cpsAuth', // password set to 15704
        email_confirm: true,
        user_metadata: metadata
      });

      if (createError) {
        console.error(`  Erro ao provisionar conta para ${email}:`, createError.message);
        continue;
      }
      newUid = createData.user.id;
      console.log(`  Conta criada: ${email} -> UID: ${newUid}`);
    } else {
      console.log(`  Conta já existente: ${email} -> UID: ${newUid}`);
    }
    oldUidToNewUidMap.set(oldUser.id, newUid);
  }

  // 2. Import Public Profiles (users table)
  console.log('\n--- 2. Importando Perfis Públicos (tabela users) ---');
  const publicUsers = readBackup('public_users.json');
  if (publicUsers) {
    for (const profile of publicUsers) {
      const email = profile.email?.toLowerCase();
      const newUid = oldUidToNewUidMap.get(profile.uid) || emailToNewUidMap.get(email);
      if (!newUid) {
        console.warn(`  Aviso: Não foi possível mapear o UID do perfil para ${email}`);
        continue;
      }
      
      const payload = {
        uid: newUid,
        email: profile.email,
        username: profile.username,
        professional_name: profile.professional_name,
        role: profile.role,
        assigned_subjects: profile.assigned_subjects || [],
        assigned_classes: profile.assigned_classes || [],
        last_seen_at: profile.last_seen_at
      };

      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'uid' });
      if (error) {
        console.error(`  Erro ao salvar perfil de ${email}:`, error.message);
      } else {
        console.log(`  Perfil importado/atualizado: ${email}`);
      }
    }
  }

  // 3. Import Allowed Professors
  console.log('\n--- 3. Importando Professores Autorizados ---');
  const allowedProfs = readBackup('allowed_professors.json');
  if (allowedProfs) {
    const { error } = await supabase.from('allowed_professors').upsert(allowedProfs, { onConflict: 'email' });
    if (error) console.error('  Erro ao importar allowed_professors:', error.message);
    else console.log(`  Importados ${allowedProfs.length} professores autorizados.`);
  }

  // Helper to translate ids and batch insert
  async function importTable(filename, tableName, idCol = 'id', keyMapping = {}) {
    const records = readBackup(filename);
    if (!records || records.length === 0) {
      console.log(`\nNenhum dado encontrado para a tabela ${tableName}`);
      return;
    }

    console.log(`\n--- Importando tabela ${tableName} (${records.length} registros) ---`);
    
    // Translate old UIDs to new UIDs inside each record
    const translated = records.map(rec => {
      const clean = { ...rec };
      
      // Map columns containing user ids
      for (const colName of Object.keys(keyMapping)) {
        const type = keyMapping[colName];
        if (type === 'uid' && clean[colName]) {
          const mapped = oldUidToNewUidMap.get(clean[colName]);
          if (mapped) {
            clean[colName] = mapped;
          }
        }
      }
      
      return clean;
    });

    // Insert records in batches of 50
    const batchSize = 50;
    for (let i = 0; i < translated.length; i += batchSize) {
      const batch = translated.slice(i, i + batchSize);
      const { error } = await supabase.from(tableName).upsert(batch, { onConflict: idCol });
      if (error) {
        console.error(`  Erro ao inserir lote na tabela ${tableName}:`, error.message);
      } else {
        console.log(`  Inserido lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(translated.length / batchSize)}`);
      }
    }
  }

  // 4. Import school settings
  await importTable('school_settings.json', 'school_settings', 'key');

  // 5. Import exams
  await importTable('exams.json', 'exams', 'id', { 'professor_id': 'uid' });

  // 6. Import results
  await importTable('results.json', 'results', 'id', { 'professor_id': 'uid' });

  // 7. Import student reports
  await importTable('student_reports.json', 'student_reports', 'id', { 'professor_id': 'uid' });

  // 8. Import lessons
  await importTable('lessons.json', 'lessons', 'id', { 'professor_id': 'uid' });

  // 9. Import attendance
  await importTable('attendance.json', 'attendance', 'id');

  // 10. Import agenda messages
  await importTable('agenda_messages.json', 'agenda_messages', 'id');

  // 11. Import login history
  await importTable('login_history.json', 'login_history', 'id', { 'uid': 'uid' });

  // 12. Import activity logs
  await importTable('activity_logs.json', 'activity_logs', 'id');

  console.log('\n🎉 IMPORTAÇÃO COMPLETA CONCLUÍDA COM SUCESSO!');
}

run();
