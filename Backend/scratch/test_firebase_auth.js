import http from 'http';
import https from 'https';

const API_KEY = "AIzaSyB8AaU5HFJE7VJRuxXvs9kotYOq74cREWA";
const PROJECT_ID = "codemafia-54284";

function checkFirebaseAuthApi() {
  return new Promise((resolve, reject) => {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
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
    req.write(JSON.stringify({ returnSecureToken: true }));
    req.end();
  });
}

async function runAuthCheck() {
  console.log('====================================================');
  console.log('   CODE MAFIA: LIVE FIREBASE AUTHENTICATION CHECK   ');
  console.log('====================================================\n');

  try {
    const res = await checkFirebaseAuthApi();
    console.log(`[Firebase IdentityToolkit Status]: HTTP ${res.status}`);
    if (res.json?.error) {
      console.log(`[Response Message]: ${res.json.error.message}`);
    } else {
      console.log(`[Response Output]:`, res.json);
    }
  } catch (err) {
    console.error(`[Error]: ${err.message}`);
  }
}

runAuthCheck();
