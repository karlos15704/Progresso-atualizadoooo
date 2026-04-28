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

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Routes
  app.post("/api/ai/correct", async (req, res) => {
    console.log(`[${new Date().toISOString()}] POST /api/ai/correct - Body keys: ${Object.keys(req.body).join(', ')}`);
    const { imageBase64, mimeType, examTitle, questions } = req.body;
    
    // Check for API Key in env or fallback to user provided one if env is placeholder
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined") {
      // Temporarily use the key provided by the user in chat to unblock them
      apiKey = "AIzaSyCsdeVta7u2kw60hgz2xayGWMFbi1x8muo"; 
      console.warn("Using fallback Gemini API key provided by user.");
    }

    if (!apiKey) {
      console.error("GEMINI_API_KEY não encontrada.");
      return res.status(500).json({ error: "A chave da API Gemini não foi encontrada. Por favor, configure GEMINI_API_KEY nos Segredos." });
    }

    try {
      console.log(`[${new Date().toISOString()}] Iniciando correção IA para: ${examTitle}`);
      const { GoogleGenAI, Type } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey });
      const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        Você é um assistente de correção de provas experiente. 
        Analise a imagem da prova/gabarito de título "${examTitle}".
        A prova possui ${questions.length} questões.
        Extraia as respostas do estudante para cada questão.
        
        Instruções estritas:
        1. Identifique e extraia o NOME DO ESTUDANTE e a TURMA (class) da imagem. Se não encontrar, retorne strings vazias.
        2. Liste o que o estudante marcou em cada questão (A, B, C, D, E ou texto para dissertativas).
        3. Retorne o objeto \`answers\` onde a chave é o NÚMERO da questão (começando em 1) e o valor é a resposta extraída.
        4. Não tente calcular a nota.
      `;

      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              studentName: { type: Type.STRING },
              studentClass: { type: Type.STRING },
              answers: { 
                type: Type.OBJECT,
                description: "Mapeamento do número da questão para a resposta (ex: {\"1\": \"A\", \"2\": \"texto...\"})"
              },
              feedback: { type: Type.STRING }
            },
            required: ["studentName", "answers", "feedback"]
          }
        }
      });

      const responseText = result.response.text();
      console.log(`[${new Date().toISOString()}] Sucesso na correção IA.`);
      res.json(JSON.parse(responseText));
    } catch (err: any) {
      console.error("Erro na correção IA:", err);
      res.status(500).json({ error: err.message || "Erro interno na correção IA." });
    }
  });

  app.post("/api/ai/study-guide", async (req, res) => {
    const { content } = req.body;
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "undefined") {
      apiKey = "AIzaSyCsdeVta7u2kw60hgz2xayGWMFbi1x8muo"; 
    }

    if (!apiKey) return res.json({ guide: "Guia manual: " + content });

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genAI = new GoogleGenAI({ apiKey });
      const model = (genAI as any).getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Com base nos seguintes conteúdos: "${content}", crie um guia de estudos estruturado para os alunos. Inclua tópicos principais, explicações breves e dicas de estudo. Formate em Markdown.`;
      const result = await model.generateContent(prompt);
      res.json({ guide: result.response.text() });
    } catch (err) {
      res.json({ guide: "Guia manual: " + content });
    }
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
