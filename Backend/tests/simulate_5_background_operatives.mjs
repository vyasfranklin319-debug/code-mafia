import WebSocket from 'ws';

const CF_WS_BASE = 'wss://code-mafia-api.codemafia.workers.dev';
const roomId = process.argv[2];

if (!roomId) {
  console.error('Usage: node simulate_5_background_operatives.mjs <ROOM_ID>');
  process.exit(1);
}

const OPERATIVES = [
  { id: 'op-bot-2', name: 'Agent_Frontend', avatarColor: 'bg-indigo-600', isReady: true },
  { id: 'op-bot-3', name: 'Agent_Backend', avatarColor: 'bg-blue-600', isReady: true },
  { id: 'op-bot-4', name: 'Agent_DevOps', avatarColor: 'bg-emerald-600', isReady: true },
  { id: 'op-bot-5', name: 'Agent_Security', avatarColor: 'bg-rose-600', isReady: true },
  { id: 'op-bot-6', name: 'Agent_QA', avatarColor: 'bg-amber-600', isReady: true },
];

console.log(`[SIMULATOR] Connecting 5 background operatives to room #${roomId}...`);

const clients = [];

for (const op of OPERATIVES) {
  const url = `${CF_WS_BASE}/ws/room/${roomId}?name=${encodeURIComponent(op.name)}&pid=${encodeURIComponent(op.id)}`;
  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log(`[SIMULATOR] Connected: ${op.name}`);
    ws.send(JSON.stringify({
      event: 'joinRoom',
      payload: {
        roomId,
        player: {
          id: op.id,
          displayName: op.name,
          isHost: false,
          isReady: op.isReady,
          avatarColor: op.avatarColor
        }
      }
    }));
  });

  ws.on('error', (err) => console.error(`[SIMULATOR ERROR] ${op.name}:`, err.message));
  clients.push(ws);
}

// Keep connection alive with periodic pings for 60 seconds
const interval = setInterval(() => {
  clients.forEach(ws => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ event: 'PING' }));
    }
  });
}, 10000);

setTimeout(() => {
  clearInterval(interval);
  clients.forEach(ws => ws.close());
  console.log('[SIMULATOR] Simulation completed. Exiting.');
  process.exit(0);
}, 60000);
