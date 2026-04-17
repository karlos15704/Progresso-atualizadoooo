import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://kieifmfjonynbqvmhzis.supabase.co';
const supabaseAnonKey = 'sb_publishable_LBmWn0aH9NxX68r8SZzQog__ortltvi';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('schedule_events').select('*').limit(1);
  console.log("SCHEDULE EVENTS:", data, error);
}
check();
