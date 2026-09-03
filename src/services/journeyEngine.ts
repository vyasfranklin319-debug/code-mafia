import { 
  RankDefinition, RankName, RankInfo, PlayerDeveloperJourney, 
  LeaderboardOperative, AchievementBadge, DetailedGameAnalyticsItem 
} from '../types/journey';
import { GameHistoryItem } from '../types/game';

// 1. ALL COMPETITIVE RANK DEFINITIONS (BRONZE -> GRANDMASTER)
export const RANK_DEFINITIONS: RankDefinition[] = [
  { name: 'Bronze I', tier: 'BRONZE', minXp: 0, maxXp: 499, badgeIcon: '🥉', colorClass: 'from-amber-700 to-amber-900 border-amber-600' },
  { name: 'Bronze II', tier: 'BRONZE', minXp: 500, maxXp: 999, badgeIcon: '🥉', colorClass: 'from-amber-700 to-amber-900 border-amber-600' },
  { name: 'Bronze III', tier: 'BRONZE', minXp: 1000, maxXp: 1499, badgeIcon: '🥉', colorClass: 'from-amber-700 to-amber-900 border-amber-600' },
  
  { name: 'Silver I', tier: 'SILVER', minXp: 1500, maxXp: 2199, badgeIcon: '🥈', colorClass: 'from-slate-400 to-slate-600 border-slate-300' },
  { name: 'Silver II', tier: 'SILVER', minXp: 2200, maxXp: 2899, badgeIcon: '🥈', colorClass: 'from-slate-400 to-slate-600 border-slate-300' },
  { name: 'Silver III', tier: 'SILVER', minXp: 2900, maxXp: 3599, badgeIcon: '🥈', colorClass: 'from-slate-400 to-slate-600 border-slate-300' },

  { name: 'Gold I', tier: 'GOLD', minXp: 3600, maxXp: 4399, badgeIcon: '🥇', colorClass: 'from-amber-400 to-yellow-600 border-amber-300' },
  { name: 'Gold II', tier: 'GOLD', minXp: 4400, maxXp: 5199, badgeIcon: '🥇', colorClass: 'from-amber-400 to-yellow-600 border-amber-300' },
  { name: 'Gold III', tier: 'GOLD', minXp: 5200, maxXp: 5999, badgeIcon: '🥇', colorClass: 'from-amber-400 to-yellow-600 border-amber-300' },
  { name: 'Gold IV', tier: 'GOLD', minXp: 6000, maxXp: 6799, badgeIcon: '🥇', colorClass: 'from-amber-400 to-yellow-600 border-amber-300' },

  { name: 'Platinum I', tier: 'PLATINUM', minXp: 6800, maxXp: 7699, badgeIcon: '💎', colorClass: 'from-cyan-500 to-blue-700 border-cyan-300' },
  { name: 'Platinum II', tier: 'PLATINUM', minXp: 7700, maxXp: 8599, badgeIcon: '💎', colorClass: 'from-cyan-500 to-blue-700 border-cyan-300' },
  { name: 'Platinum III', tier: 'PLATINUM', minXp: 8600, maxXp: 9499, badgeIcon: '💎', colorClass: 'from-cyan-500 to-blue-700 border-cyan-300' },
  { name: 'Platinum IV', tier: 'PLATINUM', minXp: 9500, maxXp: 10499, badgeIcon: '💎', colorClass: 'from-cyan-500 to-blue-700 border-cyan-300' },

  { name: 'Heroic', tier: 'HEROIC', minXp: 10500, maxXp: 11999, badgeIcon: '🔥', colorClass: 'from-red-600 to-rose-800 border-rose-400' },
  { name: 'Master', tier: 'MASTER', minXp: 12000, maxXp: 14999, badgeIcon: '👑', colorClass: 'from-purple-600 to-violet-900 border-purple-400' },
  { name: 'Grandmaster', tier: 'GRANDMASTER', minXp: 15000, maxXp: 999999, badgeIcon: '⚡', colorClass: 'from-fuchsia-500 via-purple-600 to-indigo-700 border-fuchsia-300' }
];

// Helper: Calculate Rank Info from total XP
export function calculateRankFromXp(xp: number): RankInfo {
  let currentIdx = RANK_DEFINITIONS.findIndex(r => xp >= r.minXp && xp <= r.maxXp);
  if (currentIdx === -1) {
    currentIdx = xp >= 15000 ? RANK_DEFINITIONS.length - 1 : 0;
  }

  const currentRank = RANK_DEFINITIONS[currentIdx];
  const nextRank = currentIdx < RANK_DEFINITIONS.length - 1 ? RANK_DEFINITIONS[currentIdx + 1] : null;
  const prevRank = currentIdx > 0 ? RANK_DEFINITIONS[currentIdx - 1] : null;

  const requiredXp = nextRank ? nextRank.minXp - currentRank.minXp : 1000;
  const xpInTier = xp - currentRank.minXp;
  const progressPercent = nextRank ? Math.min(100, Math.max(0, Math.round((xpInTier / requiredXp) * 100))) : 100;

  return {
    currentRank,
    nextRank,
    prevRank,
    currentXp: xp,
    requiredXp,
    progressPercent
  };
}

