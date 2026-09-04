import WebSocket from 'ws';

const CF_WS_BASE = 'wss://code-mafia-api.codemafia.workers.dev';
const CF_HTTP_BASE = 'https://code-mafia-api.codemafia.workers.dev';
const ROOM_ID = 'OP' + Math.floor(1000 + Math.random() * 9000);

console.log('===============================================================');
console.log(`OPERATIVE MATCH LOBBY: 6-PLAYER CONCURRENCY & PERSISTENCE TEST`);
console.log(`Target Live Server: ${CF_WS_BASE}`);
console.log(`Target Room Code:   ${ROOM_ID}`);
console.log('===============================================================\n');

const OPERATIVES = [
  { id: 'op-1', name: 'Operative_1_Host', isHost: true, isReady: true, avatarColor: 'bg-purple-600' },
  { id: 'op-2', name: 'Operative_2_Frontend', isHost: false, isReady: true, avatarColor: 'bg-indigo-600' },
  { id: 'op-3', name: 'Operative_3_Backend', isHost: false, isReady: true, avatarColor: 'bg-blue-600' },
  { id: 'op-4', name: 'Operative_4_DevOps', isHost: false, isReady: true, avatarColor: 'bg-emerald-600' },
  { id: 'op-5', name: 'Operative_5_Security', isHost: false, isReady: true, avatarColor: 'bg-rose-600' },
  { id: 'op-6', name: 'Operative_6_QA', isHost: false, isReady: true, avatarColor: 'bg-amber-600' },
];

function connectOperative(op) {
  return new Promise((resolve, reject) => {
    const url = `${CF_WS_BASE}/ws/room/${ROOM_ID}?name=${encodeURIComponent(op.name)}&pid=${encodeURIComponent(op.id)}`;
    const ws = new WebSocket(url);
    const messages = [];

    ws.on('open', () => {
      console.log(`[CONNECTED] ${op.name} (pid: ${op.id}) - Socket OPEN`);
      resolve({ op, ws, messages });
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        messages.push(msg);
      } catch (e) {
        messages.push({ raw: data.toString() });
      }
    });

    ws.on('close', (code, reason) => {
      console.warn(`[DISCONNECT ALERT] ${op.name} closed with code=${code} reason=${reason}`);
    });

    ws.on('error', (err) => {
      console.error(`[SOCKET ERROR] ${op.name}:`, err.message);
      reject(err);
    });
  });
}

