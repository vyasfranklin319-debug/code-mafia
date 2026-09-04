/**
 * CODE MAFIA — Cloudflare Native WebSocket Adapter
 *
 * Provides a Socket.IO-compatible interface (emit/on/off/connect/disconnect)
 * using raw WebSockets connecting to Cloudflare Durable Objects.
 *
 * Used in PRODUCTION (codemafia-54284.web.app).
 * Local dev uses Socket.IO (realtimeSync.ts → localhost:3001).
 */

const CF_WS_BASE = 'wss://code-mafia-api.codemafia.workers.dev';
const CF_HTTP_BASE = 'https://code-mafia-api.codemafia.workers.dev';
const CF_PING_INTERVAL = 20000; // 20s keepalive ping to prevent idle disconnect

type EventHandler = (...args: any[]) => void;

class CloudflareSocket {
  private ws: WebSocket | null = null;
  private currentRoomId: string | null = null;
  private playerId: string = `usr-${Date.now()}`;
  private playerName: string = 'Operative';
  private handlers = new Map<string, Set<EventHandler>>();
  private queuedMessages: Array<{ event: string; payload: any }> = [];
  private pendingGetRoomCallbacks = new Map<string, (state: any) => void>();
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 15000;
  private shouldReconnect = true;
  private isConnecting = false;

  public connected = false;
  public id = `cf-${Date.now()}`;

  constructor() {
    // Attempt to load stored user credentials if available (sessionStorage first for tab isolation)
    if (typeof window !== 'undefined') {
      const storedId = sessionStorage.getItem('code_mafia_user_id') || localStorage.getItem('code_mafia_user_id');
      const storedName = localStorage.getItem('code_mafia_active_user');
      if (storedId) this.playerId = storedId;
      if (storedName) this.playerName = storedName;
    }
  }

  // ── Public Socket.IO-compatible API ───────────────────────────────────────

