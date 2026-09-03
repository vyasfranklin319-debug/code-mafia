import { Player, ActivityEvent, ChatMessage } from '../types/game';

const BOT_NAMES = [
  'NeonGhost', 'ShadowByte', 'QuantumFang', 'RiftCrawler',
  'HexWarden', 'ApexHunter', 'CyberValkyrie', 'PhantomGrid'
];

const BOT_AVATARS = [
  'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600',
  'bg-cyan-600', 'bg-rose-600', 'bg-indigo-600', 'bg-teal-600'
];

export function generateBotPlayers(countNeeded: number, startIndex: number = 1): Player[] {
  const bots: Player[] = [];
  for (let i = 0; i < countNeeded; i++) {
    const nameIndex = (startIndex + i) % BOT_NAMES.length;
    const colorIndex = (startIndex + i) % BOT_AVATARS.length;
    bots.push({
      id: `bot-${Date.now()}-${i}`,
      displayName: BOT_NAMES[nameIndex],
      isAlive: true,
      isHost: false,
      isBot: true,
      isReady: true,
      avatarColor: BOT_AVATARS[colorIndex],
      stats: {
        bugsFixed: 0,
        testsRun: 0,
        votesCast: 0
      }
    });
  }
  return bots;
}

export function generateBotChat(
  bot: Player,
  phase: string,
  players: Player[],
  activityFeed: ActivityEvent[]
): ChatMessage | null {
  if (phase !== 'DISCUSSION' && phase !== 'WORK_ROUND') return null;

  const otherPlayers = players.filter(p => p.id !== bot.id && p.isAlive);
  if (otherPlayers.length === 0) return null;

  const targetPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];

  const devMessages = [
    `I spent the round looking at the test suite. ${targetPlayer.displayName} made a change right before tests failed!`,
    `Let's check the activity feed — who edited the main file last?`,
    `I verified the priority filter logic. We need all tests green!`,
    `I'm confident we have at least one bug fixed. Who is running the next test?`,
    `Is anyone else suspicious of ${targetPlayer.displayName}? Their diff looks unusual.`
  ];

  const mafiaMessages = [
    `I was working on the inventory calculations. Everything looked clean on my end.`,
    `Why is everyone targeting me? Check ${targetPlayer.displayName}'s recent edits!`,
    `I ran tests earlier and 2 passed. We just need to fix the edge case.`,
    `I think ${targetPlayer.displayName} is trying to deflect attention away from themselves.`,
    `Let's focus on passing the tests before voting blindly!`
  ];

  const pool = bot.role === 'MAFIA' ? mafiaMessages : devMessages;
  const text = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    senderId: bot.id,
    senderName: bot.displayName,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text
  };
}

export function decideBotVote(
  bot: Player,
  alivePlayers: Player[],
  activityFeed: ActivityEvent[]
): string | null {
  const validTargets = alivePlayers.filter(p => p.id !== bot.id);
  if (validTargets.length === 0) return null;

  if (bot.role === 'MAFIA') {
    // Mafia targets Developers
    const devTargets = validTargets.filter(p => p.role !== 'MAFIA');
    const pool = devTargets.length > 0 ? devTargets : validTargets;
    return pool[Math.floor(Math.random() * pool.length)].id;
  } else {
    // Developer targets candidate player at random
    return validTargets[Math.floor(Math.random() * validTargets.length)].id;
  }
}
