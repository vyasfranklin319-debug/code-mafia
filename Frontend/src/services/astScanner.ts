import { AstReport, AstFinding, Player } from '../types/game';

/**
 * Perform AST / Static Analysis on a code string
 */
export function scanCodeAst(
  targetPlayer: Player,
  filePath: string,
  code: string
): AstReport {
  const lines = code.split('\n');
  const findings: AstFinding[] = [];

  let decisionPoints = 1; // Base cyclomatic complexity = 1

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const trimmed = lineText.trim();

    // 1. Cyclomatic Complexity Counters
    const branchMatches = lineText.match(/\b(if|else if|for|while|case|catch|except)\b|\?|\&\&|\|\|/g);
    if (branchMatches) {
      decisionPoints += branchMatches.length;
    }

    // 2. Infinite Loop Detection
    if (/\bwhile\s*\(\s*(true|1)\s*\)/i.test(lineText) || /\bwhile\s+True\s*:/i.test(lineText) || /\bfor\s*\(\s*;\s*;\s*\)/.test(lineText)) {
      findings.push({
        id: `ast-${Date.now()}-${lineNum}-inf`,
        severity: 'HIGH',
        rule: 'AST_INFINITE_LOOP',
        line: lineNum,
        message: 'Potential infinite loop construct detected. May cause gas/CPU execution timeout.'
      });
    }

    // 3. Artificial Delays (Sleep / Timeout)
    if (/\b(setTimeout|setInterval|sleep|time\.sleep)\b/i.test(lineText)) {
      findings.push({
        id: `ast-${Date.now()}-${lineNum}-delay`,
        severity: 'MEDIUM',
        rule: 'AST_ARTIFICIAL_DELAY',
        line: lineNum,
        message: 'Artificial delay or sleep function found. Could be used for latency sabotage.'
      });
    }

    // 4. Hardcoded Constant Returns (Bypassing Logic)
    if (/^\s*return\s+(true|false|0|-1|100|null|undefined|"[^"]*");\s*$/i.test(lineText) && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
      findings.push({
        id: `ast-${Date.now()}-${lineNum}-hardcode`,
        severity: 'MEDIUM',
        rule: 'AST_HARDCODED_RETURN',
        line: lineNum,
        message: 'Static hardcoded return statement overrides dynamic function calculation.'
      });
    }

    // 5. Empty Catch / Exception Swallowing
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(lineText) || /except\s*:\s*pass/.test(lineText)) {
      findings.push({
        id: `ast-${Date.now()}-${lineNum}-swallow`,
        severity: 'HIGH',
        rule: 'AST_EXCEPTION_SWALLOW',
        line: lineNum,
        message: 'Swallowed exception block hides runtime errors from unit test assertions.'
      });
    }
  });

  // Calculate overall cyclomatic complexity score (scaled 1-100)
  const complexityScore = Math.min(100, Math.round(decisionPoints * 7.5));

  return {
    id: `ast-report-${Date.now()}`,
    targetPlayerId: targetPlayer.id,
    targetPlayerName: targetPlayer.displayName,
    complexityScore,
    scannedFilePath: filePath,
    findings,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}
