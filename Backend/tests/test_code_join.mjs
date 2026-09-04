import WebSocket from 'ws';

const CF_BASE = 'wss://code-mafia-api.codemafia.workers.dev';
const HTTP_BASE = 'https://code-mafia-api.codemafia.workers.dev';
const ROOM_ID = 'JOIN' + Math.floor(1000 + Math.random() * 9000);

console.log(`=== Testing Room Code Join Flow for Room: ${ROOM_ID} ===`);

function createClient(name, pid) {
  return new Promise((resolve, reject) => {
    const url = `${CF_BASE}/ws/room/${ROOM_ID}?name=${encodeURIComponent(name)}&pid=${encodeURIComponent(pid)}`;
    const ws = new WebSocket(url);
    const events = [];

    ws.on('open', () => {
      console.log(`[${name}] WS connected to ${ROOM_ID}`);
      resolve({
        ws,
        name,
        pid,
        events,
        send(event, payload) {
          ws.send(JSON.stringify({ event, payload }));
        }
      });
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        events.push(msg);
        if (msg.event === 'ROOM_UPDATED' || msg.event.startsWith('roomUpdate:')) {
          const players = msg.payload?.players || msg.payload?.roomState?.players || [];
          console.log(`[${name}] Received room state update: ${players.length} players -> [${players.map(p => p.displayName).join(', ')}]`);
        }
      } catch (e) {}
    });

    ws.on('error', reject);
  });
}

async function runTest() {
  try {
    // 1. Host creates room
    console.log('\n--- Step 1: Host creates room ---');
    const host = await createClient('HostOperative', 'usr-host-1');
    host.send('createRoom', {
      roomId: ROOM_ID,
      state: {
        meta: { id: ROOM_ID, joinCode: ROOM_ID, phase: 'LOBBY', hostName: 'HostOperative', playersCount: 1 },
        players: [{ id: 'usr-host-1', displayName: 'HostOperative', isHost: true, isReady: true }]
      }
    });

    await new Promise(r => setTimeout(r, 600));

    // 2. Player 2 joins with Room Code
    console.log('\n--- Step 2: Player 2 joins with code ---');
    const player2 = await createClient('Player2_Dev', 'usr-p2');
    player2.send('joinRoom', {
      roomId: ROOM_ID,
      player: { id: 'usr-p2', displayName: 'Player2_Dev', isHost: false, isReady: false }
    });

    await new Promise(r => setTimeout(r, 600));

    // 3. Player 3 joins with Room Code
    console.log('\n--- Step 3: Player 3 joins with code ---');
    const player3 = await createClient('Player3_QA', 'usr-p3');
    player3.send('joinRoom', {
      roomId: ROOM_ID,
      player: { id: 'usr-p3', displayName: 'Player3_QA', isHost: false, isReady: false }
    });

    await new Promise(r => setTimeout(r, 1000));

    // 4. Verify HTTP getState
    console.log('\n--- Step 4: Verify HTTP getState endpoint ---');
    const res = await fetch(`${HTTP_BASE}/ws/room/${ROOM_ID}?action=getState`, {
      headers: { 'Origin': 'https://codemafia-54284.web.app' }
    });
    const state = await res.json();
    console.log(`HTTP getState returned: ${state?.players?.length} players:`, state?.players?.map(p => p.displayName));

    if (state?.players?.length === 3) {
      console.log('\n SUCCESS: All players connected to the room code successfully and are synchronized!');
    } else {
      console.error('\n FAILED: Expected 3 players in room state, got:', state?.players?.length);
      process.exit(1);
    }

    host.ws.close();
    player2.ws.close();
    player3.ws.close();
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTest();
