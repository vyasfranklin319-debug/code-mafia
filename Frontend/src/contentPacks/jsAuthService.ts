import { ContentPack } from '../types/game';

export const jsAuthServicePack: ContentPack = {
  id: 'js-auth-service-v1',
  name: 'Auth & Rate Limiter (JavaScript)',
  description: 'Authentication token verifier and sliding-window rate limiter with seeded timing and window-reset bugs.',
  language: 'javascript',
  difficulty: 'Hard',
  minPlayers: 5,
  maxPlayers: 12,
  estDurationMinutes: 20,
  files: [
    {
      path: 'src/authLimiter.js',
      name: 'authLimiter.js',
      language: 'javascript',
      initialContent: `class AuthLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map();
  }

  verifyToken(token, currentTimeMs) {
    if (!token || !token.expiresAt) return false;
    // BUG 1 (Seeded): ExpiresAt is in seconds, but currentTimeMs is in milliseconds!
    // Triggers invalid false positives/negatives on token validation
    return token.expiresAt > currentTimeMs; 
  }

  isRateLimited(clientId, nowMs = Date.now()) {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { count: 1, resetAt: nowMs + this.windowMs });
      return false;
    }

    const record = this.clients.get(clientId);

    // BUG 2 (Seeded): Failed window reset - if nowMs > record.resetAt, record.count should reset to 1!
    if (nowMs > record.resetAt) {
      record.resetAt = nowMs + this.windowMs;
      // Missing: record.count = 1; (Counter continues accumulating indefinitely!)
    }

    record.count += 1;
    return record.count > this.maxRequests;
  }
}

module.exports = AuthLimiter;
`,
      currentContent: `class AuthLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map();
  }

  verifyToken(token, currentTimeMs) {
    if (!token || !token.expiresAt) return false;
    // BUG 1 (Seeded): ExpiresAt is in seconds, but currentTimeMs is in milliseconds!
    // Triggers invalid false positives/negatives on token validation
    return token.expiresAt > currentTimeMs; 
  }

  isRateLimited(clientId, nowMs = Date.now()) {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { count: 1, resetAt: nowMs + this.windowMs });
      return false;
    }

    const record = this.clients.get(clientId);

    // BUG 2 (Seeded): Failed window reset - if nowMs > record.resetAt, record.count should reset to 1!
    if (nowMs > record.resetAt) {
      record.resetAt = nowMs + this.windowMs;
      // Missing: record.count = 1; (Counter continues accumulating indefinitely!)
    }

    record.count += 1;
    return record.count > this.maxRequests;
  }
}

module.exports = AuthLimiter;
`
    }
  ],
  testSuite: [
    {
      id: 'test-auth-1',
      name: 'Token Timestamp Unit Conversion',
      description: 'Verifies verifyToken converts token.expiresAt (sec) to milliseconds when comparing against currentTimeMs',
      isHidden: false
    },
    {
      id: 'test-auth-2',
      name: 'Sliding Window Reset',
      description: 'Verifies isRateLimited resets request count to 1 when a window expires',
      isHidden: false
    },
    {
      id: 'test-auth-3',
      name: 'Rate Limit Threshold Enforcement',
      description: 'Verifies isRateLimited returns true only when request count strictly exceeds maxRequests within window',
      isHidden: true
    }
  ],
  referenceSolution: {
    'src/authLimiter.js': `class AuthLimiter {
  constructor(maxRequests = 5, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map();
  }

  verifyToken(token, currentTimeMs) {
    if (!token || !token.expiresAt) return false;
    const expiresMs = token.expiresAt > 1e11 ? token.expiresAt : token.expiresAt * 1000;
    return expiresMs > currentTimeMs;
  }

  isRateLimited(clientId, nowMs = Date.now()) {
    if (!this.clients.has(clientId)) {
      this.clients.set(clientId, { count: 1, resetAt: nowMs + this.windowMs });
      return false;
    }

    const record = this.clients.get(clientId);

    if (nowMs > record.resetAt) {
      record.count = 1;
      record.resetAt = nowMs + this.windowMs;
      return false;
    }

    record.count += 1;
    return record.count > this.maxRequests;
  }
}

module.exports = AuthLimiter;`
  }
};
