// scripts/apply_migrations.js
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const dbUrl = process.env.NEW_DATABASE_URL;

if (!dbUrl) {
  console.error('Erro: NEW_DATABASE_URL não está configurada no .env');
  process.exit(1);
}

// Bypasses the self-signed SSL certificate check required by Supabase direct connections
const client = new Client({ 
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Conectando ao novo banco de dados Supabase para aplicar a estrutura...');
  try {
    await client.connect();
    console.log('Conectado com sucesso.');

    const sqlPath = path.join(process.cwd(), 'database.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Arquivo database.sql não encontrado no caminho: ${sqlPath}`);
    }

    console.log('Lendo database.sql...');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Aplicando migrations (isso criará as tabelas, RLS, funções e índices)...');
    
    // Execute the SQL dump directly
    await client.query(sql);
    
    console.log('🎉 Migrations aplicadas com sucesso!');
  } catch (err) {
    console.error('❌ Erro ao aplicar as migrations:', err.message || err);
  } finally {
    await client.end();
  }
}

run();
