/**
 * CODE MAFIA — Durable Object: GameRoom
 * Authoritative room state management + real-time WebSocket broadcasting.
 * Fully compatible with both camelCase (realtimeSync.ts) and UPPERCASE events.
 */

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // ws -> { id, roomId, playerName, playerId }
    this.maxCapacity = 6;
    this.roomState = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const roomId = (url.pathname.split('/ws/room/')[1] || url.pathname.split('/api/v1/rooms/')[1])?.split('?')[0]?.split('/')[0] || 'default';
    const cleanRoomId = roomId.toUpperCase();
    const playerName = url.searchParams.get('name') || 'Anonymous';
    const playerId = url.searchParams.get('pid') || `p-${Date.now()}`;

    // ─── 1. Non-WebSocket HTTP Requests (CORS + State Query) ──────────────────
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      const requestOrigin = request.headers.get('Origin') || '';
      const allowedOrigins = [
        'https://codemafia-54284.web.app',
        'https://codemafia-54284.firebaseapp.com',
        'http://localhost:5173',
        'http://localhost:3000',
      ];
      const isAllowed = allowedOrigins.includes(requestOrigin) || (typeof requestOrigin === 'string' && requestOrigin.endsWith('.vercel.app'));
      const origin = isAllowed ? requestOrigin : allowedOrigins[0];

      const cors = {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Vary': 'Origin',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: cors });
      }

      if (url.searchParams.get('action') === 'getState' || url.pathname.endsWith('/state')) {
        return new Response(JSON.stringify(this.roomState || null), {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Expected WebSocket upgrade' }), {
        status: 426,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // ─── 2. WebSocket Upgrade ────────────────────────────────────────────────
    // Allow re-connecting players without blocking on capacity
    const alreadyInRoom = Array.from(this.sessions.values()).some(s => s.playerId === playerId);
    if (!alreadyInRoom && this.sessions.size >= this.maxCapacity) {
      return new Response('ROOM_FULL', { status: 403 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept WebSocket with Cloudflare Hibernation API
    this.state.acceptWebSocket(server, [playerId]);

    const sessionId = `ws-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
    this.sessions.set(server, { id: sessionId, roomId: cleanRoomId, playerName, playerId });

    // Send immediate confirmation + current room state to newly connected client
    server.send(JSON.stringify({
      event: 'WS_CONNECTED',
      payload: {
        sessionId,
        roomId: cleanRoomId,
        onlineCount: this.sessions.size,
        maxCapacity: this.maxCapacity,
        roomState: this.roomState,
        roster: this._getRoster(),
      },
    }));

    // Notify other players that someone connected
    this._broadcast(server, {
      event: 'PLAYER_CONNECTED',
      payload: {
        player: { id: playerId, displayName: playerName, name: playerName },
        onlineCount: this.sessions.size,
      },
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    try {
      const data = typeof message === 'string' ? JSON.parse(message) : JSON.parse(new TextDecoder().decode(message));
      if (!data || !data.event) return;

      const event = data.event;
      const payload = data.payload || {};
      const session = this.sessions.get(ws);
      const roomId = session?.roomId || payload.roomId || 'DEFAULT';
      const cleanRoomId = roomId.toUpperCase();

      switch (event) {
        case 'PING':
          ws.send(JSON.stringify({ event: 'PONG', payload: { ts: Date.now() } }));
          break;

        case 'createRoom':
        case 'CREATE_ROOM': {
          const state = payload.state || payload;
          this.roomState = state;
          console.log(`[DO:GameRoom] Room created: ${cleanRoomId}`);
          ws.send(JSON.stringify({ event: 'ROOM_CREATED', payload: { roomState: this.roomState } }));
          this._broadcastAllRoomState(cleanRoomId);
          break;
        }

        case 'joinRoom':
        case 'JOIN_ROOM': {
          const player = payload.player;
          if (player) {
            if (!this.roomState) {
              this.roomState = {
                meta: { id: cleanRoomId, joinCode: cleanRoomId, phase: 'LOBBY', playersCount: 1, updatedAt: Date.now() },
                players: [player],
                votes: {},
                chatMessages: [],
                testRuns: [],
                files: [],
                systemIntegrity: { score: 100, pipelineStatus: 'STAGING', buildDurationMs: 850, lastUpdated: '' },
                sabotageState: null,
                stagedPrs: [],
                gitCommits: [],
                activityFeed: []
              };
            } else {
              const players = this.roomState.players || [];
              const idx = players.findIndex(p => p.id === player.id || p.displayName === player.displayName);
              if (idx >= 0) {
                players[idx] = { ...players[idx], ...player };
              } else {
                players.push(player);
              }
              this.roomState = {
                ...this.roomState,
                players,
                meta: {
                  ...(this.roomState.meta || {}),
                  playersCount: players.length,
                  updatedAt: Date.now()
                }
              };
            }

            console.log(`[DO:GameRoom] Player "${player.displayName}" joined room ${cleanRoomId}. Total: ${this.roomState.players.length}`);
            this._broadcastAllRoomState(cleanRoomId);
            this._broadcast(ws, {
              event: 'multiplayerEvent',
              payload: { event: 'PLAYER_JOINED', payload: { player } }
            });
            this._broadcast(ws, {
              event: 'PLAYER_JOINED',
              payload: { player }
            });
          } else if (this.roomState) {
            ws.send(JSON.stringify({ event: 'ROOM_STATE', payload: { roomState: this.roomState } }));
            ws.send(JSON.stringify({ event: `roomUpdate:${cleanRoomId}`, payload: this.roomState }));
          }
          break;
        }

        case 'getRoom': {
          ws.send(JSON.stringify({ event: 'ROOM_STATE', payload: { roomState: this.roomState } }));
          ws.send(JSON.stringify({ event: `roomUpdate:${cleanRoomId}`, payload: this.roomState }));
          break;
        }

        case 'syncSession':
        case 'SYNC_STATE': {
          const incoming = payload.session || payload.state;
          if (incoming) {
            // Protect player list from dropping players unintentionally
            if (this.roomState?.players && incoming.players && this.roomState.players.length > incoming.players.length) {
              incoming.players = this.roomState.players;
            }
            this.roomState = { ...(this.roomState || {}), ...incoming };
            this._broadcastAllRoomState(cleanRoomId);
          }
          break;
        }

        case 'updatePlayers':
        case 'UPDATE_PLAYERS': {
          if (this.roomState && Array.isArray(payload.players)) {
            this.roomState.players = payload.players;
            this.roomState.meta = {
              ...(this.roomState.meta || {}),
              playersCount: payload.players.length,
              updatedAt: Date.now()
            };
            this._broadcastAllRoomState(cleanRoomId);
          }
          break;
        }

        case 'updatePlayerReady':
        case 'PLAYER_READY': {
          if (this.roomState?.players && payload.playerId !== undefined) {
            this.roomState.players = this.roomState.players.map(p =>
              p.id === payload.playerId ? { ...p, isReady: payload.isReady } : p
            );
            this._broadcastAllRoomState(cleanRoomId);
            this._broadcastAll({
              event: 'PLAYER_READY_TOGGLED',
              payload: { playerId: payload.playerId, isReady: payload.isReady }
            });
          }
          break;
        }

        case 'setRoomPhase':
        case 'SET_PHASE': {
          if (this.roomState) {
            this.roomState.meta = {
              ...(this.roomState.meta || {}),
              phase: payload.phase,
              updatedAt: Date.now(),
              ...(payload.extraMeta || {})
            };
            this._broadcastAllRoomState(cleanRoomId);
            this._broadcastAll({
              event: 'PHASE_ADVANCED',
              payload: { phase: payload.phase, session: this.roomState }
            });
          }
          break;
        }

        case 'castVote':
        case 'CAST_VOTE': {
          if (this.roomState && payload.voterId !== undefined) {
            this.roomState.votes = {
              ...(this.roomState.votes || {}),
              [payload.voterId]: payload.targetId
            };
            this._broadcastAllRoomState(cleanRoomId);
            this._broadcastAll({
              event: 'VOTE_REGISTERED',
              payload: { voterId: payload.voterId, targetId: payload.targetId }
            });
          }
          break;
        }

        case 'clearVotes': {
          if (this.roomState) {
            this.roomState.votes = {};
            this._broadcastAllRoomState(cleanRoomId);
          }
          break;
        }

        case 'syncFiles':
        case 'SYNC_FILES': {
          if (this.roomState && payload.files) {
            this.roomState.files = payload.files;
            this._broadcastAllRoomState(cleanRoomId);
          }
          break;
        }

        case 'sendChat':
        case 'SEND_CHAT': {
          if (this.roomState && payload.messages) {
            this.roomState.chatMessages = payload.messages;
            this._broadcastAllRoomState(cleanRoomId);
            const lastMsg = payload.messages[payload.messages.length - 1];
            if (lastMsg) {
              this._broadcastAll({ event: 'CHAT_RECEIVED', payload: { message: lastMsg } });
            }
          }
          break;
        }

        case 'syncTestRun': {
          if (this.roomState) {
            if (payload.testRuns) this.roomState.testRuns = payload.testRuns;
            if (payload.systemIntegrity) this.roomState.systemIntegrity = payload.systemIntegrity;
            if (payload.activityFeed) this.roomState.activityFeed = payload.activityFeed;
            this._broadcastAllRoomState(cleanRoomId);
          }
          break;
        }

        case 'setCodeFrozen': {
          if (this.roomState) {
            this.roomState.isCodeFrozen = payload.isCodeFrozen;
            if (payload.activityFeed) this.roomState.activityFeed = payload.activityFeed;
            this._broadcastAllRoomState(cleanRoomId);
            this._broadcastAll({
              event: 'CODE_FREEZE_TOGGLED',
              payload: { isCodeFrozen: payload.isCodeFrozen }
            });
          }
          break;
        }

        case 'syncSabotage': {
          if (this.roomState) {
            this.roomState.sabotageState = payload.sabotageState;
            if (payload.activityFeed) this.roomState.activityFeed = payload.activityFeed;
            this._broadcastAllRoomState(cleanRoomId);
          }
          break;
        }

        case 'syncStagedPrs': {
          if (this.roomState) {
            this.roomState.stagedPrs = payload.stagedPrs;
            if (payload.activityFeed) this.roomState.activityFeed = payload.activityFeed;
            this._broadcastAllRoomState(cleanRoomId);
          }
          break;
        }

        case 'leaveRoom':
        case 'LEAVE_ROOM': {
          if (this.roomState?.players && payload.playerId) {
            this.roomState.players = this.roomState.players.filter(p => p.id !== payload.playerId);
            this.roomState.meta = {
              ...(this.roomState.meta || {}),
              playersCount: this.roomState.players.length,
              updatedAt: Date.now()
            };
            this._broadcastAllRoomState(cleanRoomId);
            this._broadcastAll({ event: 'PLAYER_LEFT', payload: { playerId: payload.playerId } });
          }
          break;
        }

        case 'multiplayerEvent': {
          this._broadcast(ws, {
            event: 'multiplayerEvent',
            payload: { event: payload.event, payload: payload.payload }
          });
          if (payload.event) {
            this._broadcast(ws, { event: payload.event, payload: payload.payload });
          }
          break;
        }

        default:
          // Forward unknown events
          this._broadcast(ws, data);
          break;
      }
    } catch (e) {
      console.error('[DO:GameRoom] webSocketMessage error:', e.message);
    }
  }

  async webSocketClose(ws, code, reason) {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);

    if (session) {
      console.log(`[DO:GameRoom] WebSocket closed: ${session.playerName} (${session.playerId})`);
      this._broadcast(null, {
        event: 'PLAYER_DISCONNECTED',
        payload: {
          playerId: session.playerId,
          playerName: session.playerName,
          onlineCount: this.sessions.size,
        },
      });
    }
  }

  async webSocketError(ws, error) {
    this.sessions.delete(ws);
  }

  _getRoster() {
    return Array.from(this.sessions.values()).map(s => ({ id: s.playerId, name: s.playerName }));
  }

  _broadcastAllRoomState(cleanRoomId) {
    if (!this.roomState) return;
    const msg1 = JSON.stringify({ event: 'ROOM_UPDATED', payload: { roomState: this.roomState } });
    const msg2 = JSON.stringify({ event: `roomUpdate:${cleanRoomId}`, payload: this.roomState });

    for (const [ws] of this.sessions) {
      try {
        ws.send(msg1);
        ws.send(msg2);
      } catch (e) {
        this.sessions.delete(ws);
      }
    }
  }

  _broadcast(sender, data) {
    const message = JSON.stringify(data);
    for (const [ws] of this.sessions) {
      if (ws !== sender) {
        try { ws.send(message); } catch (e) { this.sessions.delete(ws); }
      }
    }
  }

  _broadcastAll(data) {
    const message = JSON.stringify(data);
    for (const [ws] of this.sessions) {
      try { ws.send(message); } catch (e) { this.sessions.delete(ws); }
    }
  }
}