  on(event: string, handler: EventHandler): this {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler: EventHandler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, ...args: any[]): this {
    const payload = args[0] || {};
    const callback = typeof args[args.length - 1] === 'function' ? args[args.length - 1] : null;

    // Extract room id from payload if available
    const targetRoom = (payload.roomId || payload.joinCode || (payload.session && (payload.session.joinCode || payload.session.id)))?.toUpperCase();
    if (targetRoom && targetRoom !== this.currentRoomId) {
      this.currentRoomId = targetRoom;
      if (payload.player) {
        this.playerId = payload.player.id || this.playerId;
        this.playerName = payload.player.displayName || this.playerName;
      }
      this._connectToRoom(this.currentRoomId);
    }

    // Special: getRoom with callback (fetch authoritative state via fast HTTP + WS fallback)
    if (event === 'getRoom' && callback) {
      const queryRoom = targetRoom || this.currentRoomId || 'DEFAULT';
      let called = false;
      const safeCallback = (state: any) => {
        if (!called && state) {
          called = true;
          this.pendingGetRoomCallbacks.delete(queryRoom);
          try { callback(state); } catch (e) {}
        }
      };

      this.pendingGetRoomCallbacks.set(queryRoom, safeCallback);

      // 1. Fast HTTP probe
      this._fetchRoomStateWithTimeout(queryRoom, 2500).then(state => {
        if (state) safeCallback(state);
      });

      // 2. WS message
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'getRoom', payload: { roomId: queryRoom } }));
      } else {
        this.queuedMessages.push({ event: 'getRoom', payload: { roomId: queryRoom } });
        if (!this.isConnecting) {
          this._connectToRoom(queryRoom);
        }
      }

      // 3. Fallback timeout to complete callback
      setTimeout(() => {
        if (!called) {
          called = true;
          this.pendingGetRoomCallbacks.delete(queryRoom);
          try { callback(null); } catch (e) {}
        }
      }, 2500);

      return this;
    }

    // If socket is open, send immediately
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ event, payload }));
      } catch (err) {
        console.warn('[CF-WS] Send error, queuing message:', event);
        this.queuedMessages.push({ event, payload });
      }
    } else {
      // Queue message until WebSocket connects
      console.log(`[CF-WS] Socket not open yet (state: ${this.ws?.readyState}), queuing: ${event}`);
      this.queuedMessages.push({ event, payload });
      if (this.currentRoomId && !this.isConnecting) {
        this._connectToRoom(this.currentRoomId);
      }
    }

    return this;
  }

  connect(): this {
    this.shouldReconnect = true;
    if (this.currentRoomId && (!this.ws || this.ws.readyState === WebSocket.CLOSED)) {
      this._connectToRoom(this.currentRoomId);
    }
    return this;
  }

  disconnect(): this {
    this.shouldReconnect = false;
    this._cleanup();
    return this;
  }

  // ── Explicit Room Connection Helper ───────────────────────────────────────

  setRoom(roomId: string, playerId?: string, playerName?: string) {
    const cleanCode = roomId.trim().toUpperCase();
    if (playerId) this.playerId = playerId;
    if (playerName) this.playerName = playerName;

    if (this.currentRoomId !== cleanCode || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.currentRoomId = cleanCode;
      this._connectToRoom(cleanCode);
    }
  }

  // ── Internal Connection Management ────────────────────────────────────────

  private _connectToRoom(roomId: string) {
    if (!roomId) return;
    this._cleanup();

    this.isConnecting = true;
    const encodedName = encodeURIComponent(this.playerName || 'Operative');
    const encodedPid = encodeURIComponent(this.playerId || `usr-${Date.now()}`);
    const url = `${CF_WS_BASE}/ws/room/${roomId}?name=${encodedName}&pid=${encodedPid}`;

    console.log(`[CF-WS] Connecting to Durable Object: ${url}`);

    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.error('[CF-WS] WebSocket constructor error:', e);
      this.isConnecting = false;
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log(`[CF-WS] Successfully connected to room: ${roomId}`);
      this.connected = true;
      this.isConnecting = false;
      this.reconnectDelay = 1000;
      this._startPing();
      this._fire('connect');

      // Flush queued messages
      if (this.queuedMessages.length > 0) {
        console.log(`[CF-WS] Flushing ${this.queuedMessages.length} queued messages`);
        const queue = [...this.queuedMessages];
        this.queuedMessages = [];
        for (const msg of queue) {
          try {
            this.ws?.send(JSON.stringify(msg));
          } catch (e) {
            console.error('[CF-WS] Error sending queued message:', e);
          }
        }
      }
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        const { event, payload } = msg;

        if (event === 'PONG') return; // internal heartbeat response

        // 1. Authoritative Room State Broadcasts
        if (event === 'WS_CONNECTED' || event === 'ROOM_STATE' || event === 'ROOM_UPDATED') {
          const roomState = payload?.roomState || payload;
          if (roomState && this.currentRoomId) {
            const cb = this.pendingGetRoomCallbacks.get(this.currentRoomId);
            if (cb) {
              cb(roomState);
            }
            this._fire(`roomUpdate:${this.currentRoomId}`, roomState);
          }
          if (event === 'WS_CONNECTED') {
            this._fire('cf:connected', payload);
          }
          return;
        }

        // 2. Exact room update event e.g. "roomUpdate:GKR76K"
        if (event.startsWith('roomUpdate:')) {
          const roomId = event.replace('roomUpdate:', '');
          const cb = this.pendingGetRoomCallbacks.get(roomId);
          if (cb) {
            cb(payload);
          }
          this._fire(event, payload);
          return;
        }

        // 3. Multiplayer join/leave events
        if (event === 'PLAYER_CONNECTED' || event === 'PLAYER_JOINED') {
          this._fire('multiplayerEvent', { event: 'PLAYER_JOINED', payload });
          this._fire('PLAYER_JOINED', payload);
          return;
        }

        if (event === 'PLAYER_DISCONNECTED' || event === 'PLAYER_LEFT') {
          this._fire('multiplayerEvent', { event: 'PLAYER_LEFT', payload });
          this._fire('PLAYER_LEFT', payload);
          return;
        }

        // 4. Custom events (PLAYER_READY_TOGGLED, CODE_FREEZE_TOGGLED, etc.)
        this._fire(event, payload);
        this._fire('multiplayerEvent', { event, payload });
      } catch (e) {
        console.warn('[CF-WS] Failed to parse message:', evt.data);
      }
    };

    this.ws.onclose = (evt) => {
      console.warn(`[CF-WS] Disconnected (code: ${evt.code}, reason: ${evt.reason || 'closed'})`);
      this.connected = false;
      this.isConnecting = false;
      this._fire('disconnect', evt.reason || 'transport close');
      if (this.shouldReconnect && this.currentRoomId) {
        this._scheduleReconnect();
      }
    };

    this.ws.onerror = (err) => {
      console.error('[CF-WS] WebSocket error:', err);
      this.isConnecting = false;
      this._fire('connect_error', err);
    };
  }

  private _startPing() {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'PING' }));
      }
    }, CF_PING_INTERVAL);
  }

  private _stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private _scheduleReconnect() {
    if (this.reconnectTimer) return;
    console.log(`[CF-WS] Reconnecting in ${this.reconnectDelay}ms...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect && this.currentRoomId) {
        this._connectToRoom(this.currentRoomId);
      }
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, this.maxReconnectDelay);
  }

  private _cleanup() {
    this._stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.connected = false;
    this.isConnecting = false;
  }

  private _fire(event: string, ...args: any[]) {
    this.handlers.get(event)?.forEach(h => {
      try { h(...args); } catch (e) {
        console.error(`[CF-WS] Error in handler for event "${event}":`, e);
      }
    });
  }

  private async _fetchRoomStateWithTimeout(roomId: string, timeoutMs = 2000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const url = `${CF_HTTP_BASE}/ws/room/${roomId.toUpperCase()}?action=getState`;
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return data;
      }
    } catch (e) {
      // Aborted or fetch failed
    } finally {
      clearTimeout(timeoutId);
    }
    return null;
  }
}

// Global Singleton Instance
let cfSocketInstance: CloudflareSocket | null = null;

export function getCFSocket(): CloudflareSocket {
  if (!cfSocketInstance) {
    cfSocketInstance = new CloudflareSocket();
  }
  return cfSocketInstance;
}

export { CloudflareSocket };
