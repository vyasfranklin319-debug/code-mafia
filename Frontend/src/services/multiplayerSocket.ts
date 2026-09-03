/**
 * HIGH-PERFORMANCE MULTIPLAYER WEBSOCKET ENGINE
 * Automatic Reconnection, Keepalive Heartbeat, & Multi-tab Sync
 */

let broadcastChannel: BroadcastChannel | null = null;
let webSocket: WebSocket | null = null;
let eventSource: EventSource | null = null;
let heartbeatInterval: any = null;
let reconnectTimer: any = null;
let currentRoomId: string | null = null;
let currentOnEvent: ((event: string, data: any) => void) | null = null;

const getHostUrls = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const httpProto = isHttps ? 'https:' : 'http:';
  const wsProto = isHttps ? 'wss:' : 'ws:';

  const httpUrl = (import.meta as any).env?.VITE_BACKEND_URL || (import.meta as any).env?.VITE_API_BASE_URL || `${httpProto}//${host}:3001`;
  const wsUrl = (import.meta as any).env?.VITE_WS_URL || `${wsProto}//${host}:3001`;

  return { httpUrl, wsUrl };
};

export function initSocketConnection(roomId: string, player: any, onEvent: (event: string, data: any) => void) {
  currentRoomId = roomId;
  currentOnEvent = onEvent;
  const { httpUrl, wsUrl } = getHostUrls();

  // 1. Setup local BroadcastChannel for zero-latency multi-tab sync
  if ('BroadcastChannel' in window) {
    try {
      if (broadcastChannel) broadcastChannel.close();
      broadcastChannel = new BroadcastChannel(`code-mafia-${roomId}`);
      broadcastChannel.onmessage = (msg) => {
        if (msg.data && msg.data.event) {
          onEvent(msg.data.event, msg.data.payload);
        }
      };
    } catch (e) {
      console.warn('[BroadcastChannel] Warning:', e);
    }
  }

  // 2. Connect via Resilient Native WebSocket Stream
  connectWebSocket(wsUrl, roomId, onEvent);

  // 3. Fallback: SSE only if on local HTTP dev server (not Cloudflare Workers)
  if (httpUrl.includes('localhost') || httpUrl.includes('127.0.0.1')) {
    try {
      if (eventSource) eventSource.close();
      const fullSseUrl = `${httpUrl}/api/v1/events/${roomId}`;
      eventSource = new EventSource(fullSseUrl);
      eventSource.onmessage = (msg) => {
        try {
          const { event, payload } = JSON.parse(msg.data);
          if (event && event !== 'CONNECTED') {
            onEvent(event, payload);
          }
        } catch (e) {}
      };
    } catch (err) {}
  }
}

function connectWebSocket(wsUrl: string, roomId: string, onEvent: (event: string, data: any) => void) {
  try {
    if (webSocket) {
      webSocket.close();
      webSocket = null;
    }

    const fullWsUrl = `${wsUrl}/ws/room/${roomId}`;
    webSocket = new WebSocket(fullWsUrl);

    webSocket.onopen = () => {
      console.log(`[WebSocket Stream] Connected to room ${roomId} at ${fullWsUrl}`);
      
      // Start 15s Heartbeat Ping to prevent Cloudflare/Proxy timeout
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (webSocket && webSocket.readyState === WebSocket.OPEN) {
          webSocket.send(JSON.stringify({ event: 'PING', payload: { timestamp: Date.now() } }));
        }
      }, 15000);
    };

    webSocket.onmessage = (evt) => {
      try {
        const { event, payload } = JSON.parse(evt.data);
        if (event && event !== 'WS_CONNECTED' && event !== 'PONG') {
          onEvent(event, payload);
        }
      } catch (e) {}
    };

    webSocket.onclose = () => {
      console.log('[WebSocket Stream] Connection closed. Auto-reconnecting in 2s...');
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      
      // Auto-reconnect if still in room
      if (currentRoomId === roomId && currentOnEvent) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => {
          connectWebSocket(wsUrl, roomId, onEvent);
        }, 2000);
      }
    };

    webSocket.onerror = () => {
      console.warn('[WebSocket Stream] Transport error encountered.');
    };
  } catch (e) {
    console.warn('[WebSocket Stream] Exception during connection:', e);
  }
}

export function emitMultiplayerEvent(event: string, payload: any) {
  const { httpUrl } = getHostUrls();

  // 1. Broadcast to local tabs instantly
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ event, payload });
    } catch (e) {}
  }

  // 2. Send via WebSocket if open
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    try {
      webSocket.send(JSON.stringify({ event, payload }));
      return;
    } catch (e) {}
  }

  // 3. HTTP POST broadcast fallback
  const roomId = payload.roomId || (payload.sessionData && payload.sessionData.id) || currentRoomId;
  if (roomId && (httpUrl.includes('localhost') || httpUrl.includes('127.0.0.1'))) {
    fetch(`${httpUrl}/api/v1/events/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload })
    }).catch(() => {});
  }
}

export function disconnectSocket() {
  currentRoomId = null;
  currentOnEvent = null;

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
  if (webSocket) {
    webSocket.close();
    webSocket = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
