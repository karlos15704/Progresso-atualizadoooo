const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://kieifmfjonynbqvmhzis.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZWlmbWZqb255bmJxdm1oemlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNDEwNDEsImV4cCI6MjA5MTkxNzA0MX0.Mb4ZkNkbZN5f5pWRYXCrxynQN65QBuRgy3z4jMx25SI');

async function run() {
  const { data, error } = await supabase.from('exams').select('id, title, professor_id').order('created_at', { ascending: false }).limit(20);
  console.log(JSON.stringify({data, error}, null, 2));
}
run();
