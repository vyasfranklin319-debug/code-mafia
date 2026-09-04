import { io } from './Frontend/node_modules/socket.io-client/build/esm/index.js';

async function testMultipleClients() {
  const BACKEND_URL = 'http://localhost:3001';
  console.log('Testing 6 player connections to Backend...');
  const clients = [];

  for (let i = 1; i <= 6; i++) {
    const socket = io(BACKEND_URL, { transports: ['websocket'] });
    await new Promise((res, rej) => {
      socket.on('connect', () => {
        console.log(`Player ${i} connected with socketId: ${socket.id}`);
        res();
      });
      socket.on('disconnect', (reason) => {
        console.warn(`[EVENT] Player ${i} disconnected! Reason: ${reason}`);
      });
      socket.on('connect_error', rej);
    });
    clients.push(socket);

    socket.emit('joinRoom', {
      roomId: 'TEST6P',
      player: { id: 'p' + i, displayName: 'Player' + i }
    });
  }

  await new Promise(r => setTimeout(r, 1000));

  console.log('\n--- VERIFICATION STATUS ---');
  let allConnected = true;
  clients.forEach((c, idx) => {
    console.log(`Player ${idx + 1} connected: ${c.connected}`);
    if (!c.connected) allConnected = false;
  });
  console.log(`All 6 connected: ${allConnected}`);

  clients.forEach(c => c.disconnect());
  console.log('Test completed.');
}

testMultipleClients().catch(err => console.error(err));
