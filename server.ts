import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";

import webpush from "web-push";

dotenv.config();

const BASE_DIR = process.env.VERCEL ? '/tmp' : process.cwd();
const LOG_FILE = path.join(BASE_DIR, 'server-debug.log');

function safeLogToFile(content: string) {
  if (process.env.VERCEL) return;
  try {
    fs.appendFileSync(LOG_FILE, content);
  } catch (err) {
    console.warn("Failed to write to local log file:", err);
  }
}

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BBIRjtfRMYIYh6BcB9kfp26uOYvbEX4ecWP50-mbb0grmGNdIR8L_k1I-pMdjBBocxOaFQRnJYAMUIEdwA-7Z6M";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "wluC8QGJwUnpXbtKCpK5UX-Y87CPU_4u094FvJ_11VA";
const VAPID_MAILTO = process.env.VAPID_MAILTO || "mailto:ti@cps.local";

try {
  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (vapidErr: any) {
  console.warn("Aviso ao configurar VAPID para notificações push:", vapidErr.message || vapidErr);
}

const SUBSCRIPTIONS_FILE = path.join(BASE_DIR, 'push_subscriptions.json');

function getSubscriptions() {
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
    } catch (e) {
      return [];
    }
  }
  return [];
}

function saveSubscription(sub: any) {
  const subs = getSubscriptions();
  // Avoid duplicates
  const exists = subs.find((s: any) => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2));
  }
}

const app = express();
const PORT = 3000;

// --- PUSH NOTIFICATION ENDPOINTS ---
app.post("/api/push/subscribe", (req, res) => {
  const subscription = req.body;
  saveSubscription(subscription);
  res.status(201).json({ success: true });
});

app.post("/api/push/send", async (req, res) => {
  const { title, body } = req.body;
  const subscriptions = getSubscriptions();
  const notifications = subscriptions.map((sub: any) => 
    webpush.sendNotification(sub, JSON.stringify({ title, body }))
      .catch(err => {
        if (err.statusCode === 410) {
          // Subscription expired or removed
          console.log("Subscription expired:", sub.endpoint);
        } else {
          console.error("Push error:", err);
        }
      })
  );

  await Promise.all(notifications);
  res.json({ success: true, count: subscriptions.length });
});

// Configuração do Transportador de Email (Nodemailer)
const getEmailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

