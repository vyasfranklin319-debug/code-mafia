export type RankName = 
  | 'Bronze I' | 'Bronze II' | 'Bronze III'
  | 'Silver I' | 'Silver II' | 'Silver III'
  | 'Gold I' | 'Gold II' | 'Gold III' | 'Gold IV'
  | 'Platinum I' | 'Platinum II' | 'Platinum III' | 'Platinum IV'
  | 'Heroic' | 'Master' | 'Grandmaster';

export interface RankDefinition {
  name: RankName;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'HEROIC' | 'MASTER' | 'GRANDMASTER';
  minXp: number;
  maxXp: number;
  badgeIcon: string;
  colorClass: string;
}

export interface RankInfo {
  currentRank: RankDefinition;
  nextRank: RankDefinition | null;
  prevRank: RankDefinition | null;
  currentXp: number;
  requiredXp: number;
  progressPercent: number;
}

export interface RadarSkills {
  debugging: number;
  logic: number;
  problemSolving: number;
  speed: number;
  accuracy: number;
  testing: number;
}

export interface FactorCodingGrowth {
  codingAccuracyPercent: number;
  successfulSubmissions: number;
  buildSuccessRatePercent: number;
  taskCompletionPercent: number;
  codeComplexityImprovement: number; // e.g. +18%
  developmentSpeedScore: number;     // e.g. 88/100
  startingSkillScore: number;
  currentSkillScore: number;
  growthTimeline: { game: string; skillScore: number; date: string }[];
}

export interface FactorDebugging {
  bugsDetected: number;
  bugsFixed: number;
  avgDebuggingTimeSeconds: number;
  firstAttemptFixRatePercent: number;
  difficultBugsSolved: number;
  regressionBugsCount: number;
  problemSolvingAccuracyPercent: number;
  radar: RadarSkills;
}

export interface FactorTestingQuality {
  testsCreated: number;
  testsPassed: number;
  testCoveragePercent: number;
  failedBuilds: number;
  regressionRatePercent: number;
  criticalBugs: number;
  codeQualityScore: number; // 0-100
  cleanCodeScore: number;   // 0-100
  initialQualityScore: number;
}

export interface FactorCollaboration {
  teamContributionsCount: number;
  tasksCompleted: number;
  codeReviewsCount: number;
  successfulMergesCount: number;
  helpfulContributionsCount: number;
  teamObjectivesCompletedCount: number;
  collaborationScore: number; // 0-100
  timeline: { date: string; contributionType: string; scoreGained: number }[];
}

export interface FactorGamePerformance {
  totalGames: number;
  wins: number;
  losses: number;
  winRatePercent: number;
  devWins: number;
  mafiaWins: number;
  bugsFixedPerGame: number;
  tasksCompletedPerGame: number;
  testsPassedPerGame: number;
  mvpGamesCount: number;
  avgGameDurationMinutes: number;
  performancePerGameScore: number;
}

export interface FactorProgression {
  xpEarnedTotal: number;
  performanceConsistencyScore: number;
  currentWinStreak: number;
  bestWinStreak: number;
  weeklyImprovementPercent: number;
  monthlyImprovementPercent: number;
  topStrengths: string[];
  areasToImprove: string[];
  personalizedRecommendations: string[];
}

export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  category: 'BUG_FIX' | 'TESTING' | 'STREAK' | 'COLLABORATION' | 'RANK';
  icon: string;
  isUnlocked: boolean;
  unlockedAtDate?: string;
  currentProgress: number;
  maxProgress: number;
}

export interface DetailedGameAnalyticsItem {
  id: string;
  gameCode: string;
  date: string;
  durationMinutes: number;
  result: 'VICTORY' | 'DEFEAT';
  packName: string;
  language: string;
  playerContributionScore: number;
  bugsDetected: number;
  bugsFixed: number;
  testsPassed: number;
  tasksCompleted: number;
  codeQualityScore: number;
  debuggingScore: number;
  teamPerformanceScore: number;
  xpGained: number;
  rankBefore: RankName;
  rankAfter: RankName;
}

export interface LeaderboardOperative {
  rankPosition: number;
  playerId: string;
  playerName: string;
  avatarColor: string;
  tier: RankName;
  xp: number;
  games: number;
  winRatePercent: number;
  codingScore: number;
  debuggingScore: number;
  codeQualityScore: number;
  collaborationScore: number;
  currentStreak: number;
}

export interface PlayerDeveloperJourney {
  playerId: string;
  playerName: string;
  avatarColor: string;
  rankInfo: RankInfo;
  overallPerformanceScore: number;
  
  // 6 Core Performance Factors
  codingGrowth: FactorCodingGrowth;
  debugging: FactorDebugging;
  testingQuality: FactorTestingQuality;
  collaboration: FactorCollaboration;
  gamePerformance: FactorGamePerformance;
  progression: FactorProgression;

  achievements: AchievementBadge[];
  gameHistory: DetailedGameAnalyticsItem[];
  journeyTimeline: { date: string; milestoneTitle: string; detail: string; rankAchieved?: RankName }[];
}
