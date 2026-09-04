/**
 * 6-Player Connection Bug Regression Test
 * Tests that all players remain connected when players 3-6 join.
 */

const { io } = require('socket.io-client');

const BACKEND = 'http://localhost:3001';
const ROOM_CODE = 'BUGTEST';
const MAX_PLAYERS = 6;

async function createPlayer(name, isHost = false) {
  return new Promise((resolve, reject) => {
    const socket = io(BACKEND, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 5000,
    });

    socket.connected_status = 'connecting';
    
    socket.on('connect', () => {
      socket.connected_status = 'connected';
      console.log(`  ✓ [${name}] connected (socket: ${socket.id})`);
      resolve({ socket, name });
    });

    socket.on('disconnect', (reason) => {
      socket.connected_status = 'disconnected';
      console.warn(`  ✗ [${name}] DISCONNECTED! reason: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      reject(new Error(`[${name}] connection error: ${err.message}`));
    });

    setTimeout(() => {
      if (socket.connected_status === 'connecting') {
        reject(new Error(`[${name}] connection timeout`));
      }
    }, 5000);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runTest() {
  console.log('\n=== 6-PLAYER CONNECTION BUG REGRESSION TEST ===\n');
  
  const players = [];
  let passed = 0;
  let failed = 0;

  try {
    // Step 1: Host creates room
    console.log('[Step 1] Host creates room...');
    const hostResult = await createPlayer('Player1-Host');
    hostResult.socket.emit('createRoom', {
      roomId: ROOM_CODE,
      state: {
        meta: { id: 'test-session', joinCode: ROOM_CODE, phase: 'LOBBY', playersCount: 1 },
        players: [{ id: 'p1', displayName: 'Player1-Host', isHost: true, isReady: true, isAlive: true }],
      }
    });
    players.push(hostResult);
    await sleep(300);

    // Step 2-6: Additional players join one by one
    for (let i = 2; i <= MAX_PLAYERS; i++) {
      const name = `Player${i}`;
      console.log(`\n[Step ${i}] ${name} joins...`);
      const result = await createPlayer(name);
      result.socket.emit('joinRoom', {
        roomId: ROOM_CODE,
        player: { id: `p${i}`, displayName: name, isHost: false, isReady: false, isAlive: true }
      });
      players.push(result);
      await sleep(500);

      // Check ALL previously connected players are still connected
      console.log(`  Checking all ${players.length} players still connected...`);
      let allOk = true;
      for (const p of players) {
        const ok = p.socket.connected;
        if (ok) {
          console.log(`    ✓ ${p.name}: CONNECTED`);
        } else {
          console.log(`    ✗ ${p.name}: DISCONNECTED ← BUG!`);
          allOk = false;
          failed++;
        }
      }
      if (allOk) {
        passed++;
        console.log(`  ✓ PASS: All ${players.length} players connected after ${name} joined`);
      } else {
        console.log(`  ✗ FAIL: Players disconnected when ${name} joined`);
      }
    }

    // Final summary
    console.log('\n=== TEST RESULTS ===');
    console.log(`Passed: ${passed}/${MAX_PLAYERS - 1} join scenarios`);
    console.log(`Failed: ${failed} players erroneously disconnected`);
    
    if (failed === 0) {
      console.log('\n✅ BUG FIXED: All 6 players remain connected throughout!');
    } else {
      console.log('\n❌ BUG STILL PRESENT: Players are being disconnected on new joins');
    }

  } finally {
    // Clean up
    for (const p of players) {
      p.socket.disconnect();
    }
  }
}

runTest().catch(err => {
  console.error('Test error:', err.message);
  process.exit(1);
});
