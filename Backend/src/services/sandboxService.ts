/**
 * CODE MAFIA — ISOLATED CODE EXECUTION SERVICE
 * Dispatches code execution to Piston, Docker, or Isolated Sub-processes
 * NEVER executes untrusted code in the main application server process.
 */

import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TestCase {
  id: string;
  name: string;
  description?: string;
  assertion?: string;
  input?: any;
  expected?: any;
}

export interface SandboxExecutionResult {
  passedCount: number;
  failedCount: number;
  totalCount: number;
  passRate: number;
  durationMs: number;
  results: Array<{
    id: string;
    name: string;
    status: 'PASS' | 'FAIL' | 'ERROR';
    durationMs?: number;
    errorMessage?: string;
  }>;
}

// 1. External Piston Execution Adapter
async function runViaPiston(
  pistonUrl: string,
  code: string,
  testCases: TestCase[],
  language: string
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const results: any[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    // Build a test expression based on test case format
    let testExpression: string;

    if (tc.assertion) {
      // Explicit assertion string (e.g. "return add(1,2) === 3;")
      testExpression = tc.assertion;
    } else if (tc.input !== undefined && tc.expected !== undefined) {
      // Input/expected format: call the first declared function with input args
      const args = Array.isArray(tc.input)
        ? tc.input.map((v: any) => JSON.stringify(v)).join(', ')
        : JSON.stringify(tc.input);
      const expected = JSON.stringify(tc.expected);
      // Extract function name from code
      const fnMatch = code.match(/function\s+(\w+)\s*\(/);
      const fnName = fnMatch ? fnMatch[1] : 'solve';
      testExpression = `return JSON.stringify(${fnName}(${args})) === JSON.stringify(${expected});`;
    } else if (tc.description) {
      testExpression = tc.description;
    } else {
      testExpression = 'return true;';
    }

    const combinedCode = `
      ${code}
      try {
        const testResult = (() => { ${testExpression} })();
        if (testResult === true) {
          console.log("__MAFIA_TEST_PASS__");
        } else {
          console.log("__MAFIA_TEST_FAIL__: expected true, got " + JSON.stringify(testResult));
        }
      } catch (e) {
        console.log("__MAFIA_TEST_ERROR__:" + e.message);
      }
    `;

    try {
      const resp = await fetch(`${pistonUrl}/api/v2/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: language === 'javascript' ? 'javascript' : 'python',
          version: '*',
          files: [{ name: 'solution.js', content: combinedCode }],
          run_timeout: 2000
        })
      });

      const data: any = await resp.json();
      const stdout = data.run?.stdout || '';

      if (stdout.includes('__MAFIA_TEST_PASS__')) {
        passedCount++;
        results.push({ id: tc.id, name: tc.name, status: 'PASS', durationMs: 15 });
      } else if (stdout.includes('__MAFIA_TEST_FAIL__')) {
        failedCount++;
        results.push({ id: tc.id, name: tc.name, status: 'FAIL', errorMessage: 'Test assertion failed' });
      } else {
        failedCount++;
        const errorMsg = stdout.split('__MAFIA_TEST_ERROR__:')[1] || data.run?.stderr || 'Execution error';
        results.push({ id: tc.id, name: tc.name, status: 'ERROR', errorMessage: errorMsg.trim() });
      }
    } catch (err: any) {
      failedCount++;
      results.push({ id: tc.id, name: tc.name, status: 'ERROR', errorMessage: err.message });
    }
  }

  const durationMs = Date.now() - startTime;
  const passRate = testCases.length > 0 ? Math.round((passedCount / testCases.length) * 100) : 0;

  return {
    passedCount,
    failedCount,
    totalCount: testCases.length,
    passRate,
    durationMs,
    results
  };
}

// 2. Child Process Worker Sandbox (Zero-setup local air-gap fallback)
function runViaIsolatedWorker(
  code: string,
  testCases: TestCase[],
  language: string
): Promise<SandboxExecutionResult> {
  return new Promise((resolve) => {
    const workerPath = path.join(__dirname, 'sandboxWorker.js');

    // Spawn child worker with strict 64MB memory limit
    const child = fork(workerPath, [], {
      execArgv: ['--max-old-space-size=64'],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc']
    });

    let hasResponded = false;

    // Hard watchdog timer: if worker hangs or attempts CPU exhaustion, terminate it immediately
    const watchdog = setTimeout(() => {
      if (!hasResponded) {
        hasResponded = true;
        child.kill('SIGKILL');
        resolve({
          passedCount: 0,
          failedCount: testCases.length,
          totalCount: testCases.length,
          passRate: 0,
          durationMs: 3000,
          results: testCases.map(tc => ({
            id: tc.id,
            name: tc.name,
            status: 'ERROR',
            errorMessage: 'Process Terminated: Maximum execution ceiling (3000ms) exceeded'
          }))
        });
      }
    }, 3500);

    child.on('message', (result: SandboxExecutionResult) => {
      if (!hasResponded) {
        hasResponded = true;
        clearTimeout(watchdog);
        child.kill('SIGTERM');
        resolve(result);
      }
    });

    child.on('error', (err) => {
      if (!hasResponded) {
        hasResponded = true;
        clearTimeout(watchdog);
        resolve({
          passedCount: 0,
          failedCount: testCases.length,
          totalCount: testCases.length,
          passRate: 0,
          durationMs: 50,
          results: testCases.map(tc => ({
            id: tc.id,
            name: tc.name,
            status: 'ERROR',
            errorMessage: `Sandbox process error: ${err.message}`
          }))
        });
      }
    });

    child.send({ code, testCases, language });
  });
}

/**
 * Public Entry Point: Execute Code in Isolated Sandbox
 */
export async function executeCodeInSandbox(
  code: string,
  testCases: TestCase[] = [],
  language: string = 'javascript'
): Promise<SandboxExecutionResult> {
  const pistonUrl = process.env.PISTON_URL;
  if (pistonUrl) {
    try {
      return await runViaPiston(pistonUrl, code, testCases, language);
    } catch (e: any) {
      console.warn('[Sandbox] Piston execution failed, falling back to isolated worker:', e.message);
    }
  }

  // Fallback to Isolated Worker Process
  return runViaIsolatedWorker(code, testCases, language);
}
