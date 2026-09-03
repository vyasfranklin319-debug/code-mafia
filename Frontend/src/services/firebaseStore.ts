import { doc, setDoc, getDoc, getDocs, collection, onSnapshot, Unsubscribe, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { GameSession } from '../types/game';

export interface FirestoreHistoryRecord {
  id: string;
  date: string;
  packName: string;
  language: string;
  playerCount: number;
  mafiaCount: number;
  winner: string;
  durationMinutes: number;
  roundsCount: number;
}

export interface UserProfileData {
  uid: string;
  email: string;
  username: string;
  fullName?: string;
  xp?: number;
  rankTitle?: string;
  totalGames?: number;
  wins?: number;
  updatedAt?: any;
}

export interface DashboardStatsData {
  totalGames: number;
  wins: number;
  totalXp: number;
  bugsFixed: number;
  testsRun: number;
  favoritePacks: string[];
  lastUpdated: string;
}

/**
 * 1. USER PROFILE STORAGE (Firestore Collection: 'users')
 * Stores and updates live user profiles in Firestore
 */
export async function saveUserProfileToFirestore(userId: string, profile: { email: string; username: string; fullName?: string; xp?: number }) {
  try {
    const userRef = doc(db, 'users', userId);
    const payload: UserProfileData = {
      uid: userId,
      email: profile.email,
      username: profile.username,
      fullName: profile.fullName || profile.username,
      xp: profile.xp || 100,
      rankTitle: 'Junior Operative',
      totalGames: 1,
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, payload, { merge: true });
    console.log(`[Cloud Firestore] Saved live user profile: users/${userId}`);
    return payload;
  } catch (e: any) {
    console.warn('[Cloud Firestore Sync Fallback] Error saving user profile:', e.message);
    return null;
  }
}

/**
 * FETCH USER PROFILE FROM FIRESTORE
 */
export async function getUserProfileFromFirestore(userId: string): Promise<UserProfileData | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      return userSnap.data() as UserProfileData;
    }
    return null;
  } catch (e: any) {
    console.warn('[Cloud Firestore Fetch Fallback] Error fetching user profile:', e.message);
    return null;
  }
}

/**
 * 2. LIVE GAME SESSION STORAGE (Firestore Collection: 'sessions')
 * Persists room phase, current round, join code, and player roster
 */
export async function syncSessionToFirestore(session: GameSession) {
  if (!session || !session.id) return;
  try {
    const sessionRef = doc(db, 'sessions', session.id);
    const payload = {
      id: session.id,
      joinCode: session.joinCode,
      phase: session.phase,
      currentRound: session.currentRound,
      hostName: session.players?.find(p => p.isHost)?.displayName || session.players?.[0]?.displayName || 'OperativeHost',
      playersCount: session.players ? session.players.length : 0,
      winner: session.winner || null,
      updatedAt: serverTimestamp()
    };

    await setDoc(sessionRef, payload, { merge: true });
    console.log(`[Cloud Firestore] Synced session state: sessions/${session.id} (Phase: ${session.phase})`);
  } catch (e: any) {
    console.warn('[Cloud Firestore Session Sync Warning]:', e.message);
  }
}

/**
 * 2b. GLOBAL MATCHMAKING SCANNER (Firestore Collection: 'sessions')
 * Scans live open rooms in Cloud Firestore with phase === 'LOBBY'
 */
export async function findGlobalOpenSessionFromFirestore(): Promise<any | null> {
  try {
    const querySnapshot = await getDocs(collection(db, 'sessions'));
    let openSession: any = null;

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.phase === 'LOBBY' && data.playersCount < 6) {
        openSession = data;
      }
    });

    return openSession;
  } catch (e: any) {
    console.warn('[Cloud Firestore Global Matchmaking Scan Error]:', e.message);
    return null;
  }
}

/**
 * 3. REALTIME FIRESTORE LISTENER
 * Subscribes to live room state changes
 */
