/**
 * CODE MAFIA — DURABLE DATABASE SERVICE
 * Dual-Mode Storage: PostgreSQL (Primary) with Automatic In-Memory Fallback
 */

import pg from 'pg';

export interface GameRecord {
  id: string;
  joinCode: string;
  hostName: string;
  phase: string;
  currentRound: number;
  phaseEndsAt: number;
  winner?: string | null;
  winReason?: string | null;
  config: any;
  createdAt: number;
  endedAt?: number | null;
}

export interface PlayerRecord {
  id: string;
  gameId: string;
  userId?: string;
  displayName: string;
  role?: string;
  isAlive: boolean;
  isHost: boolean;
  isReady: boolean;
  avatarColor: string;
  stats: any;
}

// In-Memory Fallback Store (Used when PostgreSQL is offline or DATABASE_URL not set)
const memGames = new Map<string, GameRecord>(); // joinCode -> GameRecord
const memPlayers = new Map<string, PlayerRecord[]>(); // joinCode -> PlayerRecord[]
const memCommits = new Map<string, any[]>();
const memTestRuns = new Map<string, any[]>();
const memVotes = new Map<string, any[]>();
const memEliminations = new Map<string, any[]>();
const memUsers = new Map<string, any>();

let pgPool: pg.Pool | null = null;
let isPgConnected = false;

export async function initDatabase(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[DB] DATABASE_URL not provided. Running in high-speed In-Memory store mode.');
    return;
  }

  try {
    pgPool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: process.env.NODE_ENV === 'production' && !databaseUrl.includes('localhost') ? { rejectUnauthorized: false } : false
    });

    const client = await pgPool.connect();
    console.log('[DB] Successfully connected to PostgreSQL database.');
    isPgConnected = true;
    client.release();
  } catch (err: any) {
    console.warn('[DB] PostgreSQL connection failed. Falling back to In-Memory store mode:', err.message);
    isPgConnected = false;
    pgPool = null;
  }
}

// 1. Games
export async function dbSaveGame(game: GameRecord): Promise<void> {
  memGames.set(game.joinCode.toUpperCase(), game);

  if (isPgConnected && pgPool) {
    try {
      const query = `
        INSERT INTO games (id, join_code, host_name, phase, current_round, phase_ends_at, winner, win_reason, config_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (join_code) DO UPDATE SET
          phase = EXCLUDED.phase,
          current_round = EXCLUDED.current_round,
          phase_ends_at = EXCLUDED.phase_ends_at,
          winner = EXCLUDED.winner,
          win_reason = EXCLUDED.win_reason;
      `;
      await pgPool.query(query, [
        game.id,
        game.joinCode.toUpperCase(),
        game.hostName,
        game.phase,
        game.currentRound,
        game.phaseEndsAt || 0,
        game.winner || null,
        game.winReason || null,
        JSON.stringify(game.config || {})
      ]);
    } catch (e: any) {
      console.warn('[DB] Postgres saveGame error:', e.message);
    }
  }
}

export async function dbGetGame(joinCode: string): Promise<GameRecord | null> {
  const cleanCode = joinCode.toUpperCase();
  if (isPgConnected && pgPool) {
    try {
      const res = await pgPool.query('SELECT * FROM games WHERE join_code = $1', [cleanCode]);
      if (res.rows.length > 0) {
        const row = res.rows[0];
        return {
          id: row.id,
          joinCode: row.join_code,
          hostName: row.host_name,
          phase: row.phase,
          currentRound: row.current_round,
          phaseEndsAt: Number(row.phase_ends_at),
          winner: row.winner,
          winReason: row.win_reason,
          config: typeof row.config_json === 'string' ? JSON.parse(row.config_json) : row.config_json,
          createdAt: new Date(row.created_at).getTime(),
          endedAt: row.ended_at ? new Date(row.ended_at).getTime() : null
        };
      }
    } catch (e: any) {
      console.warn('[DB] Postgres getGame error:', e.message);
    }
  }
  return memGames.get(cleanCode) || null;
}

export async function dbUpdateGamePhase(
  joinCode: string,
  phase: string,
  extra: { phaseEndsAt?: number; currentRound?: number; winner?: string | null; winReason?: string | null } = {}
): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  const existing = memGames.get(cleanCode);
  if (existing) {
    existing.phase = phase;
    if (extra.phaseEndsAt !== undefined) existing.phaseEndsAt = extra.phaseEndsAt;
    if (extra.currentRound !== undefined) existing.currentRound = extra.currentRound;
    if (extra.winner !== undefined) existing.winner = extra.winner;
    if (extra.winReason !== undefined) existing.winReason = extra.winReason;
  }

  if (isPgConnected && pgPool) {
    try {
      await pgPool.query(
        `UPDATE games SET 
          phase = $1, 
          phase_ends_at = COALESCE($2, phase_ends_at),
          current_round = COALESCE($3, current_round),
          winner = COALESCE($4, winner),
          win_reason = COALESCE($5, win_reason)
        WHERE join_code = $6`,
        [phase, extra.phaseEndsAt || null, extra.currentRound || null, extra.winner || null, extra.winReason || null, cleanCode]
      );
    } catch (e: any) {
      console.warn('[DB] Postgres updateGamePhase error:', e.message);
    }
  }
}

