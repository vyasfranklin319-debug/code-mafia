/**
 * CODE MAFIA — YJS CRDT WEBSOCKET SERVER
 * Handles collaborative real-time code editing with concurrent merges,
 * conflict-free resolution, and live remote cursor awareness.
 */

import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

interface SharedDocState {
  name: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<WebSocket>;
}

const docs = new Map<string, SharedDocState>();

function getOrCreateDoc(docName: string): SharedDocState {
  let state = docs.get(docName);
  if (!state) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    const conns = new Set<WebSocket>();

    doc.on('update', (update: Uint8Array, origin: any) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);

      for (const conn of conns) {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      }
    });

    awareness.on('update', ({ added, updated, removed }: any, origin: any) => {
      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
      const message = encoding.toUint8Array(encoder);

      for (const conn of conns) {
        if (conn !== origin && conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      }
    });

    state = { name: docName, doc, awareness, conns };
    docs.set(docName, state);
  }
  return state;
}

export function setupYjsWebSocket(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
    if (pathname.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (conn: WebSocket, req: http.IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    // Path format: /yjs/<docName>
    const docName = url.pathname.replace(/^\/yjs\/?/, '') || 'default-room';
    const state = getOrCreateDoc(docName);

    state.conns.add(conn);

    // 1. Send initial SyncStep 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, state.doc);
    conn.send(encoding.toUint8Array(encoder));

    // 2. Send current Awareness states
    const awarenessStates = state.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(state.awareness, Array.from(awarenessStates.keys()))
      );
      conn.send(encoding.toUint8Array(awarenessEncoder));
    }

    conn.on('message', (message: ArrayBuffer) => {
      try {
        const u8 = new Uint8Array(message);
        const decoder = decoding.createDecoder(u8);
        const messageType = decoding.readVarUint(decoder);

        if (messageType === MESSAGE_SYNC) {
          const replyEncoder = encoding.createEncoder();
          encoding.writeVarUint(replyEncoder, MESSAGE_SYNC);
          syncProtocol.readSyncMessage(decoder, replyEncoder, state.doc, conn);
          if (encoding.length(replyEncoder) > 1) {
            conn.send(encoding.toUint8Array(replyEncoder));
          }
        } else if (messageType === MESSAGE_AWARENESS) {
          awarenessProtocol.applyAwarenessUpdate(
            state.awareness,
            decoding.readVarUint8Array(decoder),
            conn
          );
        }
      } catch (err: any) {
        console.warn('[Yjs] Message processing error:', err.message);
      }
    });

    conn.on('close', () => {
      state.conns.delete(conn);
      if (state.conns.size === 0) {
        // Retain doc in memory for ongoing match, or garbage collect if needed
      }
    });
  });

  console.log('[Yjs] CRDT WebSocket collaborative editor engine mounted at /yjs');
  return wss;
}