async function sendNotificationEmail(to: string, subject: string, html: string) {
  const transporter = getEmailTransporter();
  if (!transporter) {
    console.warn(`[Email Notification] SMTP não configurado. Notificação para ${to} ignorada ou apenas logada.`);
    console.log(`[Email Mocked] To: ${to}, Subject: ${subject}`);
    return { success: false, warning: "SMTP não configurado" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"Mural Progresso" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[Email Error] Erro ao enviar email para ${to}:`, error);
    return { success: false, error: error.message };
  }
}

// Trust local proxy for rate limiting (X-Forwarded-For)
app.set('trust proxy', 1);

// --- SECURITY MIDDLEWARES ---
// 1. Helmet for secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: false, // Vite handles CSP in dev, and it can be tricky with inline scripts
  crossOriginEmbedderPolicy: false,
}));

// 2. CORS configuration
app.use(cors({
  origin: true, // Allow all origins for now in AI Studio environment, but with credentials support
  credentials: true,
}));

// 3. Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { error: "Muitas requisições deste IP. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit login/auth attempts
  message: { error: "Muitas tentativas de acesso. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit AI requests
  message: { error: "Limite de uso da IA atingido para o seu IP. Tente novamente em instantes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", globalLimiter);
app.use("/api/auth/", authLimiter);
app.use("/api/ai/", aiLimiter);

export { app };

let supabaseAdmin: any = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const rawEnvUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!rawEnvUrl || rawEnvUrl === 'undefined' || rawEnvUrl === 'null' || rawEnvUrl.trim() === '') {
      throw new Error("A variável de ambiente 'VITE_SUPABASE_URL' ou 'SUPABASE_URL' é obrigatória no backend.");
    }
    const url = rawEnvUrl.trim().replace(/\/rest\/v1\/?$/, '');
    
    const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    if (!envKey || envKey === 'undefined' || envKey === 'null' || envKey.trim() === '') {
      throw new Error("A secret/variável de ambiente 'SUPABASE_SERVICE_ROLE_KEY' é obrigatória no backend.");
    }
      
    supabaseAdmin = createClient(url, envKey);
  }
  return supabaseAdmin;
}

interface OnlineUser {
  uid: string;
  email: string;
  name: string;
  role: string;
  lastSeen: number;
}
const onlineUsers = new Map<string, OnlineUser>();

async function recordActivity(actorName: string, actorEmail: string, actionType: string, description: string) {
  const emailLower = (actorEmail || '').toLowerCase().trim();
  const nameLower = (actorName || '').toLowerCase();
  const isTI = emailLower === 'ti@cps.local' || emailLower.includes('ti') || nameLower.includes('ti');
  if (isTI) {
    return; // Ghost mode
  }

  const admin = getSupabaseAdmin();
  const timestamp = new Date().toISOString();
  
  // 1. Double log locally to a file that is absolutely guaranteed to persist in the container's disk
  try {
    const localLogsFile = path.join(BASE_DIR, 'activity_logs.json');
    let logs: any[] = [];
    if (fs.existsSync(localLogsFile)) {
      try {
        const raw = fs.readFileSync(localLogsFile, 'utf-8');
        logs = JSON.parse(raw);
      } catch (e) {
        logs = [];
      }
    }
    logs.unshift({
      id: Math.random().toString(36).substring(2, 11),
      actor_name: actorName,
      actor_email: actorEmail,
      action_type: actionType,
      description,
      created_at: timestamp
    });
    if (logs.length > 2000) logs = logs.slice(0, 2000);
    fs.writeFileSync(localLogsFile, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error("Local log error:", e);
  }

  // 2. Try to write to Supabase activity_logs
  try {
    const { error } = await admin.from('activity_logs').insert([{
      actor_name: actorName,
      actor_email: actorEmail,
      action_type: actionType,
      description,
      created_at: timestamp
    }]);
    if (error) {
      if (!error.message?.includes('Could not find the table') && !error.message?.includes('relation "public.activity_logs" does not exist') && !error.message?.includes('schema cache')) {
        console.warn("Supabase activity_logs insert failed/unconfigured. Local logging succeeded.", error.message);
      }
    }
  } catch (err: any) {
    if (!err.message?.includes('Could not find the table') && !err.message?.includes('relation "public.activity_logs" does not exist') && !err.message?.includes('schema cache')) {
      console.warn("Supabase activity_logs insert threw error. Local logging succeeded.", err);
    }
  }
}

// We need to support large payload sizes for base64 images
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Servir uploads de avatar locais como fallback para resiliência offline ou falhas de storage do Supabase
app.use('/uploads', express.static(path.join(BASE_DIR, 'uploads')));

// Debug logging for API requests only
app.use((req, res, next) => {
  if (req.url.startsWith('/api/') || req.url === '/') {
    const contentType = req.headers['content-type'] ? ` - Content-Type: ${req.headers['content-type']}` : '';
    const entry = `${new Date().toISOString()} - ${req.method} ${req.url}${contentType}\n`;
    
    // Only write to file if NOT on Vercel
    if (!process.env.VERCEL) {
      try {
        fs.appendFileSync(LOG_FILE, entry);
      } catch (e) {
        // Silently fail if disk is not writable
      }
    }
    console.log(entry.trim());
  }
  next();
});

// Initialization logic
// Garantir diretório de uploads (somente se não for Vercel ou usar /tmp se necessário)
const uploadsDir = path.join(BASE_DIR, 'uploads');
if (!process.env.VERCEL && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Double check and clear log on start (Sync) - Only if not on Vercel
if (!process.env.VERCEL) {
  try {
    fs.writeFileSync(LOG_FILE, `Server initialized at ${new Date().toISOString()}\n`);
  } catch (e) {}
}

app.get("/api/debug/test-email", async (req, res) => {
  const targetEmail = process.env.NOTIFICATION_IT_EMAIL;
  if (!targetEmail) {
    return res.status(400).json({ 
      success: false, 
      error: "A variável de ambiente NOTIFICATION_IT_EMAIL não está configurada no seu arquivo .env." 
    });
  }

  console.log(`[Debug Email] Solicitando envio de e-mail de teste para ${targetEmail}`);
  const result = await sendNotificationEmail(
    targetEmail,
    "Teste de Configuração SMTP - Mural Progresso",
    `
    <div style="font-family: sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; color: #334155; border: 1px solid #e2e8f0; rounded-lg">
      <h2 style="color: #35495e; font-size: 18px; font-weight: bold; margin-bottom: 16px;">Mural Progresso - Teste de Email SMTP</h2>
      <p style="font-size: 14px; margin-bottom: 16px;">Este é um e-mail de teste para validar se as credenciais SMTP no seu arquivo <strong>.env</strong> estão corretas.</p>
      <div style="background-color: #f8fafc; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; margin-bottom: 16px;">
        SMTP_HOST: ${process.env.SMTP_HOST || 'não configurado'}<br/>
        SMTP_USER: ${process.env.SMTP_USER || 'não configurado'}<br/>
        SMTP_PORT: ${process.env.SMTP_PORT || 'não configurado'}
      </div>
      <p style="font-size: 14px; color: #16a34a; font-weight: bold;">✔ Se você recebeu este email, sua configuração de SMTP está funcionando 100%!</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      <p style="font-size: 11px; color: #64748b;">MURAL PROGRESSO - Sistema de Gestão Institucional</p>
    </div>
    `
  );

  if (result.success) {
    return res.json({
      success: true,
      message: `E-mail de teste SMTP enviado de forma bem-sucedida para "${targetEmail}"!`,
      messageId: result.messageId
    });
  } else {
    return res.status(500).json({
      success: false,
      error: "Falha ao enviar o e-mail de teste SMTP.",
      details: result.error || result.warning
    });
  }
});

  app.post("/api/auth/panic-repair", async (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email obrigatório." });
    }
    
    try {
      const admin = getSupabaseAdmin();
      const { data: ant } = await admin.from('users').select('*').ilike('email', `%${email.split('@')[0]}%`).maybeSingle();
      if (ant) {
        // Force reset his bloated data and problematic fields
        await admin.from('users').update({
          role: ant.role || 'professor',
          // Do not slice assigned_subjects unless it's insanely large and clearly a mistake
          assigned_subjects: (Array.isArray(ant.assigned_subjects) && ant.assigned_subjects.length > 200) ? ant.assigned_subjects.slice(0, 50) : ant.assigned_subjects
        }).eq('uid', ant.uid);
        
        // CRITICAL: Clear auth metadata which causes 431 Header Too Large
        await admin.auth.admin.updateUserById(ant.uid, {
          user_metadata: { 
            avatar_base64: null, 
            avatar_url: (ant.avatar_url?.startsWith('data:') || (ant.user_metadata?.avatar_url?.startsWith('data:'))) ? null : (ant.avatar_url || ant.user_metadata?.avatar_url)
          }
        });

        return res.json({ success: true, message: "A conta foi higienizada. Imagens pesadas foram removidas para restaurar a estabilidade. Tente logar novamente." });
      }
      res.status(404).json({ error: "Conta não localizada no banco de dados." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Client-side Remote Logger
  app.post("/api/debug/client-log", (req, res) => {
    const { message, stack, userEmail } = req.body;
    const logEntry = `[CLIENT ERROR] ${new Date().toISOString()} - User: ${userEmail || 'Guest'} - ${message}\nStack: ${stack || 'N/A'}\n\n`;
    safeLogToFile(logEntry);
    res.json({ success: true });
  });

  // Health check & Debug
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.post("/api/notify/email", express.json(), async (req, res) => {
    const { to, subject, body } = req.body;
    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Parâmetros 'to', 'subject' e 'body' são obrigatórios." });
    }
    const result = await sendNotificationEmail(to, subject, body);
    res.json(result);
  });

  app.get("/api/debug-env", (req, res) => {
    res.json({
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasKarlosKey: !!process.env.KarlosAPI,
      hasSupabaseServiceKey: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY),
      nodeEnv: process.env.NODE_ENV,
      port: 3000
    });
  });

  app.get("/api/debug/test-email", async (req, res) => {
    const itEmail = process.env.NOTIFICATION_IT_EMAIL || "karlos15704@gmail.com";
    const subject = "🧪 Teste de Conexão SMTP - Colégio Progresso";
    const html = `
      <div style="font-family: sans-serif; padding: 25px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; rounded-2xl; background-color: #ffffff;">
        <h2 style="color: #a88d44; font-family: 'Space Grotesk', sans-serif; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-top: 0;">🧪 Teste de Envio SMTP</h2>
        <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">Olá,</p>
        <p style="font-size: 15px; color: #1e293b; line-height: 1.6;">Este é um e-mail de teste automatizado enviado para validar o funcionamento integrado do servidor SMTP e confirmar a entrega de notificações ao portal <strong>Colégio Progresso</strong>.</p>
        
        <div style="background-color: #f8fafc; border-radius: 12px; padding: 15px; margin: 20px 0; border: 1px solid #f1f5f9;">
          <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-top: 0; margin-bottom: 10px;">Parâmetros Utilizados no Envio:</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155;">
            <tr>
              <td style="padding: 4px 0; font-weight: 600; width: 140px;">Servidor SMTP:</td>
              <td style="padding: 4px 0; font-family: monospace; color: #475569;">${process.env.SMTP_HOST || 'Não definido'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">Porta SMTP:</td>
              <td style="padding: 4px 0; font-family: monospace; color: #475569;">${process.env.SMTP_PORT || 'Não definido'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">Usuário de Autenticação:</td>
              <td style="padding: 4px 0; font-family: monospace; color: #475569;">${process.env.SMTP_USER || 'Não definido'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: 600;">Destinatário de TI:</td>
              <td style="padding: 4px 0; font-family: monospace; color: #475569;">${itEmail}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #10b981; font-weight: bold; margin-top: 20px;">
          🎉 Sucesso! Se esta mensagem chegou à sua caixa de entrada, o backend está configurado corretamente e pronto para disparar notificações automáticas de provas e boletins.
        </p>
        
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 25px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
          Mural Pedagógico - Colégio Progresso © 2026
        </p>
      </div>
    `;

    const result = await sendNotificationEmail(itEmail, subject, html);
    res.json({
      success: result.success,
      recipient: itEmail,
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        hasPassword: !!process.env.SMTP_PASS,
        notificationItEmail: process.env.NOTIFICATION_IT_EMAIL,
      },
      details: result
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

    // Mask window and document to prevent "Forbidden use of secret API key in browser" error
    const g = globalThis as any;
    const origWindow = g.window;
    const origDocument = g.document;
    try {
      if (g.window !== undefined) delete g.window;
      if (g.document !== undefined) delete g.document;
    } catch (_) {}

    const client = new GoogleGenAI({ apiKey });

    try {
      if (origWindow !== undefined) g.window = origWindow;
      if (origDocument !== undefined) g.document = origDocument;
    } catch (_) {}

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
          model: "gemini-2.5-flash",
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

  // AI Exam Creator Endpoint
  app.post("/api/process-exam", async (req, res) => {
    const { text, title } = req.body;
    
    let apiKey = (process.env.KarlosAPI || "").trim();
    if (!apiKey || apiKey === "" || apiKey === "undefined") {
      apiKey = (process.env.GEMINI_API_KEY || "").trim();
    }

    if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey.includes('YOUR_API_KEY')) {
      return res.status(401).json({ 
        error: "Chave da API não configurada." 
      });
    }

    try {
      const client = new GoogleGenAI({ apiKey });

      const prompt = `Analise o texto da prova colado e converta-o para o nosso formato estruturado.
      
Texto Colado:
${text}

Se a questão não for de múltipla escolha ou não tiver alternativas, considere como "essay".
Para objective, identifique as alternativas e gere o array de string "options". Se houver um gabarito no texto final, relacione com "correctAnswer".
`;

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Extraído ou sugerido a partir do texto" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "objective ou essay" },
                    text: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING, description: "A, B, C, D, E etc" },
                    points: { type: Type.INTEGER }
                  },
                  required: ["type", "text", "points"]
                }
              }
            },
            required: ["title", "questions"]
          }
        }
      });

      let jsonStr = response.text || "{}";
      const parsed = JSON.parse(jsonStr);

      res.json(parsed);
    } catch (err: any) {
      console.error("AI Exam Processing Error:", err);
      res.status(500).json({ error: err.message || "Erro ao processar a prova com a IA." });
    }
  });

  // AI Multimodal File Exam Creator Endpoint for TI
  app.post("/api/admin/parse-exam-file", async (req, res) => {
    const { fileBase64, mimeType, fileName, customInstructions, rawText } = req.body;
    
    let apiKey = (process.env.KarlosAPI || "").trim();
    if (!apiKey || apiKey === "" || apiKey === "undefined") {
      apiKey = (process.env.GEMINI_API_KEY || "").trim();
    }
    if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey.includes('YOUR_API_KEY')) {
      return res.status(401).json({ 
        error: "Chave da API não configurada." 
      });
    }

    try {
      const client = new GoogleGenAI({ apiKey });

      let isWord = false;
      let isText = false;
      let extractedText = "";

      const lowerMime = (mimeType || "").toLowerCase();
      const lowerName = (fileName || "").toLowerCase();

      if (rawText) {
        extractedText = rawText;
        isText = true;
      } else if (
        lowerMime.includes("word") ||
        lowerMime.includes("officedocument.wordprocessingml") ||
        lowerMime.includes("msword") ||
        lowerName.endsWith(".docx") ||
        lowerName.endsWith(".doc")
      ) {
        isWord = true;
      } else if (lowerMime.startsWith("text/") || lowerName.endsWith(".txt")) {
        isText = true;
      }

      if (rawText) {
        // rawText already assigned to extractedText
      } else if (isWord) {
        try {
          const mammoth = await import("mammoth");
          const buffer = Buffer.from(fileBase64, "base64");
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } catch (err: any) {
          console.error("Mammoth text extraction error:", err);
          return res.status(400).json({
            error: "Falha ao extrair texto do arquivo Word (.doc/.docx). Verifique se o formato está correto (são suportados apenas arquivos .docx válidos)."
          });
        }
      } else if (isText) {
        try {
          extractedText = Buffer.from(fileBase64, "base64").toString("utf-8");
        } catch (err: any) {
          console.error("Text file decoding error:", err);
          return res.status(400).json({
            error: "Falha ao decodificar o arquivo de texto."
          });
        }
      }

      const prompt = `Analise o arquivo de prova fornecido e converta-o para o nosso formato estruturado.
      
Diretrizes:
1. Mapeie todas as questões encontradas na prova.
2. Identifique quais questões são objetivas (múltipla escolha) e quais são dissertativas (essay).
3. Para questões objetivas, extraia as alternativas como um array de strings ("options") contendo os textos das alternativas. Identifique a alternativa correta ("correctAnswer") como a letra correspondente ("A", "B", "C", "D", etc.). Se nenhuma alternativa correta for especificada no arquivo, adote "A" ou gere a resposta correta se possível.
4. Para questões dissertativas, defina "type" como "essay", "options" como um array vazio e "correctAnswer" como "". Defina também "lineCount" como um número de linhas em branco adequado para o aluno escrever a resposta (padrão: 5).
5. IDENTIFICAÇÃO DE FORMAS GEOMÉTRICAS: Se a questão contiver ou fizer referência clara a uma forma geométrica (por exemplo, um círculo, quadrado, retângulo, triângulo, triângulo retângulo, linha ou seta), configure os seguintes campos da questão correspondente:
   - "drawingShape": uma das opções: "none", "circle", "square", "rectangle", "triangle", "right-triangle", "line", "arrow".
   - "drawingShapeSize": tamanho da forma geométrica (número, padrão: 150).
   - "drawingShapeHeight": altura da forma geométrica (necessária para retângulos, triângulos ou triângulos retângulos, número, padrão: 100).
   - "drawingShapeFill": cor de preenchimento (padrão: "transparent").
   - "drawingShapeBorderColor": cor da borda (padrão: "black").
   - "drawingShapeBorderWidth": largura da borda (número, padrão: 2).
   - "drawingShapeBorderStyle": estilo da borda ("solid", "dashed" ou "dotted", padrão: "solid").
   - "drawingShapeText": qualquer legenda, rótulo ou valor numérico que deva aparecer escrito dentro/sobre a forma geométrica (ex: valores de lados, raio, etc.).
6. IDENTIFICAÇÃO DE GRÁFICOS E IMAGENS: Se a questão referir-se a uma imagem, foto ou gráfico complexo que não possa ser desenhado como forma geométrica simples:
   - Se o próprio arquivo enviado for uma imagem contendo apenas uma única questão com figura, podemos associar a imagem inteira à questão definindo "image" com a string base64 original.
   - Caso contrário, gere uma descrição textual rica da imagem dentro do texto da questão ou insira um marcador indicando a necessidade de imagem.
7. O campo "points" de cada questão deve ser preenchido (número, padrão: 1).
8. Extraia ou sugira um título representativo para a prova no campo "title".
9. Instruções extras fornecidas pelo usuário: ${customInstructions || "Nenhuma"}.`;

        let contentsList: any;
        if (isWord || isText) {
          contentsList = prompt + `\n\n--- INÍCIO DO TEXTO EXTRAÍDO DO ARQUIVO ---\n${extractedText}\n--- FIM DO TEXTO EXTRAÍDO DO ARQUIVO ---`;
        } else {
          contentsList = [
            prompt,
            {
              inlineData: {
                mimeType: mimeType || "application/pdf",
                data: fileBase64,
              },
            },
          ];
        }

        const generationConfig = {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    type: { type: Type.STRING },
                    text: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    correctAnswer: { type: Type.STRING },
                    points: { type: Type.NUMBER },
                    lineCount: { type: Type.INTEGER },
                    drawingShape: { type: Type.STRING },
                    drawingShapeSize: { type: Type.INTEGER },
                    drawingShapeHeight: { type: Type.INTEGER },
                    drawingShapeFill: { type: Type.STRING },
                    drawingShapeBorderColor: { type: Type.STRING },
                    drawingShapeBorderWidth: { type: Type.INTEGER },
                    drawingShapeBorderStyle: { type: Type.STRING },
                    drawingShapeText: { type: Type.STRING }
                  },
                  required: ["id", "type", "text"]
                }
              }
            },
            required: ["title", "questions"]
          }
        };

        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: contentsList,
          config: generationConfig
        });

        let responseText = response.text || "{}";
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        let parsed;
        try {
          parsed = JSON.parse(responseText);
        } catch (jsonErr: any) {
          console.error("JSON Parsing Error for Gemini response!");
          console.error("Response text length:", responseText.length);
          console.error("Response text snippet (last 500 chars):", responseText.slice(-500));
          try {
            const scratchDir = path.join(process.cwd(), "scratch");
            if (!fs.existsSync(scratchDir)) {
              fs.mkdirSync(scratchDir);
            }
            fs.writeFileSync(path.join(scratchDir, "gemini-raw-response.json"), responseText, "utf-8");
            console.log("Wrote raw Gemini response to scratch/gemini-raw-response.json for debugging");
          } catch (writeErr) {
            console.error("Failed to write raw response to file:", writeErr);
          }
          throw jsonErr;
        }
        res.json(parsed);
    } catch (err: any) {
      console.error("AI Exam File Parsing Error:", err);
      res.status(500).json({ error: err.message || "Erro ao processar o arquivo com a IA." });
    }
  });

  // Fast text extraction route for Word (.docx) and Text (.txt) files
  app.post("/api/admin/extract-text", async (req, res) => {
    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64) {
      return res.status(400).json({ error: "Nenhum arquivo enviado para extração de texto." });
    }
    try {
      let isWord = false;
      let isText = false;
      let extractedText = "";

      const lowerMime = (mimeType || "").toLowerCase();
      const lowerName = (fileName || "").toLowerCase();

      if (
        lowerMime.includes("word") ||
        lowerMime.includes("officedocument.wordprocessingml") ||
        lowerMime.includes("msword") ||
        lowerName.endsWith(".docx") ||
        lowerName.endsWith(".doc")
      ) {
        isWord = true;
      } else if (lowerMime.startsWith("text/") || lowerName.endsWith(".txt")) {
        isText = true;
      }

      if (isWord) {
        const mammoth = await import("mammoth");
        const buffer = Buffer.from(fileBase64, "base64");
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else if (isText) {
        extractedText = Buffer.from(fileBase64, "base64").toString("utf-8");
      } else {
        return res.status(400).json({ error: "Formato de arquivo não suportado para extração rápida de texto." });
      }

      res.json({ text: extractedText });
    } catch (err: any) {
      console.error("Text extraction endpoint error:", err);
      res.status(500).json({ error: err.message || "Erro ao extrair texto do arquivo." });
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
      // Mask window and document to prevent "Forbidden use of secret API key in browser" error
      const g = globalThis as any;
      const origWindow = g.window;
      const origDocument = g.document;
      try {
        if (g.window !== undefined) delete g.window;
        if (g.document !== undefined) delete g.document;
      } catch (_) {}

      const client = new GoogleGenAI({ apiKey });

      try {
        if (origWindow !== undefined) g.window = origWindow;
        if (origDocument !== undefined) g.document = origDocument;
      } catch (_) {}
      
      const maxRetries = 1;
      let attempt = 0;
      
      const executeGuideAttempt = async (): Promise<any> => {
        try {
          return await client.models.generateContent({
            model: "gemini-2.5-flash",
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

  // AI Announcement Assistant (Format, tone, correction)
  app.post("/api/ai/improve-announcement", async (req, res) => {
    const { title, content, targetTone } = req.body;
    
    let apiKey = (process.env.KarlosAPI || "").trim();
    if (!apiKey || apiKey === "" || apiKey === "undefined") {
      apiKey = (process.env.GEMINI_API_KEY || "").trim();
    }

    if (!apiKey || apiKey === "" || apiKey === "undefined" || apiKey.includes('YOUR_API_KEY')) {
      return res.status(401).json({ 
        error: "Chave da API não encontrada. Adicione o segredo 'KarlosAPI' ou 'GEMINI_API_KEY' em Settings > Secrets." 
      });
    }

    try {
      // Mask window and document to prevent "Forbidden use of secret API key in browser" error
      const g = globalThis as any;
      const origWindow = g.window;
      const origDocument = g.document;
      try {
        if (g.window !== undefined) delete g.window;
        if (g.document !== undefined) delete g.document;
      } catch (_) {}

      const client = new GoogleGenAI({ apiKey });

      try {
        if (origWindow !== undefined) g.window = origWindow;
        if (origDocument !== undefined) g.document = origDocument;
      } catch (_) {}
      
      const prompt = `Melhore o seguinte comunicado escolar destinado ao Colégio Progresso Santista.
Sua missão é:
1. Corrigir erros de português (ortografia, concordância, pontuação).
2. Deixar o estilo e formatação mais profissionais, limpos e organizados de acordo com o tom desejado.
3. Usar quebras de parágrafo claras para que a leitura fique agradável e limpa.

Título atual: "${title || ''}"
Texto atual: "${content || ''}"
Tom desejado: ${targetTone || 'formal'}

Você deve retornar obrigatoriamente um objeto JSON com as chaves:
- "title": O título aperfeiçoado de forma curta e corporativa.
- "content": O corpo textual aperfeiçoado e formatado elegantemente.`;

      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING }
            },
            required: ["title", "content"]
          }
        }
      });

      let responseText = response.text || "{}";
      responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(responseText);
      res.json(parsed);
    } catch (err: any) {
      console.error("Improve Announcement Error:", err);
      res.status(500).json({ error: err.message || "Erro ao formatar o recado com IA." });
    }
  });

  // Route to record login attempts (success or failure)
  app.post("/api/auth/record-login", async (req, res) => {
    const { email, uid, status, failureReason } = req.body;

    if (!email) {
      return res.status(400).json({ error: "E-mail do usuário é obrigatório." });
    }

    const emailLower = email.toLowerCase().trim();
    const isTI = emailLower === 'ti@cps.local' || emailLower.includes('ti');
    if (isTI) {
      return res.json({ success: true });
    }

    try {
      const admin = getSupabaseAdmin();

      // --- SELF-HEALING: Antonio Carlos Account Fix ---
      // If Antonio's profile data becomes bloated, it can cause fetch/session issues.
      if (email.toLowerCase().includes('antonio')) {
        const { data: ant } = await admin.from('users').select('*').ilike('email', '%antonio%').maybeSingle();
        if (ant) {
          const subjectsSize = Array.isArray(ant.assigned_subjects) ? ant.assigned_subjects.length : 0;
          const roleStr = (ant.role || '');
          const hasBloatedMetadata = ant.avatar_base64 || (ant.user_metadata?.avatar_base64);
          
          if (subjectsSize > 100 || roleStr.length > 150 || hasBloatedMetadata) {
            console.log("Self-healing: Removing heavy metadata from Antonio's account.");
            await admin.from('users').update({
              role: ant.role || 'professor',
              avatar_url: ant.avatar_url?.startsWith('data:') ? null : ant.avatar_url,
              assigned_subjects: subjectsSize > 100 ? ant.assigned_subjects.slice(0, 50) : ant.assigned_subjects
            }).eq('uid', ant.uid);

            // Also clear AUTH metadata which is the main cause of 431/Fetch errors
            await admin.auth.admin.updateUserById(ant.uid, {
              user_metadata: { avatar_base64: null, avatar_url: ant.avatar_url?.startsWith('data:') ? null : ant.avatar_url }
            });
          }
        }
      }

      const ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();
      const userAgent = (req.headers['user-agent'] || '').toString();

      // Attempt to insert login history record
      const { error } = await admin.from('login_history').insert([{
        uid: uid || null,
        email: email.toLowerCase().trim(),
        ip_address: ipAddress,
        user_agent: userAgent,
        status: status || 'failed',
        failure_reason: failureReason || null,
        attempted_at: new Date().toISOString()
      }]);

      if (error) {
        // If table doesn't exist yet, we don't want to crash. We can catch and log.
        if (error.code === '42P01') {
          console.warn("Table 'login_history' does not exist in public schema yet. Did you run the SQL script?");
          return res.status(200).json({ success: false, warning: "Tabela login_history não encontrada no banco." });
        }
        throw error;
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Erro ao registrar histórico de login:", err);
      res.status(500).json({ error: err.message || "Erro interno ao registrar login." });
    }
  });

  // Admin route to get login history
  app.get("/api/admin/login-history", async (req, res) => {
    try {
      const admin = getSupabaseAdmin();
      const { data, error } = await admin
        .from('login_history')
        .select('*')
        .order('attempted_at', { ascending: false })
        .limit(300); // Increased limit slightly, but capped to avoid memory issues

      if (error) {
        if (error.code === '42P01') {
          return res.json({ success: true, history: [], warning: "Tabela login_history não encontrada no banco." });
        }
        throw error;
      }

      res.json({ success: true, history: data });
    } catch (err: any) {
      console.error("Erro ao obter histórico de logins:", err);
      res.status(500).json({ error: err.message || "Erro interno ao obter histórico." });
    }
  });

  app.get("/api/admin/list-professors", async (req, res) => {
    try {
      const admin = getSupabaseAdmin();
      
      // Get all auth users
      const { data: { users: authUsers }, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (authError) throw authError;

      // Get all public.users
      const { data: publicUsers, error: publicError } = await admin.from('users').select('*');
      if (publicError) throw publicError;

      // Merge data
      const mergedUsers = publicUsers.filter((p: any) => p.email !== 'ti@cps.local').map((pUser: any) => {
        const authUser = authUsers.find((au: any) => au.id === pUser.uid);
        if (authUser?.user_metadata) {
          // Merge metadata like avatar_url and true string role
          return {
            ...pUser,
            avatar_url: authUser.user_metadata.avatar_url || authUser.user_metadata.avatar_base64 || null,
            role: authUser.user_metadata.role || pUser.role, // prioritize custom role string
            professional_name: authUser.user_metadata.displayName || pUser.professional_name
          };
        }
        return pUser;
      });

      res.json({ success: true, users: mergedUsers });
    } catch (err: any) {
      console.error("Erro ao listar professores:", err);
      res.status(500).json({ error: err.message || "Erro interno ao listar." });
    }
  });

  const SCHOOL_SETTINGS_FILE = path.join(BASE_DIR, 'school_settings.json');
  const AGENDA_FILE = path.join(BASE_DIR, 'agenda_messages.json');

  function getLocalAgenda() {
    if (fs.existsSync(AGENDA_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(AGENDA_FILE, 'utf-8'));
      } catch {
        return [];
      }
    }
    return [];
  }

  function saveLocalAgenda(messages: any[]) {
    try {
      fs.writeFileSync(AGENDA_FILE, JSON.stringify(messages, null, 2));
    } catch (err) {
      console.warn("Error saving local agenda file:", err);
    }
  }

  app.get("/api/admin/school-settings", async (req, res) => {
    try {
      try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin
          .from("school_settings")
          .select("data")
          .eq("key", "school_info")
          .maybeSingle();

        if (!error && data && data.data) {
          return res.json({ success: true, schoolInfo: data.data });
        }
      } catch (dbErr) {
        console.warn("Falha ao ler school_settings do Supabase, caindo para arquivo local:", dbErr);
      }

      if (fs.existsSync(SCHOOL_SETTINGS_FILE)) {
        const raw = fs.readFileSync(SCHOOL_SETTINGS_FILE, 'utf-8');
        return res.json({ success: true, schoolInfo: JSON.parse(raw) });
      } else {
        return res.json({ success: false, message: "No settings found" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/school-settings", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { schoolInfo } = req.body;
      if (!schoolInfo) return res.status(400).json({ error: "schoolInfo is required" });

      const admin = getSupabaseAdmin();
      const { error } = await admin
        .from("school_settings")
        .upsert(
          {
            key: "school_info",
            data: schoolInfo,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;


      try {
        fs.writeFileSync(SCHOOL_SETTINGS_FILE, JSON.stringify(schoolInfo, null, 2));
      } catch (fileErr) {
        console.warn("Falha ao escrever arquivo local school_settings.json:", fileErr);
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/agenda/messages", async (req, res) => {
    try {
      try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin
          .from("agenda_messages")
          .select("*")
          .order("date", { ascending: false });

        if (!error && data) {
          const mapped = data.map((m: any) => ({
            id: m.id,
            senderName: m.sender_name,
            receiversNames: m.receivers_names,
            recipientType: m.recipient_type,
            subject: m.subject,
            body: m.body,
            category: m.category,
            requiresSignature: m.requires_signature,
            signatures: m.signatures || [],
            date: m.date,
            teacherRead: m.teacher_read,
            isFromFamily: m.is_from_family,
            attachments: m.attachments || [],
            status: m.status,
            replies: m.replies || []
          }));
          return res.json({ success: true, messages: mapped });
        }
      } catch (dbErr: any) {
        console.warn("Supabase fetch for agenda failed, falling back to local file:", dbErr.message || dbErr);
      }

      // Fallback
      return res.json({ success: true, messages: getLocalAgenda() });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/agenda/messages", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || !message.id) {
        return res.status(400).json({ error: "Mensagem inválida." });
      }

      const dbMessage = {
        id: message.id,
        sender_name: message.senderName,
        receivers_names: message.receiversNames || [],
        recipient_type: message.recipientType,
        subject: message.subject,
        body: message.body,
        category: message.category,
        requires_signature: !!message.requiresSignature,
        signatures: message.signatures || [],
        date: message.date || new Date().toISOString(),
        teacher_read: !!message.teacherRead,
        is_from_family: !!message.isFromFamily,
        attachments: message.attachments || [],
        status: message.status || 'approved',
        replies: message.replies || []
      };

      let savedInDb = false;

      // 1. Try Supabase
      try {
        const admin = getSupabaseAdmin();
        const { error } = await admin
          .from("agenda_messages")
          .upsert(dbMessage, { onConflict: "id" });

        if (!error) {
          savedInDb = true;
        } else {
          throw error;
        }
      } catch (dbErr: any) {
        console.warn("Supabase upsert for agenda failed, falling back to local file:", dbErr.message || dbErr);
      }

      // 2. Local fallback / sync
      const local = getLocalAgenda();
      const idx = local.findIndex((m: any) => m.id === message.id);
      if (idx !== -1) {
        local[idx] = message;
      } else {
        local.unshift(message);
      }
      saveLocalAgenda(local);

      res.json({ success: true, savedInDb });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/agenda/messages/delete", express.json(), async (req, res) => {
    try {
      const { id, permanent } = req.body;
      if (!id) return res.status(400).json({ error: "ID é obrigatório." });

      // 1. Try Supabase
      try {
        const admin = getSupabaseAdmin();
        if (permanent) {
          await admin.from("agenda_messages").delete().eq("id", id);
        } else {
          await admin
            .from("agenda_messages")
            .update({ status: 'deleted' })
            .eq("id", id);
        }
      } catch (dbErr: any) {
        console.warn("Supabase delete failed for agenda:", dbErr.message || dbErr);
      }

      // 2. Local file sync
      const local = getLocalAgenda();
      const updated = local.filter((m: any) => m.id !== id);
      saveLocalAgenda(updated);

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/agenda/upload", express.json({ limit: '100mb' }), async (req, res) => {
    const { fileBase64, filename, filetype } = req.body;

    if (!fileBase64 || !filename) {
      return res.status(400).json({ error: "Arquivo e nome de arquivo são obrigatórios." });
    }

    try {
      if (fileBase64.length > 90 * 1024 * 1024) { 
        return res.status(400).json({ error: "Arquivo muito grande. Limite de 90MB." });
      }

      const commaIndex = fileBase64.indexOf(',');
      const base64Data = commaIndex !== -1 ? fileBase64.substring(commaIndex + 1) : fileBase64;
      const buffer = Buffer.from(base64Data, 'base64');

      const fileExt = filename.split('.').pop() || 'bin';
      const cleanFilename = `agenda_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      let finalUrl = "";
      let uploadedSuccessfully = false;

      // Try uploading to Supabase Storage
      try {
        const admin = getSupabaseAdmin();
        try {
          const { data: buckets } = await admin.storage.listBuckets();
          const hasBucket = buckets?.some((b: any) => b.id === 'agenda');
          if (!hasBucket) {
            await admin.storage.createBucket('agenda', { public: true });
          }
        } catch (bucketErr) {
          console.warn("Could not check/create agenda bucket:", bucketErr);
        }

        const { error: uploadError } = await admin.storage
          .from('agenda')
          .upload(cleanFilename, buffer, { 
            contentType: filetype || 'application/octet-stream',
            upsert: true
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = admin.storage.from('agenda').getPublicUrl(cleanFilename);
          finalUrl = publicUrl;
          uploadedSuccessfully = true;
        } else {
          console.warn("Erro ao fazer upload no Supabase Storage (agenda):", uploadError.message);
        }
      } catch (storageErr: any) {
        console.warn("Falha ao usar Supabase Storage para agenda:", storageErr.message || storageErr);
      }

      if (!uploadedSuccessfully) {
        // Fallback to local files
        const uploadsDir = path.join(BASE_DIR, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const localPath = path.join(uploadsDir, cleanFilename);
        fs.writeFileSync(localPath, buffer);
        finalUrl = `/uploads/${cleanFilename}`;
      }

      res.json({ success: true, url: finalUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin route to create a professor account
  app.post("/api/admin/create-professor", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "O corpo da requisição é obrigatório." });
      }
      const { username, fullName, password, assignedSubjects, assignedClasses, role } = req.body;

      if (!username || !fullName || !password) {
        return res.status(400).json({ error: "Nome, usuário e senha são obrigatórios." });
      }

      if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ error: "Configuração do servidor incompleta. Por favor, adicione a secret 'SUPABASE_SERVICE_ROLE_KEY' em Settings > Secrets no AI Studio." });
      }

      const admin = getSupabaseAdmin();
      const safeUsername = username.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
      const email = `${safeUsername}@cps.local`;
      const finalPassword = password + "_cpsAuth"; 

      let userUid: string;
      let isNewUser = true;

      // 1. Check if user already exists in the local database (FAST, INDEXED LOOKUP)
      const { data: existingProfile } = await admin
        .from('users')
        .select('uid')
        .eq('email', email)
        .maybeSingle();

      if (existingProfile) {
        userUid = existingProfile.uid;
        isNewUser = false;
        // Reset password/metadata since admin is recreating/reactivating
        const { error: updateError } = await admin.auth.admin.updateUserById(userUid, {
          password: finalPassword,
          user_metadata: { displayName: fullName, role: role || 'professor' }
        });
        if (updateError) throw updateError;
      } else {
        // Create a new user
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
          email,
          password: finalPassword,
          email_confirm: true,
          user_metadata: { displayName: fullName, role: role || 'professor' }
        });

        if (authError) {
          const errMsg = authError.message.toLowerCase();
          if (errMsg.includes("already") || errMsg.includes("exist") || errMsg.includes("registrado")) {
            // Lazy fallback listUsers only if absolutely needed to resolve UID of an orphaned auth user
            const { data: { users: authUsers }, error: list2Error } = await admin.auth.admin.listUsers();
            if (!list2Error && authUsers) {
              const u = authUsers.find((x: any) => x.email?.toLowerCase() === email.toLowerCase());
              if (u) {
                userUid = u.id;
                isNewUser = false;
                const { error: updateError } = await admin.auth.admin.updateUserById(userUid, {
                  password: finalPassword,
                  user_metadata: { displayName: fullName, role: role || 'professor' }
                });
                if (updateError) throw updateError;
              } else {
                throw authError;
              }
            } else {
              throw authError;
            }
          } else {
            throw authError;
          }
        } else {
          if (!authData.user) throw new Error("Falha ao criar usuário no Auth.");
          userUid = authData.user.id;
        }
      }

      // 2. Clear or format existing profile in users table (Upsert logic)

      if (existingProfile) {
        const dbRoleUpdate = (role && role.includes('admin')) ? 'admin' : 'professor';
        const { error: updateProfileError } = await admin
          .from('users')
          .update({
            uid: userUid,
            username: username.toLowerCase().trim(),
            professional_name: fullName,
            role: dbRoleUpdate,
            assigned_subjects: assignedSubjects || [],
            assigned_classes: assignedClasses || []
          })
          .eq('email', email);
        if (updateProfileError) throw updateProfileError;
      } else {
        const dbRole = (role && (role.toLowerCase().includes('admin') || role.toLowerCase().includes('ti') || role.toLowerCase().includes('suporte'))) ? 'admin' : 'professor';
        const { error: insertProfileError } = await admin
          .from('users')
          .insert([{
            uid: userUid,
            email: email,
            username: username.toLowerCase().trim(),
            professional_name: fullName,
            role: dbRole,
            assigned_subjects: assignedSubjects || [],
            assigned_classes: assignedClasses || []
          }]);
        if (insertProfileError) throw insertProfileError;
      }

      // 3. Upsert into allowed_professors table
      const { data: existingAllowed } = await admin
        .from('allowed_professors')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingAllowed) {
        const { error: updateAllowedErr } = await admin
          .from('allowed_professors')
          .update({
            username: username.toLowerCase().trim(),
            full_name: fullName,
            assigned_subjects: assignedSubjects || []
          })
          .eq('email', email);
        if (updateAllowedErr) throw updateAllowedErr;
      } else {
        const { error: insertAllowedErr } = await admin
          .from('allowed_professors')
          .insert([{
            email,
            username: username.toLowerCase().trim(),
            full_name: fullName,
            assigned_subjects: assignedSubjects || []
          }]);
        if (insertAllowedErr) throw insertAllowedErr;
      }

      res.status(201).json({ message: "Professor criado ou re-ativado com sucesso!", userUid });
    } catch (err: any) {
      const errorMsg = `Erro ao criar professor: ${err.message || err}\nStack: ${err.stack || ''}\n`;
      safeLogToFile(errorMsg);
      console.error("Erro ao criar professor:", err);
      res.status(500).json({ error: err.message || "Erro interno ao criar professor." });
    }
  });

  // Legacy endpoint pointing to the new consolidated one to maintain compatibility
  app.post("/api/admin/update-professor", (req, res) => {
    // Forward to the metadata endpoint
    req.url = "/api/admin/update-professor-metadata";
    app._router.handle(req, res, () => {});
  });

  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "O corpo da requisição é obrigatório." });
      }
      const { targetUid, newPassword, adminToken } = req.body;

      if (!targetUid || !newPassword || !adminToken) {
        return res.status(400).json({ error: "UID, nova senha e token de admin são obrigatórios." });
      }

      const admin = getSupabaseAdmin();
      
      // 1. Verify admin token safely
      const { data, error: verifyError } = await admin.auth.getUser(adminToken);
      if (verifyError || !data || !data.user) {
        return res.status(401).json({ error: "Sessão expirada ou não autorizada." });
      }
      const adminUser = data.user;

      // 2. Check if adminUser is actually an admin — accept all admin role variants
      const { data: profile } = await admin
        .from('users')
        .select('role, email')
        .eq('uid', adminUser.id)
        .maybeSingle();
      
      const isMaster = 
        adminUser.email?.toLowerCase() === 'cps@cps.local' || 
        adminUser.email?.toLowerCase() === 'karlos15704@gmail.com' ||
        adminUser.email?.toLowerCase() === 'ti@cps.local';
      
      const profileRole = (profile?.role || '').toLowerCase();
      const hasAdminRole = isMaster ||
        profileRole.includes('admin') ||
        profileRole.includes('ti') ||
        profileRole.includes('suporte') ||
        profileRole.includes('coordenador') ||
        profileRole.includes('coordenadora') ||
        profileRole.includes('secretaria') ||
        profileRole.includes('diretor') ||
        profileRole.includes('diretoria') ||
        profileRole.includes('vice_diretor');
      
      if (!hasAdminRole) {
        return res.status(403).json({ error: "Apenas administradores podem redefinir senhas de outros usuários." });
      }

      // 3. Perform password reset
      const finalPassword = newPassword + "_cpsAuth"; 
      const { error: updateError } = await admin.auth.admin.updateUserById(targetUid, {
        password: finalPassword
      });

      if (updateError) throw updateError;

      res.json({ message: "Senha redefinida com sucesso!" });
    } catch (err: any) {
      console.error("Erro ao redefinir senha:", err);
      res.status(500).json({ error: err.message || "Erro interno ao redefinir senha." });
    }
  });

  // Admin route to delete a professor account
  app.post("/api/admin/delete-professor", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "O corpo da requisição é obrigatório." });
      }
      const { targetUid, email, adminToken } = req.body;

      if (!targetUid || !email || !adminToken) {
        return res.status(400).json({ error: "UID, e-mail e token de admin são obrigatórios." });
      }

      const admin = getSupabaseAdmin();
      
      // 1. Verify admin token safely
      const { data, error: verifyError } = await admin.auth.getUser(adminToken);
      if (verifyError || !data || !data.user) {
        return res.status(401).json({ error: "Sessão expirada ou não autorizada." });
      }
      const adminUser = data.user;

      // 2. Check if adminUser is actually an admin in the database
      const { data: profile, error: profileError } = await admin
        .from('users')
        .select('role, email')
        .eq('uid', adminUser.id)
        .single();
      
      const isMaster = adminUser.email?.toLowerCase() === 'cps@cps.local' || adminUser.email?.toLowerCase() === 'karlos15704@gmail.com';
      
      if (!isMaster && (profileError || profile?.role !== 'admin')) {
        return res.status(403).json({ error: "Apenas administradores podem excluir usuários do sistema." });
      }

      // 3. Safety: Make sure the target is not the master admin
      if (email.toLowerCase() === 'cps@cps.local') {
        return res.status(403).json({ error: "O administrador geral do colégio não pode ser excluído." });
      }

      // 4. Delete Auth User from Supabase Identity Manager
      const { error: authError } = await admin.auth.admin.deleteUser(targetUid);
      if (authError) {
        console.warn("User delete from auth warning (might not exist in auth anymore):", authError);
      }

      // 5. Delete Profile in users table
      const { error: profileDeleteError } = await admin.from('users').delete().eq('uid', targetUid);
      if (profileDeleteError) throw profileDeleteError;

      // 6. Delete from allowed_professors
      const { error: allowedDeleteError } = await admin.from('allowed_professors').delete().eq('email', email);
      if (allowedDeleteError) throw allowedDeleteError;

      res.json({ message: "Professor excluído com sucesso!" });
    } catch (err: any) {
      console.error("Erro ao excluir professor:", err);
      res.status(500).json({ error: err.message || "Erro interno ao excluir professor." });
    }
  });