export function listenToFirestoreSession(sessionId: string, onUpdate: (data: any) => void): Unsubscribe {
  const sessionRef = doc(db, 'sessions', sessionId);
  return onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.data());
    }
  }, (err) => {
    console.warn('[Cloud Firestore Stream Listener Error]:', err.message);
  });
}

/**
 * 4. MATCH TELEMETRY ARCHIVES STORAGE (Firestore Collection: 'matchHistory')
 * Archives completed arena match telemetry into Firestore
 */
export async function saveMatchTelemetryToFirestore(matchRecord: FirestoreHistoryRecord) {
  try {
    const matchId = matchRecord.id || `match-${Date.now()}`;
    const matchRef = doc(db, 'matchHistory', matchId);

    await setDoc(matchRef, {
      ...matchRecord,
      createdAt: serverTimestamp()
    });

    console.log(`[Cloud Firestore] Match telemetry saved: matchHistory/${matchId}`);
  } catch (e: any) {
    console.warn('[Cloud Firestore Match History Sync Error]:', e.message);
  }
}

/**
 * FETCH MATCH HISTORY FROM FIRESTORE
 */
export async function fetchMatchHistoryFromFirestore(): Promise<FirestoreHistoryRecord[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'matchHistory'));
    const records: FirestoreHistoryRecord[] = [];
    querySnapshot.forEach((docSnap) => {
      records.push(docSnap.data() as FirestoreHistoryRecord);
    });
    return records;
  } catch (e: any) {
    console.warn('[Cloud Firestore Match History Fetch Error]:', e.message);
    return [];
  }
}

/**
 * 5. DASHBOARD TELEMETRY STORAGE (Firestore Collection: 'dashboardStats')
 * Stores and fetches live dashboard stats in Cloud Firestore
 */
export async function saveDashboardStatsToFirestore(userId: string, stats: Partial<DashboardStatsData>) {
  try {
    const statsRef = doc(db, 'dashboardStats', userId);
    const payload = {
      ...stats,
      lastUpdated: new Date().toISOString(),
      updatedAt: serverTimestamp()
    };
    await setDoc(statsRef, payload, { merge: true });
    console.log(`[Cloud Firestore] Saved dashboard telemetry: dashboardStats/${userId}`);
    return payload;
  } catch (e: any) {
    console.warn('[Cloud Firestore Dashboard Sync Error]:', e.message);
    return null;
  }
}

export async function fetchDashboardStatsFromFirestore(userId: string): Promise<DashboardStatsData | null> {
  try {
    const statsSnap = await getDoc(doc(db, 'dashboardStats', userId));
    if (statsSnap.exists()) {
      return statsSnap.data() as DashboardStatsData;
    }
    return null;
  } catch (e: any) {
    console.warn('[Cloud Firestore Dashboard Fetch Error]:', e.message);
    return null;
  }
}

/**
 * 6. DEVELOPER JOURNEY & ANALYTICS MODULES STORAGE (Firestore Collection: 'developerJourneys')
 * Stores calculated user journey analytics and insights across all 12 analytics modules
 */
export async function saveJourneyDataToFirestore(userId: string, journeyData: any) {
  try {
    const journeyRef = doc(db, 'developerJourneys', userId);
    const payload = {
      ...journeyData,
      lastUpdated: new Date().toISOString(),
      updatedAt: serverTimestamp()
    };
    await setDoc(journeyRef, payload, { merge: true });
    console.log(`[Cloud Firestore] Saved developer journey analytics insights: developerJourneys/${userId}`);
    return payload;
  } catch (e: any) {
    console.warn('[Cloud Firestore Journey Sync Error]:', e.message);
    return null;
  }
}

export async function fetchJourneyDataFromFirestore(userId: string): Promise<any | null> {
  try {
    const journeySnap = await getDoc(doc(db, 'developerJourneys', userId));
    if (journeySnap.exists()) {
      return journeySnap.data();
    }
    return null;
  } catch (e: any) {
    console.warn('[Cloud Firestore Journey Fetch Error]:', e.message);
    return null;
  }
}
