import https from 'https';

const API_KEY = "AIzaSyB8AaU5HFJE7VJRuxXvs9kotYOq74cREWA";

export function signUpWithFirebase(email, password) {
  return new Promise((resolve, reject) => {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
    const payload = JSON.stringify({
      email,
      password,
      returnSecureToken: true
    });

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
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
    req.write(payload);
    req.end();
  });
}

async function runTest() {
  const testEmail = `firebase_user_${Date.now()}@codemafia.com`;
  console.log(`[Testing Direct Firebase Auth Registration] Target Email: ${testEmail}`);
  const result = await signUpWithFirebase(testEmail, "SecurePass123!");
  console.log(`[Firebase Response Status]: ${result.status}`);
  if (result.status === 200) {
    console.log(`[PASS] User successfully registered in Firebase!`);
    console.log(`[Firebase UID]: ${result.json.localId}`);
    console.log(`[Firebase ID Token]: ${result.json.idToken.slice(0, 35)}...`);
  } else {
    console.log(`[FAIL] Firebase error:`, result.json?.error?.message || result.json);
  }
}

runTest();
