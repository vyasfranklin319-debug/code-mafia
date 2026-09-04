import WebSocket from 'ws';

const CF_BASE = 'wss://code-mafia-api.codemafia.workers.dev';
const HTTP_BASE = 'https://code-mafia-api.codemafia.workers.dev';
const ROOM_ID = 'TEST' + Math.floor(1000 + Math.random() * 9000);

console.log(`Starting Multiplayer Test for Room: ${ROOM_ID}`);

function createPlayerClient(name, pid) {
  return new Promise((resolve, reject) => {
    const url = `${CF_BASE}/ws/room/${ROOM_ID}?name=${encodeURIComponent(name)}&pid=${encodeURIComponent(pid)}`;
    const ws = new WebSocket(url);
    const messages = [];

    ws.on('open', () => {
      console.log(`[${name}] WebSocket OPEN`);
      resolve({ ws, messages });
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      console.log(`[${name}] Received event:`, msg.event);
      messages.push(msg);
    });

    ws.on('close', (code, reason) => {
      console.log(`[${name}] WebSocket CLOSED: code=${code}`);
    });

    ws.on('error', (err) => {
      console.error(`[${name}] WebSocket ERROR:`, err.message);
      reject(err);
    });
  });
}

async function runTest() {
  try {
    // 1. Player 1 Connects & Creates Room
    console.log('\n--- Step 1: Player 1 connects & creates room ---');
    const p1 = await createPlayerClient('Player1_Host', 'p1-id');
    p1.ws.send(JSON.stringify({
      event: 'createRoom',
      payload: {
        roomId: ROOM_ID,
        state: {
          meta: { id: ROOM_ID, joinCode: ROOM_ID, phase: 'LOBBY', hostName: 'Player1_Host', playersCount: 1 },
          players: [{ id: 'p1-id', displayName: 'Player1_Host', isHost: true, isReady: true }]
        }
      }
    }));

    await new Promise(r => setTimeout(r, 1000));

    // 2. Player 2 Connects & Joins Room
    console.log('\n--- Step 2: Player 2 connects & joins room ---');
    const p2 = await createPlayerClient('Player2_Dev', 'p2-id');
    p2.ws.send(JSON.stringify({
      event: 'joinRoom',
      payload: {
        roomId: ROOM_ID,
        player: { id: 'p2-id', displayName: 'Player2_Dev', isHost: false, isReady: false }
      }
    }));

    await new Promise(r => setTimeout(r, 1000));

    // 3. Player 3 Connects & Joins Room
    console.log('\n--- Step 3: Player 3 connects & joins room ---');
    const p3 = await createPlayerClient('Player3_QA', 'p3-id');
    p3.ws.send(JSON.stringify({
      event: 'joinRoom',
      payload: {
        roomId: ROOM_ID,
        player: { id: 'p3-id', displayName: 'Player3_QA', isHost: false, isReady: true }
      }
    }));

    await new Promise(r => setTimeout(r, 1500));

    // 4. Check HTTP State endpoint
    console.log('\n--- Step 4: Verify HTTP getState endpoint ---');
    const res = await fetch(`${HTTP_BASE}/ws/room/${ROOM_ID}?action=getState`);
    const state = await res.json();
    console.log('Room State players count:', state?.players?.length);
    console.log('Player names in room:', state?.players?.map(p => p.displayName));

    // 5. Verify all 3 sockets are still OPEN
    console.log('\n--- Step 5: Verify Socket Connection States ---');
    console.log('Player 1 WS readyState (1=OPEN):', p1.ws.readyState);
    console.log('Player 2 WS readyState (1=OPEN):', p2.ws.readyState);
    console.log('Player 3 WS readyState (1=OPEN):', p3.ws.readyState);

    const allConnected = (p1.ws.readyState === 1 && p2.ws.readyState === 1 && p3.ws.readyState === 1);
    const hasAll3Players = (state?.players?.length === 3);

    if (allConnected && hasAll3Players) {
      console.log('\n SUCCESS: All 3 players connected simultaneously without any disconnections!');
    } else {
      console.error('\n FAILURE: Some players disconnected or state mismatch!');
    }

    // Cleanup
    p1.ws.close();
    p2.ws.close();
    p3.ws.close();
    process.exit(allConnected && hasAll3Players ? 0 : 1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTest();
