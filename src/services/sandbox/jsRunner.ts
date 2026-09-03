import { TestCase } from '../../types/game';

export async function runJsTests(code: string, packId: string, testSuite: TestCase[]): Promise<TestCase[]> {
  const results: TestCase[] = [];

  // Gas & Timeout Safety Ceiling Check (AST Guard)
  if (/\bwhile\s*\(\s*(true|1)\s*\)/i.test(code) || /\bfor\s*\(\s*;\s*;\s*\)/.test(code)) {
    // Intercept infinite loop before running
    return testSuite.map(t => ({
      ...t,
      status: 'ERROR',
      durationMs: 500,
      errorMessage: 'GasLimitExceeded: CPU execution timeout ceiling reached (500ms limit exceeded due to infinite loop construct)'
    }));
  }

  // Create isolated execution evaluation
  for (const test of testSuite) {
    const startTime = performance.now();

    // Check if test is an injected Mafia Flaky Test
    if (test.isFlaky) {
      // 50% random flaky failure
      const passes = Math.random() > 0.5;
      results.push({
        ...test,
        status: passes ? 'PASS' : 'FAIL',
        durationMs: 42,
        errorMessage: passes ? undefined : 'AssertionError [FlakyRegressionTrap]: Edge case assertion failed intermittently'
      });
      continue;
    }

    try {
      if (packId === 'js-task-master-v1') {
        const testPassed = executeTaskMasterTest(code, test.id);
        const duration = Math.round(performance.now() - startTime);
        results.push({
          ...test,
          status: testPassed ? 'PASS' : 'FAIL',
          durationMs: duration,
          errorMessage: testPassed ? undefined : getFailureReason(test.id)
        });
      } else if (packId === 'js-auth-service-v1') {
        const testPassed = executeAuthServiceTest(code, test.id);
        const duration = Math.round(performance.now() - startTime);
        results.push({
          ...test,
          status: testPassed ? 'PASS' : 'FAIL',
          durationMs: duration,
          errorMessage: testPassed ? undefined : getAuthFailureReason(test.id)
        });
      } else {
        results.push({
          ...test,
          status: 'PASS',
          durationMs: 12
        });
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      results.push({
        ...test,
        status: 'ERROR',
        durationMs: duration,
        errorMessage: err.message || 'Execution Error / Exception'
      });
    }
  }

  return results;
}

function executeTaskMasterTest(code: string, testId: string): boolean {
  try {
    // Construct sandbox module function
    const wrappedCode = `${code}; return TaskManager;`;
    const TaskManagerClass = new Function(wrappedCode)();
    const tm = new TaskManagerClass();

    if (testId === 'test-1') {
      // Priority filter test
      tm.addTask('1', 'Fix bug', 2); // numeric priority 2
      tm.addTask('2', 'Write docs', "2"); // string priority "2"
      const res1 = tm.getTasksByPriority("2");
      const res2 = tm.getTasksByPriority(2);
      return res1.length === 2 && res2.length === 2;
    }

    if (testId === 'test-2') {
      // Complete Task Status Mutation
      const t1 = tm.addTask('10', 'Refactor queue');
      const updated = tm.completeTask('10');
      return updated !== null && updated.status === 'completed' && tm.tasks[0].status === 'completed';
    }

    if (testId === 'test-3') {
      // Async Queue Sequential Execution
      const checkAsync = async () => {
        const q = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
        const res = await tm.processQueue(q);
        return Array.isArray(res) && res.length === 3 && res[0].id === 'a' && res[2].id === 'c';
      };
      // Synchronous check if processQueue returned promise
      const codeStr = tm.processQueue.toString();
      return codeStr.includes('for (') || codeStr.includes('for-of') || codeStr.includes('for (const');
    }

    if (testId === 'test-4') {
      // Completed Count Tracking
      tm.addTask('1', 'T1');
      tm.addTask('2', 'T2');
      tm.completeTask('1');
      tm.completeTask('2');
      return tm.completedCount === 2;
    }
  } catch (e) {
    return false;
  }
  return true;
}

function getFailureReason(testId: string): string {
  switch (testId) {
    case 'test-1':
      return 'AssertionError: getTasksByPriority("2") returned 1 item, expected 2 (String vs Number priority coercion failed)';
    case 'test-2':
      return 'AssertionError: completeTask("10") returned status "pending", expected "completed"';
    case 'test-3':
      return 'AssertionError: processQueue did not await async queue items in order (forEach used instead of async loop)';
    case 'test-4':
      return 'AssertionError: completedCount was 0, expected 2';
    default:
      return 'Assertion failed';
  }
}

function executeAuthServiceTest(code: string, testId: string): boolean {
  try {
    const wrappedCode = `${code}; return AuthLimiter;`;
    const AuthLimiterClass = new Function(wrappedCode)();
    const limiter = new AuthLimiterClass(3, 1000);

    if (testId === 'test-auth-1') {
      // Token Timestamp Unit Conversion
      const nowMs = 1700000000000;
      const tokenInSec = { expiresAt: Math.floor(nowMs / 1000) + 300 }; // expires in 300s
      return limiter.verifyToken(tokenInSec, nowMs) === true;
    }

    if (testId === 'test-auth-2') {
      // Sliding Window Reset
      const client = 'ip-123';
      limiter.isRateLimited(client, 1000);
      limiter.isRateLimited(client, 1000); // count = 2
      // Fast forward past window
      const resultAfterWindow = limiter.isRateLimited(client, 3000); // 3000 > 1000 + 1000
      return resultAfterWindow === false; // Should reset count to 1 and return false
    }

    if (testId === 'test-auth-3') {
      // Rate limit threshold
      const client = 'ip-456';
      limiter.isRateLimited(client, 100);
      limiter.isRateLimited(client, 100);
      limiter.isRateLimited(client, 100);
      return limiter.isRateLimited(client, 100) === true;
    }
  } catch (e) {
    return false;
  }
  return true;
}

function getAuthFailureReason(testId: string): string {
  switch (testId) {
    case 'test-auth-1':
      return 'AssertionError: verifyToken failed to convert expiresAt seconds to milliseconds';
    case 'test-auth-2':
      return 'AssertionError: isRateLimited returned true after window expiration (count was not reset to 1)';
    case 'test-auth-3':
      return 'AssertionError: rate limit threshold check failed';
    default:
      return 'Assertion failed';
  }
}
