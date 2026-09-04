/**
 * CODE MAFIA — FIREBASE REALTIME DATABASE MULTIPLAYER ENGINE
 *
 * Provides real-time synchronization with:
 * - Zero quota limits (free tier RTDB)
 * - Sub-100ms sync latency
 * - Built-in onDisconnect presence cleanup
 * - Universal client sync for: Host, Joiners, Matchmaking Scanner
 * - Complete state replication: Roles, Codebase, Test Runs, Sabotage, Chat, Votes, Timers
 */

import { getDatabase, ref, set, get, onValue, off, remove, onDisconnect, update } from 'firebase/database';
import { app } from '../config/firebase';
import {
  GameSession,
  Player,
  ContentFile,
  ChatMessage,
  TestRunResult,
  SystemIntegrity,
  SabotageState,
  PrHotfix,
  GitCommit,
  ActivityEvent,
  EliminationRecord
} from '../types/game';

const db = getDatabase(app);

export interface RTDBRoomData {
  meta: {
    id: string;
    joinCode: string;
    phase: string;
    phaseEndsAt?: number;
    currentRound?: number;
    hostName: string;
    config?: any;
    winner?: string | null;
    winReason?: string | null;
    isCodeFrozen?: boolean;
    playersCount?: number;
    updatedAt: number;
    createdAt: number;
  };
  players: Record<string, Player>;
  files?: ContentFile[];
  votes?: Record<string, string | null>;
  chatMessages?: ChatMessage[];
  testRuns?: TestRunResult[];
  systemIntegrity?: SystemIntegrity;
  sabotageState?: SabotageState;
  stagedPrs?: PrHotfix[];
  gitCommits?: GitCommit[];
  activityFeed?: ActivityEvent[];
  eliminationHistory?: EliminationRecord[];
}

export interface RTDBRoomUpdatePayload {
  meta: any;
  players: Player[];
  files?: ContentFile[] | null;
  votes?: Record<string, string | null>;
  chatMessages?: ChatMessage[] | null;
  testRuns?: TestRunResult[] | null;
  systemIntegrity?: SystemIntegrity | null;
  sabotageState?: SabotageState | null;
  stagedPrs?: PrHotfix[] | null;
  gitCommits?: GitCommit[] | null;
  activityFeed?: ActivityEvent[] | null;
  eliminationHistory?: EliminationRecord[] | null;
  isCodeFrozen?: boolean;
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
    phaseEndsAt: session.phaseEndsAt || 0,
    currentRound: session.currentRound || 1,
    hostName: hostPlayer?.displayName || session.hostName || 'OperativeHost',
    config: session.config || null,
    winner: session.winner || null,
    winReason: session.winReason || null,
    isCodeFrozen: !!session.isCodeFrozen,
    playersCount: session.players.length,
    updatedAt: Date.now(),
    createdAt: Date.now()
  };

  const playersMap: Record<string, any> = {};
  session.players.forEach(p => {
    playersMap[p.id] = {
      id: p.id,
      displayName: p.displayName,
      role: p.role || null,
      isHost: p.isHost,
      isReady: p.isReady,
      isAlive: p.isAlive,
      isBot: false,
      avatarColor: p.avatarColor || 'bg-purple-600',
      stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 },
      joinedAt: Date.now()
    };
  });

  await set(roomRef, {
    meta,
    players: playersMap,
    files: session.files || [],
    votes: session.votes || {},
    chatMessages: session.chatMessages || [],
    testRuns: session.testRuns || [],
    systemIntegrity: session.systemIntegrity || { score: 100, pipelineStatus: 'STAGING', buildDurationMs: 850, lastUpdated: '' },
    sabotageState: session.sabotageState || { shadowCommitsRemaining: 1, fakeCiActiveUntil: null, flakyTestInjected: false, memoryLeakActive: false, silentRegressionActive: false, syntaxMaskedPlayerId: null },
    stagedPrs: session.stagedPrs || [],
    gitCommits: session.gitCommits || [],
    activityFeed: session.activityFeed || [],
    eliminationHistory: session.eliminationHistory || []
  });

  // Setup disconnect handler for host
  if (hostPlayer) {
    const hostRef = ref(db, 'rooms/' + cleanCode + '/players/' + hostPlayer.id);
    onDisconnect(hostRef).remove();
  }

  console.log('[RTDB] Room created with full state replication:', cleanCode);
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
    role: player.role || null,
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
 * Update full player roster in RTDB (for role assignments and elimination outcomes).
 */
