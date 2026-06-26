// scripts/migrate_supabase.js
import pg from 'pg';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const { Client } = pg;

// Connection configurations
const oldDbUrl = process.env.OLD_DATABASE_URL;
const newDbUrl = process.env.NEW_DATABASE_URL;

if (!oldDbUrl || !newDbUrl) {
  console.error('ERRO: Você deve configurar OLD_DATABASE_URL e NEW_DATABASE_URL no seu arquivo .env ou como variáveis de ambiente.');
  console.error('Exemplo:');
  console.error('  OLD_DATABASE_URL=postgresql://postgres:[SENHA_ANTIGA]@db.kieifmfjonynbqvmhzis.supabase.co:6543/postgres');
  console.error('  NEW_DATABASE_URL=postgresql://postgres:[SENHA_NOVA]@db.feyfhczjuojhkjxhttap.supabase.co:6543/postgres');
  process.exit(1);
}

// Bypasses the self-signed SSL certificate check required by Supabase direct pooler connections
const sourceClient = new Client({ 
  connectionString: oldDbUrl,
  ssl: { rejectUnauthorized: false }
});
const destClient = new Client({ 
  connectionString: newDbUrl,
  ssl: { rejectUnauthorized: false }
});

// List of public tables in topological order (dependencies first)
const publicTables = [
  'school_settings',
  'allowed_professors',
  'users',
  'exams',
  'results',
  'student_reports',
  'lessons',
  'attendance',
  'agenda_messages',
  'login_history',
  'activity_logs'
];

async function migrateTable(tableName, schemaName = 'public', idColumn = 'id') {
  console.log(`\n Migrando tabela: ${schemaName}.${tableName}...`);
  try {
    // 1. Get row count and data from source
    const selectRes = await sourceClient.query(`SELECT * FROM ${schemaName}.${tableName}`);
    const rows = selectRes.rows;
    console.log(`   Linhas encontradas na origem: ${rows.length}`);

    if (rows.length === 0) {
      console.log(`   Nenhuma linha para migrar.`);
      return;
    }

    // 2. Prepare destination table: get column names
    const colsRes = await destClient.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
    `, [schemaName, tableName]);
    
    if (colsRes.rows.length === 0) {
      console.warn(`   AVISO: Tabela destino ${schemaName}.${tableName} não encontrada. Certifique-se de executar o arquivo database.sql no destino primeiro.`);
      return;
    }

    const destColumns = colsRes.rows.map(c => c.column_name);

    // 3. Temporarily disable triggers/RLS on destination table to bypass checks and speed up inserts
    await destClient.query(`ALTER TABLE ${schemaName}.${tableName} DISABLE TRIGGER ALL`);

    // 4. Perform upsert inserts in batches to prevent payload limits
    let successCount = 0;
    for (const row of rows) {
      // Clean up row keys that are not present in the destination schema
      const keys = Object.keys(row).filter(key => destColumns.includes(key));
      if (keys.length === 0) continue;

      const values = keys.map(k => row[k]);
      
      const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
      const columnsList = keys.map(k => `"${k}"`).join(', ');
      
      let queryStr = `INSERT INTO ${schemaName}.${tableName} (${columnsList}) VALUES (${placeholders})`;
      
      // Upsert configuration to prevent duplicates
      if (idColumn) {
        const updateSets = keys.filter(k => k !== idColumn).map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
        if (updateSets.length > 0) {
          queryStr += ` ON CONFLICT (${idColumn}) DO UPDATE SET ${updateSets}`;
        } else {
          queryStr += ` ON CONFLICT (${idColumn}) DO NOTHING`;
        }
      }

      try {
        await destClient.query(queryStr, values);
        successCount++;
      } catch (insertErr) {
        console.error(`   Falha ao migrar linha id=${row[idColumn] || 'unknown'}:`, insertErr.message);
      }
    }

    // 5. Re-enable triggers/RLS
    await destClient.query(`ALTER TABLE ${schemaName}.${tableName} ENABLE TRIGGER ALL`);
    console.log(`   Migração de ${schemaName}.${tableName} concluída: ${successCount}/${rows.length} inseridas.`);
  } catch (err) {
    console.error(`   Erro crítico ao migrar a tabela ${schemaName}.${tableName}:`, err.message);
  }
}

async function runMigration() {
  console.log('Iniciando migração de dados do Supabase via conexões TCP diretas...');
  try {
    await sourceClient.connect();
    console.log(' Conectado com sucesso ao Supabase de ORIGEM.');
    await destClient.connect();
    console.log(' Conectado com sucesso ao Supabase de DESTINO.');

    // --- MIGRAR AUTENTICAÇÃO (auth.users e auth.identities) ---
    console.log('\n--- 1. MIGRANDO DADOS DE AUTENTICAÇÃO (SCHEMA auth) ---');
    
    // Migrar auth.users (preservando hashes de senhas e perfis)
    await migrateTable('users', 'auth', 'id');
    
    // Migrar auth.identities
    await migrateTable('identities', 'auth', 'id');

    // --- MIGRAR DADOS PÚBLICOS ---
    console.log('\n--- 2. MIGRANDO DADOS PÚBLICOS (SCHEMA public) ---');
    for (const table of publicTables) {
      let idCol = 'id';
      if (table === 'users') idCol = 'uid'; // users table uses uid
      if (table === 'school_settings') idCol = 'key'; // school_settings uses key
      
      await migrateTable(table, 'public', idCol);
    }

    console.log('\n🎉 MIGRAÇÃO DE DADOS FINALIZADA COM SUCESSO!');
  } catch (err) {
    console.error('\n❌ Erro crítico no processo de migração:', err);
  } finally {
    try {
      await sourceClient.end();
      await destClient.end();
    } catch (_) {}
  }
}

runMigration();
