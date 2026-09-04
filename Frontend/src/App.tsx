import React, { useState, useEffect, useRef } from 'react';
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
// botSim removed — no AI bots in multiplayer
import { createCommit } from './services/gitEngine';
import { createPrHotfix, calculateSystemIntegrity } from './services/prHotfixEngine';
import { activateMemoryLeak, activateSilentRegression, activateSyntaxMasking } from './services/sabotageEngine';
import { initSocketConnection, emitMultiplayerEvent, disconnectSocket } from './services/multiplayerSocket';
import { apiCreateSession } from './services/apiClient';
import { syncSessionToFirestore, listenToFirestoreSession } from './services/firebaseStore';
import {
  saveRoomToRTDB,
  joinRoomInRTDB,
  getRoomFromRTDB,
  updatePlayerReadyInRTDB,
  updatePlayersInRTDB,
  leaveRoomInRTDB,
  setRoomPhaseInRTDB,
  syncSessionToRTDB,
  findGlobalOpenSessionFromRTDB,
  listenToRoomInRTDB,
  castVoteInRTDB,
  clearVotesInRTDB,
  syncFilesToRTDB,
  sendChatToRTDB,
  syncTestRunToRTDB,
  setCodeFrozenInRTDB,
  syncSabotageToRTDB,
  syncStagedPrsToRTDB
} from './services/realtimeSync';

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
  // Initialize session state — restored from sessionStorage only if an active match is in progress
  const [session, setSession] = useState<GameSession | null>(() => {
    try {
      const savedSession = sessionStorage.getItem('code_mafia_active_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.phase && parsed.phase !== 'LOGIN' && parsed.phase !== 'DASHBOARD') {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [currentUser, setCurrentUser] = useState<Player | null>(() => {
    try {
      const savedUser = localStorage.getItem('code_mafia_active_user');
      if (savedUser) {
        // FIX BUG 4: Reuse stable persisted ID so it never changes across refreshes
        let stableId = localStorage.getItem('code_mafia_user_id');
        if (!stableId) {
          stableId = `usr-${Date.now()}`;
          localStorage.setItem('code_mafia_user_id', stableId);
        }
        return {
          id: stableId,
          displayName: savedUser,
          isAlive: true,
          isHost: false,
          isBot: false,
          isReady: false,
          avatarColor: 'bg-purple-600',
          stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
        };
      }
    } catch (e) {}
    return null;
  });

  // Persist session to sessionStorage to maintain stable room code across renders and refreshes
  useEffect(() => {
    if (session) {
      try {
        sessionStorage.setItem('code_mafia_active_session', JSON.stringify(session));
      } catch (e) {}
    } else {
      sessionStorage.removeItem('code_mafia_active_session');
    }
  }, [session?.id, session?.joinCode]);

  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isNextEditShadow, setIsNextEditShadow] = useState(false);

  const currentUserRef = useRef<Player | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Initialize socket listener for real-time multiplayer
  useEffect(() => {
    if (!session || !currentUser) return;
    const channelKey = (session.joinCode || session.id).toUpperCase();

    initSocketConnection(channelKey, currentUser, (event, data) => {
      if (event === 'PLAYER_JOINED') {
        if (data && data.player) {
          setSession(prev => {
            if (!prev) return null;
            const exists = prev.players.some(p => p.id === data.player.id || p.displayName === data.player.displayName);
            if (exists) return prev;
            return { ...prev, players: [...prev.players, data.player] };
          });
        }
      }

      if (event === 'ROOM_STATE') {
        if (data && Array.isArray(data.players)) {
          setSession(prev => {
            if (!prev) return null;
            return prev;
          });
        }
      }

      if (event === 'PLAYER_READY_TOGGLED') {
        if (data && data.playerId) {
          setSession(prev => {
            if (!prev) return null;
            const updated = prev.players.map(p =>
              p.id === data.playerId ? { ...p, isReady: data.isReady } : p
            );
            return { ...prev, players: updated };
          });
        }
      }

      if (event === 'GAME_STARTED') {
        if (data && data.session) {
          setSession(data.session);
          setCurrentPhase('ROLE_REVEAL');
          const meUser = currentUserRef.current;
          const activeId = localStorage.getItem('code_mafia_user_id');
          const activeName = localStorage.getItem('code_mafia_active_user');
          const me = data.session.players?.find((p: any) =>
            (meUser && (p.id === meUser.id || p.displayName === meUser.displayName)) ||
            (activeId && p.id === activeId) ||
            (activeName && p.displayName === activeName)
          );
          if (me && me.role) {
            setCurrentUser(prev => prev ? { ...prev, role: me.role, isAlive: me.isAlive !== false } : {
              id: me.id,
              displayName: me.displayName,
              isAlive: me.isAlive !== false,
              isHost: me.isHost,
              isBot: false,
              isReady: me.isReady,
              role: me.role,
              avatarColor: me.avatarColor || 'bg-purple-600',
              stats: me.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
            });
          }
        }
      }

      if (event === 'PHASE_ADVANCED') {
        if (data && data.phase) {
          setCurrentPhase(data.phase);
          if (data.session) {
            setSession(data.session);
            const meUser = currentUserRef.current;
            const activeId = localStorage.getItem('code_mafia_user_id');
            const activeName = localStorage.getItem('code_mafia_active_user');
            const me = data.session.players?.find((p: any) =>
              (meUser && (p.id === meUser.id || p.displayName === meUser.displayName)) ||
              (activeId && p.id === activeId) ||
              (activeName && p.displayName === activeName)
            );
            if (me) {
              setCurrentUser(prev => prev ? { ...prev, isAlive: me.isAlive !== false, role: me.role || prev.role } : null);
            }
          }
        }
      }

      if (event === 'CODE_UPDATED' || event === 'CODE_EDIT') {
        if (data && data.filePath && data.newContent !== undefined) {
          setSession(prev => {
            if (!prev) return null;
            const updatedFiles = prev.files.map(f =>
              f.path === data.filePath ? { ...f, currentContent: data.newContent } : f
            );
            return { ...prev, files: updatedFiles };
          });
        }
      }

      if (event === 'TEST_RUN_COMPLETED' || event === 'TRIGGER_TEST_RUN') {
        if (data && data.testRunResult) {
          setSession(prev => {
            if (!prev) return null;
            const exists = prev.testRuns.some(r => r.id === data.testRunResult.id);
            const runs = exists ? prev.testRuns : [...prev.testRuns, data.testRunResult];
            const integrity = data.systemIntegrity || prev.systemIntegrity;
            const feed = data.activityEvent ? [...prev.activityFeed, data.activityEvent] : prev.activityFeed;
            const updated = { ...prev, testRuns: runs, systemIntegrity: integrity, activityFeed: feed };
            return evaluateWinConditions(updated);
          });
        }
      }

      if (event === 'CHAT_RECEIVED' || event === 'SEND_CHAT') {
        if (data && data.message) {
          setSession(prev => {
            if (!prev) return null;
            const exists = prev.chatMessages.some(m => m.id === data.message.id);
            if (exists) return prev;
            return { ...prev, chatMessages: [...prev.chatMessages, data.message] };
          });
        }
      }

      if (event === 'VOTE_REGISTERED' || event === 'CAST_VOTE') {
        if (data && data.voterId) {
          setSession(prev => {
            if (!prev) return null;
            return { ...prev, votes: { ...prev.votes, [data.voterId]: data.targetId } };
          });
        }
      }

      if (event === 'CODE_FREEZE_TOGGLED') {
        if (data) {
          setSession(prev => {
            if (!prev) return null;
            const feed = data.event ? [...prev.activityFeed, data.event] : prev.activityFeed;
            return { ...prev, isCodeFrozen: !!data.isCodeFrozen, activityFeed: feed };
          });
        }
      }

      if (event === 'SABOTAGE_ACTIVATED') {
        if (data && data.sabotageState) {
          setSession(prev => {
            if (!prev) return null;
            const feed = data.event ? [...prev.activityFeed, data.event] : prev.activityFeed;
            return { ...prev, sabotageState: data.sabotageState, activityFeed: feed };
          });
        }
      }

      if (event === 'PR_STAGED') {
        if (data && data.pr) {
          setSession(prev => {
            if (!prev) return null;
            const feed = data.event ? [...prev.activityFeed, data.event] : prev.activityFeed;
            return { ...prev, stagedPrs: [...prev.stagedPrs, data.pr], activityFeed: feed };
          });
        }
      }

      if (event === 'AST_REPORT_SAVED') {
        if (data && data.report) {
          setSession(prev => {
            if (!prev) return null;
            const feed = data.event ? [...prev.activityFeed, data.event] : prev.activityFeed;
            return { ...prev, astReports: [...prev.astReports, data.report], activityFeed: feed };
          });
        }
      }
    });

    return () => {
      // FIX BUG: Do NOT call disconnectSocket() here.
      // The socket is a singleton — disconnecting it on session state changes
      // killed ALL players' connections whenever a new player joined (because
      // the session state update re-ran this effect, triggering disconnect).
      // Socket cleanup happens only on intentional logout / page unload.
    };
  // FIX BUG 2: Remove currentUser?.id — Firestore listener updates currentUser which was
  // causing the socket to disconnect/reconnect on every player join event.
  // The socket room key only depends on the session keys, not on currentUser identity.
  }, [session?.id, session?.joinCode]);

  // ─── REALTIME DATABASE MULTIPLAYER LISTENER ─────────────────────────────────
  // Primary multiplayer sync engine: Realtime Database with 0 quota issues,
  // sub-100ms latency, automatic presence tracking, and synchronized full-room state.
  useEffect(() => {
    const joinCode = session?.joinCode?.toUpperCase();
    if (!joinCode || !currentUser || !session) return;

    const unsub = listenToRoomInRTDB(joinCode, (roomData) => {
      const {
        meta,
        players,
        files,
        votes,
        chatMessages,
        testRuns,
        systemIntegrity,
        sabotageState,
        stagedPrs,
        gitCommits,
        activityFeed,
        eliminationHistory,
        isCodeFrozen
      } = roomData;

      if (!players || players.length === 0) return;

      setSession(prev => {
        if (!prev) return prev;
        let updated = { ...prev };
        let changed = false;

        // 1. Sync players list (including roles and alive statuses)
        if (JSON.stringify(players) !== JSON.stringify(prev.players)) {
          updated.players = players;
          changed = true;
        }

        // 2. Sync phase changes
        if (meta?.phase && meta.phase !== prev.phase) {
          updated.phase = meta.phase;
          setCurrentPhase(meta.phase as any);
          changed = true;
        }

        // 3. Sync round
        if (meta?.currentRound && meta.currentRound !== prev.currentRound) {
          updated.currentRound = meta.currentRound;
          changed = true;
        }

        // 4. Authoritative Phase Timer Sync: guarantees identical countdowns on all devices
        if (meta?.phaseEndsAt !== undefined && meta.phaseEndsAt !== prev.phaseEndsAt) {
          updated.phaseEndsAt = meta.phaseEndsAt;
          changed = true;
        }

        // 5. Sync winner and win reason
        if (meta?.winner !== undefined && meta.winner !== prev.winner) {
          updated.winner = meta.winner;
          changed = true;
        }
        if (meta?.winReason !== undefined && meta.winReason !== prev.winReason) {
          updated.winReason = meta.winReason;
          changed = true;
        }

        // 6. Sync Code Freeze status across all players
        if (isCodeFrozen !== undefined && isCodeFrozen !== prev.isCodeFrozen) {
          updated.isCodeFrozen = isCodeFrozen;
          changed = true;
        }

        // 7. Real-time Votes Sync
        if (votes && JSON.stringify(votes) !== JSON.stringify(prev.votes)) {
          updated.votes = votes;
          changed = true;
        }

        // 8. Runtime Codebase Sync: propagate shared code files across all operatives
        if (files && Array.isArray(files) && files.length > 0) {
          const filesDiffer = files.some(rf => {
            const local = prev.files.find(lf => lf.path === rf.path);
            return !local || local.currentContent !== rf.currentContent;
          });
          if (filesDiffer) {
            updated.files = files;
            changed = true;
          }
        }

        // 9. Chat Messages Sync
        if (chatMessages && Array.isArray(chatMessages) && chatMessages.length > prev.chatMessages.length) {
          updated.chatMessages = chatMessages;
          changed = true;
        }

        // 10. Test Runs Sync
        if (testRuns && Array.isArray(testRuns) && testRuns.length > prev.testRuns.length) {
          updated.testRuns = testRuns;
          changed = true;
        }

        // 11. System Integrity Gauge Sync
        if (systemIntegrity && systemIntegrity.score !== prev.systemIntegrity?.score) {
          updated.systemIntegrity = systemIntegrity;
          changed = true;
        }

        // 12. Sabotage State Sync
        if (sabotageState && JSON.stringify(sabotageState) !== JSON.stringify(prev.sabotageState)) {
          updated.sabotageState = sabotageState;
          changed = true;
        }

        // 13. Staged PRs Sync
        if (stagedPrs && Array.isArray(stagedPrs) && stagedPrs.length !== prev.stagedPrs.length) {
          updated.stagedPrs = stagedPrs;
          changed = true;
        }

        // 14. Activity Feed Timeline Sync
        if (activityFeed && Array.isArray(activityFeed) && activityFeed.length > prev.activityFeed.length) {
          updated.activityFeed = activityFeed;
          changed = true;
        }

        // 15. Git Commits Audit Trail Sync
        if (gitCommits && Array.isArray(gitCommits) && gitCommits.length > prev.gitCommits.length) {
          updated.gitCommits = gitCommits;
          changed = true;
        }

        // 16. Elimination History Sync
        if (eliminationHistory && Array.isArray(eliminationHistory) && eliminationHistory.length > prev.eliminationHistory.length) {
          updated.eliminationHistory = eliminationHistory;
          changed = true;
        }

        return changed ? updated : prev;
      });

      // Sync currentUser host, ready, alive, and assigned role
      const meUser = currentUserRef.current;
      const activeId = localStorage.getItem('code_mafia_user_id');
      const activeName = localStorage.getItem('code_mafia_active_user');
      const me = players.find(p =>
        (meUser && (p.id === meUser.id || p.displayName === meUser.displayName)) ||
        (activeId && p.id === activeId) ||
        (activeName && p.displayName === activeName)
      );
      if (me) {
        setCurrentUser(prev => {
          if (!prev) {
            return {
              id: me.id,
              displayName: me.displayName,
              isAlive: me.isAlive !== false,
              isHost: me.isHost,
              isBot: false,
              isReady: me.isReady,
              role: me.role,
              avatarColor: me.avatarColor || 'bg-purple-600',
              stats: me.stats || { bugsFixed: 0, testsRun: 0, votesCast: 0 }
            };
          }
          if (
            me.isHost !== prev.isHost ||
            me.isReady !== prev.isReady ||
            me.isAlive !== prev.isAlive ||
            (me.role && me.role !== prev.role)
          ) {
            return {
              ...prev,
              isHost: me.isHost,
              isReady: me.isReady,
              isAlive: me.isAlive,
              role: me.role || prev.role
            };
          }
          return prev;
        });
      }
    });

    return () => unsub();
  }, [session?.joinCode]);

  // ─── FIRESTORE PHASE LISTENER (Secondary Backup) ─────────────────────────────
  useEffect(() => {
    const listenKey = session?.joinCode?.toUpperCase() || session?.id?.toUpperCase();
    if (!listenKey || !session || session.phase === 'LOBBY') return;

    try {
      const unsubscribe = listenToFirestoreSession(listenKey, (firestoreData) => {
        if (!firestoreData) return;
        setSession(prev => {
          if (!prev) return prev;
          if (firestoreData.phase && firestoreData.phase !== prev.phase) {
            setCurrentPhase(firestoreData.phase);
            return { ...prev, phase: firestoreData.phase };
          }
          return prev;
        });
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('[Firestore listener skipped]:', e);
    }
  }, [session?.joinCode, session?.id, session?.phase]);

  // Handler: Create Game (Mode 1: Launch Arena Match)
  const handleCreateGame = async (config: GameConfig, hostName: string) => {
    const effectiveHost = hostName.trim() || currentUser?.displayName || localStorage.getItem('code_mafia_active_user') || 'OperativeUser';
    localStorage.setItem('code_mafia_active_user', effectiveHost);

    // Pre-generate a 6-character stable PIN
    const stableJoinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    let stableUserId = localStorage.getItem('code_mafia_user_id');
    if (!stableUserId) {
      stableUserId = `usr-${Date.now()}`;
      localStorage.setItem('code_mafia_user_id', stableUserId);
    }

    const hostPlayer: Player = {
      id: stableUserId,
      displayName: effectiveHost,
      isAlive: true,
      isHost: true,
      isBot: false,
      isReady: true,
      avatarColor: 'bg-purple-600',
      stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
    };

    const initialSession = createInitialSession(config, effectiveHost, stableJoinCode);
    initialSession.id = `sess-${Date.now()}`;
    initialSession.hostName = effectiveHost;
    initialSession.players = [hostPlayer];

    // 1. INSTANT UI TRANSITION (Zero latency, user enters lobby immediately!)
    setSession(initialSession);
    setCurrentUser(hostPlayer);
    setCurrentPhase('LOBBY');

    // 2. PRIMARY SYNC: Save room to RTDB immediately
    saveRoomToRTDB(initialSession).catch(err => console.warn('[RTDB saveRoom error]:', err));

    // 3. Worker API integration (non-blocking)
    try {
      await apiCreateSession({
        hostName: effectiveHost,
        packId: config.packId,
        playerCount: config.playerCount,
        mafiaCount: config.mafiaCount,
        joinCode: stableJoinCode
      });
    } catch (e) {
      console.warn('[API Create Session Fallback]:', e);
    }

    // 4. Secondary: Firestore (safely ignored if quota exceeded)
    try {
      await syncSessionToFirestore(initialSession);
    } catch (err) {
      console.warn('[Firestore sync skipped]:', err);
    }
  };

  // Handler: Join Room by PIN / Code (Mode 2: Enter Room Pin / Join Code)
  const handleJoinByPin = async (pinCode: string) => {
    const activeUserName = currentUser?.displayName || localStorage.getItem('code_mafia_active_user') || 'OperativeUser';
    const cleanPin = pinCode.trim().toUpperCase();

    let stableUserId = localStorage.getItem('code_mafia_user_id');
    if (!stableUserId) {
      stableUserId = `usr-${Date.now()}`;
      localStorage.setItem('code_mafia_user_id', stableUserId);
    }

    try {
      // 1. PRIMARY LOOKUP: Check Realtime Database first (zero quota issues, instant response)
      const rtdbRoom = await getRoomFromRTDB(cleanPin);

      let targetSession: GameSession;
      let meAsPlayer: Player;

      if (rtdbRoom && rtdbRoom.meta) {
        const existingPlayers: Player[] = rtdbRoom.players || [];
        const hostName = rtdbRoom.meta.hostName || existingPlayers.find(p => p.isHost)?.displayName || 'OperativeHost';
        const existingMe = existingPlayers.find(p => p.displayName === activeUserName || p.id === stableUserId);

        if (existingMe) {
          meAsPlayer = { ...existingMe, isHost: existingMe.displayName === hostName };
        } else {
          meAsPlayer = {
            id: stableUserId,
            displayName: activeUserName,
            isAlive: true,
            isHost: activeUserName === hostName,
            isBot: false,
            isReady: false,
            avatarColor: 'bg-purple-600',
            stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
          };
        }

        const updatedPlayers = existingMe
          ? existingPlayers.map(p => ({ ...p, isHost: p.displayName === hostName }))
          : [...existingPlayers.map(p => ({ ...p, isHost: p.displayName === hostName })), meAsPlayer];

        const matchConfig: GameConfig = rtdbRoom.meta.config || {
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

        const base = createInitialSession(matchConfig, hostName, cleanPin);
        targetSession = {
          ...base,
          id: rtdbRoom.meta.id || cleanPin,
          joinCode: cleanPin,
          phase: (rtdbRoom.meta.phase as any) || 'LOBBY',
          phaseEndsAt: rtdbRoom.meta.phaseEndsAt || 0,
          currentRound: rtdbRoom.meta.currentRound || 1,
          winner: rtdbRoom.meta.winner || null,
          winReason: rtdbRoom.meta.winReason || null,
          isCodeFrozen: !!rtdbRoom.isCodeFrozen,
          files: (rtdbRoom.files && Array.isArray(rtdbRoom.files) && rtdbRoom.files.length > 0) ? rtdbRoom.files : base.files,
          votes: rtdbRoom.votes || {},
          chatMessages: (rtdbRoom.chatMessages && Array.isArray(rtdbRoom.chatMessages)) ? rtdbRoom.chatMessages : base.chatMessages,
          testRuns: (rtdbRoom.testRuns && Array.isArray(rtdbRoom.testRuns)) ? rtdbRoom.testRuns : base.testRuns,
          systemIntegrity: rtdbRoom.systemIntegrity || base.systemIntegrity,
          sabotageState: rtdbRoom.sabotageState || base.sabotageState,
          stagedPrs: (rtdbRoom.stagedPrs && Array.isArray(rtdbRoom.stagedPrs)) ? rtdbRoom.stagedPrs : base.stagedPrs,
          gitCommits: (rtdbRoom.gitCommits && Array.isArray(rtdbRoom.gitCommits)) ? rtdbRoom.gitCommits : base.gitCommits,
          activityFeed: (rtdbRoom.activityFeed && Array.isArray(rtdbRoom.activityFeed)) ? rtdbRoom.activityFeed : base.activityFeed,
          eliminationHistory: (rtdbRoom.eliminationHistory && Array.isArray(rtdbRoom.eliminationHistory)) ? rtdbRoom.eliminationHistory : base.eliminationHistory,
          hostName,
          players: updatedPlayers
        };
      } else {
        // 2. SECONDARY FALLBACK: Check Cloud Firestore
        let firestoreDoc: any = null;
        try {
          const { getSessionFromFirestore } = await import('./services/firebaseStore');
          firestoreDoc = await getSessionFromFirestore(cleanPin);
        } catch (e) {
          console.warn('[Firestore lookup skipped]:', e);
        }

        if (firestoreDoc) {
          const existingPlayers: Player[] = (Array.isArray(firestoreDoc.players) ? firestoreDoc.players : [])
            .filter((p: any) => !p.isBot);
          const hostName = firestoreDoc.hostName || existingPlayers.find((p: any) => p.isHost)?.displayName || activeUserName;
          const existingMe = existingPlayers.find((p: any) => p.displayName === activeUserName);

          if (existingMe) {
            meAsPlayer = { ...existingMe, isHost: existingMe.displayName === hostName };
          } else {
            meAsPlayer = {
              id: stableUserId,
              displayName: activeUserName,
              isAlive: true,
              isHost: false,
              isBot: false,
              isReady: false,
              avatarColor: 'bg-purple-600',
              stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
            };
          }

          const updatedPlayers = existingMe
            ? existingPlayers.map(p => ({ ...p, isHost: p.displayName === hostName }))
            : [...existingPlayers.map(p => ({ ...p, isHost: p.displayName === hostName })), meAsPlayer];

          const matchConfig: GameConfig = firestoreDoc.config || {
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

          const base = createInitialSession(matchConfig, hostName, cleanPin);
          targetSession = {
            ...base,
            id: firestoreDoc.id || cleanPin,
            joinCode: cleanPin,
            phase: firestoreDoc.phase || 'LOBBY',
            hostName,
            players: updatedPlayers
          };
        } else {
          // Room not found in snapshot: connect to the room as a joining player without overwriting the host
          meAsPlayer = {
            id: stableUserId,
            displayName: activeUserName,
            isAlive: true,
            isHost: false,
            isBot: false,
            isReady: false,
            avatarColor: 'bg-purple-600',
            stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
          };
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
          targetSession = createInitialSession(defaultConfig, 'OperativeHost', cleanPin);
          targetSession.joinCode = cleanPin;
          targetSession.hostName = 'OperativeHost';
          targetSession.players = [meAsPlayer];
        }
      }

      setSession(targetSession);
      setCurrentUser(meAsPlayer);
      setCurrentPhase('LOBBY');

      // Write player presence to RTDB
      await joinRoomInRTDB(cleanPin, meAsPlayer);

      // Broadcast via socket for low latency
      emitMultiplayerEvent('PLAYER_JOINED', {
        roomId: cleanPin,
        player: meAsPlayer,
        sessionData: targetSession
      });

      // Firestore secondary sync (safely ignored if quota exhausted)
      try {
        const { syncSessionToFirestore } = await import('./services/firebaseStore');
        await syncSessionToFirestore(targetSession);
      } catch (err) {
        console.warn('[Firestore sync skipped]:', err);
      }
    } catch (e) {
      console.warn('[Join PIN Error]:', e);
    }
  };

  // Handler: Quick Match — Global Matchmaking Scanner (Mode 3: Quick Match - Find Game)
  const handleQuickMatch = async () => {
    const activeUserName = currentUser?.displayName || localStorage.getItem('code_mafia_active_user') || 'OperativeUser';

    try {
      // 1. PRIMARY: Scan Firebase Realtime Database for open lobby rooms
      const openRtdbRoom = await findGlobalOpenSessionFromRTDB();
      if (openRtdbRoom && openRtdbRoom.joinCode) {
        console.log(`[Quick Match] Found open room in RTDB: ${openRtdbRoom.joinCode} (${openRtdbRoom.playersCount} players)`);
        await handleJoinByPin(openRtdbRoom.joinCode);
        return;
      }

      // 2. SECONDARY: Scan Cloud Firestore
      try {
        const { findGlobalOpenSessionFromFirestore } = await import('./services/firebaseStore');
        const openRoom = await findGlobalOpenSessionFromFirestore();
        if (openRoom && openRoom.joinCode) {
          console.log(`[Quick Match] Found open room in Firestore: ${openRoom.joinCode}`);
          await handleJoinByPin(openRoom.joinCode);
          return;
        }
      } catch (e) {
        console.warn('[Firestore Quick Match skipped]:', e);
      }
    } catch (e) {
      console.warn('[Quick Match] Scan fallback:', e);
    }

    // 3. No open rooms found — Create a new global arena room and wait for live players
    console.log('[Quick Match] No open rooms found. Creating new arena room...');
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
    await handleCreateGame(defaultConfig, activeUserName);
  };

  // Handler: Ready Up
  const handleToggleReady = async () => {
    if (!session || !currentUser) return;
    const newReady = !currentUser.isReady;
    const updatedPlayers = session.players.map(p =>
      p.displayName === currentUser.displayName || p.id === currentUser.id ? { ...p, isReady: newReady } : p
    );
    const updatedUser = { ...currentUser, isReady: newReady };
    const updatedSession = { ...session, players: updatedPlayers };

    setSession(updatedSession);
    setCurrentUser(updatedUser);

    const channelKey = (session.joinCode || session.id).toUpperCase();
    // PRIMARY SYNC: Update ready state in RTDB — propagates instantly to all peers
    if (session.joinCode) {
      await updatePlayerReadyInRTDB(session.joinCode, currentUser.id, newReady);
    }
    // Secondary: WebSocket broadcast + Firestore persistence
    emitMultiplayerEvent('PLAYER_READY_TOGGLED', { roomId: channelKey, playerId: currentUser.id, isReady: newReady });
    try {
      await syncSessionToFirestore(updatedSession);
    } catch (e) {
      console.warn('[Firestore ready sync skipped]:', e);
    }
  };

  // Handler: Start Game
  const handleStartGame = async () => {
    if (!session) return;
    const sessionWithRoles = assignRoles(session);
    setSession(sessionWithRoles);
    const updatedMe = sessionWithRoles.players.find(p => p.id === currentUser?.id || p.displayName === currentUser?.displayName) || currentUser;
    setCurrentUser(updatedMe);
    setCurrentPhase('ROLE_REVEAL');

    const channelKey = (session.joinCode || session.id).toUpperCase();

    // PRIMARY SYNC: Broadcast phase transition in RTDB with authoritative timer and assigned player roles
    if (session.joinCode) {
      await updatePlayersInRTDB(session.joinCode, sessionWithRoles.players);
      await setRoomPhaseInRTDB(session.joinCode, 'ROLE_REVEAL', { phaseEndsAt: sessionWithRoles.phaseEndsAt });
      await syncSessionToRTDB(sessionWithRoles);
    }

    emitMultiplayerEvent('GAME_STARTED', { roomId: channelKey, phase: 'ROLE_REVEAL', session: sessionWithRoles });
    try {
      await syncSessionToFirestore(sessionWithRoles);
    } catch (e) {
      console.warn('[Firestore start sync skipped]:', e);
    }
  };

  // Handler: Acknowledge Role -> Start Round 1
  const handleAcknowledgeRole = async () => {
    if (!session) return;
    const workSession = startWorkRound(session);
    setSession(workSession);
    setCurrentPhase('WORK_ROUND');

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await setRoomPhaseInRTDB(session.joinCode, 'WORK_ROUND', { phaseEndsAt: workSession.phaseEndsAt });
      await syncSessionToRTDB(workSession);
    }
    emitMultiplayerEvent('PHASE_ADVANCED', { roomId: channelKey, phase: 'WORK_ROUND', session: workSession });
    try {
      await syncSessionToFirestore(workSession);
    } catch (e) {
      console.warn('[Firestore sync skipped]:', e);
    }
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

    const channelKey = (session.joinCode || session.id).toUpperCase();

    // Sync updated runtime codebase to RTDB so all players see changes live
    if (session.joinCode) {
      syncFilesToRTDB(session.joinCode, updatedFiles);
    }

    emitMultiplayerEvent('CODE_EDIT', {
      roomId: channelKey,
      filePath,
      newContent,
      playerId: currentUser.id,
      playerName: currentUser.displayName
    });
    emitMultiplayerEvent('CODE_UPDATED', {
      roomId: channelKey,
      filePath,
      newContent,
      playerId: currentUser.id,
      playerName: currentUser.displayName
    });
  };

  // Handler: Stage PR Hotfix to Staging Branch
  const handleStagePrHotfix = async () => {
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

    const updatedPrs = [...session.stagedPrs, pr];
    const updatedFeed = [...session.activityFeed, prEvent];

    setSession({
      ...session,
      stagedPrs: updatedPrs,
      activityFeed: updatedFeed
    });

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await syncStagedPrsToRTDB(session.joinCode, updatedPrs, updatedFeed);
    }
    emitMultiplayerEvent('PR_STAGED', { roomId: channelKey, pr, event: prEvent });
  };

  // Handler: Activate Mafia Covert Memory Leak
  const handleActivateMemoryLeak = async () => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    const newSession = activateMemoryLeak(session);
    setSession(newSession);

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await syncSabotageToRTDB(session.joinCode, newSession.sabotageState, newSession.activityFeed);
    }
    emitMultiplayerEvent('SABOTAGE_ACTIVATED', {
      roomId: channelKey,
      sabotageState: newSession.sabotageState,
      event: newSession.activityFeed[newSession.activityFeed.length - 1]
    });
  };

  // Handler: Activate Mafia Covert Silent Regression
  const handleActivateSilentRegression = async () => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    const newSession = activateSilentRegression(session);
    setSession(newSession);

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await syncSabotageToRTDB(session.joinCode, newSession.sabotageState, newSession.activityFeed);
    }
    emitMultiplayerEvent('SABOTAGE_ACTIVATED', {
      roomId: channelKey,
      sabotageState: newSession.sabotageState,
      event: newSession.activityFeed[newSession.activityFeed.length - 1]
    });
  };

  // Handler: Activate Mafia Covert Syntax Masking
  const handleActivateSyntaxMasking = async (targetPlayer: Player) => {
    if (!session || !currentUser || currentUser.role !== 'MAFIA') return;
    const newSession = activateSyntaxMasking(session, targetPlayer);
    setSession(newSession);

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await syncSabotageToRTDB(session.joinCode, newSession.sabotageState, newSession.activityFeed);
    }
    emitMultiplayerEvent('SABOTAGE_ACTIVATED', {
      roomId: channelKey,
      sabotageState: newSession.sabotageState,
      event: newSession.activityFeed[newSession.activityFeed.length - 1]
    });
  };

  // Handler: Emergency Call Code Freeze
  const handleTriggerCodeFreeze = async () => {
    if (!session || !currentUser) return;
    const freezeEvent = {
      id: `freeze-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      playerId: currentUser.id,
      playerName: currentUser.displayName,
      type: 'CODE_FREEZE' as const,
      details: `Emergency Code Freeze called by ${currentUser.displayName}! Editor locked for incident review.`
    };

    const updatedFeed = [...session.activityFeed, freezeEvent];

    setSession({
      ...session,
      isCodeFrozen: true,
      activityFeed: updatedFeed
    });

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await setCodeFrozenInRTDB(session.joinCode, true, updatedFeed);
    }
    emitMultiplayerEvent('CODE_FREEZE_TOGGLED', {
      roomId: channelKey,
      isCodeFrozen: true,
      event: freezeEvent
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
  const handleTriggerFakeCi = async () => {
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

    const updatedSabotage = {
      ...session.sabotageState,
      fakeCiActiveUntil: activeUntil
    };
    const updatedFeed = [...session.activityFeed, sabotageEvent];

    setSession({
      ...session,
      sabotageState: updatedSabotage,
      activityFeed: updatedFeed
    });

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await syncSabotageToRTDB(session.joinCode, updatedSabotage, updatedFeed);
    }
    emitMultiplayerEvent('SABOTAGE_ACTIVATED', {
      roomId: channelKey,
      sabotageState: updatedSabotage,
      event: sabotageEvent
    });
  };

  // Handler: Inject Flaky Regression Trap
  const handleInjectFlakyTest = async () => {
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
    const updatedSabotage = {
      ...session.sabotageState,
      flakyTestInjected: true
    };

    const updatedSession = {
      ...session,
      contentPack: {
        ...session.contentPack,
        testSuite: updatedSuite
      },
      sabotageState: updatedSabotage
    };

    setSession(updatedSession);

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await syncSabotageToRTDB(session.joinCode, updatedSabotage, session.activityFeed);
    }
    emitMultiplayerEvent('SABOTAGE_ACTIVATED', {
      roomId: channelKey,
      sabotageState: updatedSabotage
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

    const channelKey = (session.joinCode || session.id).toUpperCase();
    emitMultiplayerEvent('AST_REPORT_SAVED', { roomId: channelKey, report, event: scanEvent });
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

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await syncTestRunToRTDB(session.joinCode, evaluatedSession.testRuns, updatedIntegrity, evaluatedSession.activityFeed);
      if (evaluatedSession.phase === 'RESULTS') {
        await syncSessionToRTDB(evaluatedSession);
      }
    }

    emitMultiplayerEvent('TRIGGER_TEST_RUN', {
      roomId: channelKey,
      testRunResult,
      systemIntegrity: updatedIntegrity,
      activityEvent: runEvent
    });
    emitMultiplayerEvent('TEST_RUN_COMPLETED', {
      roomId: channelKey,
      testRunResult,
      systemIntegrity: updatedIntegrity,
      activityEvent: runEvent
    });
  };

  // Handler: Send Chat
  const handleSendMessage = async (text: string, isMafiaOnly?: boolean) => {
    if (!session || !currentUser) return;
    const msg = {
      id: `msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text,
      isMafiaOnly
    };

    const updatedMessages = [...session.chatMessages, msg];

    setSession({
      ...session,
      chatMessages: updatedMessages
    });

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await sendChatToRTDB(session.joinCode, msg, updatedMessages);
    }

    emitMultiplayerEvent('SEND_CHAT', { roomId: channelKey, message: msg });
    emitMultiplayerEvent('CHAT_RECEIVED', { roomId: channelKey, message: msg });
  };

  // Handler: Advance to Discussion
  const handleAdvanceToDiscussion = async () => {
    if (!session) return;
    const discSession = startDiscussion(session);
    setSession(discSession);
    setCurrentPhase('DISCUSSION');
    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await setRoomPhaseInRTDB(session.joinCode, 'DISCUSSION', { phaseEndsAt: discSession.phaseEndsAt });
      await syncSessionToRTDB(discSession);
    }
    emitMultiplayerEvent('PHASE_ADVANCED', { roomId: channelKey, phase: 'DISCUSSION', session: discSession });
  };

  // Handler: Advance to Voting
  const handleAdvanceToVoting = async () => {
    if (!session) return;
    const votingSession = startVoting(session);
    setSession(votingSession);
    setCurrentPhase('VOTING');
    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await clearVotesInRTDB(session.joinCode);
      await setRoomPhaseInRTDB(session.joinCode, 'VOTING', { phaseEndsAt: votingSession.phaseEndsAt });
      await syncSessionToRTDB(votingSession);
    }
    emitMultiplayerEvent('PHASE_ADVANCED', { roomId: channelKey, phase: 'VOTING', session: votingSession });
  };

  // Handler: Cast Vote
  const handleCastVote = async (targetPlayerId: string | null) => {
    if (!session || !currentUser) return;
    const updatedVotes = { ...session.votes, [currentUser.id]: targetPlayerId };

    const voteEvent = {
      id: `vote-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      playerId: currentUser.id,
      playerName: currentUser.displayName,
      type: 'VOTE' as const,
      details: targetPlayerId ? `Cast elimination vote` : `Abstained from voting`
    };

    setSession({
      ...session,
      votes: updatedVotes,
      activityFeed: [...session.activityFeed, voteEvent]
    });

    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await castVoteInRTDB(session.joinCode, currentUser.id, targetPlayerId);
    }

    emitMultiplayerEvent('CAST_VOTE', {
      roomId: channelKey,
      voterId: currentUser.id,
      targetId: targetPlayerId
    });
    emitMultiplayerEvent('VOTE_REGISTERED', {
      roomId: channelKey,
      voterId: currentUser.id,
      targetId: targetPlayerId
    });
  };

  // Handler: Tally Vote -> Process Elimination
  const handleProcessElimination = async () => {
    if (!session) return;
    // CRITICAL: Only the host computes authoritative elimination outcome and broadcasts to all peers
    if (currentUser && !currentUser.isHost) {
      console.log('[Voting] Operative client waiting for Host to tally votes and broadcast elimination...');
      return;
    }
    const elimSession = processElimination(session);
    setSession(elimSession);
    setCurrentPhase(elimSession.phase);
    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.joinCode) {
      await updatePlayersInRTDB(session.joinCode, elimSession.players);
      await setRoomPhaseInRTDB(session.joinCode, elimSession.phase, {
        phaseEndsAt: elimSession.phaseEndsAt,
        winner: elimSession.winner || null,
        winReason: elimSession.winReason || null
      });
      await syncSessionToRTDB(elimSession);
    }
    emitMultiplayerEvent('PHASE_ADVANCED', { roomId: channelKey, phase: elimSession.phase, session: elimSession });
  };

  // Handler: Continue after Elimination
  const handleContinueAfterElimination = async () => {
    if (!session) return;
    const channelKey = (session.joinCode || session.id).toUpperCase();
    if (session.phase === 'RESULTS') {
      setCurrentPhase('RESULTS');
      if (session.joinCode) {
        await setRoomPhaseInRTDB(session.joinCode, 'RESULTS');
      }
      emitMultiplayerEvent('PHASE_ADVANCED', { roomId: channelKey, phase: 'RESULTS', session });
    } else {
      const nextRoundSession: GameSession = {
        ...session,
        currentRound: session.currentRound + 1
      };
      const workSession = startWorkRound(nextRoundSession);
      setSession(workSession);
      setCurrentPhase('WORK_ROUND');
      if (session.joinCode) {
        await setRoomPhaseInRTDB(session.joinCode, 'WORK_ROUND', {
          currentRound: nextRoundSession.currentRound,
          phaseEndsAt: workSession.phaseEndsAt
        });
        await syncSessionToRTDB(workSession);
      }
      emitMultiplayerEvent('PHASE_ADVANCED', { roomId: channelKey, phase: 'WORK_ROUND', session: workSession });
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
              localStorage.setItem('code_mafia_active_user', cleanName);
              const updatedUser = {
                id: `usr-${Date.now()}`,
                displayName: cleanName,
                isAlive: true,
                isHost: false,
                isBot: false,
                isReady: false,
                avatarColor: 'bg-purple-600',
                stats: { bugsFixed: 0, testsRun: 0, votesCast: 0 }
              };
              setCurrentUser(updatedUser);
              setSession(null);
              sessionStorage.removeItem('code_mafia_active_session');
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
