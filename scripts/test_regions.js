// scripts/test_regions.js
import pg from 'pg';
const { Client } = pg;

const password = 'sb_secret_-1fQCWAEeTkx0fI41beM3A_KxKhBZwa';
const projectRef = 'feyfhczjuojhkjxhttap';

const regions = [
  'sa-east-1', // São Paulo
  'us-east-1', // N. Virginia
  'us-east-2', // Ohio
  'us-west-1', // N. California
  'us-west-2', // Oregon
  'eu-central-1', // Frankfurt
  'eu-west-1', // Ireland
  'eu-west-2', // London
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'ca-central-1' // Canada
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`Testing region ${region} (${host})...`);
  const client = new Client({
    host: host,
    port: 6543,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: password,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log(`  🎉 Success! Connected successfully to region: ${region}`);
    console.log(`  Connection string: postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Detecting Supabase project region...');
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      console.log('\nRegion detection completed successfully!');
      break;
    }
  }
}

run();
