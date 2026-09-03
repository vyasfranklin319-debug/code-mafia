let broadcastChannel: BroadcastChannel | null = null;
let eventSource: EventSource | null = null;

export function initSocketConnection(roomId: string, player: any, onEvent: (event: string, data: any) => void) {
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

  // 2. Connect to Server-Sent Events (SSE) stream if server is running
  try {
    eventSource = new EventSource(`http://localhost:3001/api/v1/events/${roomId}`);
    eventSource.onmessage = (msg) => {
      try {
        const { event, payload } = JSON.parse(msg.data);
        if (event && event !== 'CONNECTED') {
          onEvent(event, payload);
        }
      } catch (e) {
        // Handle message parse
      }
    };
  } catch (err) {
    console.log('Backend server offline, running in local BroadcastChannel mode');
  }
}

export function emitMultiplayerEvent(event: string, payload: any) {
  // Broadcast locally to other tabs
  if (broadcastChannel) {
    broadcastChannel.postMessage({ event, payload });
  }

  // HTTP POST to server for broadcasting
  const roomId = payload.roomId || (payload.sessionData && payload.sessionData.id);
  if (roomId) {
    fetch(`http://localhost:3001/api/v1/events/${roomId}`, {
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
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
