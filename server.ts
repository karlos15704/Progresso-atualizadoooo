import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";

const LOG_FILE = path.join(process.cwd(), 'server-debug.log');

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

  // API Routes
  const apiRouter = express.Router();
  
  apiRouter.post("/correct", async (req, res) => {
    console.log("Correction request received");
    try {
      const { imageBase64, mimeType, examTitle, questions } = req.body;
      if (!imageBase64) throw new Error("Imagem não recebida no servidor.");
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "undefined") {
        return res.status(500).json({ error: "A chave da API Gemini não foi encontrada no servidor." });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Create a simplified mapping for the AI to understand the expected answers and their weights
      const expectedAnswers = questions.map((q: any) => ({
        questionId: q.id,
        correctOption: q.correctAnswer,
        points: parseFloat(q.points || 1) // Default to 1 point if not specified
      }));

      const maxTotalScore = expectedAnswers.reduce((sum: number, q: any) => sum + q.points, 0);

      const prompt = `
        Você é um assistente de correção de provas e avaliações. 
        Analise a imagem da prova/gabarito de título "${examTitle}".
        
        Abaixo está a lista oficial de respostas esperadas ("correctOption") e o valor (peso) de cada questão ("points"):
        ${JSON.stringify(expectedAnswers, null, 2)}
        
        Instruções estritas:
        1. Identifique e extraia o nome do estudante e também a sua turma (class) da imagem, se houver.
        2. Leia quais alternativas o estudante marcou para cada questão.
        3. Construa o \`answers\` object onde a chave é o número da questão e o valor é a letra marcada pelo estudante (ex: "1": "A"). Se estiver rasurado ou em branco, coloque "".
        4. Calcule a nota final (\`score\`) somando o valor (\`points\`) SOMENTE das questões em que o estudante acertou. O \`maxScore\` total desta prova é ${maxTotalScore}.
        5. Crie um \`feedback\` curto para o aluno (ex: "Excelente!", "Estude mais o tópico X").
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
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
                description: "Mapeamento de número da questão para resposta extraída"
              },
              score: { type: Type.NUMBER },
              maxScore: { type: Type.NUMBER },
              feedback: { type: Type.STRING }
            },
            required: ["studentName", "answers", "score", "maxScore", "feedback"]
          }
        }
      });

      if (!response.text) {
        console.error("Gemini returned empty text or was blocked by safety filters.");
        throw new Error("A Inteligência Artificial não retornou uma resposta válida para esta imagem. Tente com uma foto mais nítida.");
      }

      let responseText = response.text.trim();
      if (responseText.startsWith("```json")) {
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      } else if (responseText.startsWith("```")) {
        responseText = responseText.replace(/```/g, "").trim();
      }

      let parsedResult;
      try {
        parsedResult = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error("Failed to parse Gemini response:", responseText);
        throw new Error("O resultado da IA não estava no formato correto. Resposta: " + responseText.substring(0, 100) + "...");
      }

      res.json(parsedResult);
    } catch (error: any) {
      console.error("Internal Server Error in /api/correctExam:", error);
      res.status(500).json({ error: error.message || "Erro interno no servidor." });
    }
  });

  apiRouter.post("/generateGuide", async (req, res) => {
    try {
      const { content } = req.body;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "undefined") {
        return res.status(500).json({ error: "A chave da API Gemini não foi encontrada no servidor." });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Com base nos seguintes conteúdos: "${content}", crie um guia de estudos estruturado para os alunos.
        Inclua tópicos principais, explicações breves e dicas de estudo.
        Formate em Markdown.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt
      });

      res.json({ text: response.text || "Sem guia de estudos gerado." });
    } catch (error: any) {
      console.warn("AI generation failed, returning fallback content.", error);
      res.json({ text: "Guia manual: " + req.body.content });
    }
  });

  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 EduGrade Server is strictly listening on http://0.0.0.0:${PORT}`);
    console.log(`Endpoints: POST /api/correctExam, POST /api/generateGuide, GET /api/health`);
  });
}

startServer();
