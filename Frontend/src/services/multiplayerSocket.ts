/**
 * HIGH-PERFORMANCE MULTIPLAYER WEBSOCKET ENGINE (Socket.IO Adapter)
 * Replaces old raw WebSockets / BroadcastChannels with a unified Socket.IO connection.
 */

import { initSocketConnection as getSocket } from './realtimeSync';

export function initSocketConnection(roomId: string, player: any, onEvent: (event: string, data: any) => void) {
  const socket = getSocket();
  
  // Connect and join room
  if (!socket.connected) {
    socket.connect();
  }
  
  // Listen for multiplayer broadcast events
  socket.on('multiplayerEvent', (data: { event: string; payload: any }) => {
    onEvent(data.event, data.payload);
  });
  
  // Listen for standard room updates from realtimeSync.ts and map them to legacy events if needed
  socket.on(`roomUpdate:${roomId.toUpperCase()}`, (roomData: any) => {
    // If we wanted to map full room syncs to local state, we could,
    // but App.tsx already listens to listenToRoomInRTDB for state.
  });
}

export function emitMultiplayerEvent(event: string, payload: any) {
  const socket = getSocket();
  if (socket) {
    // Emit custom application event via Socket.IO
    socket.emit('multiplayerEvent', {
      roomId: payload.roomId || (payload.sessionData && payload.sessionData.id),
      event,
      payload
    });
  }
}

export function disconnectSocket() {
  const socket = getSocket();
  if (socket) {
    socket.disconnect();
  }
}