// 2. WEIGHTED XP CALCULATION (30% Coding, 20% Debugging, 15% Testing/Quality, 15% Problem Solving, 10% Collaboration, 10% Performance)
export function calculateGameXpReward(metrics: {
  codingScore: number;       // 0-100
  debuggingScore: number;    // 0-100
  testingQualityScore: number;// 0-100
  problemSolvingScore: number;// 0-100
  collaborationScore: number; // 0-100
  gamePerformanceScore: number;// 0-100
  isVictory: boolean;
  bugsFixedCount: number;
}): number {
  const weightedBase = 
    (metrics.codingScore * 0.30) +
    (metrics.debuggingScore * 0.20) +
    (metrics.testingQualityScore * 0.15) +
    (metrics.problemSolvingScore * 0.15) +
    (metrics.collaborationScore * 0.10) +
    (metrics.gamePerformanceScore * 0.10);

  const victoryBonus = metrics.isVictory ? 150 : 30;
  const bugFixBonus = metrics.bugsFixedCount * 45;

  return Math.round((weightedBase * 3.5) + victoryBonus + bugFixBonus);
}

// 3. GENERATE COMPLETE PLAYER DEVELOPER JOURNEY DATA
export function getPlayerDeveloperJourney(playerName: string = 'OperativeAlpha'): PlayerDeveloperJourney {
  // Try retrieving recorded match history
  let rawHistory: GameHistoryItem[] = [];
  try {
    const saved = localStorage.getItem('code_mafia_match_history');
    if (saved) rawHistory = JSON.parse(saved);
  } catch (e) {
    rawHistory = [];
  }

  // Base dynamic metrics seed calculated from actual history length
  const gamesPlayed = Math.max(14, rawHistory.length + 12);
  const wins = Math.max(10, Math.round(gamesPlayed * 0.71));
  const losses = gamesPlayed - wins;
  const winRate = Math.round((wins / gamesPlayed) * 100);

  const baseBugsFixed = 42 + (rawHistory.length * 4);
  const totalXp = 5640 + (rawHistory.length * 280);

  const rankInfo = calculateRankFromXp(totalXp);

  // 10 Detailed Game History Items
  const gameHistory: DetailedGameAnalyticsItem[] = rawHistory.length > 0
    ? rawHistory.map((h, idx) => ({
        id: h.id,
        gameCode: `#CM-${1080 + idx}`,
        date: h.date,
        durationMinutes: h.durationMinutes,
        result: h.winner === 'DEVELOPERS' ? 'VICTORY' : 'DEFEAT',
        packName: h.packName,
        language: h.language,
        playerContributionScore: 88 + (idx % 10),
        bugsDetected: 4 + (idx % 3),
        bugsFixed: 3 + (idx % 2),
        testsPassed: 6 + (idx % 2),
        tasksCompleted: 4,
        codeQualityScore: 90 + (idx % 8),
        debuggingScore: 86 + (idx % 10),
        teamPerformanceScore: 92,
        xpGained: 240 + (idx * 25),
        rankBefore: 'Gold II',
        rankAfter: rankInfo.currentRank.name
      }))
    : Array.from({ length: 8 }, (_, idx) => ({
        id: `hist-dyn-${idx}`,
        gameCode: `#CM-${1080 + idx}`,
        date: `2026-09-0${Math.min(9, idx + 1)} 14:${10 + idx * 5}`,
        durationMinutes: 14 + (idx % 4),
        result: idx % 4 !== 0 ? 'VICTORY' : 'DEFEAT',
        packName: idx % 2 === 0 ? 'Task Master API (JS)' : 'Inventory & Discount (Python)',
        language: idx % 2 === 0 ? 'JavaScript' : 'Python',
        playerContributionScore: 84 + (idx * 2),
        bugsDetected: 5,
        bugsFixed: 4,
        testsPassed: 7,
        tasksCompleted: 4,
        codeQualityScore: 88 + (idx % 5),
        debuggingScore: 91,
        teamPerformanceScore: 89,
        xpGained: 260,
        rankBefore: idx < 4 ? 'Gold II' : 'Gold III',
        rankAfter: idx < 4 ? 'Gold III' : 'Gold IV'
      }));

  const achievements: AchievementBadge[] = [
    { id: 'ach-1', name: 'First Bug Fixed', description: 'Patch your first syntax or logic bug in the arena', category: 'BUG_FIX', icon: '🐞', isUnlocked: true, unlockedAtDate: '2026-08-15', currentProgress: 1, maxProgress: 1 },
    { id: 'ach-2', name: '10 Bugs Fixed', description: 'Eliminate 10 code bugs across matches', category: 'BUG_FIX', icon: '⚡', isUnlocked: true, unlockedAtDate: '2026-08-20', currentProgress: 10, maxProgress: 10 },
    { id: 'ach-3', name: '100 Bugs Fixed', description: 'Reach 100 total bug fixes in operative history', category: 'BUG_FIX', icon: '🎯', isUnlocked: baseBugsFixed >= 100, currentProgress: Math.min(100, baseBugsFixed), maxProgress: 100 },
    { id: 'ach-4', name: 'Debugging Master', description: 'Maintain over 90% debugging accuracy across 10 matches', category: 'BUG_FIX', icon: '🔮', isUnlocked: true, unlockedAtDate: '2026-08-28', currentProgress: 10, maxProgress: 10 },
    { id: 'ach-5', name: 'Perfect Test Run', description: 'Pass 100% of defined unit tests on your first PR staging', category: 'TESTING', icon: '🧪', isUnlocked: true, unlockedAtDate: '2026-09-01', currentProgress: 1, maxProgress: 1 },
    { id: 'ach-6', name: '10 Game Win Streak', description: 'Achieve a 10 game victory streak as a Developer', category: 'STREAK', icon: '🔥', isUnlocked: false, currentProgress: 6, maxProgress: 10 },
    { id: 'ach-7', name: 'Team MVP', description: 'Earn highest contribution score in a match', category: 'COLLABORATION', icon: '👑', isUnlocked: true, unlockedAtDate: '2026-09-02', currentProgress: 4, maxProgress: 5 },
    { id: 'ach-8', name: 'Gold Achiever', description: 'Reach Gold competitive tier rank', category: 'RANK', icon: '🥇', isUnlocked: true, unlockedAtDate: '2026-08-26', currentProgress: 1, maxProgress: 1 },
    { id: 'ach-9', name: 'Platinum Achiever', description: 'Reach Platinum competitive tier rank', category: 'RANK', icon: '💎', isUnlocked: rankInfo.currentRank.tier === 'PLATINUM' || rankInfo.currentRank.tier === 'HEROIC' || rankInfo.currentRank.tier === 'MASTER' || rankInfo.currentRank.tier === 'GRANDMASTER', currentProgress: 0, maxProgress: 1 }
  ];

  return {
    playerId: 'usr-alpha-1',
    playerName,
    avatarColor: 'bg-gradient-to-tr from-purple-600 to-indigo-600',
    rankInfo,
    overallPerformanceScore: 89,

    // Factor A: Coding Skill Growth
    codingGrowth: {
      codingAccuracyPercent: 94,
      successfulSubmissions: 38,
      buildSuccessRatePercent: 91,
      taskCompletionPercent: 88,
      codeComplexityImprovement: 24,
      developmentSpeedScore: 86,
      startingSkillScore: 62,
      currentSkillScore: 92,
      growthTimeline: [
        { game: 'Game #1', skillScore: 62, date: 'Aug 15' },
        { game: 'Game #4', skillScore: 71, date: 'Aug 20' },
        { game: 'Game #8', skillScore: 80, date: 'Aug 26' },
        { game: 'Game #12', skillScore: 86, date: 'Sep 01' },
        { game: 'Game #15', skillScore: 92, date: 'Sep 03' }
      ]
    },

    // Factor B: Debugging & Problem Solving
    debugging: {
      bugsDetected: baseBugsFixed + 14,
      bugsFixed: baseBugsFixed,
      avgDebuggingTimeSeconds: 142,
      firstAttemptFixRatePercent: 82,
      difficultBugsSolved: 16,
      regressionBugsCount: 3,
      problemSolvingAccuracyPercent: 93,
      radar: {
        debugging: 94,
        logic: 90,
        problemSolving: 92,
        speed: 84,
        accuracy: 91,
        testing: 88
      }
    },

    // Factor C: Testing & Code Quality
    testingQuality: {
      testsCreated: 48,
      testsPassed: 112,
      testCoveragePercent: 87,
      failedBuilds: 4,
      regressionRatePercent: 5,
      criticalBugs: 2,
      codeQualityScore: 92,
      cleanCodeScore: 89,
      initialQualityScore: 74
    },

    // Factor D: Collaboration
    collaboration: {
      teamContributionsCount: 64,
      tasksCompleted: 36,
      codeReviewsCount: 22,
      successfulMergesCount: 31,
      helpfulContributionsCount: 58,
      teamObjectivesCompletedCount: 14,
      collaborationScore: 91,
      timeline: [
        { date: 'Sep 03', contributionType: 'Staged PR Hotfix #4 Merged', scoreGained: 45 },
        { date: 'Sep 02', contributionType: 'AST Memory Leak Neutralized', scoreGained: 60 },
        { date: 'Sep 01', contributionType: 'Unit Test Suite Passed 100%', scoreGained: 50 }
      ]
    },

    // Factor E: Game Performance
    gamePerformance: {
      totalGames: gamesPlayed,
      wins,
      losses,
      winRatePercent: winRate,
      devWins: wins,
      mafiaWins: 2,
      bugsFixedPerGame: 3.2,
      tasksCompletedPerGame: 2.6,
      testsPassedPerGame: 7.8,
      mvpGamesCount: 4,
      avgGameDurationMinutes: 16,
      performancePerGameScore: 90
    },

    // Factor F: Consistency & Progression
    progression: {
      xpEarnedTotal: totalXp,
      performanceConsistencyScore: 94,
      currentWinStreak: 6,
      bestWinStreak: 8,
      weeklyImprovementPercent: 18,
      monthlyImprovementPercent: 42,
      topStrengths: [
        'Rapid Bug Identification & Isolation',
        'High First-Attempt Fix Rate (82%)',
        'Clean Code Refactoring & Low Regressions'
      ],
      areasToImprove: [
        'Edge-case unit test coverage expansion (+8%)',
        'Complex AST cyclomatic complexity reduction',
        'Cross-operative code review speed'
      ],
      personalizedRecommendations: [
        'Your debugging accuracy increased by 18%, but regression bugs increased by 5%. Focus on writing regression tests before merging PRs.',
        'Great job on Gold III rank progression! 28% more XP required to reach Gold II.'
      ]
    },

    achievements,
    gameHistory,
    journeyTimeline: [
      { date: '2026-08-15', milestoneTitle: 'First Arena Entry', detail: 'Joined Code Mafia Arena as Junior Developer', rankAchieved: 'Bronze I' },
      { date: '2026-08-20', milestoneTitle: 'First 10 Bugs Fixed', detail: 'Earned 10 Bugs Fixed badge', rankAchieved: 'Silver III' },
      { date: '2026-08-26', milestoneTitle: 'Gold Competitive Rank', detail: 'Promoted to Gold Tier after 5-game win streak', rankAchieved: 'Gold I' },
      { date: '2026-09-03', milestoneTitle: 'Current Performance Peak', detail: 'Reached Gold III (5,640 XP, 71% Win Rate)', rankAchieved: rankInfo.currentRank.name }
    ]
  };
}

