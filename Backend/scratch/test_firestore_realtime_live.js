import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB8AaU5HFJE7VJRuxXvs9kotYOq74cREWA",
  authDomain: "codemafia-54284.firebaseapp.com",
  projectId: "codemafia-54284",
  storageBucket: "codemafia-54284.firebasestorage.app",
  messagingSenderId: "113127636776",
  appId: "1:113127636776:web:3cbd588e4f0d65d2649a1d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testRealtimeFirestore() {
  console.log('======================================================');
  console.log('  CODE MAFIA: REALTIME CLOUD FIRESTORE STORAGE CHECK  ');
  console.log('======================================================\n');

  try {
    const testDocId = `live_session_${Date.now()}`;
    const sessionRef = doc(db, 'sessions', testDocId);

    // 1. Write live session document
    console.log(`[Step 1] Writing live session document to Firestore: sessions/${testDocId}...`);
    await setDoc(sessionRef, {
      id: testDocId,
      joinCode: 'ROOM99',
      phase: 'LOBBY',
      currentRound: 1,
      hostName: 'RaidenFighter',
      createdAt: new Date().toISOString()
    });
    console.log(`[PASS] Document successfully written to Cloud Firestore!`);

    // 2. Read document back
    console.log(`[Step 2] Reading document back from Cloud Firestore...`);
    const docSnap = await getDoc(sessionRef);
    if (docSnap.exists()) {
      console.log(`[PASS] Document retrieved from Firestore:`, docSnap.data());
    } else {
      console.log(`[FAIL] Document not found.`);
    }
  } catch (err) {
    console.error(`[Cloud Firestore Error]:`, err.message);
  }
}

testRealtimeFirestore();
