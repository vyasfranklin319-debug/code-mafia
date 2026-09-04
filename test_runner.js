/**
 * CODE MAFIA — COMPREHENSIVE BACKEND & FRONTEND TEST SUITE
 * Run: node test_runner.js
 */

const http = require('http');
const results = [];
let passed = 0, failed = 0;

function testResult(id, name, status, detail) {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} T${id}: ${name} — ${detail}`);
  results.push({ id, name, status, detail });
  if (status === 'PASS') passed++; else failed++;
}

function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port, path }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, headers: res.headers }));
    }).on('error', reject);
  });
}

function httpPost(port, path, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const opts = {
      hostname: 'localhost', port, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('');
  console.log('='.repeat(60));
  console.log('  CODE MAFIA — COMPREHENSIVE DOM & API TEST SUITE');
  console.log('='.repeat(60));
  console.log('');

  // ─── BACKEND API TESTS ─────────────────────────────────────

  console.log('▶ BACKEND API TESTS (port 3001)');
  console.log('─'.repeat(40));

  // T1: Health endpoint
  try {
    const r = await httpGet(3001, '/api/health');
    const data = JSON.parse(r.body);
    if (r.status === 200 && data.status === 'ok') {
      testResult(1, 'Health Check', 'PASS', `status=ok, service=${data.service.slice(0, 40)}`);
    } else {
      testResult(1, 'Health Check', 'FAIL', `Status ${r.status}, body: ${r.body.slice(0, 60)}`);
    }
  } catch (e) { testResult(1, 'Health Check', 'FAIL', `Connection refused: ${e.message}`); }

  // T2: 404 handling
  try {
    const r = await httpGet(3001, '/api/does-not-exist');
    if (r.status === 404) testResult(2, '404 Route Handling', 'PASS', 'Correctly returns 404');
    else testResult(2, '404 Route Handling', 'FAIL', `Expected 404, got ${r.status}`);
  } catch (e) { testResult(2, '404 Route Handling', 'FAIL', e.message); }

  // T3: CORS headers
  try {
    const r = await httpGet(3001, '/api/health');
    const hasCors = r.headers['access-control-allow-origin'] !== undefined;
    if (hasCors) testResult(3, 'CORS Headers', 'PASS', `access-control-allow-origin: ${r.headers['access-control-allow-origin']}`);
    else testResult(3, 'CORS Headers', 'FAIL', 'No CORS headers found');
  } catch (e) { testResult(3, 'CORS Headers', 'FAIL', e.message); }

  // T4: Session Creation API
  try {
    const r = await httpPost(3001, '/api/v1/sessions', {
      hostName: 'TestHost', packId: 'buggy-sort', playerCount: 4, mafiaCount: 1, joinCode: 'TESTCODE'
    });
    const data = JSON.parse(r.body);
    if (r.status === 201 && data.joinCode) {
      testResult(4, 'Session Creation API', 'PASS', `Room: ${data.joinCode}, Host: ${data.hostPlayer && data.hostPlayer.displayName}`);
    } else {
      testResult(4, 'Session Creation API', 'FAIL', `Status ${r.status}, body: ${r.body.slice(0, 80)}`);
    }
  } catch (e) { testResult(4, 'Session Creation API', 'FAIL', e.message); }

  // T5: Sandbox Execution — safe code
  try {
    const r = await httpPost(3001, '/api/v1/sandbox/execute', {
      code: 'function add(a, b) { return a + b; }',
      testCases: [{ input: [2, 3], expected: 5 }, { input: [10, 20], expected: 30 }],
      language: 'javascript'
    });
    const data = JSON.parse(r.body);
    if (r.status === 200 && data.passed !== undefined) {
      testResult(5, 'Sandbox Safe Code Execution', 'PASS', `${data.passed}/${data.total} tests passed`);
    } else {
      testResult(5, 'Sandbox Safe Code Execution', 'FAIL', `Status ${r.status}, body: ${r.body.slice(0, 100)}`);
    }
  } catch (e) { testResult(5, 'Sandbox Safe Code Execution', 'FAIL', e.message); }

  // T6: Sandbox Security — infinite loop timeout
  try {
    const start = Date.now();
    const r = await httpPost(3001, '/api/v1/sandbox/execute', {
      code: 'while(true){} function add(a,b){return a+b;}',
      testCases: [{ input: [1, 2], expected: 3 }],
      language: 'javascript'
    });
    const elapsed = Date.now() - start;
    if (elapsed < 10000) {
      testResult(6, 'Sandbox Timeout (infinite loop)', 'PASS', `Contained in ${elapsed}ms, status=${r.status}`);
    } else {
      testResult(6, 'Sandbox Timeout (infinite loop)', 'FAIL', `Did not time out: ${elapsed}ms`);
    }
  } catch (e) { testResult(6, 'Sandbox Timeout (infinite loop)', 'FAIL', e.message); }

  // T7: Sandbox — wrong answer detection
  try {
    const r = await httpPost(3001, '/api/v1/sandbox/execute', {
      code: 'function add(a, b) { return a - b; }', // Wrong: subtraction instead of addition
      testCases: [{ input: [2, 3], expected: 5 }],
      language: 'javascript'
    });
    const data = JSON.parse(r.body);
    if (r.status === 200 && data.passed === 0) {
      testResult(7, 'Sandbox Wrong Answer Detection', 'PASS', `Correctly detected 0/${data.total} passed`);
    } else {
      testResult(7, 'Sandbox Wrong Answer Detection', 'FAIL', `Expected 0 passes, got: ${r.body.slice(0, 80)}`);
    }
  } catch (e) { testResult(7, 'Sandbox Wrong Answer Detection', 'FAIL', e.message); }

  // T8: Match History GET
  try {
    const r = await httpGet(3001, '/api/v1/history');
    if (r.status === 200) {
      const d = JSON.parse(r.body);
      testResult(8, 'Match History GET', 'PASS', `Records: ${Array.isArray(d) ? d.length : JSON.stringify(d).slice(0, 40)}`);
    } else {
      testResult(8, 'Match History GET', 'FAIL', `Status ${r.status}`);
    }
  } catch (e) { testResult(8, 'Match History GET', 'FAIL', e.message); }

  // T9: Match History POST
  try {
    const r = await httpPost(3001, '/api/v1/history', { id: 'test-match-1', winner: 'DEVELOPERS', rounds: 3, players: ['Alice', 'Bob'] });
    if (r.status === 201) testResult(9, 'Match History POST', 'PASS', 'Saved successfully');
    else testResult(9, 'Match History POST', 'FAIL', `Status ${r.status}, body: ${r.body.slice(0, 80)}`);
  } catch (e) { testResult(9, 'Match History POST', 'FAIL', e.message); }

  // ─── FRONTEND BUILD TESTS ──────────────────────────────────

  console.log('');
  console.log('▶ FRONTEND BUILD TESTS (port 3000)');
  console.log('─'.repeat(40));

  // T10: Frontend Serving
  try {
    const r = await httpGet(3000, '/');
    if (r.status === 200 && r.body.includes('<html')) {
      testResult(10, 'Frontend HTML Serving', 'PASS', `HTML served, length=${r.body.length}`);
    } else {
      testResult(10, 'Frontend HTML Serving', 'FAIL', `Status ${r.status}, body: ${r.body.slice(0, 60)}`);
    }
  } catch (e) { testResult(10, 'Frontend HTML Serving', 'FAIL', e.message); }

  // T11: React root in HTML
  try {
    const r = await httpGet(3000, '/');
    if (r.body.includes('id="root"') || r.body.includes("id='root'")) {
      testResult(11, 'React Root DOM Element', 'PASS', '<div id="root"> present in HTML');
    } else {
      testResult(11, 'React Root DOM Element', 'FAIL', 'Root element missing from HTML');
    }
  } catch (e) { testResult(11, 'React Root DOM Element', 'FAIL', e.message); }

  // T12: Vite script tag in HTML
  try {
    const r = await httpGet(3000, '/');
    if (r.body.includes('<script') && r.body.includes('.tsx') || r.body.includes('type="module"') || r.body.includes('/src/main')) {
      testResult(12, 'Vite Module Script Tag', 'PASS', 'ES Module script tag present');
    } else {
      testResult(12, 'Vite Module Script Tag', 'FAIL', 'No module script found in HTML');
    }
  } catch (e) { testResult(12, 'Vite Module Script Tag', 'FAIL', e.message); }

  // T13: index.html has title
  try {
    const r = await httpGet(3000, '/');
    const titleMatch = r.body.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      testResult(13, 'Page Title in HTML', 'PASS', `Title: "${titleMatch[1]}"`);
    } else {
      testResult(13, 'Page Title in HTML', 'FAIL', 'No <title> tag found');
    }
  } catch (e) { testResult(13, 'Page Title in HTML', 'FAIL', e.message); }

  // T14: Session roundtrip — create then retrieve
  try {
    const joinCode = 'RDTRIP' + Date.now().toString().slice(-4);
    const sr = await httpPost(3001, '/api/v1/sessions', {
      hostName: 'RoundtripHost', packId: 'buggy-sort',
      playerCount: 4, mafiaCount: 1, joinCode
    });
    const sd = JSON.parse(sr.body);
    if (sd.joinCode) {
      await httpPost(3001, '/api/v1/history', { id: (sd.game && sd.game.id) || joinCode, winner: 'MAFIA', rounds: 2 });
      const hr = await httpGet(3001, '/api/v1/history');
      const hd = JSON.parse(hr.body);
      if (Array.isArray(hd) && hd.length > 0) {
        testResult(14, 'Full Session→History Roundtrip', 'PASS', `Session ${sd.joinCode} created, ${hd.length} history records`);
      } else {
        testResult(14, 'Full Session→History Roundtrip', 'FAIL', 'History empty after save');
      }
    } else {
      testResult(14, 'Full Session→History Roundtrip', 'FAIL', `Session creation failed: ${sr.body.slice(0, 80)}`);
    }
  } catch (e) { testResult(14, 'Full Session→History Roundtrip', 'FAIL', e.message); }

  // T15: Backend + Frontend both up simultaneously
  try {
    const [backendR, frontendR] = await Promise.all([
      httpGet(3001, '/api/health'),
      httpGet(3000, '/')
    ]);
    if (backendR.status === 200 && frontendR.status === 200) {
      testResult(15, 'Full Stack Both Running', 'PASS', `Backend: ${backendR.status}, Frontend: ${frontendR.status}`);
    } else {
      testResult(15, 'Full Stack Both Running', 'FAIL', `Backend: ${backendR.status}, Frontend: ${frontendR.status}`);
    }
  } catch (e) { testResult(15, 'Full Stack Both Running', 'FAIL', e.message); }

  // ─── FINAL SUMMARY ─────────────────────────────────────────
  console.log('');
  console.log('='.repeat(60));
  const total = passed + failed;
  const pct = Math.round((passed / total) * 100);
  console.log(`  RESULTS: ${passed}/${total} PASSED  (${pct}%)`);
  console.log('='.repeat(60));
  console.log('');

  if (failed > 0) {
    console.log('FAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ T${r.id}: ${r.name} — ${r.detail}`);
    });
    console.log('');
  }

  process.exit(failed === 0 ? 0 : 1);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
