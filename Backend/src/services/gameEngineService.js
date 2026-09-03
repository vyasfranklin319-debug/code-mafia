// In-memory game sessions store
const sessionsStore = new Map();

// Helper: Generate random 6-character room Join Code
export function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Create Session
export function createSession(config) {
  const sessionId = config.sessionId || config.id || `sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const joinCode = config.joinCode || generateJoinCode();

  const session = {
    id: sessionId,
    joinCode,
    config: {
      packId: config.packId || 'task-master-js',
      playerCount: config.playerCount || 6,
      mafiaCount: config.mafiaCount || 2,
      workRoundSeconds: config.workRoundSeconds || 180,
      discussionSeconds: config.discussionSeconds || 90,
      votingSeconds: config.votingSeconds || 45,
      passRateThreshold: config.passRateThreshold || 100,
      maxRounds: config.maxRounds || 3
    },
    phase: 'LOBBY',
    currentRound: 1,
    players: [],
    secretRoles: new Map(), // Secure server-only map: playerId -> role
    gitCommits: [],
    stagedPrs: [],
    testRuns: [],
    votes: {},
    eliminatedPlayers: [],
    createdAt: Date.now()
  };

  sessionsStore.set(sessionId, session);
  return session;
}

// 2. Get Public Session (Strict Security Rule: Exposes NO secret Mafia roles!)
export function getPublicSession(sessionId, requestingPlayerId = null) {
  const session = sessionsStore.get(sessionId);
  if (!session) return null;

  // Mask secret roles for public payload
  const publicPlayers = session.players.map(p => ({
    id: p.id,
    displayName: p.displayName,
    isAlive: p.isAlive,
    isHost: p.isHost,
    isReady: p.isReady,
    avatarColor: p.avatarColor,
    // Only return role if the game has ended OR if it's the player's own role request
    role: session.phase === 'RESULTS' || p.id === requestingPlayerId 
      ? session.secretRoles.get(p.id) 
      : undefined
  }));

  return {
    id: session.id,
    joinCode: session.joinCode,
    config: session.config,
    phase: session.phase,
    currentRound: session.currentRound,
    players: publicPlayers,
    gitCommitsCount: session.gitCommits.length,
    stagedPrsCount: session.stagedPrs.length,
    winner: session.winner || null,
    winReason: session.winReason || null
  };
}

// 3. Start Session & Distribute Hidden Roles (Fisher-Yates Shuffle)
export function startSession(sessionId) {
  const session = sessionsStore.get(sessionId);
  if (!session) throw new Error('Session not found');

  const playerCount = session.players.length;
  const mafiaCount = Math.min(session.config.mafiaCount, Math.floor(playerCount / 2));
  const inspectorCount = 1;

  // Roles array
  const roles = [];
  for (let i = 0; i < mafiaCount; i++) roles.push('MAFIA');
  for (let i = 0; i < inspectorCount; i++) roles.push('INSPECTOR');
  while (roles.length < playerCount) roles.push('DEVELOPER');

  // Fisher-Yates Shuffle
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  // Assign to server-only map
  session.players.forEach((p, idx) => {
    session.secretRoles.set(p.id, roles[idx]);
  });

  session.phase = 'ROLE_REVEAL';
  return getPublicSession(sessionId);
}

// 4. Evaluate Victory Conditions
export function evaluateVictory(sessionId, testPassRate = 0) {
  const session = sessionsStore.get(sessionId);
  if (!session) return null;

  const alivePlayers = session.players.filter(p => p.isAlive);
  const aliveMafia = alivePlayers.filter(p => session.secretRoles.get(p.id) === 'MAFIA');
  const aliveDevs = alivePlayers.filter(p => session.secretRoles.get(p.id) !== 'MAFIA');

  if (testPassRate >= session.config.passRateThreshold) {
    session.phase = 'RESULTS';
    session.winner = 'DEVELOPERS';
    session.winReason = 'All defined unit test suites passed 100%!';
  } else if (aliveMafia.length === 0) {
    session.phase = 'RESULTS';
    session.winner = 'DEVELOPERS';
    session.winReason = 'All covert Mafia saboteurs were identified and eliminated!';
  } else if (aliveMafia.length >= aliveDevs.length) {
    session.phase = 'RESULTS';
    session.winner = 'MAFIA';
    session.winReason = 'Mafia achieved parity over Developers!';
  } else if (session.currentRound >= session.config.maxRounds) {
    session.phase = 'RESULTS';
    session.winner = 'MAFIA';
    session.winReason = 'Maximum development rounds reached without passing test suites!';
  }

  return session.winner ? { winner: session.winner, winReason: session.winReason } : null;
}
