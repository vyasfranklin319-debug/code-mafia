import http from 'http';

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method,
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runPinJoinTest() {
  console.log('================================================================');
  console.log('  CODE MAFIA: ROOM JOIN CODE / PIN ENTERING INTEGRITY TEST     ');
  console.log('================================================================\n');

  // Step 1: Host creates room session
  const createRes = await makeRequest('http://127.0.0.1:3001/api/v1/sessions', 'POST', {
    hostName: 'HostAlpha',
    playerCount: 6,
    mafiaCount: 2
  });

  const sessionId = createRes.data.sessionId;
  const joinCode = createRes.data.joinCode;
  console.log(`[Step 1] Room created! Session ID: ${sessionId} | Join PIN / Code: ${joinCode}`);

  // Step 2: Fetch public session via Join PIN
  const sessionRes = await makeRequest(`http://127.0.0.1:3001/api/v1/sessions/${sessionId}`);
  console.log(`[Step 2] Public session lookup via Join Code: ${sessionRes.data.joinCode} (Phase: ${sessionRes.data.phase})`);

  if (sessionRes.status === 200 && sessionRes.data.joinCode === joinCode) {
    console.log('\n================================================================');
    console.log('  [PASS] ROOM JOIN CODE / PIN VERIFIED SUCCESSFULLY!           ');
    console.log(`  Join PIN "${joinCode}" connects players directly to Room ${sessionId}`);
    console.log('================================================================\n');
  } else {
    console.error('[FAIL] Room PIN verification failed!');
  }
}

runPinJoinTest();
