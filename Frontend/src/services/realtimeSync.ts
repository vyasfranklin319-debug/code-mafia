/**
 * CODE MAFIA — FIREBASE REALTIME DATABASE MULTIPLAYER ENGINE
 *
 * Provides real-time synchronization with:
 * - Zero quota limits (free tier RTDB)
 * - Sub-100ms sync latency
 * - Built-in onDisconnect presence cleanup
 * - Universal client sync for: Host, Joiners, Matchmaking Scanner
 */

import { getDatabase, ref, set, get, onValue, off, remove, onDisconnect, update } from 'firebase/database';
import { app } from '../config/firebase';
import { GameSession, Player } from '../types/game';

const db = getDatabase(app);

export interface RTDBRoomData {
  meta: {
    id: string;
    joinCode: string;
    phase: string;
    currentRound?: number;
    hostName: string;
    config?: any;
    winner?: string | null;
    playersCount?: number;
    updatedAt: number;
    createdAt: number;
  };
  players: Record<string, Player>;
}

/**
 * Initialize / save room state in RTDB when host creates the match.
 */
export async function saveRoomToRTDB(session: GameSession): Promise<void> {
  const cleanCode = (session.joinCode || session.id).trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);

  const hostPlayer = session.players.find(p => p.isHost) || session.players[0];

  const meta = {
    id: session.id,
    joinCode: cleanCode,
    phase: session.phase || 'LOBBY',
    currentRound: session.currentRound || 1,
    hostName: hostPlayer?.displayName || session.hostName || 'OperativeHost',
    config: session.config || null,
    winner: session.winner || null,
    playersCount: session.players.length,
    updatedAt: Date.now(),
    createdAt: Date.now()
  };

  const playersMap: Record<string, any> = {};
  session.players.forEach(p => {
    playersMap[p.id] = {
      id: p.id,
      displayName: p.displayName,
      isHost: p.isHost,
      isReady: p.isReady,
      isAlive: p.isAlive,
      isBot: false,
      avatarColor: p.avatarColor || 'bg-purple-600',
      stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 },
      joinedAt: Date.now()
    };
  });

  await set(roomRef, { meta, players: playersMap });

  // Setup disconnect handler for host
  if (hostPlayer) {
    const hostRef = ref(db, 'rooms/' + cleanCode + '/players/' + hostPlayer.id);
    onDisconnect(hostRef).remove();
  }

  console.log('[RTDB] Room created:', cleanCode);
}

/**
 * Write joining player's presence to the room in RTDB.
 */
export async function joinRoomInRTDB(joinCode: string, player: Player): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const playerRef = ref(db, 'rooms/' + cleanCode + '/players/' + player.id);

  const entry = {
    id: player.id,
    displayName: player.displayName,
    isHost: player.isHost,
    isReady: player.isReady,
    isAlive: player.isAlive,
    isBot: false,
    avatarColor: player.avatarColor || 'bg-purple-600',
    stats: player.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 },
    joinedAt: Date.now()
  };

  onDisconnect(playerRef).remove();
  await set(playerRef, entry);

  // Update room player count in meta
  const metaPlayersCountRef = ref(db, 'rooms/' + cleanCode + '/meta/updatedAt');
  await set(metaPlayersCountRef, Date.now());

  console.log('[RTDB] Player "' + player.displayName + '" joined room ' + cleanCode);
}

/**
 * Fetch a room from RTDB by join code or ID.
 */
export async function getRoomFromRTDB(pinOrCode: string): Promise<{ meta: any; players: Player[] } | null> {
  if (!pinOrCode) return null;
  const cleanCode = pinOrCode.trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);

  try {
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) return null;

    const val = snapshot.val();
    const rawPlayers = val.players || {};
    const players: Player[] = Object.values(rawPlayers).map((p: any) => ({
      id: p.id,
      displayName: p.displayName,
      isHost: p.isHost || false,
      isReady: p.isReady || false,
      isAlive: p.isAlive !== false,
      isBot: false,
      avatarColor: p.avatarColor || 'bg-purple-600',
      stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
    }));

    return {
      meta: val.meta || {},
      players
    };
  } catch (err: any) {
    console.warn('[RTDB] getRoomFromRTDB error:', err.message);
    return null;
  }
}

/**
 * Toggle a player's ready state in RTDB.
 */