// 2. Players
export async function dbSavePlayer(joinCode: string, player: PlayerRecord): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  const list = memPlayers.get(cleanCode) || [];
  const idx = list.findIndex(p => p.id === player.id || p.displayName === player.displayName);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...player };
  } else {
    list.push(player);
  }
  memPlayers.set(cleanCode, list);

  if (isPgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO game_players (id, game_id, user_id, display_name, role, is_alive, is_host, is_ready, avatar_color, stats_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           role = EXCLUDED.role,
           is_alive = EXCLUDED.is_alive,
           is_ready = EXCLUDED.is_ready,
           stats_json = EXCLUDED.stats_json;`,
        [
          player.id,
          player.gameId,
          player.userId || null,
          player.displayName,
          player.role || null,
          player.isAlive,
          player.isHost,
          player.isReady,
          player.avatarColor,
          JSON.stringify(player.stats || {})
        ]
      );
    } catch (e: any) {
      console.warn('[DB] Postgres savePlayer error:', e.message);
    }
  }
}

export async function dbGetPlayers(joinCode: string): Promise<PlayerRecord[]> {
  const cleanCode = joinCode.toUpperCase();
  if (isPgConnected && pgPool) {
    try {
      const res = await pgPool.query(
        `SELECT p.* FROM game_players p 
         JOIN games g ON p.game_id = g.id 
         WHERE g.join_code = $1`,
        [cleanCode]
      );
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          gameId: r.game_id,
          userId: r.user_id,
          displayName: r.display_name,
          role: r.role,
          isAlive: r.is_alive,
          isHost: r.is_host,
          isReady: r.is_ready,
          avatarColor: r.avatar_color,
          stats: typeof r.stats_json === 'string' ? JSON.parse(r.stats_json) : r.stats_json
        }));
      }
    } catch (e: any) {
      console.warn('[DB] Postgres getPlayers error:', e.message);
    }
  }
  return memPlayers.get(cleanCode) || [];
}

// 3. Match History Archives
export async function dbSaveMatchHistory(item: any): Promise<void> {
  const id = item.id || `hist-${Date.now()}`;
  const record = { ...item, id };
  const existing = memTestRuns.get('history') || [];
  existing.unshift(record);
  memTestRuns.set('history', existing);

  if (isPgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO game_eliminations (id, game_id, round_number, eliminated_role, vote_tally_json)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, item.packName || 'default', item.roundsCount || 1, item.winner || 'DEVELOPERS', JSON.stringify(item)]
      );
    } catch (e: any) {
      console.warn('[DB] Postgres saveMatchHistory error:', e.message);
    }
  }
}

export async function dbGetMatchHistory(): Promise<any[]> {
  return memTestRuns.get('history') || [];
}

export async function dbSaveVote(joinCode: string, roundNumber: number, voterId: string, targetId: string | null): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  const list = memVotes.get(cleanCode) || [];
  list.push({ roundNumber, voterId, targetId, createdAt: Date.now() });
  memVotes.set(cleanCode, list);

  if (isPgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO game_votes (id, game_id, round_number, voter_id, target_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [`vote-${Date.now()}-${Math.random()}`, cleanCode, roundNumber, voterId, targetId || null]
      );
    } catch (e: any) {
      console.warn('[DB] Postgres saveVote error:', e.message);
    }
  }
}

export async function dbSaveElimination(joinCode: string, elimination: any): Promise<void> {
  const cleanCode = joinCode.toUpperCase();
  const list = memEliminations.get(cleanCode) || [];
  list.push(elimination);
  memEliminations.set(cleanCode, list);

  if (isPgConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO game_eliminations (id, game_id, round_number, eliminated_player_id, eliminated_player_name, eliminated_role, vote_tally_json, was_tie)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `elim-${Date.now()}`,
          cleanCode,
          elimination.roundNumber || 1,
          elimination.eliminatedPlayerId || null,
          elimination.eliminatedPlayerName || null,
          elimination.eliminatedRole || null,
          JSON.stringify(elimination.voteTally || {}),
          elimination.wasTie || false
        ]
      );
    } catch (e: any) {
      console.warn('[DB] Postgres saveElimination error:', e.message);
    }
  }
}
