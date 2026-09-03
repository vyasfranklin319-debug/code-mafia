import React, { useState, useEffect } from 'react';
import { GameSession, Player, GameConfig, Phase, AstReport, ReplayFrame, PrHotfix } from './types/game';
import {
  createInitialSession,
  assignRoles,
  startWorkRound,
  startDiscussion,
  startVoting,
  processElimination,
  evaluateWinConditions
} from './services/gameEngine';
import { executeTestSuite } from './services/sandbox/testRunner';
import { generateBotPlayers } from './services/botSim';
import { createCommit } from './services/gitEngine';
import { createPrHotfix, calculateSystemIntegrity } from './services/prHotfixEngine';
import { activateMemoryLeak, activateSilentRegression, activateSyntaxMasking } from './services/sabotageEngine';
import { initSocketConnection, emitMultiplayerEvent, disconnectSocket } from './services/multiplayerSocket';

import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { GameConfigWizard } from './pages/GameConfigWizard';
import { LobbyPage } from './pages/LobbyPage';
import { RoleRevealModal } from './pages/RoleRevealModal';
import { WorkRoundPage } from './pages/WorkRoundPage';
import { DiscussionPage } from './pages/DiscussionPage';
import { VotingPage } from './pages/VotingPage';
import { EliminationModal } from './pages/EliminationModal';
import { ResultsPage } from './pages/ResultsPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminPacksPage } from './pages/AdminPacksPage';
import { LoginPage } from './pages/LoginPage';
import { DeveloperJourneyDashboard } from './pages/DeveloperJourneyDashboard';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentPhase, setCurrentPhase] = useState<Phase>('LOBBY');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Initialize default session on launch so NEXUS ARENA views render instantly
  const initialConfig: GameConfig = {
    packId: 'task-master-js',
    playerCount: 6,
    mafiaCount: 2,
    workRoundSeconds: 180,
    discussionSeconds: 90,
    votingSeconds: 45,
    transparencyLevel: 'FULL',
    tieRule: 'NO_ELIMINATION',
    passRateThreshold: 100,
    maxRounds: 3
  };
  const defaultSession = createInitialSession(initialConfig, 'VoidRunner_X');

  const [session, setSession] = useState<GameSession | null>(defaultSession);
  const [currentUser, setCurrentUser] = useState<Player | null>(defaultSession.players[0]);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isNextEditShadow, setIsNextEditShadow] = useState(false);

  // Initialize socket listener for real-time multiplayer
  useEffect(() => {
    if (!session || !currentUser) return;

    initSocketConnection(session.id, currentUser, (event, data) => {
      if (event === 'CODE_UPDATED') {
        setSession(prev => {
          if (!prev) return null;
          const updatedFiles = prev.files.map(f =>
            f.path === data.filePath ? { ...f, currentContent: data.newContent } : f
          );
          return { ...prev, files: updatedFiles };
        });
      }

      if (event === 'TEST_RUN_COMPLETED') {
        setSession(prev => {
          if (!prev) return null;
          const newRuns = [...prev.testRuns, data.testRunResult];
          const updatedSession = { ...prev, testRuns: newRuns };
          return evaluateWinConditions(updatedSession);
        });
      }

      if (event === 'CHAT_RECEIVED') {
        setSession(prev => {
          if (!prev) return null;
          return { ...prev, chatMessages: [...prev.chatMessages, data.message] };
        });
      }

      if (event === 'VOTE_REGISTERED') {
        setSession(prev => {
          if (!prev) return null;
          return { ...prev, votes: { ...prev.votes, [data.voterId]: data.targetId } };
        });
      }
    });

    return () => disconnectSocket();
  }, [session?.id, currentUser?.id]);

  // Handler: Create Game
  const handleCreateGame = (config: GameConfig, hostName: string) => {
    const newSession = createInitialSession(config, hostName);
    setSession(newSession);
    setCurrentUser(newSession.players[0]); // Host player
    setCurrentPhase('LOBBY');
  };

  // Handler: Ready Up
  const handleToggleReady = () => {
    if (!session || !currentUser) return;
    const updatedPlayers = session.players.map(p =>
      p.id === currentUser.id ? { ...p, isReady: !p.isReady } : p
    );
    const updatedUser = { ...currentUser, isReady: !currentUser.isReady };
    setSession({ ...session, players: updatedPlayers });
    setCurrentUser(updatedUser);
  };

  // Handler: Add Bot Player
  const handleAddBotPlayer = () => {
    if (!session) return;
    const count = session.players.length;
    const newBot = generateBotPlayers(1, count + 1)[0];
    const updatedPlayers = [...session.players, newBot];
    setSession({ ...session, players: updatedPlayers });
  };

  // Handler: Start Game
  const handleStartGame = () => {
    if (!session) return;
    const sessionWithRoles = assignRoles(session);
    setSession(sessionWithRoles);
    const updatedMe = sessionWithRoles.players.find(p => p.id === currentUser?.id) || currentUser;
    setCurrentUser(updatedMe);
    setCurrentPhase('ROLE_REVEAL');
  };

  // Handler: Acknowledge Role -> Start Round 1
  const handleAcknowledgeRole = () => {
    if (!session) return;
    const workSession = startWorkRound(session);
    setSession(workSession);
    setCurrentPhase('WORK_ROUND');
  };

  // Handler: Code Edit in Monaco + Git Commit & Replay Telemetry
  const handleCodeChange = (filePath: string, newContent: string) => {
    if (!session || !currentUser || session.isCodeFrozen) return;
    const targetFile = session.files.find(f => f.path === filePath);
    const oldContent = targetFile ? targetFile.currentContent : '';

    const updatedFiles = session.files.map(f =>
      f.path === filePath ? { ...f, currentContent: newContent } : f
    );

    const isShadow = isNextEditShadow;
    if (isShadow) setIsNextEditShadow(false);

    const commit = createCommit(currentUser, filePath, oldContent, newContent, isShadow);

    const editEvent = {
      id: `edit-${Date.now()}`,
      timestamp: commit.timestamp,
      playerId: isShadow ? 'anon-shadow-user' : currentUser.id,
      playerName: isShadow ? 'ghost_author' : currentUser.displayName,
      type: 'EDIT' as const,
      filePath,
      details: `Committed SHA ${commit.hash} (+${commit.linesAdded} -${commit.linesRemoved})`
    };

    const newReplayFrame: ReplayFrame = {
      stepIndex: session.replayFrames.length + 1,
      timestampLabel: commit.timestamp,
      relativeMs: Date.now(),
      phase: session.phase,
      activeFileContent: newContent,
      gitCommitsCount: session.gitCommits.length + 1,
      latestCommit: commit,
      chatMessagesCount: session.chatMessages.length,
      eventSummary: `Code Edit by ${commit.authorName}`
    };

    setSession({
      ...session,
      files: updatedFiles,
      gitCommits: [...session.gitCommits, commit],
      activityFeed: [...session.activityFeed, editEvent],
      replayFrames: [...session.replayFrames, newReplayFrame]
    });

    emitMultiplayerEvent('CODE_EDIT', {
      roomId: session.id,
      filePath,
      newContent,
      playerId: currentUser.id,
      playerName: currentUser.displayName
    });
  };

  // Handler: Stage PR Hotfix to Staging Branch
  const handleStagePrHotfix = () => {
    if (!session || !currentUser) return;
    const primaryFile = session.files[0];
    if (!primaryFile) return;

    const pr = createPrHotfix(
      currentUser,
      primaryFile.path,
      primaryFile.initialContent,
      primaryFile.currentContent
    );

    const prEvent = {
      id: `pr-event-${Date.now()}`,
      timestamp: pr.timestamp,
      playerId: currentUser.id,
      playerName: currentUser.displayName,
      type: 'PR_STAGED' as const,
      details: `Staged PR #${pr.prNumber} for ${primaryFile.name}`
    };

    setSession({
      ...session,
      stagedPrs: [...session.stagedPrs, pr],
      activityFeed: [...session.activityFeed, prEvent]
    });
  };

  // Handler: Activate Mafia Covert Memory Leak
  const handleActivateMemoryLeak = () => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    setSession(activateMemoryLeak(session));
  };

  // Handler: Activate Mafia Covert Silent Regression
  const handleActivateSilentRegression = () => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    setSession(activateSilentRegression(session));
  };

  // Handler: Activate Mafia Covert Syntax Masking
  const handleActivateSyntaxMasking = (targetPlayer: Player) => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    setSession(activateSyntaxMasking(session, targetPlayer));
  };

  // Handler: Emergency Call Code Freeze
  const handleTriggerCodeFreeze = () => {
    if (!session || !currentUser) return;
    const freezeEvent = {
      id: `freeze-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      playerId: currentUser.id,
      playerName: currentUser.displayName,
      type: 'CODE_FREEZE' as const,
      details: `Emergency Code Freeze called by ${currentUser.displayName}! Editor locked for incident review.`
    };

    setSession({
      ...session,
      isCodeFrozen: true,
      activityFeed: [...session.activityFeed, freezeEvent]
    });
  };

  // Handler: Activate Mafia Shadow Commit
  const handleActivateShadowCommit = () => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    if (session.sabotageState.shadowCommitsRemaining <= 0) return;

    setIsNextEditShadow(true);
    setSession({
      ...session,
      sabotageState: {
        ...session.sabotageState,
        shadowCommitsRemaining: session.sabotageState.shadowCommitsRemaining - 1
      }
    });
  };

  // Handler: Trigger Mafia Fake CI Status Inversion
  const handleTriggerFakeCi = () => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;

    const activeUntil = Date.now() + 15000;
    const sabotageEvent = {
      id: `sabotage-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      playerId: currentUser.id,
      playerName: 'Anonymous Saboteur',
      type: 'SABOTAGE' as const,
      details: 'Fake CI Status Inversion activated for 15 seconds!'
    };

    setSession({
      ...session,
      sabotageState: {
        ...session.sabotageState,
        fakeCiActiveUntil: activeUntil
      },
      activityFeed: [...session.activityFeed, sabotageEvent]
    });
  };

  // Handler: Inject Flaky Regression Trap
  const handleInjectFlakyTest = () => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    if (session.sabotageState.flakyTestInjected) return;

    const flakyTestCase = {
      id: `test-flaky-${Date.now()}`,
      name: 'Flaky Integration Assert',
      description: 'Hidden intermittent edge-case regression test assertion',
      isHidden: true,
      isFlaky: true
    };

    const updatedSuite = [...session.contentPack.testSuite, flakyTestCase];

    setSession({
      ...session,
      contentPack: {
        ...session.contentPack,
        testSuite: updatedSuite
      },
      sabotageState: {
        ...session.sabotageState,
        flakyTestInjected: true
      }
    });
  };

  // Handler: Save AST Analysis Report
  const handleSaveAstReport = (report: AstReport) => {
    if (!session) return;
    const scanEvent = {
      id: `scan-${Date.now()}`,
      timestamp: report.timestamp,
      playerId: currentUser?.id || 'system',
      playerName: currentUser?.displayName || 'Inspector',
      type: 'SCAN' as const,
      details: `AST Scan on ${report.targetPlayerName}: Complexity ${report.complexityScore}/100, ${report.findings.length} rule flags`
    };

    setSession({
      ...session,
      astReports: [...session.astReports, report],
      activityFeed: [...session.activityFeed, scanEvent]
    });
  };

  // Handler: Run Unit Test Suite & Update System Integrity
  const handleRunTests = async () => {
    if (!session || !currentUser || isTestRunning) return;
    setIsTestRunning(true);

    const isFakeCiActive = session.sabotageState.fakeCiActiveUntil !== null && session.sabotageState.fakeCiActiveUntil > Date.now();

    const testRunResult = await executeTestSuite(
      session.contentPack,
      session.files,
      { id: currentUser.id, name: currentUser.displayName },
      isFakeCiActive
    );

    setIsTestRunning(false);

    const updatedIntegrity = calculateSystemIntegrity(
      testRunResult.passedCount,
      testRunResult.totalCount,
      session.sabotageState.memoryLeakActive
    );

    const runEvent = {
      id: `run-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      playerId: currentUser.id,
      playerName: currentUser.displayName,
      type: 'TEST_RUN' as const,
      details: `Executed test suite: ${testRunResult.passedCount}/${testRunResult.totalCount} passed (System Health: ${updatedIntegrity.score}%)`
    };

    const newReplayFrame: ReplayFrame = {
      stepIndex: session.replayFrames.length + 1,
      timestampLabel: testRunResult.timestamp,
      relativeMs: Date.now(),
      phase: session.phase,
      activeFileContent: session.files[0]?.currentContent || '',
      gitCommitsCount: session.gitCommits.length,
      testRunResult,
      chatMessagesCount: session.chatMessages.length,
      eventSummary: `Test Run: ${testRunResult.passedCount}/${testRunResult.totalCount} Passed`
    };

    const updatedSession: GameSession = {
      ...session,
      testRuns: [...session.testRuns, testRunResult],
      systemIntegrity: updatedIntegrity,
      activityFeed: [...session.activityFeed, runEvent],
      replayFrames: [...session.replayFrames, newReplayFrame]
    };

    // Check win condition
    const evaluatedSession = evaluateWinConditions(updatedSession);
    setSession(evaluatedSession);

    if (evaluatedSession.phase === 'RESULTS') {
      setCurrentPhase('RESULTS');
    }

    emitMultiplayerEvent('TRIGGER_TEST_RUN', {
      roomId: session.id,
      testRunResult
    });
  };

  // Handler: Send Chat
  const handleSendMessage = (text: string, isMafiaOnly?: boolean) => {
    if (!session || !currentUser) return;
    const msg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      isMafiaOnly
    };

    setSession({
      ...session,
      chatMessages: [...session.chatMessages, msg]
    });

    emitMultiplayerEvent('SEND_CHAT', { roomId: session.id, message: msg });
  };

  // Handler: Advance to Discussion
  const handleAdvanceToDiscussion = () => {
    if (!session) return;
    const discSession = startDiscussion(session);
    setSession(discSession);
    setCurrentPhase('DISCUSSION');
  };

  // Handler: Advance to Voting
  const handleAdvanceToVoting = () => {
    if (!session) return;
    const votingSession = startVoting(session);
    setSession(votingSession);
    setCurrentPhase('VOTING');
  };

  // Handler: Cast Vote
  const handleCastVote = (targetPlayerId: string | null) => {
    if (!session || !currentUser) return;
    const updatedVotes = { ...session.votes, [currentUser.id]: targetPlayerId };

    const voteEvent = {
      id: `vote-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      playerId: currentUser.id,
      playerName: currentUser.displayName,
      type: 'VOTE' as const,
      details: `Cast elimination vote`
    };

    setSession({
      ...session,
      votes: updatedVotes,
      activityFeed: [...session.activityFeed, voteEvent]
    });

    emitMultiplayerEvent('CAST_VOTE', {
      roomId: session.id,
      voterId: currentUser.id,
      targetId: targetPlayerId
    });
  };

  // Handler: Tally Vote -> Process Elimination
  const handleProcessElimination = () => {
    if (!session) return;
    const elimSession = processElimination(session);
    setSession(elimSession);
    setCurrentPhase(elimSession.phase);
  };

  // Handler: Continue after Elimination
  const handleContinueAfterElimination = () => {
    if (!session) return;
    if (session.phase === 'RESULTS') {
      setCurrentPhase('RESULTS');
    } else {
      const nextRoundSession: GameSession = {
        ...session,
        currentRound: session.currentRound + 1
      };
      const workSession = startWorkRound(nextRoundSession);
      setSession(workSession);
      setCurrentPhase('WORK_ROUND');
    }
  };

  // Handler: Play Again
  const handlePlayAgain = () => {
    if (!session || !currentUser) return;
    handleCreateGame(session.config, currentUser.displayName);
  };

  return (
    <div className="min-h-screen bg-dark-900 text-slate-100 flex flex-col font-sans">
      {currentPhase !== 'LOGIN' && (
        <Navbar
          session={session}
          currentUser={currentUser}
          onLeaveGame={() => { setSession(null); setShowFavoritesOnly(false); setCurrentPhase('DASHBOARD'); }}
          onNavigateHome={() => { setShowFavoritesOnly(false); setCurrentPhase('DASHBOARD'); }}
          onNavigateLobby={() => setCurrentPhase('LOBBY')}
          onNavigateModes={() => setCurrentPhase('CONFIG_WIZARD')}
          onNavigateFavorites={() => {
            setShowFavoritesOnly(true);
            setCurrentPhase('DASHBOARD');
            setTimeout(() => {
              document.getElementById('featured-arenas')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          onNavigateJourney={() => setCurrentPhase('JOURNEY')}
          onNavigateHistory={() => setCurrentPhase('HISTORY')}
          onNavigateAdminPacks={() => setCurrentPhase('ADMIN_PACKS')}
          onNavigateLogin={() => setCurrentPhase('LOGIN')}
          theme={theme}
          onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        />
      )}

      <main className="flex-1">
        {currentPhase === 'LOGIN' && (
          <LoginPage
            onLoginSuccess={(username) => {
              if (currentUser) {
                setCurrentUser({ ...currentUser, displayName: username });
              }
              setShowFavoritesOnly(false);
              setCurrentPhase('DASHBOARD');
            }}
            onNavigateHome={() => { setShowFavoritesOnly(false); setCurrentPhase('DASHBOARD'); }}
          />
        )}

        {currentPhase === 'DASHBOARD' && (
          <DashboardPage
            onNewGame={() => setCurrentPhase('CONFIG_WIZARD')}
            onViewHistory={() => setCurrentPhase('HISTORY')}
            onViewAdminPacks={() => setCurrentPhase('ADMIN_PACKS')}
            showFavoritesOnly={showFavoritesOnly}
          />
        )}

        {currentPhase === 'JOURNEY' && (
          <DeveloperJourneyDashboard
            onBack={() => setCurrentPhase('DASHBOARD')}
          />
        )}

        {currentPhase === 'CONFIG_WIZARD' && (
          <GameConfigWizard
            onCancel={() => setCurrentPhase('DASHBOARD')}
            onCreateGame={handleCreateGame}
          />
        )}

        {currentPhase === 'LOBBY' && session && currentUser && (
          <LobbyPage
            session={session}
            currentUser={currentUser}
            onToggleReady={handleToggleReady}
            onAddBotPlayer={handleAddBotPlayer}
            onStartGame={handleStartGame}
          />
        )}

        {currentPhase === 'ROLE_REVEAL' && session && currentUser && (
          <RoleRevealModal
            currentUser={currentUser}
            allPlayers={session.players}
            onAcknowledge={handleAcknowledgeRole}
          />
        )}

        {currentPhase === 'WORK_ROUND' && session && currentUser && (
          <WorkRoundPage
            session={session}
            currentUser={currentUser}
            onCodeChange={handleCodeChange}
            onRunTests={handleRunTests}
            isTestRunning={isTestRunning}
            onSendMessage={handleSendMessage}
            onAdvanceToDiscussion={handleAdvanceToDiscussion}
            onActivateShadowCommit={handleActivateShadowCommit}
            onTriggerFakeCi={handleTriggerFakeCi}
            onInjectFlakyTest={handleInjectFlakyTest}
            onSaveAstReport={handleSaveAstReport}
            onStagePrHotfix={handleStagePrHotfix}
            onActivateMemoryLeak={handleActivateMemoryLeak}
            onActivateSilentRegression={handleActivateSilentRegression}
            onActivateSyntaxMasking={handleActivateSyntaxMasking}
            onTriggerCodeFreeze={handleTriggerCodeFreeze}
          />
        )}

        {currentPhase === 'DISCUSSION' && session && currentUser && (
          <DiscussionPage
            session={session}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onAdvanceToVoting={handleAdvanceToVoting}
          />
        )}

        {currentPhase === 'VOTING' && session && currentUser && (
          <VotingPage
            session={session}
            currentUser={currentUser}
            onCastVote={handleCastVote}
            onTimerExpired={handleProcessElimination}
          />
        )}

        {currentPhase === 'ELIMINATION' && session && (
          <EliminationModal
            session={session}
            onContinue={handleContinueAfterElimination}
          />
        )}

        {currentPhase === 'RESULTS' && session && (
          <ResultsPage
            session={session}
            onPlayAgain={handlePlayAgain}
            onNavigateHome={() => { setSession(null); setCurrentPhase('DASHBOARD'); }}
          />
        )}

        {currentPhase === 'HISTORY' && (
          <HistoryPage onBack={() => setCurrentPhase('DASHBOARD')} />
        )}

        {currentPhase === 'ADMIN_PACKS' && (
          <AdminPacksPage onBack={() => setCurrentPhase('DASHBOARD')} />
        )}
      </main>
    </div>
  );
};
