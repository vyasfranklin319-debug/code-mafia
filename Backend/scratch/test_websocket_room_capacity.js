import http from 'http';
import { WebSocket } from 'ws';

async function createRoomSession(playerCount = 6) {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:3001/api/v1/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(JSON.stringify({ hostName: 'HostPlayer', playerCount }));
    req.end();
  });
}

async function runWsCapacityTest() {
  console.log('================================================================');
  console.log('  CODE MAFIA: DYNAMIC WEBSOCKET ROOM CAPACITY TEST (MAX 6)   ');
  console.log('================================================================\n');

  // Step 1: Create room with 6 player limit
  const session = await createRoomSession(6);
  console.log(`[Step 1] Created Room ID: ${session.sessionId} | Join Code: ${session.joinCode} | Capacity: ${session.capacity}`);

  const sockets = [];
  const roomId = session.sessionId;

  // Step 2: Connect 6 player sockets
  for (let i = 1; i <= 6; i++) {
    const ws = new WebSocket(`ws://127.0.0.1:3001/ws/room/${roomId}`);
    await new Promise((res) => {
      ws.on('open', () => {
        console.log(`[PASS] Player #${i} connected to WebSocket room!`);
        sockets.push(ws);
        res(true);
      });
    });
  }

  // Step 3: Attempt 7th connection (exceeds capacity)
  console.log('\n[Step 3] Attempting 7th connection (exceeding room capacity limit of 6)...');
  const ws7 = new WebSocket(`ws://127.0.0.1:3001/ws/room/${roomId}`);
  ws7.on('error', (err) => {
    console.log(`[PASS] 7th connection rejected by WebSocket server: ${err.message}`);
    sockets.forEach(s => s.close());
  });
}

runWsCapacityTest();
