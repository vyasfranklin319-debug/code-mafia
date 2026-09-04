/**
 * CODE MAFIA — AUTHORITATIVE GAME STATE SERVICE
 * Manages role distribution, phase transitions, vote tallying, and win conditions.
 */

import { dbSaveGame, dbGetGame, dbUpdateGamePhase, dbSavePlayer, dbGetPlayers, dbSaveVote, dbSaveElimination, GameRecord, PlayerRecord } from './dbService.js';
import { redisSetPhaseTimer, redisGetPhaseTimer, redisCastVote, redisGetVotes, redisClearVotes } from './redisService.js';

export function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Create Session
export async function createGameSession(
  config: any,
  hostName: string,
  providedJoinCode?: string
): Promise<{ game: GameRecord; hostPlayer: PlayerRecord }> {
  const joinCode = (providedJoinCode || generateJoinCode()).toUpperCase();
  const gameId = `game-${Date.now()}-${joinCode}`;

  const game: GameRecord = {
    id: gameId,
    joinCode,
    hostName,
    phase: 'LOBBY',
    currentRound: 1,
    phaseEndsAt: 0,
    winner: null,
    winReason: null,
    config: {
      packId: config?.packId || 'task-master-js',
      playerCount: config?.playerCount || 6,
      mafiaCount: config?.mafiaCount || 2,
      workRoundSeconds: config?.workRoundSeconds || 180,
      discussionSeconds: config?.discussionSeconds || 90,
      votingSeconds: config?.votingSeconds || 45,
      passRateThreshold: config?.passRateThreshold || 100,
      maxRounds: config?.maxRounds || 3
    },
    createdAt: Date.now()
  };

  const hostPlayer: PlayerRecord = {
    id: `usr-host-${Date.now()}`,
    gameId,
    displayName: hostName,
    isHost: true,
    isReady: true,
    isAlive: true,
    avatarColor: 'bg-purple-600',
    stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
  };

  await dbSaveGame(game);
  await dbSavePlayer(joinCode, hostPlayer);

  return { game, hostPlayer };
}

// 2. Authoritative Role Assignment
export async function assignGameRoles(joinCode: string): Promise<PlayerRecord[]> {
  const cleanCode = joinCode.toUpperCase();
  const players = await dbGetPlayers(cleanCode);
  const game = await dbGetGame(cleanCode);
  if (!game || players.length === 0) return players;

  const mafiaTarget = game.config.mafiaCount || Math.max(1, Math.floor(players.length / 3));

  // Fisher-Yates shuffle
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Assign roles
  shuffled.forEach((p, idx) => {
    if (idx < mafiaTarget) {
      p.role = 'MAFIA';
    } else if (idx === mafiaTarget && players.length >= 4) {
      p.role = 'INSPECTOR';
    } else {
      p.role = 'DEVELOPER';
    }
  });

  // Save updated roles
  for (const player of shuffled) {
    await dbSavePlayer(cleanCode, player);
  }

  // Set phase to ROLE_REVEAL
  const roleRevealEndsAt = Date.now() + 10000;
  await dbUpdateGamePhase(cleanCode, 'ROLE_REVEAL', { phaseEndsAt: roleRevealEndsAt });
  await redisSetPhaseTimer(cleanCode, roleRevealEndsAt);

  return shuffled;
}

// 3. Phase Transitions
export async function advanceGamePhase(
  joinCode: string,
  targetPhase: string,
  extra: { durationSeconds?: number; currentRound?: number; winner?: string | null; winReason?: string | null } = {}
): Promise<{ phase: string; phaseEndsAt: number }> {
  const cleanCode = joinCode.toUpperCase();
  const game = await dbGetGame(cleanCode);

  let duration = extra.durationSeconds || 60;
  if (!extra.durationSeconds && game) {
    if (targetPhase === 'WORK_ROUND') duration = game.config.workRoundSeconds || 180;
    if (targetPhase === 'DISCUSSION') duration = game.config.discussionSeconds || 90;
    if (targetPhase === 'VOTING') duration = game.config.votingSeconds || 45;
    if (targetPhase === 'ELIMINATION') duration = 15;
  }

  const phaseEndsAt = Date.now() + duration * 1000;

  if (targetPhase === 'VOTING') {
    await redisClearVotes(cleanCode);
  }

  await dbUpdateGamePhase(cleanCode, targetPhase, {
    phaseEndsAt,
    currentRound: extra.currentRound,
    winner: extra.winner,
    winReason: extra.winReason
  });
  await redisSetPhaseTimer(cleanCode, phaseEndsAt);

  return { phase: targetPhase, phaseEndsAt };
}

// 4. Vote Tallying & Elimination Arbiter
export async function processVoteElimination(joinCode: string): Promise<{
  eliminatedPlayer: PlayerRecord | null;
  eliminatedRole: string | null;
  voteTally: Record<string, number>;
  wasTie: boolean;
  nextPhase: string;
  winner: string | null;
  winReason: string | null;
}> {
  const cleanCode = joinCode.toUpperCase();
  const game = await dbGetGame(cleanCode);
  const players = await dbGetPlayers(cleanCode);
  const votes = await redisGetVotes(cleanCode);

  const alivePlayers = players.filter(p => p.isAlive);
  const tally: Record<string, number> = {};

  for (const [, targetId] of Object.entries(votes)) {
    if (targetId && targetId !== '__ABSTAIN__') {
      tally[targetId] = (tally[targetId] || 0) + 1;
    }
  }

  let maxVotes = 0;
  let candidateId: string | null = null;
  let wasTie = false;

  for (const [pid, count] of Object.entries(tally)) {
    if (count > maxVotes) {
      maxVotes = count;
      candidateId = pid;
      wasTie = false;
    } else if (count === maxVotes && maxVotes > 0) {
      wasTie = true;
    }
  }

  let eliminatedPlayer: PlayerRecord | null = null;
  if (!wasTie && candidateId && maxVotes > 0) {
    eliminatedPlayer = alivePlayers.find(p => p.id === candidateId) || null;
  }

  if (eliminatedPlayer) {
    eliminatedPlayer.isAlive = false;
    await dbSavePlayer(cleanCode, eliminatedPlayer);
  }

  // Check victory condition
  const remainingPlayers = await dbGetPlayers(cleanCode);
  const aliveRemaining = remainingPlayers.filter(p => p.isAlive);
  const aliveMafia = aliveRemaining.filter(p => p.role === 'MAFIA');
  const aliveDevs = aliveRemaining.filter(p => p.role !== 'MAFIA');

  let winner: string | null = null;
  let winReason: string | null = null;

  if (aliveMafia.length === 0) {
    winner = 'DEVELOPERS';
    winReason = 'All Mafia saboteurs have been eliminated! The team secured the codebase.';
  } else if (aliveMafia.length >= aliveDevs.length) {
    winner = 'MAFIA';
    winReason = 'Mafia saboteurs outnumber or equal the developers! Sabotage achieved.';
  } else if (game && game.currentRound >= (game.config.maxRounds || 3)) {
    winner = 'MAFIA';
    winReason = 'Maximum mission rounds reached without resolving all issues. Mafia wins!';
  }

  const nextPhase = winner ? 'RESULTS' : 'ELIMINATION';
  await dbUpdateGamePhase(cleanCode, nextPhase, { winner, winReason });

  return {
    eliminatedPlayer,
    eliminatedRole: eliminatedPlayer ? eliminatedPlayer.role || 'DEVELOPER' : null,
    voteTally: tally,
    wasTie,
    nextPhase,
    winner,
    winReason
  };
}