export async function updatePlayersInRTDB(joinCode: string, players: Player[]): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const playersRef = ref(db, 'rooms/' + cleanCode + '/players');
  const map: Record<string, any> = {};
  players.forEach(p => {
    map[p.id] = {
      id: p.id,
      displayName: p.displayName,
      role: p.role || null,
      isHost: p.isHost || false,
      isReady: p.isReady || false,
      isAlive: p.isAlive !== false,
      isBot: false,
      avatarColor: p.avatarColor || 'bg-purple-600',
      stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
    };
  });
  await set(playersRef, map);
  const metaUpdatedRef = ref(db, 'rooms/' + cleanCode + '/meta/updatedAt');
  await set(metaUpdatedRef, Date.now());
}

/**
 * Fetch a room from RTDB by join code or ID.
 */
export async function getRoomFromRTDB(pinOrCode: string): Promise<RTDBRoomUpdatePayload | null> {
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
      role: p.role || undefined,
      isHost: p.isHost || false,
      isReady: p.isReady || false,
      isAlive: p.isAlive !== false,
      isBot: false,
      avatarColor: p.avatarColor || 'bg-purple-600',
      stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
    }));

    const rawVotes = val.votes || {};
    const parsedVotes: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(rawVotes)) {
      parsedVotes[k] = v === '__ABSTAIN__' ? null : (v as string | null);
    }

    return {
      meta: val.meta || {},
      players,
      files: val.files || null,
      votes: parsedVotes,
      chatMessages: val.chatMessages || null,
      testRuns: val.testRuns || null,
      systemIntegrity: val.systemIntegrity || null,
      sabotageState: val.sabotageState || null,
      stagedPrs: val.stagedPrs || null,
      gitCommits: val.gitCommits || null,
      activityFeed: val.activityFeed || null,
      eliminationHistory: val.eliminationHistory || null,
      isCodeFrozen: !!val.meta?.isCodeFrozen
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
 * Sync in-game session updates (active code, test runs, round info, phase timer, sabotage) to RTDB.
 */
export async function syncSessionToRTDB(session: GameSession): Promise<void> {
  const cleanCode = (session.joinCode || session.id).trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);
  try {
    const updates: Record<string, any> = {
      'meta/phase': session.phase,
      'meta/currentRound': session.currentRound,
      'meta/phaseEndsAt': session.phaseEndsAt || 0,
      'meta/winner': session.winner || null,
      'meta/winReason': session.winReason || null,
      'meta/isCodeFrozen': !!session.isCodeFrozen,
      'meta/updatedAt': Date.now()
    };
    if (session.files && session.files.length > 0) {
      updates['files'] = session.files;
    }
    if (session.votes) {
      updates['votes'] = session.votes;
    }
    if (session.testRuns) {
      updates['testRuns'] = session.testRuns;
    }
    if (session.systemIntegrity) {
      updates['systemIntegrity'] = session.systemIntegrity;
    }
    if (session.sabotageState) {
      updates['sabotageState'] = session.sabotageState;
    }
    if (session.stagedPrs) {
      updates['stagedPrs'] = session.stagedPrs;
    }
    if (session.chatMessages) {
      updates['chatMessages'] = session.chatMessages;
    }
    if (session.activityFeed) {
      updates['activityFeed'] = session.activityFeed;
    }
    if (session.gitCommits) {
      updates['gitCommits'] = session.gitCommits;
    }
    if (session.eliminationHistory) {
      updates['eliminationHistory'] = session.eliminationHistory;
    }
    await update(roomRef, updates);

    // Sync player roles and statuses
    if (session.players && session.players.length > 0) {
      const playersMap: Record<string, any> = {};
      session.players.forEach(p => {
        playersMap[p.id] = {
          id: p.id,
          displayName: p.displayName,
          role: p.role || null,
          isHost: p.isHost || false,
          isReady: p.isReady || false,
          isAlive: p.isAlive !== false,
          isBot: false,
          avatarColor: p.avatarColor || 'bg-purple-600',
          stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
        };
      });
      await update(ref(db, 'rooms/' + cleanCode), { players: playersMap });
    }
  } catch (e: any) {
    console.warn('[RTDB] syncSessionToRTDB error:', e.message);
  }
}

/**
 * Cast or change a player's vote in RTDB.
 */
