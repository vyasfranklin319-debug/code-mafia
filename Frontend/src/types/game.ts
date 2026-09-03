export type Role = 'DEVELOPER' | 'MAFIA' | 'INSPECTOR' | 'SPECTATOR';

export type Phase = 
  | 'LOGIN'
  | 'DASHBOARD'
  | 'JOURNEY'
  | 'CONFIG_WIZARD'
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'WORK_ROUND'
  | 'DISCUSSION'
  | 'VOTING'
  | 'ELIMINATION'
  | 'RESULTS'
  | 'HISTORY'
  | 'ADMIN_PACKS';

export type TransparencyLevel = 'FULL' | 'DIFF_ONLY' | 'ANONYMIZED';
export type TieRule = 'NO_ELIMINATION' | 'RUNOFF';

export interface Player {
  id: string;
  displayName: string;
  role?: Role;
  isAlive: boolean;
  isHost: boolean;
  isBot: boolean;
  isReady: boolean;
  avatarColor: string;
  stats: {
    bugsFixed: number;
    testsRun: number;
    votesCast: number;
  };
}

export interface GameConfig {
  packId: string;
  playerCount: number; // 5 - 12
  mafiaCount: number;  // 1 - 4
  workRoundSeconds: number; // e.g. 180 (3m)
  discussionSeconds: number; // e.g. 90 (1.5m)
  votingSeconds: number; // e.g. 45
  transparencyLevel: TransparencyLevel;
  tieRule: TieRule;
  passRateThreshold: number; // e.g. 100%
  maxRounds: number; // e.g. 3 or 4 rounds
}

export interface ContentFile {
  path: string;
  name: string;
  language: 'javascript' | 'typescript' | 'python';
  initialContent: string;
  currentContent: string;
  readOnly?: boolean;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  isHidden: boolean;
  status?: 'PASS' | 'FAIL' | 'ERROR' | 'PENDING';
  durationMs?: number;
  errorMessage?: string;
  isFlaky?: boolean;
}

export interface ContentPack {
  id: string;
  name: string;
  description: string;
  language: 'javascript' | 'python';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  minPlayers: number;
  maxPlayers: number;
  estDurationMinutes: number;
  files: ContentFile[];
  testSuite: TestCase[];
  referenceSolution: Record<string, string>; // path -> correct code
}

export interface GitCommit {
  id: string;
  hash: string;
  authorId: string;
  authorName: string;
  timestamp: string;
  filePath: string;
  linesAdded: number;
  linesRemoved: number;
  diffSnippet: string;
  isShadow?: boolean;
}

export interface AstFinding {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  rule: string;
  line: number;
  message: string;
}

export interface AstReport {
  id: string;
  targetPlayerId: string;
  targetPlayerName: string;
  complexityScore: number;
  scannedFilePath: string;
  findings: AstFinding[];
  timestamp: string;
}

export interface SabotageState {
  shadowCommitsRemaining: number;
  fakeCiActiveUntil: number | null;
  flakyTestInjected: boolean;
  memoryLeakActive: boolean;
  silentRegressionActive: boolean;
  syntaxMaskedPlayerId: string | null;
}

export type PipelineStatus = 'STAGING' | 'BUILDING' | 'TESTING' | 'DEPLOYED' | 'PIPELINE_BROKEN';

export interface SystemIntegrity {
  score: number; // 0 - 100%
  pipelineStatus: PipelineStatus;
  buildDurationMs: number;
  lastUpdated: string;
}

export interface PrHotfix {
  id: string;
  prNumber: number;
  authorId: string;
  authorName: string;
  title: string;
  filePath: string;
  oldContent: string;
  newContent: string;
  timestamp: string;
  status: 'STAGED' | 'TESTING' | 'MERGED' | 'REJECTED';
  testPassCount?: number;
  testTotalCount?: number;
}

export interface ReplayFrame {
  stepIndex: number;
  timestampLabel: string;
  relativeMs: number;
  phase: Phase;
  activeFileContent: string;
  gitCommitsCount: number;
  latestCommit?: GitCommit;
  testRunResult?: TestRunResult;
  chatMessagesCount: number;
  eventSummary: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  playerId: string;
  playerName: string;
  type: 'EDIT' | 'TEST_RUN' | 'VOTE' | 'REVERT' | 'SYSTEM' | 'SABOTAGE' | 'SCAN' | 'PR_STAGED' | 'CODE_FREEZE';
  filePath?: string;
  details: string;
  diffSummary?: string;
}

export interface TestRunResult {
  id: string;
  timestamp: string;
  triggeredByPlayerId: string;
  triggeredByPlayerName: string;
  passedCount: number;
  failedCount: number;
  totalCount: number;
  tests: TestCase[];
  durationMs: number;
  errorExcerpt?: string;
  isFakeCi?: boolean;
}

export interface VoteRecord {
  voterId: string;
  voterName: string;
  targetId: string | null; // null = abstain
  roundNumber: number;
}

export interface EliminationRecord {
  roundNumber: number;
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  eliminatedPlayerRole: Role | null;
  voteTally: Record<string, number>; // playerId -> count
  wasTie: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  text: string;
  isSystem?: boolean;
  isMafiaOnly?: boolean;
}

export interface GameSession {
  id: string;
  joinCode: string;
  hostName?: string;
  config: GameConfig;
  phase: Phase;
  currentRound: number;
  players: Player[];
  activeFilePath: string;
  files: ContentFile[];
  contentPack: ContentPack;
  activityFeed: ActivityEvent[];
  testRuns: TestRunResult[];
  votes: Record<string, string | null>; // voterId -> targetId
  eliminationHistory: EliminationRecord[];
  chatMessages: ChatMessage[];
  gitCommits: GitCommit[];
  sabotageState: SabotageState;
  systemIntegrity: SystemIntegrity;
  stagedPrs: PrHotfix[];
  isCodeFrozen: boolean;
  astReports: AstReport[];
  replayFrames: ReplayFrame[];
  phaseEndsAt: number; // Unix timestamp ms
  winner: 'DEVELOPERS' | 'MAFIA' | null;
  winReason?: string;
}

export interface GameHistoryItem {
  id: string;
  date: string;
  packName: string;
  language: string;
  playerCount: number;
  mafiaCount: number;
  winner: 'DEVELOPERS' | 'MAFIA';
  durationMinutes: number;
  roundsCount: number;
}
