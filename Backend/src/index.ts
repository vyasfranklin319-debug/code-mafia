/**
 * CODE MAFIA — UNIFIED REAL-TIME BACKEND ENGINE
 * - Node.js + Express
 * - Yjs CRDT WebSocket Server (/yjs)
 * - Socket.IO Game State & Chat Channels (/socket.io)
 * - Isolated Code Execution Sandbox Runner
 * - PostgreSQL Durable Persistence + Redis Ephemeral Caching & Pub/Sub
 */

import http from 'http';
import express from 'express';
import cors from 'cors';
import { initDatabase, dbGetMatchHistory, dbSaveMatchHistory } from './services/dbService.js';
import { initRedis } from './services/redisService.js';
import { executeCodeInSandbox } from './services/sandboxService.js';
import { createGameSession } from './services/gameStateService.js';
import { setupYjsWebSocket } from './services/yjsServer.js';
import { setupSocketIO } from './services/socketService.js';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Code Mafia Unified Engine (Yjs CRDT + Socket.IO + Postgres + Redis)',
    time: new Date().toISOString()
  });
});

// 2. Game Sessions API
app.post('/api/v1/sessions', async (req, res) => {
  try {
    const { hostName, packId, playerCount, mafiaCount, joinCode } = req.body;
    const { game, hostPlayer } = await createGameSession(
      { packId, playerCount, mafiaCount },
      hostName || 'OperativeHost',
      joinCode
    );
    res.status(201).json({ sessionId: game.id, joinCode: game.joinCode, game, hostPlayer });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Sandbox Isolated Code Execution API
app.post('/api/v1/sandbox/execute', async (req, res) => {
  try {
    const { code, testCases, language } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Code content required for execution' });
    }
    const result = await executeCodeInSandbox(code, testCases || [], language || 'javascript');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Match History Archives API
app.get('/api/v1/history', async (req, res) => {
  try {
    const records = await dbGetMatchHistory();
    res.json(records);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/v1/history', async (req, res) => {
  try {
    await dbSaveMatchHistory(req.body);
    res.status(201).json({ success: true, item: req.body });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Auth Mock / Passthrough
app.post('/api/v1/auth/login', (req, res) => {
  const { usernameOrEmail } = req.body;
  const username = usernameOrEmail ? usernameOrEmail.split('@')[0] : 'OperativeUser';
  res.json({
    user: { id: `usr-${Date.now()}`, username, email: `${username}@codemafia.dev` },
    token: `jwt-${Date.now()}`
  });
});

app.post('/api/v1/auth/register', (req, res) => {
  const { username, email } = req.body;
  res.status(201).json({
    user: { id: `usr-${Date.now()}`, username: username || 'OperativeUser', email: email || 'user@codemafia.dev' },
    token: `jwt-${Date.now()}`
  });
});

// Start Background Services & Server
async function startServer() {
  await initDatabase();
  await initRedis();

  // Mount Yjs CRDT WebSocket Server
  setupYjsWebSocket(server);

  // Mount Socket.IO Game State & Chat Server
  setupSocketIO(server);

  server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`CODE MAFIA SERVER ACTIVE ON PORT ${PORT}`);
    console.log(`- REST API:        http://localhost:${PORT}/api/health`);
    console.log(`- Yjs CRDT WS:     ws://localhost:${PORT}/yjs`);
    console.log(`- Socket.IO WS:    ws://localhost:${PORT}/socket.io`);
    console.log(`================================================================`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});
