import http from 'http';
import { parse } from 'url';

const PORT = 3001;

// Real In-memory sessions store
const sessions = new Map();
// Active SSE clients by roomId: Map<roomId, Set<http.ServerResponse>>
const sseClients = new Map();
// Real Match History Store
const matchHistoryStore = [];

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function broadcastToRoom(roomId, event, payload) {
  const clients = sseClients.get(roomId);
  if (!clients) return;
  const data = JSON.stringify({ event, payload });
  for (const clientRes of clients) {
    clientRes.write(`data: ${data}\n\n`);
  }
}

const server = http.createServer((req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname || '/';

  // 1. Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', activeSessions: sessions.size, time: new Date().toISOString() }));
    return;
  }

  // 2. Realtime SSE Event Stream: GET /api/v1/events/:roomId
  if (pathname.startsWith('/api/v1/events/') && req.method === 'GET') {
    const roomId = pathname.replace('/api/v1/events/', '');
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    res.write(`data: ${JSON.stringify({ event: 'CONNECTED', payload: { roomId } })}\n\n`);

    if (!sseClients.has(roomId)) {
      sseClients.set(roomId, new Set());
    }
    const clientsSet = sseClients.get(roomId);
    clientsSet.add(res);

    req.on('close', () => {
      clientsSet.delete(res);
    });
    return;
  }

  // 3. Broadcast Event: POST /api/v1/events/:roomId
  if (pathname.startsWith('/api/v1/events/') && req.method === 'POST') {
    const roomId = pathname.replace('/api/v1/events/', '');
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { event, payload } = JSON.parse(body);
        broadcastToRoom(roomId, event, payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 4. Create Session: POST /api/v1/sessions
  if (pathname === '/api/v1/sessions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { sessionId, joinCode, config } = JSON.parse(body);
        sessions.set(sessionId, { id: sessionId, joinCode, config, createdAt: Date.now() });
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId, joinCode }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 5. Get Session: GET /api/v1/sessions/:id
  if (pathname.startsWith('/api/v1/sessions/') && req.method === 'GET') {
    const id = pathname.replace('/api/v1/sessions/', '');
    const session = sessions.get(id);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(session));
    return;
  }

  // 6. Get Match History: GET /api/v1/history
  if (pathname === '/api/v1/history' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(matchHistoryStore));
    return;
  }

  // 7. Add Match History: POST /api/v1/history
  if (pathname === '/api/v1/history' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const historyItem = JSON.parse(body);
        matchHistoryStore.unshift(historyItem);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, count: matchHistoryStore.length }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  console.log(`[Code Mafia Native Engine Server] Running on http://localhost:${PORT}`);
});
