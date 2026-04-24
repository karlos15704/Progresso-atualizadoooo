import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

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

  // API Routes moved to frontend (aiService.ts)

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
    console.log(`🚀 Server is strictly listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