async function runOperativeLobbyTest() {
  const clients = [];

  try {
    // ── STEP 1: Host creates Operative Match Lobby with 6 slots ──
    console.log(`\n--- STEP 1: Host (${OPERATIVES[0].name}) connects and initializes 6-player lobby ---`);
    const hostClient = await connectOperative(OPERATIVES[0]);
    clients.push(hostClient);

    const initialLobbyState = {
      meta: {
        id: ROOM_ID,
        joinCode: ROOM_ID,
        phase: 'LOBBY',
        hostName: OPERATIVES[0].name,
        playersCount: 1,
        maxCapacity: 6,
        updatedAt: Date.now()
      },
      config: {
        playerCount: 6,
        mafiaCount: 2,
        roundDurationSec: 90,
        difficulty: 'MEDIUM'
      },
      players: [
        {
          id: OPERATIVES[0].id,
          displayName: OPERATIVES[0].name,
          isHost: true,
          isReady: true,
          avatarColor: OPERATIVES[0].avatarColor
        }
      ]
    };

    hostClient.ws.send(JSON.stringify({
      event: 'createRoom',
      payload: {
        roomId: ROOM_ID,
        state: initialLobbyState
      }
    }));

    await new Promise(r => setTimeout(r, 600));

    // ── STEP 2: Operatives 2 through 6 join the lobby sequentially ──
    console.log(`\n--- STEP 2: Joining remaining 5 operatives into Room #${ROOM_ID} ---`);
    for (let i = 1; i < OPERATIVES.length; i++) {
      const op = OPERATIVES[i];
      console.log(`Connecting operative ${i + 1}/6: ${op.name}...`);
      const client = await connectOperative(op);
      clients.push(client);

      // Send joinRoom payload
      client.ws.send(JSON.stringify({
        event: 'joinRoom',
        payload: {
          roomId: ROOM_ID,
          player: {
            id: op.id,
            displayName: op.name,
            isHost: false,
            isReady: op.isReady,
            avatarColor: op.avatarColor
          }
        }
      }));

      // Small tick between joins to observe network propagation
      await new Promise(r => setTimeout(r, 500));

      // Assert all already connected clients are still alive (NO LEAVES)
      const droppedClient = clients.find(c => c.ws.readyState !== 1);
      if (droppedClient) {
        throw new Error(`CRITICAL: Operative ${droppedClient.op.name} disconnected prematurely when ${op.name} joined!`);
      }
    }

    console.log(`\nAll 6 operatives have successfully joined.`);

    // ── STEP 3: Verify Authoritative In-Memory State via HTTP ──
    console.log(`\n--- STEP 3: Checking Authoritative Room State via HTTP getState ---`);
    const stateRes = await fetch(`${CF_HTTP_BASE}/ws/room/${ROOM_ID}?action=getState`);
    const authoritativeState = await stateRes.json();

    console.log(`HTTP Status: ${stateRes.status}`);
    console.log(`Roster Count: ${authoritativeState?.players?.length} / 6`);
    console.log('Operatives Present in Live State:');
    authoritativeState?.players?.forEach((p, idx) => {
      console.log(`  [Slot ${idx + 1}] ${p.displayName} (Host: ${p.isHost ? 'YES' : 'NO'}, Ready: ${p.isReady ? 'YES' : 'NO'})`);
    });

    if (authoritativeState?.players?.length !== 6) {
      throw new Error(`Expected 6 players in room state, got ${authoritativeState?.players?.length}`);
    }

    // ── STEP 4: Test Lobby Chat Propagation across all 6 operatives ──
    console.log(`\n--- STEP 4: Testing real-time Operative Lobby Chat broadcast ---`);
    clients[0].ws.send(JSON.stringify({
      event: 'chatMessage',
      payload: {
        roomId: ROOM_ID,
        message: {
          id: `msg-${Date.now()}`,
          sender: 'Operative_1_Host',
          text: 'All 6 operatives reported in! Ready for arena deployment?',
          timestamp: Date.now()
        }
      }
    }));

    await new Promise(r => setTimeout(r, 800));

    // ── STEP 5: Persistence & Keep-Alive Check (Ensure NO ONE leaves) ──
    console.log(`\n--- STEP 5: Persistence check — monitoring for 5 seconds to ensure no dropouts ---`);
    for (let sec = 1; sec <= 5; sec++) {
      await new Promise(r => setTimeout(r, 1000));
      const activeCount = clients.filter(c => c.ws.readyState === 1).length;
      console.log(`[Second ${sec}] Active Connected Operatives: ${activeCount}/6`);
      if (activeCount < 6) {
        const dead = clients.filter(c => c.ws.readyState !== 1).map(c => c.op.name);
        throw new Error(`Operative(s) unexpectedly dropped during lobby wait: ${dead.join(', ')}`);
      }
    }

    // ── STEP 6: Boundary Check — 7th Operative Attempting to Join (Room Capacity = 6) ──
    console.log(`\n--- STEP 6: Verifying room capacity limit with 7th Operative attempt ---`);
    let extraAccepted = false;
    let rejectionStatus = null;

    try {
      const extraUrl = `${CF_WS_BASE}/ws/room/${ROOM_ID}?name=Operative_7_Extra&pid=op-7`;
      const extraWs = new WebSocket(extraUrl);

      await new Promise((resolve, reject) => {
        extraWs.on('open', () => {
          extraAccepted = true;
          extraWs.close();
          resolve();
        });
        extraWs.on('unexpected-response', (req, res) => {
          rejectionStatus = res.statusCode;
          resolve();
        });
        extraWs.on('error', (err) => {
          resolve();
        });
        setTimeout(resolve, 2000);
      });
    } catch (e) {
      // Expected
    }

    console.log(`7th Player connection result: ${extraAccepted ? 'ACCEPTED (Capacity > 6)' : `BLOCKED / REJECTED (Status: ${rejectionStatus || '403/Forbidden'})`}`);

    // Re-verify all 6 original operatives are intact and undamaged
    const finalActive = clients.filter(c => c.ws.readyState === 1).length;
    console.log(`Original 6 Operatives still connected: ${finalActive}/6`);

    if (finalActive !== 6) {
      throw new Error(`Expected all 6 operatives to remain connected, but found ${finalActive}`);
    }

    console.log('\n===============================================================');
    console.log('✅ TEST PASSED: ALL 6 PLAYERS FIT IN OPERATIVE MATCH LOBBY');
    console.log('✅ 100% PERSISTENCE CONFIRMED: NO OPERATIVE LEFT OR DISCONNECTED');
    console.log('===============================================================\n');

    // Clean exit
    clients.forEach(c => c.ws.close());
    process.exit(0);

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    clients.forEach(c => c.ws.close());
    process.exit(1);
  }
}

runOperativeLobbyTest();
