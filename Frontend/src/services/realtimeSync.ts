/**
 * CODE MAFIA — SOCKET.IO MULTIPLAYER ENGINE
 *
 * Provides real-time synchronization with:
 * - Socket.IO backend for game state, chat, votes, timers
 * - Yjs CRDT for collaborative code editing (handled separately)
 */

import { io, Socket } from 'socket.io-client';
import { getCFSocket, CloudflareSocket } from './cloudflareSocket';
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

// Environment detection
export const isProduction = typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

// Determine backend URL
const getBackendUrl = () => {
  if (!isProduction) {
    return (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';
  }
  return 'https://code-mafia-api.codemafia.workers.dev';
};

const BACKEND_URL = getBackendUrl();
let socketIoInstance: Socket | null = null;
let currentJoinCode: string | null = null;

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

export function initSocketConnection(): Socket | CloudflareSocket | any {
  if (isProduction) {
    // Production (codemafia-54284.web.app): Native WebSockets via Cloudflare Durable Objects
    return getCFSocket();
  }

  // Local Development: Socket.IO Server on Node.js port 3001
  if (!socketIoInstance) {
    socketIoInstance = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketIoInstance.on('connect', () => {
      console.log('[Socket.IO] Connected to local backend:', socketIoInstance?.id);
      if (currentJoinCode) {
        socketIoInstance?.emit('joinRoom', { roomId: currentJoinCode });
      }
    });

    socketIoInstance.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected:', reason);
    });

    socketIoInstance.on('connect_error', (err) => {
      console.error('[Socket.IO] Connection Error:', err.message);
    });
  }
  return socketIoInstance;
}

/**
 * Initialize / save room state when host creates the match.
 */
export async function saveRoomToRTDB(session: GameSession): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = (session.joinCode || session.id).trim().toUpperCase();
  currentJoinCode = cleanCode;
  
  const hostPlayer = session.players.find(p => p.isHost) || session.players[0];

  if (isProduction && (s as any).setRoom) {
    (s as any).setRoom(cleanCode, hostPlayer?.id, hostPlayer?.displayName);
  }

  const payload: RTDBRoomUpdatePayload = {
    meta: {
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
    },
    players: session.players.map(p => ({
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
    })),
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
  };

  s.emit('createRoom', { roomId: cleanCode, state: payload });
  console.log('[RealtimeSync] Room created:', cleanCode);
}

/**
 * Write joining player's presence to the room.
 */
export async function joinRoomInRTDB(joinCode: string, player: Player): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  currentJoinCode = cleanCode;

  if (isProduction && (s as any).setRoom) {
    (s as any).setRoom(cleanCode, player.id, player.displayName);
  }

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

  s.emit('joinRoom', { roomId: cleanCode, player: entry });
  console.log('[RealtimeSync] Player "' + player.displayName + '" joined room ' + cleanCode);
}

/**
 * Update full player roster (for role assignments and elimination outcomes).
 */
export async function updatePlayersInRTDB(joinCode: string, players: Player[]): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('updatePlayers', { roomId: cleanCode, players });
}

/**
 * Fetch a room by join code or ID.
 */
export async function getRoomFromRTDB(pinOrCode: string): Promise<RTDBRoomUpdatePayload | null> {
  if (!pinOrCode) return null;
  const s = initSocketConnection();
  const cleanCode = pinOrCode.trim().toUpperCase();

  if (isProduction && (s as any).setRoom) {
    (s as any).setRoom(cleanCode);
  }

  return new Promise((resolve) => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, 2500);

    s.emit('getRoom', { roomId: cleanCode }, (response: RTDBRoomUpdatePayload | null) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(response);
      }
    });
  });
}

/**
 * Toggle a player's ready state.
 */
export async function updatePlayerReadyInRTDB(joinCode: string, playerId: string, isReady: boolean): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('updatePlayerReady', { roomId: cleanCode, playerId, isReady });
}

/**
 * Remove player from room (intentional exit).
 */
