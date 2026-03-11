import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/api.js';
import { serverInfoRouter } from './routes/server-info.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// API routes
app.use('/api', apiRouter);
app.use('/api/server-info', serverInfoRouter);

// Serve static files from frontend build (production)
const staticDir = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(staticDir));

// SPA fallback — all non-API routes serve index.html
app.get('/{*path}', (req, res) => {
  const indexPath = path.join(staticDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Frontend not built yet. Run frontend build first.' });
    }
  });
});

/**
 * Start Express server and return httpServer instance (for WebSocket use later)
 */
export function startServer(port = 3001) {
  return new Promise((resolve) => {
    const httpServer = app.listen(port, () => {
      console.log(`[API] Server running at http://localhost:${port}`);
      console.log(`[WS] WebSocket available at ws://localhost:${port}`);
      resolve(httpServer);
    });
  });
}
