// scripts/test_db_conn.js
import pg from 'pg';
const { Client } = pg;

const password = '15704';
const projectRef = 'feyfhczjuojhkjxhttap';

const client = new Client({ 
  host: `db.${projectRef}.supabase.co`,
  port: 6543,
  database: 'postgres',
  user: 'postgres',
  password: password,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Testing connection to db.[REF].supabase.co on port 6543 with password "15704"...');
  try {
    await client.connect();
    console.log('🎉 Success! Connected to the database!');
    const res = await client.query('SELECT version();');
    console.log('Database version:', res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error('❌ Failed to connect:', err.message);
  }
}

run();
