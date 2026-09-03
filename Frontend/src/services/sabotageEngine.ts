import { SabotageState, GameSession, Player } from '../types/game';

/**
 * Handle Mafia Covert Sabotage activations
 */
export function activateMemoryLeak(session: GameSession): GameSession {
  return {
    ...session,
    sabotageState: {
      ...session.sabotageState,
      memoryLeakActive: true
    },
    systemIntegrity: {
      ...session.systemIntegrity,
      buildDurationMs: session.systemIntegrity.buildDurationMs + 1200,
      score: Math.max(0, session.systemIntegrity.score - 15)
    },
    activityFeed: [
      ...session.activityFeed,
      {
        id: `act-sabotage-leak-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        playerId: 'anon-saboteur',
        playerName: 'Anonymous Saboteur',
        type: 'SABOTAGE',
        details: 'Memory Leak covertly injected: Build latency & timeout rates increased'
      }
    ]
  };
}

export function activateSilentRegression(session: GameSession): GameSession {
  return {
    ...session,
    sabotageState: {
      ...session.sabotageState,
      silentRegressionActive: true
    },
    activityFeed: [
      ...session.activityFeed,
      {
        id: `act-sabotage-reg-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        playerId: 'anon-saboteur',
        playerName: 'Anonymous Saboteur',
        type: 'SABOTAGE',
        details: 'Silent Regression covertly deployed to reopen solved bugs when tests pass'
      }
    ]
  };
}

export function activateSyntaxMasking(session: GameSession, targetPlayer: Player): GameSession {
  return {
    ...session,
    sabotageState: {
      ...session.sabotageState,
      syntaxMaskedPlayerId: targetPlayer.id
    },
    activityFeed: [
      ...session.activityFeed,
      {
        id: `act-sabotage-mask-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        playerId: 'anon-saboteur',
        playerName: 'Anonymous Saboteur',
        type: 'SABOTAGE',
        details: `Syntax Masking targeted at ${targetPlayer.displayName} to desynchronize editor linter`
      }
    ]
  };
}
