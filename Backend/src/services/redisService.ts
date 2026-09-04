/**
 * CODE MAFIA — REDIS EPHEMERAL STATE & PUB/SUB SERVICE
 * High-speed in-memory store for timers, live votes, and horizontal WebSocket scaling
 */

import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

let redisClient: any = null;
let redisSub: any = null;
let isRedisConnected = false;

// In-Memory Fallback Store & Local Pub/Sub
const memTimers = new Map<string, number>(); // joinCode -> phaseEndsAt
const memVotes = new Map<string, Map<string, string | null>>(); // joinCode -> (voterId -> targetId)
const memPresence = new Map<string, Set<string>>(); // joinCode -> Set<socketId>
const localPubSub = new EventEmitter();

export async function initRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log('[Redis] REDIS_URL not provided. Running in high-speed In-Memory cache & Pub/Sub mode.');
    return;
  }

  try {
    redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 2, connectTimeout: 3000 });
    redisSub = new Redis(redisUrl, { maxRetriesPerRequest: 2, connectTimeout: 3000 });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected to Redis cluster successfully.');
      isRedisConnected = true;
    });

    redisClient.on('error', (err) => {
      console.warn('[Redis] Connection warning:', err.message);
      isRedisConnected = false;
    });
  } catch (err: any) {
    console.warn('[Redis] Failed to initialize Redis client. Using in-memory fallback:', err.message);
    isRedisConnected = false;
  }
}

// 1. Authoritative Phase Timers
export async function redisSetPhaseTimer(joinCode: string, endsAt: number): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  memTimers.set(cleanCode, endsAt);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(`game:${cleanCode}:timer`, endsAt.toString(), 'EX', 7200); // 2-hour TTL
    } catch (e: any) {
      console.warn('[Redis] setTimer error:', e.message);
    }
  }
}

export async function redisGetPhaseTimer(joinCode: string): Promise<number | null> {
  const cleanCode = joinCode.toUpperCase();
  if (isRedisConnected && redisClient) {
    try {
      const val = await redisClient.get(`game:${cleanCode}:timer`);
      if (val) return parseInt(val, 10);
    } catch (e: any) {
      console.warn('[Redis] getTimer error:', e.message);
    }
  }
  return memTimers.get(cleanCode) || null;
}

// 2. Live Secret Ballots / Voting
export async function redisCastVote(joinCode: string, voterId: string, targetId: string | null): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  let roomVotes = memVotes.get(cleanCode);
  if (!roomVotes) {
    roomVotes = new Map();
    memVotes.set(cleanCode, roomVotes);
  }
  roomVotes.set(voterId, targetId);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.hset(`game:${cleanCode}:votes`, voterId, targetId || '__ABSTAIN__');
      await redisClient.expire(`game:${cleanCode}:votes`, 3600);
    } catch (e: any) {
      console.warn('[Redis] castVote error:', e.message);
    }
  }
}

export async function redisGetVotes(joinCode: string): Promise<Record<string, string | null>> {
  const cleanCode = joinCode.toUpperCase();
  if (isRedisConnected && redisClient) {
    try {
      const raw = await redisClient.hgetall(`game:${cleanCode}:votes`);
      const result: Record<string, string | null> = {};
      for (const [voter, target] of Object.entries(raw)) {
        result[voter] = target === '__ABSTAIN__' ? null : String(target);
      }
      return result;
    } catch (e: any) {
      console.warn('[Redis] getVotes error:', e.message);
    }
  }

  const roomVotes = memVotes.get(cleanCode);
  const result: Record<string, string | null> = {};
  if (roomVotes) {
    for (const [voter, target] of roomVotes.entries()) {
      result[voter] = target;
    }
  }
  return result;
}

export async function redisClearVotes(joinCode: string): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  memVotes.delete(cleanCode);

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(`game:${cleanCode}:votes`);
    } catch (e: any) {
      console.warn('[Redis] clearVotes error:', e.message);
    }
  }
}

// 3. Pub/Sub Multi-Node Broadcasting
export async function redisPublishEvent(joinCode: string, event: string, payload: any): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  const channel = `game:${cleanCode}:events`;
  const message = JSON.stringify({ event, payload });

  // Always emit locally
  localPubSub.emit(channel, { event, payload });

  if (isRedisConnected && redisClient) {
    try {
      await redisClient.publish(channel, message);
    } catch (e: any) {
      console.warn('[Redis] publish error:', e.message);
    }
  }
}

export function redisSubscribeEvents(joinCode: string, callback: (event: string, payload: any) => void): () => void {
  const cleanCode = joinCode.toUpperCase();
  const channel = `game:${cleanCode}:events`;

  const localHandler = (data: { event: string; payload: any }) => {
    callback(data.event, data.payload);
  };
  localPubSub.on(channel, localHandler);

  if (isRedisConnected && redisSub) {
    redisSub.subscribe(channel).catch(() => {});
    const redisHandler = (chan: string, msg: string) => {
      if (chan === channel) {
        try {
          const parsed = JSON.parse(msg);
          callback(parsed.event, parsed.payload);
        } catch (e) {}
      }
    };
    redisSub.on('message', redisHandler);
    return () => {
      localPubSub.off(channel, localHandler);
      if (redisSub) {
        redisSub.off('message', redisHandler);
        redisSub.unsubscribe(channel).catch(() => {});
      }
    };
  }

  return () => {
    localPubSub.off(channel, localHandler);
  };
}
