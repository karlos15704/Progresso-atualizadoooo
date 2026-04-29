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

  // AI Correction Endpoint
  app.post("/api/ai/correct", async (req, res) => {
    const { imageBase64, mimeType, examTitle, questions } = req.body;
    
    // Prioritize KarlosAPI, then use GEMINI_API_KEY as fallback
    let apiKey = (process.env.KarlosAPI || "").trim();
    if (!apiKey || apiKey === "" || apiKey === "undefined") {
      apiKey = (process.env.GEMINI_API_KEY || "").trim();
    }

    if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey.includes('YOUR_API_KEY')) {
      return res.status(401).json({ 
        error: "Chave da API não encontrada. Adicione o segredo 'KarlosAPI' ou 'GEMINI_API_KEY' em Settings > Secrets." 
      });
    }

    const { GoogleGenAI, Type } = await import("@google/genai");
    const client = new GoogleGenAI({ apiKey });

    const questionsContext = questions.map((q: any, idx: number) => {
      const typeStr = q.type === 'essay' ? 'Dissertativa' : 'Múltipla Escolha';
      const gabaritoStr = q.type !== 'essay' ? `(Gabarito esperado: ${q.correctAnswer})` : '(Transcrever texto)';
      return `Q${idx + 1}: ${typeStr} ${gabaritoStr}`;
    }).join(', ');

    const prompt = `Analise a imagem da prova: "${examTitle}". Extraia os seguintes dados estruturados:
1. studentName: Nome completo do aluno conforme escrito na prova.
2. studentClass: Turma/Série do aluno (ex: "3º ano A").
3. answers: Um objeto JSON onde a chave é o número da questão em string (ex: "1", "2") e o valor é a resposta extraída.
   - Para questões de múltipla escolha: Compare com o gabarito esperado e extraia APENAS a letra da opção escolhida (A, B, C, D ou E). Se houver rasura, identifique a opção final.
   - Para questões dissertativas: Transcreva o texto escrito pelo aluno.
   - O sistema espera as seguintes questões e gabaritos: ${questionsContext}.
4. feedback: Um comentário curto, amigável e motivador sobre o desempenho do aluno observado na correção.`;

    const maxRetries = 2;
    let attempt = 0;
    
    const executeAttempt = async (): Promise<any> => {
      try {
        const response = await client.models.generateContent({
          model: "gemini-2.0-flash",
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
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                studentName: { type: Type.STRING },
                studentClass: { type: Type.STRING },
                answers: { 
                  type: Type.OBJECT,
                  description: "Map of question number to student's answer. For multiple choice, must be just the letter (A, B, C, D or E)."
                },
                feedback: { type: Type.STRING }
              },
              required: ["studentName", "answers", "feedback"]
            }
          }
        });
        return response;
      } catch (err: any) {
        if (err.status === 429 && attempt < maxRetries) {
          attempt++;
          console.log(`[AI Retry] Attempt ${attempt} after 429 error...`);
          await new Promise(resolve => setTimeout(resolve, 5000 * attempt)); // wait 5s, 10s
          return executeAttempt();
        }
        throw err;
      }
    };

    try {
      const response = await executeAttempt();
      let responseText = response.text || "{}";
      // Ensure we clean potential markdown backticks if any
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      try {
        const parsed = JSON.parse(responseText);
        res.json(parsed);
      } catch (parseErr) {
        console.error("JSON Parse Error on AI response:", responseText);
        res.status(500).json({ error: "A IA retornou um formato inválido. Tente novamente." });
      }
    } catch (err: any) {
      console.error("AI Server Error:", err);
      
      const status = err.status || 500;
      let errorMessage = "Erro ao processar correção. ";

      if (status === 429) {
        errorMessage = "Limite de quota excedido (Rate Limit). Por favor, aguarde cerca de 1 minuto e tente novamente. Se o problema persistir, use uma chave API com mais quota.";
      } else if (status === 503) {
        errorMessage = "O serviço de IA está temporariamente sobrecarregado (Alta Demanda). Por favor, tente novamente em instantes.";
      } else if (err.status === 404) {
        errorMessage = "Modelo Gemini 1.5 Flash não disponível nesta região/chave. Tente usar KarlosAPI em Settings > Secrets.";
      } else if (err.message && err.message.includes("API key not valid")) {
        errorMessage += "A Chave API configurada parece ser inválida. Verifique em Settings > Secrets.";
      } else {
        errorMessage += err.message || "Erro desconhecido na IA.";
      }
      
      res.status(status).json({ error: errorMessage });
    }
  });

  app.post("/api/ai/study-guide", async (req, res) => {
    const { content } = req.body;
    let apiKey = (process.env.KarlosAPI || "").trim();
    if (!apiKey || apiKey === "" || apiKey === "undefined") {
      apiKey = (process.env.GEMINI_API_KEY || "").trim();
    }
    
    if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey.includes('YOUR_API_KEY')) {
      return res.json({ guide: "Guia manual (API não configurada): " + content });
    }

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const client = new GoogleGenAI({ apiKey });
      
      const maxRetries = 1;
      let attempt = 0;
      
      const executeGuideAttempt = async (): Promise<any> => {
        try {
          return await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: 'user', parts: [{ text: `Crie um guia de estudos em Markdown para alunos com base em: "${content}". Use títulos (##), listas e negrito para organizar.` }] }]
          });
        } catch (err: any) {
          if (err.status === 429 && attempt < maxRetries) {
            attempt++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            return executeGuideAttempt();
          }
          throw err;
        }
      };

      const response = await executeGuideAttempt();
      res.json({ guide: response.text });
    } catch (err: any) {
      console.error("AI Guide Error:", err);
      let errorMessage = "Guia manual (erro): ";
      if (err.status === 429) {
        errorMessage = "Erro de quota (Rate Limit). Tente novamente em instantes.";
      } else {
        errorMessage += err.message || content;
      }
      res.json({ guide: errorMessage });
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
