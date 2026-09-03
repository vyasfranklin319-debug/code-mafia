import { getMatchHistory } from './historyService.js';

// Competitive Ranks Tier Table
export const RANKS = [
  { name: 'Bronze I', minXp: 0, maxXp: 499, tier: 'BRONZE' },
  { name: 'Bronze II', minXp: 500, maxXp: 999, tier: 'BRONZE' },
  { name: 'Bronze III', minXp: 1000, maxXp: 1499, tier: 'BRONZE' },
  
  { name: 'Silver I', minXp: 1500, maxXp: 2199, tier: 'SILVER' },
  { name: 'Silver II', minXp: 2200, maxXp: 2899, tier: 'SILVER' },
  { name: 'Silver III', minXp: 2900, maxXp: 3599, tier: 'SILVER' },

  { name: 'Gold I', minXp: 3600, maxXp: 4399, tier: 'GOLD' },
  { name: 'Gold II', minXp: 4400, maxXp: 5199, tier: 'GOLD' },
  { name: 'Gold III', minXp: 5200, maxXp: 5999, tier: 'GOLD' },
  { name: 'Gold IV', minXp: 6000, maxXp: 6799, tier: 'GOLD' },

  { name: 'Platinum I', minXp: 6800, maxXp: 7699, tier: 'PLATINUM' },
  { name: 'Platinum II', minXp: 7700, maxXp: 8599, tier: 'PLATINUM' },
  { name: 'Platinum III', minXp: 8600, maxXp: 9499, tier: 'PLATINUM' },
  { name: 'Platinum IV', minXp: 9500, maxXp: 10499, tier: 'PLATINUM' },

  { name: 'Heroic', minXp: 10500, maxXp: 11999, tier: 'HEROIC' },
  { name: 'Master', minXp: 12000, maxXp: 14999, tier: 'MASTER' },
  { name: 'Grandmaster', minXp: 15000, maxXp: 999999, tier: 'GRANDMASTER' }
];

export function calculateUserRank(xp) {
  let rank = RANKS.find(r => xp >= r.minXp && xp <= r.maxXp);
  if (!rank) rank = xp >= 15000 ? RANKS[RANKS.length - 1] : RANKS[0];
  const nextRank = RANKS[RANKS.indexOf(rank) + 1] || null;
  const progressPercent = nextRank ? Math.round(((xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100) : 100;
  return { currentRank: rank, nextRank, progressPercent, currentXp: xp };
}

export function calculateXpReward(scores) {
  const weighted = 
    (scores.coding * 0.30) +
    (scores.debugging * 0.20) +
    (scores.testing * 0.15) +
    (scores.problemSolving * 0.15) +
    (scores.collaboration * 0.10) +
    (scores.performance * 0.10);

  const victoryBonus = scores.isVictory ? 150 : 30;
  return Math.round((weighted * 3.5) + victoryBonus);
}

export function getLeaderboardData(category = 'overall') {
  const history = getMatchHistory();
  const gamesCount = history.length;
  const wins = history.filter(h => h.winner === 'DEVELOPERS').length;
  const winRatePercent = gamesCount > 0 ? Math.round((wins / gamesCount) * 100) : 0;
  const xp = gamesCount * 260;
  const rankInfo = calculateUserRank(xp);

  const operatives = [
    { 
      rankPosition: 1, 
      playerId: 'usr-me',
      playerName: 'OperativeAlpha (You)', 
      tier: rankInfo.currentRank.name, 
      xp, 
      games: gamesCount,
      winRatePercent, 
      codingScore: gamesCount > 0 ? 88 : 0, 
      debuggingScore: gamesCount > 0 ? 85 : 0 
    }
  ];

  if (category === 'coding') operatives.sort((a, b) => b.codingScore - a.codingScore);
  if (category === 'debugging') operatives.sort((a, b) => b.debuggingScore - a.debuggingScore);
  if (category === 'xp') operatives.sort((a, b) => b.xp - a.xp);

  return operatives.map((op, idx) => ({ ...op, rankPosition: idx + 1 }));
}
