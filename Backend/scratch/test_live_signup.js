import https from 'https';

const API_KEY = "AIzaSyB8AaU5HFJE7VJRuxXvs9kotYOq74cREWA";

function testCreateUser() {
  return new Promise((resolve, reject) => {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
    const payload = {
      email: `operative_${Date.now()}@codemafia.com`,
      password: "TestPassword123!",
      returnSecureToken: true
    };

    const req = https.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function runLiveTest() {
  console.log('====================================================');
  console.log('   CODE MAFIA: LIVE FIREBASE USER REGISTRATION TEST  ');
  console.log('====================================================\n');

  try {
    const res = await testCreateUser();
    console.log(`[Status Code]: HTTP ${res.status}`);
    if (res.status === 200 && res.json.idToken) {
      console.log(`[PASS] Firebase Auth Active! Account UID: ${res.json.localId}`);
      console.log(`[ID Token Issued]: ${res.json.idToken.slice(0, 30)}...`);
    } else {
      console.log(`[Response Message]:`, res.json?.error?.message || res.json);
    }
  } catch (err) {
    console.error(`[Error]: ${err.message}`);
  }
}

runLiveTest();