// Helper para garantir e criar o bucket de storage do Supabase para avatares
async function ensureAvatarsBucketExists(admin: any) {
  try {
    const { data: buckets, error: listError } = await admin.storage.listBuckets();
    if (listError) {
      console.warn("Aviso ao listar buckets de storage:", listError.message);
    }
    const hasAvatars = buckets?.some((b: any) => b.id === 'avatars');
    if (!hasAvatars) {
      console.log("Criando bucket 'avatars' público...");
      const { error: createError } = await admin.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
      if (createError) {
        if (!createError.message?.toLowerCase().includes('already exists')) {
          console.warn("Aviso ao criar bucket 'avatars':", createError.message);
        }
      } else {
        console.log("Bucket 'avatars' criado com sucesso!");
      }
    }
  } catch (err: any) {
    console.warn("Falha ao garantir que o bucket 'avatars' existe:", err.message || err);
  }
}

  app.post("/api/admin/update-professor-metadata", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "O corpo da requisição é obrigatório." });
      }
      const { targetUid, professionalName, avatarUrl, assignedSubjects, assignedClasses, role, newUsername } = req.body;

      if (!targetUid) {
        return res.status(400).json({ error: "UID do usuário é obrigatório." });
      }

      const admin = getSupabaseAdmin();
      let dbErrorOccurred = null;

      // 1. Handle Username/Email update via Auth if newUsername is provided
      if (newUsername) {
        const safeUsername = newUsername.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        const newEmail = `${safeUsername}@cps.local`;
        
        // Fast check for conflict
        const { data: conflict } = await admin
          .from('users')
          .select('uid')
          .eq('email', newEmail)
          .neq('uid', targetUid)
          .maybeSingle();

        if (conflict) {
          return res.status(400).json({ error: `O nome de usuário '${newUsername}' já está em uso por outra conta.` });
        }
        
        try {
          await admin.auth.admin.updateUserById(targetUid, {
            email: newEmail,
            user_metadata: { username: safeUsername }
          });
        } catch (authErr: any) {
           console.warn("Aviso ao atualizar e-mail/username no Auth:", authErr.message);
        }
      }

      // 2. Update public.users table (Upsert logic for profile persistence)
      try {
        const { data: profile, error: getError } = await admin
          .from('users')
          .select('uid')
          .eq('uid', targetUid)
          .maybeSingle();

        if (getError) throw getError;

        if (profile) {
          const updatePayload: any = {
            professional_name: professionalName || undefined
          };
          if (role) updatePayload.role = role;
          if (assignedSubjects !== undefined) updatePayload.assigned_subjects = assignedSubjects;
          if (assignedClasses !== undefined) updatePayload.assigned_classes = assignedClasses;
          if (newUsername) {
            const safeUsername = newUsername.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
            updatePayload.username = newUsername.toLowerCase().trim();
            updatePayload.email = `${safeUsername}@cps.local`;
          }

          const { error: dbError } = await admin
            .from('users')
            .update(updatePayload)
            .eq('uid', targetUid);
          if (dbError) throw dbError;
        } else {
          // Fallback: se o registro na tabela users não existe, cria dinamicamente
          let userEmail = "";
          try {
            const { data: { user: authUser } } = await admin.auth.admin.getUserById(targetUid);
            userEmail = authUser?.email || "";
          } catch (e: any) {
             console.warn("Aviso ao ler email do auth:", e.message);
          }
          const cleanUsername = newUsername || userEmail.split('@')[0] || 'Professor';

          const { error: insertError } = await admin
            .from('users')
            .insert({
              uid: targetUid,
              email: userEmail,
              username: cleanUsername,
              role: role || 'professor',
              professional_name: professionalName,
              assigned_subjects: assignedSubjects || [],
              assigned_classes: assignedClasses || []
            });
          if (insertError) throw insertError;
        }
      } catch (err: any) {
        console.error("Erro ao atualizar tabela users:", err);
        dbErrorOccurred = `Aviso na tabela users: ${err.message || err}`;
        safeLogToFile(`WARN: Falha na tabela users para ${targetUid}: ${err.message || err}\n`);
      }

      // 2. Also update allowed_professors for sync
      try {
        const { data: teacherUser } = await admin
          .from('users')
          .select('email')
          .eq('uid', targetUid)
          .maybeSingle();

        if (teacherUser && teacherUser.email) {
          await admin
            .from('allowed_professors')
            .update({ 
              full_name: professionalName,
              assigned_subjects: assignedSubjects || []
            })
            .eq('email', teacherUser.email);
        }
      } catch (err: any) {
        console.warn("Aviso ao sincronizar allowed_professors:", err.message);
      }

      // 3. Update Auth metadata
      try {
        const meta: any = {};
        if (professionalName) meta.displayName = professionalName;
        if (role) meta.role = role;
        
        if (Object.keys(meta).length > 0) {
          await admin.auth.admin.updateUserById(targetUid, {
            user_metadata: meta
          });
        }
      } catch (metaErr: any) {
        console.warn("Aviso ao atualizar metadata no Auth:", metaErr?.message);
      }

      // 4. Update avatar if provided and has changed
      let finalAvatarUrl = avatarUrl;
      const initialAvatarUrl = req.body.initialAvatarUrl;

      if (avatarUrl !== undefined && avatarUrl !== initialAvatarUrl) {
        if (avatarUrl === null) {
          // Remove from storage
          try {
            await admin.storage.from('avatars').remove([`${targetUid}.jpeg`]);
          } catch (storageDelErr: any) {
            console.warn("Aviso ao remover arquivo do storage:", storageDelErr.message);
          }
          
          // Remover também localmente se houver
          try {
            const localFilePath = path.join(BASE_DIR, 'uploads', `avatar_${targetUid}.jpeg`);
            if (fs.existsSync(localFilePath)) {
              fs.unlinkSync(localFilePath);
            }
          } catch (fsErr: any) {
            console.warn("Aviso ao remover avatar local:", fsErr.message);
          }
          
          try {
            await admin.auth.admin.updateUserById(targetUid, {
              user_metadata: { avatar_url: null, avatar_base64: null }
            });
          } catch (metaError: any) {
            console.warn("Aviso ao atualizar auth metadata para null:", metaError.message);
          }
          
          finalAvatarUrl = null;
        } else if (avatarUrl && avatarUrl.startsWith('data:image')) {
          const commaIndex = avatarUrl.indexOf(',');
          const base64Data = commaIndex !== -1 ? avatarUrl.substring(commaIndex + 1) : avatarUrl;
          const buffer = Buffer.from(base64Data, 'base64');
          const filePath = `${targetUid}.jpeg`;

          let uploadedSuccessfully = false;

          // Tentativa 1: Supabase Storage
          try {
            await ensureAvatarsBucketExists(admin);
            const { error: uploadError } = await admin.storage
              .from('avatars')
              .upload(filePath, buffer, { upsert: true, contentType: 'image/jpeg' });
              
            if (!uploadError) {
              const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(filePath);
              finalAvatarUrl = `${publicUrl}?t=${Date.now()}`;
              uploadedSuccessfully = true;
            } else {
              console.warn("Erro ao fazer upload no Supabase Storage:", uploadError.message);
            }
          } catch (storageErr: any) {
            console.warn("Falha ao usar Supabase Storage, tentando persistência local:", storageErr.message || storageErr);
          }

          // Tentativa 2: Persistência em disco Local (Fallback seguro e infalível)
          if (!uploadedSuccessfully) {
            try {
              const uploadsDir = path.join(BASE_DIR, 'uploads');
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }
              const localPath = path.join(uploadsDir, `avatar_${targetUid}.jpeg`);
              fs.writeFileSync(localPath, buffer);
              
              // Resolve relative to host
              finalAvatarUrl = `/uploads/avatar_${targetUid}.jpeg?t=${Date.now()}`;
              uploadedSuccessfully = true;
            } catch (localErr: any) {
              console.error("Falha ao salvar avatar no disco local:", localErr.message);
              // Caso o próprio disco falhe por algum motivo de permissão extrema, mantém em Base64
              finalAvatarUrl = avatarUrl;
            }
          }

          // Atualizar metadados no Auth
          try {
            await admin.auth.admin.updateUserById(targetUid, {
              user_metadata: { avatar_url: finalAvatarUrl, avatar_base64: null }
            });
            // Also update users table with avatar
            await admin.from('users').update({ avatar_url: finalAvatarUrl }).eq('uid', targetUid);
          } catch (metaError: any) {
            console.warn("Aviso ao salvar avatar_url nos metadados de Auth:", metaError.message);
          }
        }
      }

      res.json({ 
        success: true, 
        avatar_url: finalAvatarUrl,
        warning: dbErrorOccurred 
      });
    } catch (err: any) {
      console.error("Erro ao atualizar perfil do usuário:", err);
      safeLogToFile(`ERROR /api/admin/update-professor-metadata: ${err.message || err}\nStack: ${err.stack || ''}\n`);
      res.status(500).json({ error: err.message || "Erro interno ao atualizar perfil." });
    }
  });

  app.post("/api/user/upload-avatar", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "O corpo da requisição é obrigatório." });
      }
      const { targetUid, imageBase64 } = req.body;

      if (!targetUid || !imageBase64) {
        return res.status(400).json({ error: "UID e imagem são obrigatórios." });
      }

      const admin = getSupabaseAdmin();
      
      // Basic security check: Validate base64 length (prevent extreme payloads)
      if (imageBase64.length > 15 * 1024 * 1024) { // 15MB limit for single image
        return res.status(400).json({ error: "Imagem muito grande. Limite de 15MB." });
      }

      // Convert base64 to buffer
      const commaIndex = imageBase64.indexOf(',');
      const base64Data = commaIndex !== -1 ? imageBase64.substring(commaIndex + 1) : imageBase64;
      const buffer = Buffer.from(base64Data, 'base64');

      // SECURITY: Validate magic bytes to ensure it's actually an image
      // JPEG: FF D8 FF
      // PNG: 89 50 4E 47
      // WEBP: 52 49 46 46 (RIFF) + 57 45 42 50 (WEBP)
      const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
      const isWebp = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46; // simplified

      if (!isJpeg && !isPng && !isWebp) {
        return res.status(400).json({ error: "Formato de arquivo inválido. Apenas JPEG, PNG ou WEBP são permitidos." });
      }

      const filename = `${targetUid}_${Date.now()}.jpeg`;
      const filePath = filename;

      let finalUrl = "";

      // 1. First Attempt: Save to local DISK (Primary as requested)
      try {
        const uploadsDir = path.join(BASE_DIR, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        
        const localPath = path.join(uploadsDir, filename);
        fs.writeFileSync(localPath, buffer);
        finalUrl = `/uploads/${filename}`;
        console.log(`Avatar saved locally: ${finalUrl}`);
      } catch (localErr) {
        console.warn("Falha ao salvar avatar localmente, tentando Supabase:", localErr);
      }

      // 2. Second Attempt: Save to Supabase Storage (Cloud Backup)
      try {
        await ensureAvatarsBucketExists(admin);
        const { error: uploadError } = await admin.storage
          .from('avatars')
          .upload(filePath, buffer, { upsert: true, contentType: 'image/jpeg' });
          
        if (!uploadError) {
          const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(filePath);
          finalUrl = publicUrl; // Use cloud URL if available as it is more durable
        }
      } catch (storageErr) {
        console.warn("Falha ao salvar no storage do Supabase:", storageErr);
      }

      if (!finalUrl) throw new Error("Não foi possível salvar a imagem em nenhum destino (Local ou Cloud).");
      
      // Update auth metadata - CLEAR BASE64 ALWAYS to avoid bloating JWT
      const { error: metaError } = await admin.auth.admin.updateUserById(targetUid, {
        user_metadata: { avatar_url: finalUrl, avatar_base64: null }
      });
      if (metaError) throw metaError;

      // Update users table too for consistency
      await admin.from('users').update({ avatar_url: finalUrl }).eq('uid', targetUid);
      
      res.json({ success: true, avatar_url: finalUrl });
    } catch (err: any) {
      console.error("Erro ao fazer upload da avatar:", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar avatar." });
    }
  });

  const MEDICAL_RECORDS_FILE = path.join(BASE_DIR, 'medical_records.json');

  app.get("/api/admin/get-medical-records", (req, res) => {
    try {
      if (fs.existsSync(MEDICAL_RECORDS_FILE)) {
        const raw = fs.readFileSync(MEDICAL_RECORDS_FILE, 'utf-8');
        return res.json({ success: true, medicalRecords: JSON.parse(raw) });
      } else {
        return res.json({ success: true, medicalRecords: {} });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/save-medical-records", express.json({ limit: '50mb' }), (req, res) => {
    try {
      const { medicalRecords } = req.body;
      if (!medicalRecords) return res.status(400).json({ error: "medicalRecords is required" });
      fs.writeFileSync(MEDICAL_RECORDS_FILE, JSON.stringify(medicalRecords, null, 2));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  async function ensureBucketExists(admin: any, bucketName: string) {
    try {
      const { data: buckets, error: listError } = await admin.storage.listBuckets();
      if (listError) {
        console.warn("Aviso ao listar buckets de storage:", listError.message);
      }
      const hasBucket = buckets?.some((b: any) => b.id === bucketName);
      if (!hasBucket) {
        console.log(`Criando bucket '${bucketName}' público...`);
        const { error: createError } = await admin.storage.createBucket(bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
        if (createError) {
          if (!createError.message?.toLowerCase().includes('already exists')) {
            console.warn(`Aviso ao criar bucket '${bucketName}':`, createError.message);
          }
        } else {
          console.log(`Bucket '${bucketName}' criado com sucesso!`);
        }
      }
    } catch (err: any) {
      console.warn(`Falha ao garantir que o bucket '${bucketName}' existe:`, err.message || err);
    }
  }

  app.post("/api/admin/upload-laudo", async (req, res) => {
    const { imageBase64, filename } = req.body;

    if (!imageBase64 || !filename) {
      return res.status(400).json({ error: "Arquivo e nome de arquivo são obrigatórios." });
    }

    try {
      if (imageBase64.length > 25 * 1024 * 1024) { 
        return res.status(400).json({ error: "Arquivo muito grande. Limite de 25MB." });
      }

      const commaIndex = imageBase64.indexOf(',');
      const base64Data = commaIndex !== -1 ? imageBase64.substring(commaIndex + 1) : imageBase64;
      const buffer = Buffer.from(base64Data, 'base64');

      const fileExt = filename.split('.').pop() || 'jpeg';
      const cleanFilename = `laudo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      let finalUrl = "";
      let uploadedSuccessfully = false;

      // Try uploading to Supabase Storage
      try {
        const admin = getSupabaseAdmin();
        await ensureBucketExists(admin, 'laudos');
        const { error: uploadError } = await admin.storage
          .from('laudos')
          .upload(cleanFilename, buffer, { 
            contentType: `image/${fileExt === 'png' ? 'png' : fileExt === 'gif' ? 'gif' : 'jpeg'}`,
            upsert: true
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = admin.storage.from('laudos').getPublicUrl(cleanFilename);
          finalUrl = publicUrl;
          uploadedSuccessfully = true;
        } else {
          console.warn("Erro ao fazer upload no Supabase Storage (laudos):", uploadError.message);
        }
      } catch (storageErr: any) {
        console.warn("Falha ao usar Supabase Storage para laudo:", storageErr.message || storageErr);
      }

      if (!uploadedSuccessfully) {
        // Fallback to local files
        const uploadsDir = path.join(BASE_DIR, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const localPath = path.join(uploadsDir, cleanFilename);
        fs.writeFileSync(localPath, buffer);
        finalUrl = `/uploads/${cleanFilename}`;
      }

      res.json({ success: true, fileUrl: finalUrl });
    } catch (err: any) {
      console.error("Erro ao fazer upload do laudo:", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar laudo." });
    }
  });

  app.post("/api/exam/upload-image", express.json({ limit: '50mb' }), async (req, res) => {
    const { imageBase64, filename } = req.body;

    if (!imageBase64 || !filename) {
      return res.status(400).json({ error: "Arquivo e nome de arquivo são obrigatórios." });
    }

    try {
      if (imageBase64.length > 25 * 1024 * 1024) { 
        return res.status(400).json({ error: "Arquivo muito grande. Limite de 25MB." });
      }

      const commaIndex = imageBase64.indexOf(',');
      const base64Data = commaIndex !== -1 ? imageBase64.substring(commaIndex + 1) : imageBase64;
      const buffer = Buffer.from(base64Data, 'base64');

      const fileExt = filename.split('.').pop() || 'jpeg';
      const cleanFilename = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      let finalUrl = "";
      let uploadedSuccessfully = false;

      // Try uploading to Supabase Storage
      try {
        const admin = getSupabaseAdmin();
        await ensureBucketExists(admin, 'exams');
        const { error: uploadError } = await admin.storage
          .from('exams')
          .upload(cleanFilename, buffer, { 
            contentType: `image/${fileExt === 'png' ? 'png' : fileExt === 'gif' ? 'gif' : 'jpeg'}`,
            upsert: true
          });
        
        if (!uploadError) {
          const { data: { publicUrl } } = admin.storage.from('exams').getPublicUrl(cleanFilename);
          finalUrl = publicUrl;
          uploadedSuccessfully = true;
        } else {
          console.warn("Erro ao fazer upload no Supabase Storage (exams):", uploadError.message);
        }
      } catch (storageErr: any) {
        console.warn("Falha ao usar Supabase Storage para imagem de prova:", storageErr.message || storageErr);
      }

      if (!uploadedSuccessfully) {
        // Fallback to local files
        const uploadsDir = path.join(BASE_DIR, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const localPath = path.join(uploadsDir, cleanFilename);
        fs.writeFileSync(localPath, buffer);
        finalUrl = `/uploads/${cleanFilename}`;
      }

      res.json({ success: true, fileUrl: finalUrl });
    } catch (err: any) {
      console.error("Erro ao fazer upload da imagem da prova:", err);
      res.status(500).json({ error: err.message || "Erro interno ao processar imagem." });
    }
  });

  app.post("/api/user/remove-avatar", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "O corpo da requisição é obrigatório." });
      }
      const { targetUid } = req.body;
      if (!targetUid) return res.status(400).json({ error: "UID obrigatório." });
      const admin = getSupabaseAdmin();
      
      const { error: metaError } = await admin.auth.admin.updateUserById(targetUid, {
        user_metadata: { avatar_url: null, avatar_base64: null }
      });
      if (metaError) throw metaError;
      
      // Optionally remove from storage
      try {
        await admin.storage.from('avatars').remove([`${targetUid}.jpeg`]);
      } catch (storageDelErr: any) {
        console.warn("Aviso ao remover arquivo do storage:", storageDelErr.message);
      }
      
      res.json({ success: true });
    } catch(err: any) {
      res.status(500).json({ error: err.message || "Erro interno." });
    }
  });

  // --- IN-MEMORY/DB SEAMLESS ACTIVE USERS HEARTBEAT & LOGGING ENDPOINTS ---
  app.post("/api/user/ping", async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: "O corpo da requisição é obrigatório." });
      }
      const { uid, email, name, role } = req.body;
      if (!email) return res.status(400).json({ error: "Email is required for session ping." });

      const key = email.toLowerCase().trim();
      const isTI = key === 'ti@cps.local' || (role && role.toLowerCase().includes('ti')) || (name && name.toLowerCase().includes('ti'));
      if (!isTI) {
        onlineUsers.set(key, {
          uid: uid || '',
          email: key,
          name: name || 'Usuário',
          role: role || 'professor',
          lastSeen: Date.now()
        });
      }

      // Note: last_seen_at column not used - tracking handled by in-memory onlineUsers map

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Erro interno no ping." });
    }
  });

  app.get("/api/user/online", async (req, res) => {
    const activeTimeLimit = Date.now() - 45000; // 45 seconds tolerance for "Online"
    const admin = getSupabaseAdmin();
    
    // We will build a unified map of recently active users (last 24 hours)
    // 1. First get in-memory ones (guaranteed fast)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const activeMap = new Map();
    
    for (const [email, info] of onlineUsers.entries()) {
      if (info.lastSeen >= activeTimeLimit) {
        activeMap.set(email, {
          uid: info.uid,
          email: info.email,
          name: info.name,
          role: info.role,
          lastSeen: info.lastSeen,
          isOnline: true
        });
      } else {
        onlineUsers.delete(email); // Clean up expired from memory
      }
    }

    try {
      // All online tracking is done via in-memory onlineUsers map (no last_seen_at column needed).

      // 3. For all these users, get their last login time
      // Since it's a small list, we can just grab recent successful logins for today
      if (activeMap.size > 0) {
        const emails = Array.from(activeMap.keys());
        const { data: logins } = await admin.from('login_history')
          .select('email, attempted_at')
          .eq('status', 'success')
          .in('email', emails)
          .gte('attempted_at', yesterday)
          .order('attempted_at', { ascending: false });
          
        if (logins) {
          // Since it's descending, the first match per email is their latest login
          const seenEmails = new Set();
          for (const login of logins) {
            const eml = (login.email || '').toLowerCase().trim();
            if (!seenEmails.has(eml)) {
              seenEmails.add(eml);
              const rec = activeMap.get(eml);
              if (rec) {
                rec.lastLogin = new Date(login.attempted_at).getTime();
              }
            }
          }
        }
      }
      
    } catch (e) {
      console.error("Error fetching online users from DB:", e);
    }

    // Convert map to array and sort: Online first, then by lastSeen descending
    const activeList = Array.from(activeMap.values()).sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        return b.lastSeen - a.lastSeen;
      }
      return a.isOnline ? -1 : 1;
    });

    res.json({ success: true, online: activeList });
  });

  app.post("/api/activity/log", async (req, res) => {
    const { actorName, actorEmail, actionType, description } = req.body;
    if (!actorName || !actorEmail || !description) {
      return res.status(400).json({ error: "Parâmetros actorName, actorEmail e description são obrigatórios." });
    }
    await recordActivity(actorName, actorEmail, actionType || 'client_action', description);
    res.json({ success: true });
  });

  app.get("/api/activity/history", async (req, res) => {
    try {
      // 1. Read local backup logs
      const localLogsFile = path.join(BASE_DIR, 'activity_logs.json');
      let localLogs: any[] = [];
      if (fs.existsSync(localLogsFile)) {
        try {
          const raw = fs.readFileSync(localLogsFile, 'utf-8');
          localLogs = JSON.parse(raw);
        } catch (e) {
          localLogs = [];
        }
      }

      // 2. Try querying Supabase activity_logs
      let dbLogs: any[] = [];
      try {
        const admin = getSupabaseAdmin();
        const { data, error } = await admin
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(150);
        if (!error && data) {
          dbLogs = data;
        }
      } catch (err) {
        // Safe to ignore if table doesn't exist
      }

      // 3. De-duplicate and combine
      const mergedMap = new Map<string, any>();
      
      dbLogs.forEach((item: any) => {
        const key = `${item.actor_email || ''}-${item.created_at || ''}-${item.description || ''}`;
        mergedMap.set(key, {
          id: item.id,
          actor_name: item.actor_name,
          actor_email: item.actor_email,
          action_type: item.action_type,
          description: item.description,
          created_at: item.created_at
        });
      });

      localLogs.forEach((item: any) => {
        const key = `${item.actor_email || ''}-${item.created_at || ''}-${item.description || ''}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, item);
        }
      });

      const combined = Array.from(mergedMap.values());
      combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json({ success: true, history: combined.slice(0, 150) });
    } catch (err: any) {
      console.error("Erro ao ler registros de atividades:", err);
      res.status(500).json({ error: err.message || "Erro interno." });
    }
  });

  // --- ERROR REPORTING API ---
  const ERROR_REPORTS_FILE = path.join(BASE_DIR, 'error_reports.json');

  app.post('/api/tickets/log', express.json({ limit: '10mb' }), async (req, res) => {
    try {
      const report = req.body;
      let reports = [];
      if (fs.existsSync(ERROR_REPORTS_FILE)) {
        reports = JSON.parse(fs.readFileSync(ERROR_REPORTS_FILE, 'utf-8'));
      }
      report.id = crypto.randomUUID();
      report.created_at = new Date().toISOString();
      report.status = 'pendente';
      reports.push(report);
      fs.writeFileSync(ERROR_REPORTS_FILE, JSON.stringify(reports, null, 2));
      
      // Notify IT via Email
      const itEmail = process.env.NOTIFICATION_IT_EMAIL;
      if (itEmail) {
        sendNotificationEmail(
          itEmail, 
          `🚨 Novo Reporte de Erro: ${report.professionalName || report.email}`,
          `<h3>Novo Problema Relatado</h3>
           <p><strong>Usuário:</strong> ${report.professionalName || 'N/A'} (${report.email})</p>
           <p><strong>Data:</strong> ${new Date(report.created_at).toLocaleString('pt-BR')}</p>
           <p><strong>Mensagem:</strong></p>
           <div style="background:#f4f4f4; padding:15px; border-radius:10px;">${report.message}</div>
           <p>Acesse o painel do administrador para mais detalhes.</p>`
        );
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("[ERROR] Debugging ticket log endpoint:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- DIAGNÓSTICOS DE BANCO DE DADOS ("SUPER DATABASE") ---
  app.get("/api/debug/database", async (req, res) => {
    try {
      const admin = getSupabaseAdmin();
      const results: any = {
        tables: {},
        antonioRepair: 'Normal',
        connection: 'ok',
        timestamp: new Date().toISOString()
      };

      // 1. Verificar tabelas críticas
      const criticalTables = ['users', 'exams', 'results', 'allowed_professors', 'student_reports', 'login_history'];
      
      for (const table of criticalTables) {
         try {
           const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
           if (error && (error.code === '42P01' || error.message.includes('not found'))) {
             results.tables[table] = 'MISSING';
           } else if (error) {
             results.tables[table] = `ERROR: ${error.message}`;
           } else {
             results.tables[table] = `OK (${count} records)`;
           }
         } catch (e: any) {
           results.tables[table] = `CRASH: ${e.message}`;
         }
      }

      // 2. Antonio Carlos Rescue Logic - Auto repair if corrupted
      try {
        const { data: ant, error: aErr } = await admin.from('users').select('*').ilike('email', '%antonio%').maybeSingle();
        if (ant) {
          const subjectsSize = Array.isArray(ant.assigned_subjects) ? ant.assigned_subjects.length : 0;
          const roleStr = (ant.role || '');
          
          if (subjectsSize > 40 || roleStr.length > 80 || roleStr.includes('admin') && roleStr.includes('professor') && roleStr.includes('coordenador')) {
            // Trim bloated data that might be causing session/fetch issues
            await admin.from('users').update({
               role: 'professor', 
               assigned_subjects: subjectsSize > 40 ? ant.assigned_subjects.slice(0, 5) : ant.assigned_subjects
            }).eq('uid', ant.uid);
            results.antonioRepair = 'REPAIRED: Bloated profile data trimmed for stability.';
          } else {
            results.antonioRepair = 'STATUS: Found and healthy.';
          }
        }
      } catch (_) {}

      res.json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/tickets/log', async (req, res) => {
    try {
      let reports = [];
      if (fs.existsSync(ERROR_REPORTS_FILE)) {
        reports = JSON.parse(fs.readFileSync(ERROR_REPORTS_FILE, 'utf-8'));
      }
      res.json({ reports: reports.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tickets/resolve', express.json(), async (req, res) => {
    try {
      const { id } = req.body;
      let reports = [];
      if (fs.existsSync(ERROR_REPORTS_FILE)) {
        reports = JSON.parse(fs.readFileSync(ERROR_REPORTS_FILE, 'utf-8'));
      }
      const idx = reports.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        reports[idx].status = 'resolvido';
        reports[idx].notified = false; // Mark as un-notified so the user can see it
        fs.writeFileSync(ERROR_REPORTS_FILE, JSON.stringify(reports, null, 2));
      }
      res.json({ success: true });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tickets/update', express.json(), async (req, res) => {
    try {
      const { id, status, reply } = req.body;
      let reports = [];
      if (fs.existsSync(ERROR_REPORTS_FILE)) {
        reports = JSON.parse(fs.readFileSync(ERROR_REPORTS_FILE, 'utf-8'));
      }
      const idx = reports.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        if (status) reports[idx].status = status;
        if (reply !== undefined) reports[idx].reply = reply;
        
        // Always reset notification flag when IT replies or updates so user is notified
        reports[idx].notified = false; 

        fs.writeFileSync(ERROR_REPORTS_FILE, JSON.stringify(reports, null, 2));
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tickets/delete', express.json(), async (req, res) => {
    try {
      const { id } = req.body;
      let reports = [];
      if (fs.existsSync(ERROR_REPORTS_FILE)) {
        reports = JSON.parse(fs.readFileSync(ERROR_REPORTS_FILE, 'utf-8'));
      }
      const updatedReports = reports.filter((r: any) => r.id !== id);
      fs.writeFileSync(ERROR_REPORTS_FILE, JSON.stringify(updatedReports, null, 2));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/tickets/my-notifications', async (req, res) => {
    try {
      const { email } = req.query;
      let reports = [];
      if (fs.existsSync(ERROR_REPORTS_FILE)) {
        reports = JSON.parse(fs.readFileSync(ERROR_REPORTS_FILE, 'utf-8'));
      }
      const myResolved = reports.filter((r: any) => r.email === email && r.status === 'resolvido' && r.notified === false);
      res.json({ notifications: myResolved });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/tickets/mark-notified', express.json(), async (req, res) => {
    try {
      const { id } = req.body;
      let reports = [];
      if (fs.existsSync(ERROR_REPORTS_FILE)) {
        reports = JSON.parse(fs.readFileSync(ERROR_REPORTS_FILE, 'utf-8'));
      }
      const idx = reports.findIndex((r: any) => r.id === id);
      if (idx !== -1) {
        reports[idx].notified = true;
        fs.writeFileSync(ERROR_REPORTS_FILE, JSON.stringify(reports, null, 2));
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  // ---------------------------

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

async function seedSchoolDataAndProfessors() {
  try {
    console.log("Starting automatic seed of updated school settings and professors...");
    
    // 1. Write the new school settings to school_settings.json to match DEFAULT_SCHOOL_INFO
    const SEED_SCHOOL_INFO = {
      subjects: [
        "Artes",
        "Biologia",
        "Ciências da Natureza",
        "Ciências Sociais",
        "Coordenação",
        "Educação Física",
        "Espanhol",
        "Física",
        "Geografia",
        "História",
        "Língua Inglesa",
        "Língua Portuguesa",
        "Matemática",
        "Química",
        "Robótica",
      ],
      classes: [
        "6º A",
        "6º B",
        "6º C",
        "7º A",
        "7º B",
        "8º A",
        "8º B",
        "9º A",
        "9º B",
      ],
      classShifts: {},
      classModalities: {},
      class_subjects: {},
      examCategories: ["PI", "PII", "PIII", "PIV", "PV"]
    };

    const SCHOOL_SETTINGS_FILE = path.join(process.cwd(), 'school_settings.json');
    fs.writeFileSync(SCHOOL_SETTINGS_FILE, JSON.stringify(SEED_SCHOOL_INFO, null, 2));
    console.log("Seeded school_settings.json successfully.");

    // Check if Supabase keys are configured
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      console.warn("Skipping DB seed - Supabase service role key is not configured.");
      return;
    }

    const admin = getSupabaseAdmin();

    try {
      const { data: existingSettings } = await admin
        .from("school_settings")
        .select("key")
        .eq("key", "school_info")
        .maybeSingle();

      if (!existingSettings) {
        console.log("Seeding school_info into Supabase school_settings table...");
        await admin.from("school_settings").upsert({
          key: "school_info",
          data: SEED_SCHOOL_INFO,
          updated_at: new Date().toISOString()
        });
      } else {
        // Check if old combined subject exists and update if needed
        const { data: existingData } = await admin
          .from("school_settings")
          .select("data")
          .eq("key", "school_info")
          .maybeSingle();
        if (existingData?.data?.subjects?.some((s: string) => s === "Biologia, Química e Física")) {
          console.log("Upgrading school_settings in Supabase - splitting combined subjects...");
          await admin.from("school_settings").update({
            data: SEED_SCHOOL_INFO,
            updated_at: new Date().toISOString()
          }).eq("key", "school_info");
        }
      }
    } catch (seedDbErr: any) {
      console.warn("Falha ao seedar school_info no Supabase:", seedDbErr.message || seedDbErr);
    }

    const SEED_PROFESSORS = [
      {
        username: "cristiane",
        email: "cristiane@cps.local",
        full_name: "Cristiane",
        assigned_subjects: ["Robótica"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "virgilio",
        email: "virgilio@cps.local",
        full_name: "Virgílio",
        assigned_subjects: ["Matemática"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B"]
      },
      {
        username: "andre",
        email: "andre@cps.local",
        full_name: "André",
        assigned_subjects: ["Matemática"],
        assigned_classes: ["8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "daniela",
        email: "daniela@cps.local",
        full_name: "Daniela",
        assigned_subjects: ["Língua Portuguesa"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B"]
      },
      {
        username: "carmen",
        email: "carmen@cps.local",
        full_name: "Carmen",
        assigned_subjects: ["Língua Portuguesa"],
        assigned_classes: ["8º A", "8º B"]
      },
      {
        username: "thais",
        email: "thais@cps.local",
        full_name: "Thaís",
        assigned_subjects: ["Língua Portuguesa"],
        assigned_classes: ["9º A", "9º B"]
      },
      {
        username: "antonio",
        email: "antonio@cps.local",
        full_name: "Antônio",
        assigned_subjects: ["Língua Inglesa"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "eduardo",
        email: "eduardo@cps.local",
        full_name: "Eduardo",
        assigned_subjects: ["Ciências da Natureza", "Biologia", "Química", "Física"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "natasha",
        email: "natasha@cps.local",
        full_name: "Natasha",
        assigned_subjects: ["Geografia"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B"]
      },
      {
        username: "edineia",
        email: "edineia@cps.local",
        full_name: "Edineia",
        assigned_subjects: ["Geografia"],
        assigned_classes: ["8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "joselia",
        email: "joselia@cps.local",
        full_name: "Josélia",
        assigned_subjects: ["História"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "melanie",
        email: "melanie@cps.local",
        full_name: "Melanie",
        assigned_subjects: ["Educação Física"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "mayard",
        email: "mayard@cps.local",
        full_name: "Mayard",
        assigned_subjects: ["Ciências Sociais", "Artes"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "ana.aparecida",
        email: "ana.aparecida@cps.local",
        full_name: "Ana Aparecida",
        assigned_subjects: ["Artes"],
        assigned_classes: ["6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      },
      {
        username: "julimar",
        email: "julimar@cps.local",
        full_name: "Julimar",
        assigned_subjects: ["Espanhol"],
        assigned_classes: ["6º A", "6º B", "6º C", "7º A", "7º B", "8º A", "8º B", "9º A", "9º B"]
      }
    ];

    // Seed allowed_professors table and sync to users/profiles
    for (const prof of SEED_PROFESSORS) {
      // 1. Semear na allowed_professors
      const { data: extAllowed } = await admin
        .from('allowed_professors')
        .select('id')
        .eq('email', prof.email)
        .maybeSingle();

      if (extAllowed) {
        await admin
          .from('allowed_professors')
          .update({
            username: prof.username,
            full_name: prof.full_name,
            assigned_subjects: prof.assigned_subjects
          })
          .eq('email', prof.email);
      } else {
        await admin
          .from('allowed_professors')
          .insert([{
            email: prof.email,
            username: prof.username,
            full_name: prof.full_name,
            assigned_subjects: prof.assigned_subjects
          }]);
      }

      // 2. Sincronizar com usuários registrados (se houver) para atualizar suas disciplinas/turmas
      const { data: extUser } = await admin
        .from('users')
        .select('uid')
        .eq('email', prof.email)
        .maybeSingle();

      if (extUser) {
        await admin
          .from('users')
          .update({
            professional_name: prof.full_name,
            username: prof.username,
            assigned_subjects: prof.assigned_subjects,
            assigned_classes: prof.assigned_classes
          })
          .eq('uid', extUser.uid);
      }
    }
    console.log("All updated professors seeded and synchronized successfully!");

  } catch (err: any) {
    console.error("Error automatic seeding updated schema and professors:", err.message);
  }
}

// ============================================================================
// SISTEMA DE BACKUP AUTOMÁTICO E FALLBACK OFFLINE
// ============================================================================

const BACKUP_DIR = path.join(BASE_DIR, 'backup');

async function runDatabaseBackup() {
  console.log("[Backup] Iniciando backup automático dos dados do Supabase...");
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (err: any) {
    console.warn("[Backup] Supabase Admin não configurado, pulando backup:", err.message);
    return;
  }

  const tables = [
    { table: 'users', file: 'public_users.json' },
    { table: 'school_settings', file: 'school_settings.json' },
    { table: 'allowed_professors', file: 'allowed_professors.json' },
    { table: 'exams', file: 'exams.json' },
    { table: 'results', file: 'results.json' },
    { table: 'student_reports', file: 'student_reports.json' },
    { table: 'lessons', file: 'lessons.json' },
    { table: 'attendance', file: 'attendance.json' },
    { table: 'agenda_messages', file: 'agenda_messages.json' },
    { table: 'login_history', file: 'login_history.json' },
    { table: 'activity_logs', file: 'activity_logs.json' }
  ];

  const status: any = {
    timestamp: new Date().toISOString(),
    success: true,
    tables: {}
  };

  for (const item of tables) {
    try {
      console.log(`[Backup] Exportando tabela ${item.table}...`);
      let allRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await admin
          .from(item.table)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          page++;
          if (data.length < pageSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const filePath = path.join(BACKUP_DIR, item.file);
      fs.writeFileSync(filePath, JSON.stringify(allRows, null, 2), 'utf8');
      status.tables[item.table] = {
        count: allRows.length,
        success: true
      };
    } catch (err: any) {
      console.error(`[Backup] Erro ao exportar tabela ${item.table}:`, err.message);
      status.tables[item.table] = {
        success: false,
        error: err.message
      };
      status.success = false;
    }
  }

  // Backup Auth Users
  try {
    console.log("[Backup] Exportando usuários do Auth...");
    let allAuthUsers: any[] = [];
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data: { users }, error } = await admin.auth.admin.listUsers({
        page: page,
        perPage: 1000
      });

      if (error) {
        throw error;
      }

      if (users && users.length > 0) {
        allAuthUsers = allAuthUsers.concat(users);
        page++;
        if (users.length < 1000) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    const filePath = path.join(BACKUP_DIR, 'auth_users.json');
    fs.writeFileSync(filePath, JSON.stringify(allAuthUsers, null, 2), 'utf8');
    status.tables['auth_users'] = {
      count: allAuthUsers.length,
      success: true
    };
  } catch (err: any) {
    console.error(`[Backup] Erro ao exportar usuários do Auth:`, err.message);
    status.tables['auth_users'] = {
      success: false,
      error: err.message
    };
    status.success = false;
  }

  fs.writeFileSync(path.join(BACKUP_DIR, 'backup_status.json'), JSON.stringify(status, null, 2), 'utf8');
  console.log(`[Backup] Backup concluído em ${status.timestamp}`);
}

// Rotas do Backup
app.get("/api/backup/status", (req, res) => {
  const statusFile = path.join(BACKUP_DIR, "backup_status.json");
  if (!fs.existsSync(statusFile)) {
    return res.json({ success: false, message: "Nenhum backup realizado ainda." });
  }
  try {
    const raw = fs.readFileSync(statusFile, "utf-8");
    return res.json(JSON.parse(raw));
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/backup/trigger", async (req, res) => {
  try {
    await runDatabaseBackup();
    const statusFile = path.join(BACKUP_DIR, "backup_status.json");
    const raw = fs.readFileSync(statusFile, "utf-8");
    return res.json({ success: true, status: JSON.parse(raw) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/backup/data/:table", (req, res) => {
  const { table } = req.params;
  const fileName = table === "users" ? "public_users.json" : `${table}.json`;
  const filePath = path.join(BACKUP_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Tabela ${table} não encontrada no backup` });
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    let data = JSON.parse(raw);

    // Filtragem por OR (ex: or=(professor_id.eq.xxx,professor_id.eq.yyy))
    const orFilterStr = (req.query.or || req.query._or) as string;
    if (orFilterStr) {
      let cleanFilter = orFilterStr;
      if (cleanFilter.startsWith('(') && cleanFilter.endsWith(')')) {
        cleanFilter = cleanFilter.slice(1, -1);
      }
      const parts = cleanFilter.split(',');
      data = data.filter((row: any) => {
        return parts.some(part => {
          const match = part.match(/^([^.]+)\.eq\.(.+)$/);
          if (match) {
            const [_, col, val] = match;
            return String(row[col]) === String(val);
          }
          return false;
        });
      });
    }

    // Filtragem simples por query parameters (?professor_id=xxx)
    for (const key of Object.keys(req.query)) {
      if (key === 'or' || key === '_or') continue;
      const val = req.query[key];
      if (val !== undefined) {
        data = data.filter((row: any) => String(row[key]) === String(val));
      }
    }

    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/backup/offline-login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "E-mail é obrigatório." });
  }

  const filePath = path.join(BACKUP_DIR, "public_users.json");
  if (!fs.existsSync(filePath)) {
    return res.status(500).json({ error: "Backup de usuários indisponível." });
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(raw);
    const matchedUser = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!matchedUser) {
      return res.status(404).json({ error: "Nenhum usuário com este e-mail encontrado no backup local." });
    }

    // Mockar objeto compatível com Supabase Auth
    const mockUser = {
      id: matchedUser.uid || matchedUser.id,
      email: matchedUser.email,
      role: 'authenticated',
      user_metadata: {
        role: matchedUser.role,
        username: matchedUser.username,
        professional_name: matchedUser.professional_name,
        assigned_subjects: matchedUser.assigned_subjects,
        assigned_classes: matchedUser.assigned_classes
      }
    };

    return res.json({ success: true, user: mockUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Inicialização automática do Backup
setTimeout(() => {
  runDatabaseBackup().catch(err => console.error("Erro na execução inicial do backup:", err));
}, 5000);

setInterval(() => {
  runDatabaseBackup().catch(err => console.error("Erro na execução periódica do backup:", err));
}, 3600000); // 1 hora

async function runServer() {
  // Run seed in background — don't block server startup
  seedSchoolDataAndProfessors().catch(err => {
    console.error("Background seed error:", err.message);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const startMsg = "Starting server in DEVELOPMENT mode with Vite middleware...\n";
    console.log(startMsg.trim());
    fs.appendFileSync(LOG_FILE, startMsg);
    
    const { createServer: createViteServer } = await import("vite");
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

  const portToUse = PORT;
  app.listen(portToUse, "0.0.0.0", () => {
    const msg = `🚀 Server is strictly listening on http://0.0.0.0:${portToUse}`;
    console.log(msg);
    fs.appendFileSync(LOG_FILE, msg + "\n");
  });
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  runServer().catch(err => {
    console.error("CRITICAL SERVER START ERROR:", err);
    fs.appendFileSync(LOG_FILE, `CRITICAL SERVER START ERROR: ${err.stack || err}\n`);
  });
}
