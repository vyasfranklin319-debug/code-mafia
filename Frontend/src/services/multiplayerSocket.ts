let broadcastChannel: BroadcastChannel | null = null;
let eventSource: EventSource | null = null;
let webSocket: WebSocket | null = null;

const getHostUrls = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const httpProto = isHttps ? 'https:' : 'http:';
  const wsProto = isHttps ? 'wss:' : 'ws:';

  const httpUrl = (import.meta as any).env?.VITE_BACKEND_URL || `${httpProto}//${host}:3001`;
  const wsUrl = (import.meta as any).env?.VITE_WS_URL || `${wsProto}//${host}:3001`;

  return { httpUrl, wsUrl };
};

export function initSocketConnection(roomId: string, player: any, onEvent: (event: string, data: any) => void) {
  const { httpUrl, wsUrl } = getHostUrls();

  // 1. Setup local BroadcastChannel for multi-tab real-time sync
  if ('BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(`code-mafia-${roomId}`);
      broadcastChannel.onmessage = (msg) => {
        if (msg.data && msg.data.event) {
          onEvent(msg.data.event, msg.data.payload);
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported');
    }
  }

  // 2. Connect via Native WebSocket stream
  try {
    const fullWsUrl = `${wsUrl}/ws/room/${roomId}`;
    webSocket = new WebSocket(fullWsUrl);

    webSocket.onopen = () => {
      console.log(`[WebSocket Stream] Connected to room ${roomId} at ${fullWsUrl}`);
    };

    webSocket.onmessage = (event) => {
      try {
        const { event: evt, payload } = JSON.parse(event.data);
        if (evt && evt !== 'WS_CONNECTED') {
          onEvent(evt, payload);
        }
      } catch (e) {}
    };

    webSocket.onerror = () => {
      console.warn('[WebSocket Stream Warning] Connect fallback to SSE');
    };
  } catch (e) {
    // WebSocket fallback
  }

  // 3. Fallback: Server-Sent Events (SSE)
  try {
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

export function emitMultiplayerEvent(event: string, payload: any) {
  const { httpUrl } = getHostUrls();

  // 1. Broadcast to local tabs
  if (broadcastChannel) {
    broadcastChannel.postMessage({ event, payload });
  }

  // 2. Send via WebSocket if open
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    try {
      webSocket.send(JSON.stringify({ event, payload }));
      return;
    } catch (e) {}
  }

  // 3. HTTP POST broadcast fallback
  const roomId = payload.roomId || (payload.sessionData && payload.sessionData.id);
  if (roomId) {
    fetch(`${httpUrl}/api/v1/events/${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload })
    }).catch(() => {});
  }
}

export function disconnectSocket() {
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
