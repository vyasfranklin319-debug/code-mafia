import http from 'http';
import { parse } from 'url';
import crypto from 'crypto';

import { registerUser, loginUser } from './src/services/authService.js';
import { createSession, getPublicSession, startSession, evaluateVictory } from './src/services/gameEngineService.js';
import { executeCodeInSandbox } from './src/services/sandboxService.js';
import { analyzeCodeAst } from './src/services/astService.js';
import { calculateUserRank, calculateXpReward, getLeaderboardData } from './src/services/journeyService.js';
import { addMatchToHistory, getMatchHistory, generateHistoryCsv } from './src/services/historyService.js';

const PORT = process.env.PORT || 3001;

// Active SSE client connections map
const sseClients = new Map();

// WebSocket Rooms & Dynamic Capacity Management Maps
const roomSockets = new Map(); // roomId -> Set of socket connections
const roomCapacities = new Map(); // roomId -> max capacity count (e.g. 6, 8, 12)

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Native WebSocket Frame Encoding
function createWsFrame(data) {
  const payload = Buffer.from(JSON.stringify(data));
  const len = payload.length;
  let header;

  if (len <= 125) {
    header = Buffer.from([0x81, len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function broadcastToRoom(roomId, event, payload) {
  // 1. SSE Broadcast
  const clients = sseClients.get(roomId);
  if (clients) {
    const data = JSON.stringify({ event, payload });
    for (const clientRes of clients) {
      clientRes.write(`data: ${data}\n\n`);
    }
  }

  // 2. Native WebSocket Broadcast
  const wsClients = roomSockets.get(roomId);
  if (wsClients) {
    const frame = createWsFrame({ event, payload });
    for (const socket of wsClients) {
      try {
        socket.write(frame);
      } catch (e) {}
    }
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

  // 1. Health check: GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      service: 'Code Mafia Microservices Engine Server',
      activeConnections: sseClients.size,
      activeWsRooms: roomSockets.size,
      time: new Date().toISOString() 
    }));
    return;
  }

  // 1b. Firebase Project Connection Status: GET /api/v1/firebase/status
  if (pathname === '/api/v1/firebase/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: true,
      projectId: 'codemafia-54284',
      clientEmail: 'firebase-adminsdk-fbsvc@codemafia-54284.iam.gserviceaccount.com',
      serviceAccountFile: 'Backend/config/serviceAccountKey.json',
      time: new Date().toISOString()
    }));
    return;
  }

  // 2. Auth Register: POST /api/v1/auth/register
  if (pathname === '/api/v1/auth/register' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { email, username, password } = JSON.parse(body);
        const result = registerUser(email, username, password);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 3. Auth Login: POST /api/v1/auth/login
  if (pathname === '/api/v1/auth/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { usernameOrEmail, password } = JSON.parse(body);
        const result = loginUser(usernameOrEmail, password);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
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
        const config = JSON.parse(body || '{}');
        const session = createSession(config);
        const capacity = config.playerCount || 6;
        roomCapacities.set(session.id, capacity);
        roomCapacities.set(session.joinCode, capacity);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId: session.id, joinCode: session.joinCode, capacity }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 5. Get Session State: GET /api/v1/sessions/:id
  if (pathname.startsWith('/api/v1/sessions/') && req.method === 'GET') {
    const sessionId = pathname.split('/')[4];
    const session = getPublicSession(sessionId);
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(session));
    return;
  }

  // 6. Realtime SSE Stream: GET /api/v1/events/:roomId
  if (pathname.startsWith('/api/v1/events/') && req.method === 'GET') {
    const roomId = pathname.split('/')[4];
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    if (!sseClients.has(roomId)) {
      sseClients.set(roomId, new Set());
    }
    sseClients.get(roomId).add(res);

    res.write(`data: ${JSON.stringify({ event: 'CONNECTED', roomId })}\n\n`);

    req.on('close', () => {
      const roomSet = sseClients.get(roomId);
      if (roomSet) {
        roomSet.delete(res);
        if (roomSet.size === 0) sseClients.delete(roomId);
      }
    });
    return;
  }

  // 7. Dispatch Event to Room: POST /api/v1/events/:roomId
  if (pathname.startsWith('/api/v1/events/') && req.method === 'POST') {
    const roomId = pathname.split('/')[4];
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { event, payload } = JSON.parse(body);
        broadcastToRoom(roomId, event, payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, activeListeners: sseClients.get(roomId)?.size || 0 }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 8. Sandbox Code Execution: POST /api/v1/sandbox/execute
  if (pathname === '/api/v1/sandbox/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { code, testCases, language } = JSON.parse(body);
        const result = await executeCodeInSandbox(code, testCases, language);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 9. AST Sentinel Scanner: POST /api/v1/ast/scan
  if (pathname === '/api/v1/ast/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { code, language } = JSON.parse(body);
        const report = analyzeCodeAst(code, language);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 10. Developer Journey Rank: GET /api/v1/journey/rank/:xp
  if (pathname.startsWith('/api/v1/journey/rank/') && req.method === 'GET') {
    const xpStr = pathname.split('/')[5];
    const xp = parseInt(xpStr, 10) || 0;
    const rankInfo = calculateUserRank(xp);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(rankInfo));
    return;
  }

  // 11. Developer Journey Leaderboard: GET /api/v1/journey/leaderboard
  if (pathname === '/api/v1/journey/leaderboard' && req.method === 'GET') {
    const category = parsedUrl.query.category || 'overall';
    const leaderboard = getLeaderboardData(category);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(leaderboard));
    return;
  }

  // 12. Save History Record: POST /api/v1/history
  if (pathname === '/api/v1/history' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const record = JSON.parse(body);
        const saved = addMatchToHistory(record);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item: saved }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 13. Export History CSV: GET /api/v1/history/export
  if (pathname === '/api/v1/history/export' && req.method === 'GET') {
    const csvData = generateHistoryCsv();
    res.writeHead(200, { 
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="code_mafia_telemetry.csv"'
    });
    res.end(csvData);
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// Native WebSocket Upgrade & Dynamic Capacity Manager
server.on('upgrade', (req, socket, head) => {
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname || '';

  if (pathname.startsWith('/ws/room/')) {
    const roomId = pathname.split('/ws/room/')[1].split('?')[0];
    const maxCapacity = roomCapacities.get(roomId) || 6;
    if (!roomSockets.has(roomId)) roomSockets.set(roomId, new Set());
    const clients = roomSockets.get(roomId);

    // Enforce Capacity Limit!
    if (clients.size >= maxCapacity) {
      console.warn(`[Native WS Capacity Exceeded] Room: ${roomId} | ${clients.size}/${maxCapacity}`);
      socket.write('HTTP/1.1 403 Forbidden\r\nContent-Type: text/plain\r\n\r\nROOM_FULL: Maximum capacity reached\r\n');
      socket.destroy();
      return;
    }

    // Sec-WebSocket-Accept Handshake
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`
    ];

    socket.write(headers.join('\r\n') + '\r\n\r\n');
    clients.add(socket);
    console.log(`[Native WebSocket Connected] Room: ${roomId} | Online: ${clients.size}/${maxCapacity}`);

    // Send connected frame
    socket.write(createWsFrame({
      event: 'WS_CONNECTED',
      payload: { roomId, onlineCount: clients.size, maxCapacity }
    }));

    socket.on('close', () => {
      clients.delete(socket);
      console.log(`[Native WebSocket Disconnected] Room: ${roomId} | Remaining: ${clients.size}/${maxCapacity}`);
      if (clients.size === 0) roomSockets.delete(roomId);
    });

    socket.on('error', () => {
      clients.delete(socket);
    });
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`[Code Mafia Native Engine Server] Running on http://127.0.0.1:${PORT} (WebSocket: ws://127.0.0.1:${PORT}/ws/room/:roomId)`);
});
