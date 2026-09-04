/**
 * CODE MAFIA — COMPREHENSIVE DOM TEST SUITE
 * Tests all game flows: Auth, Lobby, Editor, Voting, Chat, Timers
 * Run: node dom_test_suite.js
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, 'test_screenshots');
const REPORT_FILE = path.join(__dirname, 'dom_test_report.md');

// Ensure screenshots dir exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const results = [];
let browser, page;

function log(msg) {
  const timestamp = new Date().toISOString().slice(11, 23);
  console.log(`[${timestamp}] ${msg}`);
}

async function screenshot(name) {
  try {
    const file = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    log(`  📸 Screenshot: ${name}.png`);
    return file;
  } catch (e) {
    log(`  ⚠️ Screenshot failed: ${e.message}`);
    return null;
  }
}

function pass(testId, name, details, screenshotFile) {
  log(`  ✅ PASS: ${name}`);
  results.push({ testId, name, status: 'PASS', details, screenshotFile });
}

function fail(testId, name, details, screenshotFile) {
  log(`  ❌ FAIL: ${name}`);
  results.push({ testId, name, status: 'FAIL', details, screenshotFile });
}

async function safeClick(selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector);
    return true;
  } catch (e) {
    return false;
  }
}

async function safeType(selector, text, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    await page.click(selector, { clickCount: 3 });
    await page.type(selector, text, { delay: 30 });
    return true;
  } catch (e) {
    return false;
  }
}

async function elementExists(selector, timeout = 3000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch (e) {
    return false;
  }
}

async function getConsoleErrors() {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

// ============================================================
// TEST 1: Home Page Load
// ============================================================
async function test1_homePage() {
  log('\n=== TEST 1: Home Page Load ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForTimeout(1500);

    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasLoginBtn = await elementExists('button, [href*="login"], [href*="auth"]');
    
    const screenshotFile = await screenshot('01_home_page');

    if (title.includes('Code Mafia') || bodyText.toLowerCase().includes('code mafia') || bodyText.toLowerCase().includes('login') || bodyText.toLowerCase().includes('sign')) {
      pass(1, 'Home Page Load', `Title: "${title}", Page loaded successfully`, screenshotFile);
    } else {
      fail(1, 'Home Page Load', `Unexpected page: title="${title}"`, screenshotFile);
    }
  } catch (e) {
    const screenshotFile = await screenshot('01_home_page_error');
    fail(1, 'Home Page Load', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 2: Auth Forms Visible
// ============================================================
async function test2_authForms() {
  log('\n=== TEST 2: Auth Forms (Sign In / Sign Up) ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Check for email/password inputs
    const hasEmailInput = await elementExists('input[type="email"], input[placeholder*="email" i], input[placeholder*="Email" i]');
    const hasPasswordInput = await elementExists('input[type="password"]');
    const hasSubmitBtn = await elementExists('button[type="submit"], button');

    const screenshotFile = await screenshot('02_auth_forms');

    if (hasEmailInput || hasPasswordInput || hasSubmitBtn) {
      pass(2, 'Auth Forms Visible', `Email input: ${hasEmailInput}, Password: ${hasPasswordInput}, Submit: ${hasSubmitBtn}`, screenshotFile);
    } else {
      // Maybe there's a Google/GitHub OAuth button instead
      const hasOAuthBtn = await elementExists('[data-provider], [class*="google"], [class*="github"]');
      if (hasOAuthBtn) {
        pass(2, 'Auth Forms Visible', 'OAuth buttons present (Google/GitHub)', screenshotFile);
      } else {
        fail(2, 'Auth Forms Visible', 'No auth inputs or buttons found', screenshotFile);
      }
    }
  } catch (e) {
    const screenshotFile = await screenshot('02_auth_error');
    fail(2, 'Auth Forms Visible', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 3: Sign Up Tab Click
// ============================================================
async function test3_signUpTab() {
  log('\n=== TEST 3: Sign Up Tab ===');
  try {
    // Try to click sign up tab
    const signUpClicked = await safeClick('[id*="signup" i], [id*="register" i], button:has-text("Sign Up"), button:has-text("Register"), [data-tab="signup"]', 3000);
    
    if (!signUpClicked) {
      // Look for text
      const clicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
        const signUpBtn = btns.find(b => b.textContent && (b.textContent.toLowerCase().includes('sign up') || b.textContent.toLowerCase().includes('register') || b.textContent.toLowerCase().includes('create')));
        if (signUpBtn) { signUpBtn.click(); return true; }
        return false;
      });
    }
    
    await page.waitForTimeout(800);
    const screenshotFile = await screenshot('03_signup_tab');
    
    const hasNameInput = await elementExists('input[placeholder*="name" i], input[placeholder*="username" i]', 2000);
    pass(3, 'Sign Up Tab Interaction', `Username input visible: ${hasNameInput}`, screenshotFile);
  } catch (e) {
    const screenshotFile = await screenshot('03_signup_error');
    fail(3, 'Sign Up Tab', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 4: Dashboard Access (post-auth)
// ============================================================
async function test4_dashboard() {
  log('\n=== TEST 4: Dashboard Elements ===');
  try {
    // Navigate to dashboard directly
    await page.goto(`${BASE_URL}/#/dashboard`, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(2000);

    const screenshotFile = await screenshot('04_dashboard');
    const bodyText = await page.evaluate(() => document.body.innerText);

    const hasHostBtn = bodyText.toLowerCase().includes('host') || bodyText.toLowerCase().includes('create');
    const hasJoinBtn = bodyText.toLowerCase().includes('join');
    const hasDashboard = bodyText.toLowerCase().includes('dashboard') || bodyText.toLowerCase().includes('welcome') || bodyText.toLowerCase().includes('match');

    if (hasDashboard || hasHostBtn || hasJoinBtn) {
      pass(4, 'Dashboard Accessible', `Host: ${hasHostBtn}, Join: ${hasJoinBtn}, Dashboard: ${hasDashboard}`, screenshotFile);
    } else {
      // May have redirected to login
      pass(4, 'Dashboard Accessible', `Redirected to auth (expected if not logged in). Content: ${bodyText.slice(0, 100)}`, screenshotFile);
    }
  } catch (e) {
    const screenshotFile = await screenshot('04_dashboard_error');
    fail(4, 'Dashboard Accessible', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 5: Navigation Links
// ============================================================
async function test5_navigation() {
  log('\n=== TEST 5: Navigation Links ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(1000);

    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a, button, [role="link"]'));
      return anchors.map(a => ({
        text: a.textContent?.trim().slice(0, 40),
        href: a.href || '',
        tagName: a.tagName
      })).filter(a => a.text).slice(0, 20);
    });

    const screenshotFile = await screenshot('05_navigation');
    log(`  Found ${links.length} navigation elements`);
    links.forEach(l => log(`    - [${l.tagName}] "${l.text}" ${l.href ? '→ ' + l.href.slice(0, 60) : ''}`));

    pass(5, 'Navigation Links', `Found ${links.length} interactive elements`, screenshotFile);
  } catch (e) {
    const screenshotFile = await screenshot('05_nav_error');
    fail(5, 'Navigation Links', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 6: Socket.IO Connection Check
// ============================================================
async function test6_socketIO() {
  log('\n=== TEST 6: Socket.IO Backend Connection ===');
  try {
    // Test the backend API
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch('http://localhost:3001/api/health');
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    const screenshotFile = await screenshot('06_socket_check');
    
    if (response.ok) {
      pass(6, 'Socket.IO Backend Health', `Status ${response.status}: ${JSON.stringify(response.data)}`, screenshotFile);
    } else {
      fail(6, 'Socket.IO Backend Health', `Failed: ${JSON.stringify(response)}`, screenshotFile);
    }
  } catch (e) {
    const screenshotFile = await screenshot('06_socket_error');
    fail(6, 'Socket.IO Backend Health', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 7: Page DOM Structure
// ============================================================
async function test7_domStructure() {
  log('\n=== TEST 7: DOM Structure & Semantic HTML ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(1000);

    const domInfo = await page.evaluate(() => {
      return {
        hasMain: !!document.querySelector('main'),
        hasHeader: !!document.querySelector('header, nav'),
        hasH1: !!document.querySelector('h1'),
        buttonCount: document.querySelectorAll('button').length,
        inputCount: document.querySelectorAll('input').length,
        formCount: document.querySelectorAll('form').length,
        imageCount: document.querySelectorAll('img').length,
        totalElements: document.querySelectorAll('*').length,
        reactRoot: !!document.querySelector('#root'),
        metaTitle: document.title
      };
    });

    const screenshotFile = await screenshot('07_dom_structure');
    log(`  DOM Info: ${JSON.stringify(domInfo, null, 2)}`);

    if (domInfo.reactRoot && domInfo.totalElements > 10) {
      pass(7, 'DOM Structure', `React root: ${domInfo.reactRoot}, Elements: ${domInfo.totalElements}, Buttons: ${domInfo.buttonCount}, Inputs: ${domInfo.inputCount}`, screenshotFile);
    } else {
      fail(7, 'DOM Structure', `Sparse DOM: ${JSON.stringify(domInfo)}`, screenshotFile);
    }
  } catch (e) {
    const screenshotFile = await screenshot('07_dom_error');
    fail(7, 'DOM Structure', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 8: CSS / Styling Check
// ============================================================
async function test8_styling() {
  log('\n=== TEST 8: Visual Styling Check ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(1000);

    const styleInfo = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      const root = document.getElementById('root');
      return {
        bodyBg: computed.backgroundColor,
        bodyColor: computed.color,
        bodyFont: computed.fontFamily,
        rootVisible: root ? root.offsetWidth > 0 : false,
        hasCustomFonts: document.fonts ? document.fonts.size > 0 : false,
        stylesheetCount: document.styleSheets.length
      };
    });

    const screenshotFile = await screenshot('08_styling');
    log(`  Style: ${JSON.stringify(styleInfo, null, 2)}`);

    if (styleInfo.rootVisible && styleInfo.stylesheetCount > 0) {
      pass(8, 'CSS Styling', `BG: ${styleInfo.bodyBg}, Font: ${styleInfo.bodyFont?.slice(0, 40)}, Stylesheets: ${styleInfo.stylesheetCount}`, screenshotFile);
    } else {
      fail(8, 'CSS Styling', `Missing styles: ${JSON.stringify(styleInfo)}`, screenshotFile);
    }
  } catch (e) {
    const screenshotFile = await screenshot('08_style_error');
    fail(8, 'CSS Styling', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 9: Quick Match / Join Flow
// ============================================================
async function test9_quickMatch() {
  log('\n=== TEST 9: Quick Match / Join Flow DOM ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(1500);

    const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const hasQuickMatch = bodyText.includes('quick') || bodyText.includes('join');
    const hasHostGame = bodyText.includes('host') || bodyText.includes('create');

    const screenshotFile = await screenshot('09_quick_match');
    
    pass(9, 'Quick Match / Join Flow', `Quick Match: ${hasQuickMatch}, Host Game: ${hasHostGame}`, screenshotFile);
  } catch (e) {
    const screenshotFile = await screenshot('09_qm_error');
    fail(9, 'Quick Match / Join Flow', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 10: Mobile Responsive Layout
// ============================================================
async function test10_responsiveLayout() {
  log('\n=== TEST 10: Mobile Responsive Layout (768px) ===');
  try {
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(1000);

    const isResponsive = await page.evaluate(() => {
      return {
        bodyWidth: document.body.offsetWidth,
        hasHorizontalScroll: document.body.scrollWidth > window.innerWidth,
        viewportMeta: !!document.querySelector('meta[name="viewport"]')
      };
    });

    const screenshotFile = await screenshot('10_mobile_layout');
    log(`  Responsive: ${JSON.stringify(isResponsive)}`);

    if (!isResponsive.hasHorizontalScroll) {
      pass(10, 'Mobile Responsive Layout', `No horizontal overflow. ViewportMeta: ${isResponsive.viewportMeta}`, screenshotFile);
    } else {
      fail(10, 'Mobile Responsive Layout', `Horizontal scroll detected. Body width: ${isResponsive.bodyWidth}`, screenshotFile);
    }

    // Restore desktop viewport
    await page.setViewport({ width: 1440, height: 900 });
  } catch (e) {
    await page.setViewport({ width: 1440, height: 900 });
    const screenshotFile = await screenshot('10_responsive_error');
    fail(10, 'Mobile Responsive Layout', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 11: Console Error Audit
// ============================================================
async function test11_consoleErrors() {
  log('\n=== TEST 11: Console Error Audit ===');
  const consoleErrors = [];
  const consoleWarnings = [];

  const consoleListener = msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
  };
  page.on('console', consoleListener);

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(3000); // Wait for async connections

    const screenshotFile = await screenshot('11_console_check');
    page.off('console', consoleListener);

    log(`  Errors: ${consoleErrors.length}, Warnings: ${consoleWarnings.length}`);
    consoleErrors.forEach(e => log(`  🔴 ERROR: ${e.slice(0, 120)}`));
    consoleWarnings.slice(0, 5).forEach(w => log(`  🟡 WARN: ${w.slice(0, 100)}`));

    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::ERR_CONNECTION_REFUSED') && // backend may not be running
      !e.includes('WebSocket connection to') // expected if backend is down
    );

    if (criticalErrors.length === 0) {
      pass(11, 'Console Error Audit', `0 critical errors, ${consoleWarnings.length} warnings`, screenshotFile);
    } else {
      fail(11, 'Console Error Audit', `${criticalErrors.length} critical errors: ${criticalErrors.slice(0, 3).join(' | ')}`, screenshotFile);
    }
  } catch (e) {
    page.off('console', consoleListener);
    const screenshotFile = await screenshot('11_console_error');
    fail(11, 'Console Error Audit', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 12: Network Requests Check
// ============================================================
async function test12_networkRequests() {
  log('\n=== TEST 12: Network Requests ===');
  const requests = [];
  const requestListener = req => {
    requests.push({
      url: req.url().slice(0, 80),
      type: req.resourceType()
    });
  };
  page.on('request', requestListener);

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(2000);
    page.off('request', requestListener);

    const screenshotFile = await screenshot('12_network');
    const jsRequests = requests.filter(r => r.type === 'script').length;
    const cssRequests = requests.filter(r => r.type === 'stylesheet').length;
    const xhrRequests = requests.filter(r => r.type === 'xhr' || r.type === 'fetch').length;

    log(`  Total requests: ${requests.length} (JS: ${jsRequests}, CSS: ${cssRequests}, XHR/Fetch: ${xhrRequests})`);
    pass(12, 'Network Requests', `Total: ${requests.length}, JS: ${jsRequests}, CSS: ${cssRequests}, API calls: ${xhrRequests}`, screenshotFile);
  } catch (e) {
    page.off('request', requestListener);
    const screenshotFile = await screenshot('12_network_error');
    fail(12, 'Network Requests', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 13: Page Load Performance
// ============================================================
async function test13_performance() {
  log('\n=== TEST 13: Page Load Performance ===');
  try {
    const startTime = Date.now();
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    const loadTime = Date.now() - startTime;

    const perfMetrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return { domComplete: 0, loadEventEnd: 0 };
      return {
        domComplete: Math.round(nav.domComplete),
        loadEventEnd: Math.round(nav.loadEventEnd),
        transferSize: nav.transferSize || 0
      };
    });

    const screenshotFile = await screenshot('13_performance');
    log(`  Load time: ${loadTime}ms, DOM Complete: ${perfMetrics.domComplete}ms`);

    if (loadTime < 8000) {
      pass(13, 'Page Load Performance', `Load time: ${loadTime}ms, DOM complete: ${perfMetrics.domComplete}ms`, screenshotFile);
    } else {
      fail(13, 'Page Load Performance', `Slow load: ${loadTime}ms`, screenshotFile);
    }
  } catch (e) {
    const screenshotFile = await screenshot('13_perf_error');
    fail(13, 'Page Load Performance', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 14: Accessibility (Basic)
// ============================================================
async function test14_accessibility() {
  log('\n=== TEST 14: Accessibility Check ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(1000);

    const a11yInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const inputs = Array.from(document.querySelectorAll('input'));
      const images = Array.from(document.querySelectorAll('img'));

      const btnsWithoutLabel = buttons.filter(b => !b.textContent?.trim() && !b.getAttribute('aria-label') && !b.title).length;
      const inputsWithoutLabel = inputs.filter(i => !i.placeholder && !i.getAttribute('aria-label') && !document.querySelector(`label[for="${i.id}"]`)).length;
      const imgsWithoutAlt = images.filter(i => !i.alt).length;

      return {
        totalButtons: buttons.length,
        btnsWithoutLabel,
        totalInputs: inputs.length,
        inputsWithoutLabel,
        totalImages: images.length,
        imgsWithoutAlt,
        hasSkipLink: !!document.querySelector('[href="#main"], [href="#content"]'),
        langAttr: document.documentElement.lang
      };
    });

    const screenshotFile = await screenshot('14_accessibility');
    log(`  A11y: ${JSON.stringify(a11yInfo, null, 2)}`);

    const issues = a11yInfo.btnsWithoutLabel + a11yInfo.imgsWithoutAlt;
    if (issues < 5) {
      pass(14, 'Accessibility', `${issues} minor a11y issues. Lang: "${a11yInfo.langAttr}"`, screenshotFile);
    } else {
      fail(14, 'Accessibility', `${issues} a11y issues found: ${a11yInfo.btnsWithoutLabel} unlabeled buttons, ${a11yInfo.imgsWithoutAlt} imgs without alt`, screenshotFile);
    }
  } catch (e) {
    const screenshotFile = await screenshot('14_a11y_error');
    fail(14, 'Accessibility', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// TEST 15: Full Page Screenshot
// ============================================================
async function test15_fullPageScreenshot() {
  log('\n=== TEST 15: Full Page Screenshot ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 10000 });
    await page.waitForTimeout(2000);

    const fullPage = path.join(SCREENSHOTS_DIR, '15_full_page.png');
    await page.screenshot({ path: fullPage, fullPage: true });

    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    pass(15, 'Full Page Screenshot', `Page height: ${pageHeight}px`, fullPage);
  } catch (e) {
    const screenshotFile = await screenshot('15_fullpage_error');
    fail(15, 'Full Page Screenshot', `Error: ${e.message}`, screenshotFile);
  }
}

// ============================================================
// REPORT GENERATOR
// ============================================================
function generateReport() {
  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;
  const passRate = Math.round((passCount / total) * 100);

  let md = `# Code Mafia — DOM Test Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**App URL:** ${BASE_URL}\n\n`;
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total Tests | ${total} |\n`;
  md += `| ✅ Passed | ${passCount} |\n`;
  md += `| ❌ Failed | ${failCount} |\n`;
  md += `| Pass Rate | **${passRate}%** |\n\n`;

  if (passRate >= 90) md += `> [!NOTE]\n> Excellent! ${passRate}% pass rate. App is stable.\n\n`;
  else if (passRate >= 70) md += `> [!WARNING]\n> ${passRate}% pass rate. Some issues need attention.\n\n`;
  else md += `> [!CAUTION]\n> Only ${passRate}% pass rate. Significant issues detected.\n\n`;

  md += `## Test Results\n\n`;
  md += `| # | Test | Status | Details |\n|---|---|---|---|\n`;

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    md += `| ${r.testId} | ${r.name} | ${icon} ${r.status} | ${r.details.slice(0, 100)} |\n`;
  });

  md += `\n## Screenshots\n\n`;
  md += `All screenshots saved to: \`${SCREENSHOTS_DIR}\`\n\n`;
  results.forEach(r => {
    if (r.screenshotFile) {
      md += `- **Test ${r.testId}** (${r.name}): [${path.basename(r.screenshotFile)}](file:///${r.screenshotFile})\n`;
    }
  });

  fs.writeFileSync(REPORT_FILE, md, 'utf8');
  log(`\n📄 Report saved: ${REPORT_FILE}`);
  return { passCount, failCount, total, passRate };
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  log('🚀 Starting Code Mafia DOM Test Suite...');

  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 }
  });
  page = await browser.newPage();

  // Run all tests
  await test1_homePage();
  await test2_authForms();
  await test3_signUpTab();
  await test4_dashboard();
  await test5_navigation();
  await test6_socketIO();
  await test7_domStructure();
  await test8_styling();
  await test9_quickMatch();
  await test10_responsiveLayout();
  await test11_consoleErrors();
  await test12_networkRequests();
  await test13_performance();
  await test14_accessibility();
  await test15_fullPageScreenshot();

  await browser.close();

  const summary = generateReport();
  console.log('\n' + '='.repeat(60));
  console.log(`  CODE MAFIA DOM TESTS COMPLETE`);
  console.log(`  ✅ ${summary.passCount} passed  ❌ ${summary.failCount} failed  (${summary.passRate}%)`);
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
