import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';

const LOG_FILE = path.join(process.cwd(), 'server-debug.log');

let supabaseAdmin: any = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.VITE_SUPABASE_URL || 'https://kieifmfjonynbqvmhzis.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required for admin operations.");
    }
    supabaseAdmin = createClient(url, key);
  }
  return supabaseAdmin;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Clear log on start
  fs.writeFileSync(LOG_FILE, `Server initialized at ${new Date().toISOString()}\n`);

  // We need to support large payload sizes for base64 images
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Debug logging for all requests to a file we can read
  app.use((req, res, next) => {
    const entry = `${new Date().toISOString()} - ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers['content-type'])}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(entry.trim());
    next();
  });

  // Health check & Debug
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/debug-env", (req, res) => {
    res.json({
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      nodeEnv: process.env.NODE_ENV,
      port: 3000
    });
  });

  // Admin route to create a professor account
  app.post("/api/admin/create-professor", async (req, res) => {
    const { username, fullName, password, assignedSubjects } = req.body;

    if (!username || !fullName || !password) {
      return res.status(400).json({ error: "Nome, usuário e senha são obrigatórios." });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Configuração do servidor incompleta (service role key faltando)." });
    }

    try {
      const admin = getSupabaseAdmin();
      const email = `${username.toLowerCase().trim()}@cps.local`;
      const finalPassword = password + "_cpsAuth"; 

      // 1. Create Auth User
      const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password: finalPassword,
        email_confirm: true,
        user_metadata: { displayName: fullName }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar usuário no Auth.");

      // 2. Create Profile in users table
      const { error: profileError } = await admin.from('users').insert([{
        uid: authData.user.id,
        email: email,
        username: username.toLowerCase().trim(),
        professional_name: fullName,
        role: 'professor',
        assigned_subjects: assignedSubjects || [],
        assigned_classes: []
      }]);

      if (profileError) {
        throw profileError;
      }

      // 3. Add to allowed_professors for compatibility
      await admin.from('allowed_professors').insert([{
        email,
        username: username.toLowerCase().trim(),
        full_name: fullName,
        assigned_subjects: assignedSubjects || []
      }]);

      res.status(201).json({ message: "Professor criado com sucesso!", user: authData.user });
    } catch (err: any) {
      console.error("Erro ao criar professor:", err);
      res.status(500).json({ error: err.message || "Erro interno ao criar professor." });
    }
  });

  // Add error handler for Express parsing
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.type === 'entity.too.large') {
      console.error("Payload too large:", err);
      return res.status(413).json({ error: 'A imagem enviada é maior do que o limite permitido. Tente comprimir a foto ou reduzir a resolução.' });
    }
    if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
      return res.status(400).json({ error: 'JSON malformado.' });
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const startMsg = "Starting server in DEVELOPMENT mode with Vite middleware...\n";
    console.log(startMsg.trim());
    fs.appendFileSync(LOG_FILE, startMsg);
    
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware applied.");
    fs.appendFileSync(LOG_FILE, "Vite middleware applied.\n");
  } else {
    console.log("Starting server in PRODUCTION mode...");
    fs.appendFileSync(LOG_FILE, "Starting server in PRODUCTION mode.\n");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    const msg = `🚀 Server is strictly listening on http://0.0.0.0:${PORT}`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + "\n");
  });
}

startServer().catch(err => {
  console.error("CRITICAL SERVER START ERROR:", err);
  fs.appendFileSync(LOG_FILE, `CRITICAL SERVER START ERROR: ${err.stack || err}\n`);
});
