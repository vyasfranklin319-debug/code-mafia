import { GitCommit, Player } from '../types/game';

/**
 * Generate a 7-character hex commit SHA hash
 */
export function generateCommitHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 7; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

/**
 * Compute line additions, deletions, and a diff summary snippet
 */
export function calculateLineDiff(oldContent: string, newContent: string): { linesAdded: number; linesRemoved: number; diffSnippet: string } {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  let linesAdded = 0;
  let linesRemoved = 0;
  const diffParts: string[] = [];

  const maxLen = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === undefined && newLine !== undefined) {
      linesAdded++;
      if (diffParts.length < 3) diffParts.push(`+ L${i + 1}: ${newLine.trim()}`);
    } else if (oldLine !== undefined && newLine === undefined) {
      linesRemoved++;
      if (diffParts.length < 3) diffParts.push(`- L${i + 1}: ${oldLine.trim()}`);
    } else if (oldLine !== newLine) {
      linesAdded++;
      linesRemoved++;
      if (diffParts.length < 3) diffParts.push(`~ L${i + 1}: ${newLine.trim()}`);
    }
  }

  const diffSnippet = diffParts.length > 0 ? diffParts.join(' | ') : 'Whitespace / formatting edit';

  return { linesAdded, linesRemoved, diffSnippet };
}

/**
 * Create a new immutable GitCommit record
 */
export function createCommit(
  author: Player,
  filePath: string,
  oldContent: string,
  newContent: string,
  isShadow: boolean = false
): GitCommit {
  const hash = generateCommitHash();
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const { linesAdded, linesRemoved, diffSnippet } = calculateLineDiff(oldContent, newContent);

  const displayAuthorName = isShadow ? 'ghost_author' : author.displayName;
  const displayAuthorId = isShadow ? 'anon-shadow-user' : author.id;

  return {
    id: `commit-${Date.now()}-${hash}`,
    hash,
    authorId: displayAuthorId,
    authorName: displayAuthorName,
    timestamp,
    filePath,
    linesAdded,
    linesRemoved,
    diffSnippet,
    isShadow
  };
}