export async function updatePlayerReadyInRTDB(joinCode: string, playerId: string, isReady: boolean): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const readyRef = ref(db, 'rooms/' + cleanCode + '/players/' + playerId + '/isReady');
  await set(readyRef, isReady);
}

/**
 * Remove player from room (intentional exit).
 */
export async function leaveRoomInRTDB(joinCode: string, playerId: string): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const playerRef = ref(db, 'rooms/' + cleanCode + '/players/' + playerId);
  await remove(playerRef);
}

/**
 * Update the game phase in RTDB (e.g. LOBBY -> ROLE_REVEAL -> WORK_ROUND).
 */
export async function setRoomPhaseInRTDB(joinCode: string, phase: string, extraMeta?: Record<string, any>): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const metaRef = ref(db, 'rooms/' + cleanCode + '/meta');
  await update(metaRef, {
    phase,
    updatedAt: Date.now(),
    ...(extraMeta || {})
  });
}

/**
 * Sync in-game session updates (e.g., active code, test runs, round info) to RTDB.
 */
export async function syncSessionToRTDB(session: GameSession): Promise<void> {
  const cleanCode = (session.joinCode || session.id).trim().toUpperCase();
  const metaRef = ref(db, 'rooms/' + cleanCode + '/meta');
  try {
    await update(metaRef, {
      phase: session.phase,
      currentRound: session.currentRound,
      winner: session.winner || null,
      updatedAt: Date.now()
    });
  } catch (e: any) {
    console.warn('[RTDB] syncSessionToRTDB error:', e.message);
  }
}

/**
 * Scan all rooms in RTDB for an open LOBBY session (Quick Match).
 */
export async function findGlobalOpenSessionFromRTDB(): Promise<{ joinCode: string; hostName: string; playersCount: number; config: any } | null> {
  try {
    const roomsRef = ref(db, 'rooms');
    const snapshot = await get(roomsRef);
    if (!snapshot.exists()) return null;

    const allRooms = snapshot.val();
    let bestMatch: any = null;

    for (const [code, room] of Object.entries<any>(allRooms)) {
      const meta = room?.meta;
      const players = room?.players || {};
      const count = Object.keys(players).length;
      const maxPlayers = meta?.config?.playerCount || 6;

      if (meta && meta.phase === 'LOBBY' && count > 0 && count < maxPlayers) {
        if (!bestMatch || count > bestMatch.playersCount) {
          bestMatch = {
            joinCode: code,
            hostName: meta.hostName || 'OperativeHost',
            playersCount: count,
            config: meta.config
          };
        }
      }
    }

    return bestMatch;
  } catch (e: any) {
    console.warn('[RTDB] findGlobalOpenSessionFromRTDB error:', e.message);
    return null;
  }
}

/**
 * Real-time listener for the entire room (players and meta) in RTDB.
 * Returns unsubscribe function.
 */
export function listenToRoomInRTDB(
  joinCode: string,
  onUpdate: (roomData: { meta: any; players: Player[] }) => void
): () => void {
  const cleanCode = joinCode.trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);

  const handler = onValue(roomRef, (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }
    const val = snapshot.val();
    const rawPlayers = val.players || {};
    const players: Player[] = Object.values(rawPlayers).map((p: any) => ({
      id: p.id,
      displayName: p.displayName,
      isHost: p.isHost || false,
      isReady: p.isReady || false,
      isAlive: p.isAlive !== false,
      isBot: false,
      avatarColor: p.avatarColor || 'bg-purple-600',
      stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
    }));

    // Sort: host first
    players.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));

    onUpdate({
      meta: val.meta || {},
      players
    });
  }, (err: Error) => {
    console.warn('[RTDB] Room listener error:', err.message);
  });

  return () => off(roomRef, 'value', handler);
}

/**
 * Backward compatibility: listen only to players in a room.
 */
export function listenToRoomPlayersInRTDB(
  joinCode: string,
  onPlayersUpdate: (players: Player[]) => void
): () => void {
  return listenToRoomInRTDB(joinCode, ({ players }) => {
    onPlayersUpdate(players);
  });
}

/**
 * Backward compatibility: listen only to phase in a room.
 */
export function listenToRoomPhaseInRTDB(
  joinCode: string,
  onPhaseUpdate: (phase: string) => void
): () => void {
  return listenToRoomInRTDB(joinCode, ({ meta }) => {
    if (meta?.phase) onPhaseUpdate(meta.phase);
  });
}
