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
import { apiCreateSession } from './services/apiClient';
import { syncSessionToFirestore, listenToFirestoreSession } from './services/firebaseStore';

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
  const [currentPhase, setCurrentPhase] = useState<Phase>('LOGIN');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  // Initialize default session once on mount so NEXUS ARENA views render instantly with a STABLE room code
  const [session, setSession] = useState<GameSession | null>(() => {
    try {
      const savedSession = sessionStorage.getItem('code_mafia_active_session');
      if (savedSession) {
        return JSON.parse(savedSession);
      }
    } catch (e) {}

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
    return createInitialSession(initialConfig, 'OperativeAlpha');
  });

  const [currentUser, setCurrentUser] = useState<Player | null>(() => {
    return session?.players?.[0] || null;
  });

  // Persist session to sessionStorage to maintain stable room code across renders and refreshes
  useEffect(() => {
    if (session) {
      try {
        sessionStorage.setItem('code_mafia_active_session', JSON.stringify(session));
      } catch (e) {}
    }
  }, [session?.id, session?.joinCode]);
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

  // Realtime Cloud Firestore Session Synchronization
  useEffect(() => {
    if (session) {
      syncSessionToFirestore(session);
    }
  }, [session?.phase, session?.currentRound, session?.players, session?.winner]);

  // Realtime Cloud Firestore Stream Listener
  useEffect(() => {
    const activeKey = session?.joinCode || session?.id;
    if (!activeKey) return;

    const unsubscribe = listenToFirestoreSession(activeKey, (firestoreData) => {
      if (firestoreData) {
        setSession(prev => {
          if (!prev) return prev;
          // IMMUTABLE JOIN CODE LOCK: Never allow joinCode to change once established
          let updated = { ...prev, joinCode: prev.joinCode };
          let changed = false;

          if (firestoreData.phase && firestoreData.phase !== prev.phase) {
            updated.phase = firestoreData.phase;
            setCurrentPhase(firestoreData.phase);
            changed = true;
          }

          if (firestoreData.players && Array.isArray(firestoreData.players)) {
            const mergedPlayers = firestoreData.players.map((fp: any) => {
              const isThisHost = fp.isHost || fp.displayName === firestoreData.hostName;
              const baseObj = { ...fp, isHost: isThisHost };
              if (currentUser && fp.displayName === currentUser.displayName) {
                return { ...baseObj, isHost: isThisHost, isReady: fp.isReady ?? currentUser.isReady };
              }
              return baseObj;
            });
            if (JSON.stringify(mergedPlayers) !== JSON.stringify(prev.players)) {
              updated.players = mergedPlayers;
              changed = true;
            }
          }

          return changed ? updated : prev;
        });

        // Ensure currentUser.isHost matches room host status
        if (currentUser && firestoreData.hostName && currentUser.displayName === firestoreData.hostName) {
          if (!currentUser.isHost) {
            setCurrentUser(prev => prev ? { ...prev, isHost: true } : prev);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [session?.id, session?.joinCode, currentUser?.displayName]);

  // Handler: Create Game
  const handleCreateGame = async (config: GameConfig, hostName: string) => {
    const effectiveHost = hostName.trim() || currentUser?.displayName || localStorage.getItem('code_mafia_active_user') || 'OperativeUser';
    localStorage.setItem('code_mafia_active_user', effectiveHost);

    // Pre-generate a SINGLE STABLE PIN code so it NEVER changes
    const stableJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const apiRes = await apiCreateSession({
        hostName: effectiveHost,
        packId: config.packId,
        playerCount: config.playerCount,
        mafiaCount: config.mafiaCount
      });

      const chosenCode = (apiRes && apiRes.joinCode) ? apiRes.joinCode : stableJoinCode;
      const newSession = createInitialSession(config, effectiveHost, chosenCode);
      if (apiRes && apiRes.sessionId) newSession.id = apiRes.sessionId;

      newSession.hostName = effectiveHost;
      if (newSession.players && newSession.players.length > 0) {
        newSession.players[0].displayName = effectiveHost;
        newSession.players[0].isHost = true;
      }

      const hostPlayer = newSession.players[0];

      setSession(newSession);
      setCurrentUser(hostPlayer);
      setCurrentPhase('LOBBY');
      syncSessionToFirestore(newSession);
    } catch (e) {
      const newSession = createInitialSession(config, effectiveHost, stableJoinCode);
      newSession.hostName = effectiveHost;
      if (newSession.players && newSession.players.length > 0) {
        newSession.players[0].displayName = effectiveHost;
        newSession.players[0].isHost = true;
      }
      const hostPlayer = newSession.players[0];

      setSession(newSession);
      setCurrentUser(hostPlayer);
      setCurrentPhase('LOBBY');
      syncSessionToFirestore(newSession);
    }
  };

  // Handler: Join Room by PIN / Code
  const handleJoinByPin = async (pinCode: string) => {
    const activeUserName = currentUser?.displayName || localStorage.getItem('code_mafia_active_user') || 'JoiningOperative';
    const cleanPin = pinCode.trim().toUpperCase();

    const joiningPlayer: Player = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      displayName: activeUserName,
      isAlive: true,
      isHost: false,
      isBot: false,
      isReady: false,
      avatarColor: 'bg-purple-600',
      stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
    };

    try {
      const { getSessionFromFirestore, syncSessionToFirestore } = await import('./services/firebaseStore');
      const firestoreDoc = await getSessionFromFirestore(cleanPin);

      let targetSession: GameSession;

      if (firestoreDoc) {
        const existingPlayers = Array.isArray(firestoreDoc.players) ? firestoreDoc.players : [];
        const exists = existingPlayers.some((p: any) => p.displayName === activeUserName);
        const updatedPlayers = exists ? existingPlayers : [...existingPlayers, joiningPlayer];

        const defaultConfig: GameConfig = {
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

        const base = createInitialSession(defaultConfig, firestoreDoc.hostName || 'HostOperative');
        targetSession = {
          ...base,
          id: firestoreDoc.id || cleanPin,
          joinCode: firestoreDoc.joinCode || cleanPin,
          phase: firestoreDoc.phase || 'LOBBY',
          players: updatedPlayers
        };
      } else {
        const defaultConfig: GameConfig = {
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
        targetSession = createInitialSession(defaultConfig, activeUserName);
        targetSession.joinCode = cleanPin;
        targetSession.players = [joiningPlayer];
      }

      setSession(targetSession);
      setCurrentUser(joiningPlayer);
      setCurrentPhase('LOBBY');

      // Sync updated room with new player immediately to Cloud Firestore
      await syncSessionToFirestore(targetSession);
    } catch (e) {
      console.warn('[Join PIN Error]:', e);
    }
  };

  // Handler: Quick Match — Global Matchmaking Scanner
  const handleQuickMatch = async () => {
    const activeUserName = currentUser?.displayName || localStorage.getItem('code_mafia_active_user') || 'OperativeUser';

    try {
      // 1. Scan Cloud Firestore for open lobby rooms with available slots
      const { findGlobalOpenSessionFromFirestore } = await import('./services/firebaseStore');
      const openRoom = await findGlobalOpenSessionFromFirestore();

      if (openRoom && openRoom.id && openRoom.joinCode) {
        // Found an open room! Join it via PIN
        console.log(`[Quick Match] Found open room: ${openRoom.joinCode} (${openRoom.playersCount}/${6} players)`);
        handleJoinByPin(openRoom.joinCode);
        return;
      }
    } catch (e) {
      console.warn('[Quick Match] Firestore scan fallback:', e);
    }

    // 2. No open rooms found — Create a new global room and wait for players
    console.log('[Quick Match] No open rooms found. Creating new global room...');
    try {
      const apiRes = await apiCreateSession({
        hostName: activeUserName,
        packId: 'task-master-js',
        playerCount: 6,
        mafiaCount: 2
      });

      const defaultConfig: GameConfig = {
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

      const newSession = createInitialSession(defaultConfig, activeUserName);
      if (apiRes && apiRes.sessionId) newSession.id = apiRes.sessionId;
      if (apiRes && apiRes.joinCode) newSession.joinCode = apiRes.joinCode;
      newSession.hostName = activeUserName;
      if (newSession.players && newSession.players.length > 0) {
        newSession.players[0].displayName = activeUserName;
        newSession.players[0].isHost = true;
      }
      const hostPlayer = newSession.players[0];

      setSession(newSession);
      setCurrentUser(hostPlayer);
      setCurrentPhase('LOBBY');
      syncSessionToFirestore(newSession);
    } catch (e) {
      // Fallback: Create local session
      const defaultConfig: GameConfig = {
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

      const newSession = createInitialSession(defaultConfig, activeUserName);
      newSession.hostName = activeUserName;
      if (newSession.players && newSession.players.length > 0) {
        newSession.players[0].displayName = activeUserName;
        newSession.players[0].isHost = true;
      }
      const hostPlayer = newSession.players[0];

      setSession(newSession);
      setCurrentUser(hostPlayer);
      setCurrentPhase('LOBBY');
      syncSessionToFirestore(newSession);
    }
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
              const cleanName = username.includes('@') ? username.split('@')[0] : username;
              const updatedUser = {
                id: `usr-${Date.now()}`,
                displayName: cleanName,
                isAlive: true,
                isHost: true,
                isBot: false,
                isReady: true,
                avatarColor: 'bg-purple-600',
                stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
              };
              setCurrentUser(updatedUser);
              setSession(prev => {
                const defaultConfig: GameConfig = {
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
                if (!prev) return createInitialSession(defaultConfig, cleanName);
                const updatedPlayers = prev.players.map((p, i) => i === 0 ? { ...p, displayName: cleanName } : p);
                return { ...prev, players: updatedPlayers };
              });
              setShowFavoritesOnly(false);
              setCurrentPhase('DASHBOARD');
            }}
          />
        )}

        {currentPhase === 'DASHBOARD' && (
          <DashboardPage
            onNewGame={() => setCurrentPhase('CONFIG_WIZARD')}
            onViewHistory={() => setCurrentPhase('HISTORY')}
            onViewAdminPacks={() => setCurrentPhase('ADMIN_PACKS')}
            onJoinByPin={handleJoinByPin}
            onQuickMatch={handleQuickMatch}
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
            currentUserName={currentUser?.displayName}
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
