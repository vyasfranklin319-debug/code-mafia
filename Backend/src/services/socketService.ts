/**
 * CODE MAFIA — SOCKET.IO GAME STATE SERVICE
 * Handles rooms, reconnection, phase timers, voting, and chat.
 *
 * FIX: Complete rewrite of room join/state management to prevent player disconnect bug.
 * Each room state is stored in-memory (Map) and broadcast on every join/update.
 */

import http from 'http';
import { Server, Socket } from 'socket.io';
import {
  createGameSession,
  assignGameRoles,
  advanceGamePhase,
  processVoteElimination
} from './gameStateService.js';
import { executeCodeInSandbox } from './sandboxService.js';
import { dbSavePlayer, dbGetPlayers, dbGetGame } from './dbService.js';
import { redisCastVote, redisGetVotes, redisSetPhaseTimer } from './redisService.js';

// In-memory room state store (authoritative source for connected clients)
const roomStates = new Map<string, any>();
// Track socket -> roomId membership to prevent double-join
const socketRooms = new Map<string, string>();

function broadcastRoomUpdate(io: Server, roomCode: string) {
  const state = roomStates.get(roomCode);
  if (state) {
    io.to(`room:${roomCode}`).emit(`roomUpdate:${roomCode}`, state);
  }
}

export function setupSocketIO(server: http.Server): Server {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    // Increase ping timeouts to prevent false disconnects under load
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    let currentRoom: string | null = null;
    let currentPlayerId: string | null = null;

    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // ─── createRoom (host creates room) ────────────────────────────────────
    socket.on('createRoom', (data: { roomId: string; state: any }) => {
      const cleanCode = data.roomId.toUpperCase();

      // Leave any previous room first
      if (currentRoom && currentRoom !== cleanCode) {
        socket.leave(`room:${currentRoom}`);
      }

      currentRoom = cleanCode;
      socket.join(`room:${cleanCode}`);
      socketRooms.set(socket.id, cleanCode);

      // Store authoritative room state
      roomStates.set(cleanCode, data.state);

      console.log(`[Socket.IO] Room created: ${cleanCode} by socket ${socket.id}`);
      // Confirm to host
      socket.emit(`roomUpdate:${cleanCode}`, data.state);
    });

    // ─── joinRoom (players join / listeners subscribe) ───────────────────
    socket.on('joinRoom', (data: { roomId: string; player?: any }) => {
      const cleanCode = data.roomId.toUpperCase();

      // Leave any previous room first (prevents duplicate membership)
      if (currentRoom && currentRoom !== cleanCode) {
        socket.leave(`room:${currentRoom}`);
        socketRooms.delete(socket.id);
      }

      currentRoom = cleanCode;
      socket.join(`room:${cleanCode}`);
      socketRooms.set(socket.id, cleanCode);

      // If a player entry is provided, add them to room state
      if (data.player) {
        const state = roomStates.get(cleanCode);
        if (state) {
          const players: any[] = state.players || [];
          const exists = players.some(
            (p: any) => p.id === data.player.id || p.displayName === data.player.displayName
          );
          if (!exists) {
            players.push(data.player);
            state.players = players;
            state.meta = {
              ...state.meta,
              playersCount: players.length,
              updatedAt: Date.now()
            };
            roomStates.set(cleanCode, state);
          }
          // Broadcast updated state to ALL room members (including existing players)
          broadcastRoomUpdate(io, cleanCode);
        }
        // Also notify all members with a PLAYER_JOINED event
        socket.to(`room:${cleanCode}`).emit('multiplayerEvent', {
          event: 'PLAYER_JOINED',
          payload: { player: data.player }
        });
      }

      // Send current room state to the newly joined socket
      const currentState = roomStates.get(cleanCode);
      if (currentState) {
        socket.emit(`roomUpdate:${cleanCode}`, currentState);
      }

      console.log(`[Socket.IO] Socket ${socket.id} joined room ${cleanCode}`);
    });

    // ─── getRoom (fetch current state, returns via callback) ────────────
    socket.on('getRoom', (data: { roomId: string }, callback: (state: any) => void) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode) || null;
      if (typeof callback === 'function') callback(state);
    });

    // ─── syncSession (full state update) ────────────────────────────────
    socket.on('syncSession', (data: { roomId: string; session: any }) => {
      const cleanCode = data.roomId.toUpperCase();
      // Merge into existing state (don't overwrite players if the update has fewer)
      const existing = roomStates.get(cleanCode);
      if (existing && data.session) {
        const merged = { ...existing, ...data.session };
        // Preserve player count (never reduce via a partial sync)
        if (existing.players && data.session.players &&
            existing.players.length > data.session.players.length) {
          merged.players = existing.players;
        }
        roomStates.set(cleanCode, merged);
        broadcastRoomUpdate(io, cleanCode);
      } else if (data.session) {
        roomStates.set(cleanCode, data.session);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── updatePlayers ───────────────────────────────────────────────────
    socket.on('updatePlayers', (data: { roomId: string; players: any[] }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.players = data.players;
        state.meta = { ...state.meta, playersCount: data.players.length, updatedAt: Date.now() };
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── updatePlayerReady ───────────────────────────────────────────────
    socket.on('updatePlayerReady', (data: { roomId: string; playerId: string; isReady: boolean }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state && state.players) {
        state.players = state.players.map((p: any) =>
          p.id === data.playerId ? { ...p, isReady: data.isReady } : p
        );
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
        io.to(`room:${cleanCode}`).emit('PLAYER_READY_TOGGLED', {
          playerId: data.playerId,
          isReady: data.isReady
        });
      }
    });

    // ─── leaveRoom ───────────────────────────────────────────────────────
    socket.on('leaveRoom', (data: { roomId: string; playerId: string }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state && state.players) {
        state.players = state.players.filter((p: any) => p.id !== data.playerId);
        state.meta = { ...state.meta, playersCount: state.players.length, updatedAt: Date.now() };
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
      socket.leave(`room:${cleanCode}`);
      socketRooms.delete(socket.id);
      if (currentRoom === cleanCode) currentRoom = null;
    });

    // ─── setRoomPhase ────────────────────────────────────────────────────
    socket.on('setRoomPhase', (data: { roomId: string; phase: string; extraMeta?: any }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.meta = { ...state.meta, phase: data.phase, updatedAt: Date.now(), ...(data.extraMeta || {}) };
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── castVote ────────────────────────────────────────────────────────
    socket.on('castVote', (data: { roomId: string; voterId: string; targetId: string | null }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.votes = { ...(state.votes || {}), [data.voterId]: data.targetId };
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── clearVotes ──────────────────────────────────────────────────────
    socket.on('clearVotes', (data: { roomId: string }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.votes = {};
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── syncFiles ───────────────────────────────────────────────────────
    socket.on('syncFiles', (data: { roomId: string; files: any[] }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.files = data.files;
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── sendChat ────────────────────────────────────────────────────────
    socket.on('sendChat', (data: { roomId: string; messages: any[] }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.chatMessages = data.messages;
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── syncTestRun ─────────────────────────────────────────────────────
    socket.on('syncTestRun', (data: { roomId: string; testRuns: any[]; systemIntegrity: any; activityFeed: any[] }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.testRuns = data.testRuns;
        state.systemIntegrity = data.systemIntegrity;
        state.activityFeed = data.activityFeed;
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── setCodeFrozen ───────────────────────────────────────────────────
    socket.on('setCodeFrozen', (data: { roomId: string; isCodeFrozen: boolean; activityFeed: any[] }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.isCodeFrozen = data.isCodeFrozen;
        state.activityFeed = data.activityFeed;
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── syncSabotage ────────────────────────────────────────────────────
    socket.on('syncSabotage', (data: { roomId: string; sabotageState: any; activityFeed: any[] }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.sabotageState = data.sabotageState;
        state.activityFeed = data.activityFeed;
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── syncStagedPrs ───────────────────────────────────────────────────
    socket.on('syncStagedPrs', (data: { roomId: string; stagedPrs: any[]; activityFeed: any[] }) => {
      const cleanCode = data.roomId.toUpperCase();
      const state = roomStates.get(cleanCode);
      if (state) {
        state.stagedPrs = data.stagedPrs;
        state.activityFeed = data.activityFeed;
        roomStates.set(cleanCode, state);
        broadcastRoomUpdate(io, cleanCode);
      }
    });

    // ─── findGlobalOpenSession ───────────────────────────────────────────
    socket.on('findGlobalOpenSession', (_data: any, callback: (result: any) => void) => {
      for (const [code, state] of roomStates) {
        if (state?.meta?.phase === 'LOBBY' && (state?.players?.length || 0) < (state?.meta?.capacity || 6)) {
          if (typeof callback === 'function') {
            callback({
              joinCode: code,
              hostName: state.meta.hostName,
              playersCount: state.players?.length || 0,
              config: state.meta.config
            });
          }
          return;
        }
      }
      if (typeof callback === 'function') callback(null);
    });

    // ─── Generic multiplayer event passthrough ───────────────────────────
    socket.on('multiplayerEvent', (data: { roomId: string; event: string; payload: any }) => {
      const cleanCode = data.roomId?.toUpperCase();
      if (cleanCode) {
        socket.to(`room:${cleanCode}`).emit('multiplayerEvent', data);
      }
    });

    // ─── Legacy join_room (DB-backed game state) ─────────────────────────
    socket.on('join_room', async (data: { roomId: string; player: any }) => {
      const { roomId, player } = data;
      if (!roomId || !player) return;

      const cleanCode = roomId.toUpperCase();
      currentRoom = cleanCode;
      currentPlayerId = player.id;
      const roomKey = `room:${cleanCode}`;

      socket.join(roomKey);
      socketRooms.set(socket.id, cleanCode);

      try {
        await dbSavePlayer(cleanCode, {
          id: player.id,
          gameId: cleanCode,
          displayName: player.displayName,
          isHost: player.isHost || false,
          isReady: player.isReady || false,
          isAlive: player.isAlive !== false,
          avatarColor: player.avatarColor || 'bg-purple-600',
          stats: player.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
        });

        const players = await dbGetPlayers(cleanCode);
        const game = await dbGetGame(cleanCode);

        io.to(roomKey).emit('PLAYER_JOINED', { player, playersCount: players.length });
        socket.emit('ROOM_STATE', { game, players });
      } catch (err) {
        console.warn('[join_room] DB error:', err);
      }
    });

    // ─── Disconnect: Clean up room membership ────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} — reason: ${reason}`);

      const room = socketRooms.get(socket.id) || currentRoom;
      if (room) {
        socket.leave(`room:${room}`);
        socketRooms.delete(socket.id);
      }
    });
  });

  console.log('[Socket.IO] Game state & messaging channel mounted');
  return io;
}