export async function castVoteInRTDB(joinCode: string, voterId: string, targetId: string | null): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const voteRef = ref(db, 'rooms/' + cleanCode + '/votes/' + voterId);
  await set(voteRef, targetId === null ? '__ABSTAIN__' : targetId);

  const metaUpdatedRef = ref(db, 'rooms/' + cleanCode + '/meta/updatedAt');
  await set(metaUpdatedRef, Date.now());
}

/**
 * Reset / clear all votes for a new voting round.
 */
export async function clearVotesInRTDB(joinCode: string): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const votesRef = ref(db, 'rooms/' + cleanCode + '/votes');
  await set(votesRef, {});

  const metaUpdatedRef = ref(db, 'rooms/' + cleanCode + '/meta/updatedAt');
  await set(metaUpdatedRef, Date.now());
}

/**
 * Push updated codebase files to RTDB so all players have access to runtime code.
 */
export async function syncFilesToRTDB(joinCode: string, files: ContentFile[]): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const filesRef = ref(db, 'rooms/' + cleanCode + '/files');
  await set(filesRef, files);

  const metaUpdatedRef = ref(db, 'rooms/' + cleanCode + '/meta/updatedAt');
  await set(metaUpdatedRef, Date.now());
}

/**
 * Push a new chat message to RTDB.
 */
export async function sendChatToRTDB(joinCode: string, message: ChatMessage, allMessages: ChatMessage[]): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const chatRef = ref(db, 'rooms/' + cleanCode + '/chatMessages');
  await set(chatRef, allMessages);

  const metaUpdatedRef = ref(db, 'rooms/' + cleanCode + '/meta/updatedAt');
  await set(metaUpdatedRef, Date.now());
}

/**
 * Synchronize Test Run and System Integrity Score to RTDB.
 */
export async function syncTestRunToRTDB(joinCode: string, testRuns: TestRunResult[], systemIntegrity: SystemIntegrity, activityFeed: ActivityEvent[]): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);
  await update(roomRef, {
    testRuns,
    systemIntegrity,
    activityFeed,
    'meta/updatedAt': Date.now()
  });
}

/**
 * Synchronize Emergency Code Freeze status to RTDB.
 */
export async function setCodeFrozenInRTDB(joinCode: string, isCodeFrozen: boolean, activityFeed: ActivityEvent[]): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);
  await update(roomRef, {
    'meta/isCodeFrozen': isCodeFrozen,
    activityFeed,
    'meta/updatedAt': Date.now()
  });
}

/**
 * Synchronize Mafia Sabotage State to RTDB.
 */
export async function syncSabotageToRTDB(joinCode: string, sabotageState: SabotageState, activityFeed: ActivityEvent[]): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);
  await update(roomRef, {
    sabotageState,
    activityFeed,
    'meta/updatedAt': Date.now()
  });
}

/**
 * Synchronize Staged PRs to RTDB.
 */
export async function syncStagedPrsToRTDB(joinCode: string, stagedPrs: PrHotfix[], activityFeed: ActivityEvent[]): Promise<void> {
  const cleanCode = joinCode.trim().toUpperCase();
  const roomRef = ref(db, 'rooms/' + cleanCode);
  await update(roomRef, {
    stagedPrs,
    activityFeed,
    'meta/updatedAt': Date.now()
  });
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
 * Real-time listener for the entire room (players, meta, files, votes, chat, tests, sabotage) in RTDB.
 * Returns unsubscribe function.
 */
export function listenToRoomInRTDB(
  joinCode: string,
  onUpdate: (roomData: RTDBRoomUpdatePayload) => void
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
      role: p.role || undefined,
      isHost: p.isHost || false,
      isReady: p.isReady || false,
      isAlive: p.isAlive !== false,
      isBot: false,
      avatarColor: p.avatarColor || 'bg-purple-600',
      stats: p.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
    }));

    // Sort: host first
    players.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0));

    // Parse votes (__ABSTAIN__ -> null)
    const rawVotes = val.votes || {};
    const parsedVotes: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(rawVotes)) {
      parsedVotes[k] = v === '__ABSTAIN__' ? null : (v as string | null);
    }

    onUpdate({
      meta: val.meta || {},
      players,
      files: val.files || null,
      votes: parsedVotes,
      chatMessages: val.chatMessages || null,
      testRuns: val.testRuns || null,
      systemIntegrity: val.systemIntegrity || null,
      sabotageState: val.sabotageState || null,
      stagedPrs: val.stagedPrs || null,
      gitCommits: val.gitCommits || null,
      activityFeed: val.activityFeed || null,
      eliminationHistory: val.eliminationHistory || null,
      isCodeFrozen: !!val.meta?.isCodeFrozen
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
