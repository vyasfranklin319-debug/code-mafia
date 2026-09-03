import { ContentPack, TestRunResult, TestCase, ContentFile } from '../../types/game';
import { runJsTests } from './jsRunner';
import { runPythonTests } from './pythonRunner';

export async function executeTestSuite(
  contentPack: ContentPack,
  files: ContentFile[],
  player: { id: string; name: string },
  isFakeCi: boolean = false
): Promise<TestRunResult> {
  const startTime = performance.now();
  
  // Find primary code file
  const mainFile = files.find(f => !f.readOnly) || files[0];
  const code = mainFile ? mainFile.currentContent : '';

  let executedTests: TestCase[] = [];

  if (contentPack.language === 'javascript') {
    executedTests = await runJsTests(code, contentPack.id, contentPack.testSuite);
  } else if (contentPack.language === 'python') {
    executedTests = await runPythonTests(code, contentPack.id, contentPack.testSuite);
  }

  // If Fake CI is active, visually invert passed/failed status to confuse team
  if (isFakeCi) {
    executedTests = executedTests.map(t => ({
      ...t,
      status: t.status === 'PASS' ? 'FAIL' : 'PASS',
      errorMessage: t.status === 'PASS' ? 'AssertionError [FakeCIInversion]: Decoy status inverted by Mafia' : undefined
    }));
  }

  const passedCount = executedTests.filter(t => t.status === 'PASS').length;
  const failedCount = executedTests.filter(t => t.status === 'FAIL' || t.status === 'ERROR').length;
  const durationMs = Math.round(performance.now() - startTime);

  const firstError = executedTests.find(t => t.errorMessage);

  return {
    id: `run-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    triggeredByPlayerId: player.id,
    triggeredByPlayerName: player.name,
    passedCount,
    failedCount,
    totalCount: executedTests.length,
    tests: executedTests,
    durationMs,
    errorExcerpt: firstError ? firstError.errorMessage : undefined,
    isFakeCi
  };
}