export async function leaveRoomInRTDB(joinCode: string, playerId: string): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('leaveRoom', { roomId: cleanCode, playerId });
  currentJoinCode = null;
}

/**
 * Update the game phase (e.g. LOBBY -> ROLE_REVEAL -> WORK_ROUND).
 */
export async function setRoomPhaseInRTDB(joinCode: string, phase: string, extraMeta?: Record<string, any>): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('setRoomPhase', { roomId: cleanCode, phase, extraMeta });
}

/**
 * Sync in-game session updates to Socket.IO.
 */
export async function syncSessionToRTDB(session: GameSession): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = (session.joinCode || session.id).trim().toUpperCase();
  s.emit('syncSession', { roomId: cleanCode, session });
}

/**
 * Cast or change a player's vote.
 */
export async function castVoteInRTDB(joinCode: string, voterId: string, targetId: string | null): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('castVote', { roomId: cleanCode, voterId, targetId });
}

/**
 * Reset / clear all votes for a new voting round.
 */
export async function clearVotesInRTDB(joinCode: string): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('clearVotes', { roomId: cleanCode });
}

/**
 * Push updated codebase files to Socket.IO.
 */
export async function syncFilesToRTDB(joinCode: string, files: ContentFile[]): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('syncFiles', { roomId: cleanCode, files });
}

/**
 * Push a new chat message.
 */
export async function sendChatToRTDB(joinCode: string, message: ChatMessage, allMessages: ChatMessage[]): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('sendChat', { roomId: cleanCode, messages: allMessages });
}

/**
 * Synchronize Test Run and System Integrity Score.
 */
export async function syncTestRunToRTDB(joinCode: string, testRuns: TestRunResult[], systemIntegrity: SystemIntegrity, activityFeed: ActivityEvent[]): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('syncTestRun', { roomId: cleanCode, testRuns, systemIntegrity, activityFeed });
}

/**
 * Synchronize Emergency Code Freeze status.
 */
export async function setCodeFrozenInRTDB(joinCode: string, isCodeFrozen: boolean, activityFeed: ActivityEvent[]): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('setCodeFrozen', { roomId: cleanCode, isCodeFrozen, activityFeed });
}

/**
 * Synchronize Mafia Sabotage State.
 */
export async function syncSabotageToRTDB(joinCode: string, sabotageState: SabotageState, activityFeed: ActivityEvent[]): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('syncSabotage', { roomId: cleanCode, sabotageState, activityFeed });
}

/**
 * Synchronize Staged PRs.
 */
export async function syncStagedPrsToRTDB(joinCode: string, stagedPrs: PrHotfix[], activityFeed: ActivityEvent[]): Promise<void> {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();
  s.emit('syncStagedPrs', { roomId: cleanCode, stagedPrs, activityFeed });
}

/**
 * Scan all rooms for an open LOBBY session (Quick Match).
 */
export async function findGlobalOpenSessionFromRTDB(): Promise<{ joinCode: string; hostName: string; playersCount: number; config: any } | null> {
  const s = initSocketConnection();
  return new Promise((resolve) => {
    s.emit('findGlobalOpenSession', {}, (response: any) => {
      resolve(response);
    });
  });
}

/**
 * Real-time listener for the entire room.
 * Returns unsubscribe function.
 */
export function listenToRoomInRTDB(
  joinCode: string,
  onUpdate: (roomData: RTDBRoomUpdatePayload) => void
): () => void {
  const s = initSocketConnection();
  const cleanCode = joinCode.trim().toUpperCase();

  if (isProduction && (s as any).setRoom) {
    (s as any).setRoom(cleanCode);
  }
  
  const handler = (roomData: RTDBRoomUpdatePayload) => {
    onUpdate(roomData);
  };
  
  s.on(`roomUpdate:${cleanCode}`, handler);
  
  // Request current room state immediately (read-only, no side effects)
  s.emit('getRoom', { roomId: cleanCode }, (state: RTDBRoomUpdatePayload | null) => {
    if (state) onUpdate(state);
  });
  
  return () => {
    s.off(`roomUpdate:${cleanCode}`, handler);
  };
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
