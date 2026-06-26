// scripts/export_old_data.js
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const oldDbUrl = process.env.OLD_DATABASE_URL;

if (!oldDbUrl) {
  console.error('Erro: Defina a variável OLD_DATABASE_URL no .env com a senha do banco antigo.');
  console.error('Exemplo: OLD_DATABASE_URL=postgresql://postgres:[SENHA_ANTIGA]@db.kieifmfjonynbqvmhzis.supabase.co:6543/postgres?sslmode=require');
  process.exit(1);
}

const client = new Client({
  connectionString: oldDbUrl,
  ssl: { rejectUnauthorized: false }
});

const backupDir = path.join(process.cwd(), 'backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

const tablesToExport = [
  { table: 'users', schema: 'auth', file: 'auth_users.json' },
  { table: 'identities', schema: 'auth', file: 'auth_identities.json' },
  { table: 'school_settings', schema: 'public', file: 'school_settings.json' },
  { table: 'allowed_professors', schema: 'public', file: 'allowed_professors.json' },
  { table: 'users', schema: 'public', file: 'public_users.json' },
  { table: 'exams', schema: 'public', file: 'exams.json' },
  { table: 'results', schema: 'public', file: 'results.json' },
  { table: 'student_reports', schema: 'public', file: 'student_reports.json' },
  { table: 'lessons', schema: 'public', file: 'lessons.json' },
  { table: 'attendance', schema: 'public', file: 'attendance.json' },
  { table: 'agenda_messages', schema: 'public', file: 'agenda_messages.json' },
  { table: 'login_history', schema: 'public', file: 'login_history.json' },
  { table: 'activity_logs', schema: 'public', file: 'activity_logs.json' }
];

async function run() {
  console.log('Conectando ao banco de dados antigo...');
  try {
    await client.connect();
    console.log('Conectado.');

    for (const item of tablesToExport) {
      console.log(`Exportando tabela ${item.schema}.${item.table}...`);
      try {
        const res = await client.query(`SELECT * FROM ${item.schema}.${item.table}`);
        const filePath = path.join(backupDir, item.file);
        fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2), 'utf8');
        console.log(`  Exportado: ${res.rows.length} registros salvos em backup/${item.file}`);
      } catch (err) {
        console.error(`  Erro ao exportar ${item.schema}.${item.table}:`, err.message);
      }
    }
    console.log('\n🎉 Exportação de dados concluída! Verifique a pasta backup/');
  } catch (err) {
    console.error('Falha de conexão com o banco antigo:', err.message);
  } finally {
    await client.end();
  }
}

run();
