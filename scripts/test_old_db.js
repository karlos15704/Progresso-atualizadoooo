// scripts/test_old_db.js
import pg from 'pg';
const { Client } = pg;

const projectRef = 'kieifmfjonynbqvmhzis';
const passwords = ['15704', '15704_cpsAuth']; // test potential passwords

async function testPassword(pwd) {
  console.log(`Testing old database with password: ${pwd}...`);
  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 6543,
    database: 'postgres',
    user: 'postgres',
    password: pwd,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`  🎉 Success! Connected to the OLD database using password "${pwd}"!`);
    
    // Check tables
    const res = await client.query("SELECT count(*) FROM public.users");
    console.log(`  Number of users in old DB: ${res.rows[0].count}`);
    
    await client.end();
    return true;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    return false;
  }
}

async function run() {
  for (const pwd of passwords) {
    const ok = await testPassword(pwd);
    if (ok) break;
  }
}

run();
