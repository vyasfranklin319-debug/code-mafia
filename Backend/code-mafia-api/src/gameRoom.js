/**
 * CODE MAFIA — Durable Object: GameRoom
 * Handles WebSocket connections for real-time multiplayer rooms on Cloudflare Workers
 */

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map(); // ws -> { id, roomId, playerName }
    this.maxCapacity = 6;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const roomId = url.pathname.split('/ws/room/')[1]?.split('?')[0] || 'default';
    const playerName = url.searchParams.get('name') || 'Anonymous';

    // Check capacity
    if (this.sessions.size >= this.maxCapacity) {
      return new Response('ROOM_FULL: Maximum capacity reached', { status: 403 });
    }

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket
    this.state.acceptWebSocket(server);

    const sessionId = `ws-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.sessions.set(server, { id: sessionId, roomId, playerName });

    const getRoster = () => Array.from(this.sessions.values()).map(s => ({ id: s.id, name: s.playerName }));

    // Send connected message with roster
    server.send(JSON.stringify({
      event: 'WS_CONNECTED',
      payload: {
        roomId,
        onlineCount: this.sessions.size,
        maxCapacity: this.maxCapacity,
        roster: getRoster(),
      },
    }));

    // Broadcast player join to all others
    this.broadcast(server, {
      event: 'PLAYER_JOINED',
      payload: {
        player: { id: sessionId, name: playerName },
        onlineCount: this.sessions.size,
        maxCapacity: this.maxCapacity,
      },
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      if (data && data.event === 'PING') {
        ws.send(JSON.stringify({ event: 'PONG', payload: { timestamp: Date.now() } }));
        return;
      }
      // Broadcast to all other clients in the room
      this.broadcast(ws, data);
    } catch (e) {
      // Ignore invalid messages
    }
  }

  async webSocketClose(ws, code, reason) {
    const session = this.sessions.get(ws);
    this.sessions.delete(ws);

    if (session) {
      this.broadcast(null, {
        event: 'PLAYER_LEFT',
        payload: {
          playerId: session.id,
          onlineCount: this.sessions.size,
          maxCapacity: this.maxCapacity,
        },
      });
    }
  }

  async webSocketError(ws, error) {
    this.sessions.delete(ws);
  }

  broadcast(sender, data) {
    const message = typeof data === 'string' ? data : JSON.stringify(data);
    for (const [ws] of this.sessions) {
      if (ws !== sender) {
        try {
          ws.send(message);
        } catch (e) {
          // Client disconnected
          this.sessions.delete(ws);
        }
      }
    }
  }
}
