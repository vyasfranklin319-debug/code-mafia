import { PrHotfix, Player, GameSession, SystemIntegrity, PipelineStatus } from '../types/game';

let prCounter = 101;

export function createPrHotfix(
  author: Player,
  filePath: string,
  oldContent: string,
  newContent: string,
  title?: string
): PrHotfix {
  const prNumber = prCounter++;
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return {
    id: `pr-${Date.now()}-${prNumber}`,
    prNumber,
    authorId: author.id,
    authorName: author.displayName,
    title: title || `Hotfix #${prNumber}: Update ${filePath.split('/').pop()}`,
    filePath,
    oldContent,
    newContent,
    timestamp,
    status: 'STAGED'
  };
}

export function calculateSystemIntegrity(
  passedCount: number,
  totalCount: number,
  isMemoryLeakActive: boolean = false
): SystemIntegrity {
  if (totalCount === 0) {
    return {
      score: 100,
      pipelineStatus: 'STAGING',
      buildDurationMs: isMemoryLeakActive ? 2400 : 850,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  const rawPercent = Math.round((passedCount / totalCount) * 100);
  const finalScore = isMemoryLeakActive ? Math.max(0, rawPercent - 20) : rawPercent;

  let pipelineStatus: PipelineStatus = 'DEPLOYED';
  if (finalScore < 50) {
    pipelineStatus = 'PIPELINE_BROKEN';
  } else if (finalScore < 80) {
    pipelineStatus = 'TESTING';
  } else if (finalScore < 100) {
    pipelineStatus = 'BUILDING';
  }

  return {
    score: finalScore,
    pipelineStatus,
    buildDurationMs: isMemoryLeakActive ? 3200 : 920,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
}