// 4. GLOBAL LEADERBOARD OPERATIVES (SECURE - NO SECRET MAFIA ROLES EXPOSED)
export function getGlobalLeaderboard(): LeaderboardOperative[] {
  return [
    { rankPosition: 1, playerId: 'p-gm1', playerName: 'ValkyrieCode', avatarColor: 'bg-indigo-600', tier: 'Grandmaster', xp: 16840, games: 82, winRatePercent: 84, codingScore: 98, debuggingScore: 97, codeQualityScore: 96, collaborationScore: 95, currentStreak: 12 },
    { rankPosition: 2, playerId: 'p-m1', playerName: 'CyberShadow', avatarColor: 'bg-purple-600', tier: 'Master', xp: 14210, games: 74, winRatePercent: 79, codingScore: 95, debuggingScore: 96, codeQualityScore: 94, collaborationScore: 92, currentStreak: 8 },
    { rankPosition: 3, playerId: 'p-h1', playerName: 'PhantomZero', avatarColor: 'bg-rose-600', tier: 'Heroic', xp: 11450, games: 61, winRatePercent: 75, codingScore: 92, debuggingScore: 94, codeQualityScore: 91, collaborationScore: 90, currentStreak: 5 },
    { rankPosition: 4, playerId: 'p-pl1', playerName: 'EliteKnight', avatarColor: 'bg-cyan-600', tier: 'Platinum IV', xp: 9820, games: 52, winRatePercent: 73, codingScore: 90, debuggingScore: 91, codeQualityScore: 89, collaborationScore: 94, currentStreak: 4 },
    { rankPosition: 5, playerId: 'p-me', playerName: 'OperativeAlpha (You)', avatarColor: 'bg-purple-500', tier: 'Gold III', xp: 5640, games: 26, winRatePercent: 71, codingScore: 92, debuggingScore: 94, codeQualityScore: 90, collaborationScore: 91, currentStreak: 6 },
    { rankPosition: 6, playerId: 'p-g1', playerName: 'BinaryBandit', avatarColor: 'bg-amber-600', tier: 'Gold I', xp: 4120, games: 28, winRatePercent: 64, codingScore: 84, debuggingScore: 82, codeQualityScore: 83, collaborationScore: 85, currentStreak: 2 }
  ];
}
