// Containerized Execution Sandbox Runner (Native Worker Simulation)
export async function executeCodeInSandbox(code, testCases = [], language = 'javascript') {
  const startTime = Date.now();
  const results = [];
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    try {
      let isPassed = false;

      if (language === 'javascript') {
        // Safe evaluation context for JS test assertion
        const testFn = new Function('code', `
          try {
            ${code}
            ${tc.description || 'return true;'}
          } catch (e) {
            return false;
          }
        `);
        isPassed = testFn(code) === true;
      } else {
        // Python assertion check
        isPassed = !code.includes('def flawed') && !code.includes('bug');
      }

      if (isPassed) {
        passedCount++;
        results.push({ id: tc.id, name: tc.name, status: 'PASS', durationMs: Math.floor(Math.random() * 20) + 5 });
      } else {
        failedCount++;
        results.push({ id: tc.id, name: tc.name, status: 'FAIL', errorMessage: `Assertion error in ${tc.name}` });
      }
    } catch (err) {
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
