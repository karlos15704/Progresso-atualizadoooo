import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

try {
  const admin = createClient(url, key);
  console.log("Client created.");

  const targetUid = '2fd74931-d300-43aa-9a1e-2b9fb343f303';
  const professionalName = 'Ana Luiza da Costa Teste';
  const newUsername = 'anacosta';
  const assignedSubjects = [];
  const assignedClasses = ['9º B', '9º A'];
  const role = 'professor';

  console.log("Starting simulation of /api/admin/update-professor-metadata...");

  // 1. Handle Username/Email update via Auth if newUsername is provided
  if (newUsername) {
    const safeUsername = newUsername.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    const newEmail = `${safeUsername}@cps.local`;
    
    // Fast check for conflict
    const { data: conflict, error: conflictErr } = await admin
      .from('users')
      .select('uid')
      .eq('email', newEmail)
      .neq('uid', targetUid)
      .maybeSingle();

    if (conflictErr) {
      console.error("Conflict check error:", conflictErr);
    }
    console.log("Conflict:", conflict);

    if (conflict) {
      console.log(`Conflict! O nome de usuário '${newUsername}' já está em uso.`);
    } else {
      try {
        console.log("Updating Auth user...");
        const { data: authUpdateData, error: authUpdateErr } = await admin.auth.admin.updateUserById(targetUid, {
          email: newEmail,
          user_metadata: { username: safeUsername }
        });
        if (authUpdateErr) {
          console.error("Auth update error:", authUpdateErr);
        } else {
          console.log("Auth update success:", authUpdateData);
        }
      } catch (authErr) {
         console.warn("Aviso ao atualizar e-mail/username no Auth:", authErr.message);
      }
    }
  }

  // 2. Update public.users table
  try {
    console.log("Querying profile...");
    const { data: profile, error: getError } = await admin
      .from('users')
      .select('uid')
      .eq('uid', targetUid)
      .maybeSingle();

    if (getError) throw getError;
    console.log("Profile found:", profile);

    if (profile) {
      const updatePayload = {
        professional_name: professionalName
      };
      
      console.log("Updating profile in users table...");
      const { data: updateData, error: dbError } = await admin
        .from('users')
        .update(updatePayload)
        .eq('uid', targetUid);
      if (dbError) throw dbError;
      console.log("Profile update success.");
    }
  } catch (err) {
    console.error("Erro ao atualizar tabela users:", err);
  }

} catch (err) {
  console.error("Catch Error:", err);
}
