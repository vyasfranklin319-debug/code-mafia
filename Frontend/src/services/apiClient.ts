/**
 * CODE MAFIA - FRONTEND TO BACKEND UNIFIED API CLIENT
 * Connects Frontend directly to Backend Microservices at http://localhost:3001
 */

const PROD_API_URL = 'https://code-mafia-api.codemafia.workers.dev';

const getApiBase = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3001';
  }
  return (import.meta as any).env?.VITE_BACKEND_URL || PROD_API_URL;
};

const API_BASE = getApiBase();

async function request<T>(endpoint: string, method: string = 'GET', body?: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  
  // Attach auth token if present
  const token = localStorage.getItem('code_mafia_jwt_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 5-second timeout so API calls never hang indefinitely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network response was not ok' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// 1. Health Check
export async function apiHealthCheck() {
  return request<{ status: string; service: string; activeConnections: number }>('/api/health');
}

// 2. Auth: Register
export async function apiAuthRegister(data: { email: string; username: string; password?: string }) {
  const result = await request<{ user: any; token: string }>('/api/v1/auth/register', 'POST', data);
  if (result.token) {
    localStorage.setItem('code_mafia_jwt_token', result.token);
  }
  return result;
}

// 3. Auth: Login
export async function apiAuthLogin(data: { usernameOrEmail: string; password?: string }) {
  const result = await request<{ user: any; token: string }>('/api/v1/auth/login', 'POST', data);
  if (result.token) {
    localStorage.setItem('code_mafia_jwt_token', result.token);
  }
  return result;
}

// 4. Sessions: Create
export async function apiCreateSession(configPayload: { hostName: string; packId: string; playerCount: number; mafiaCount: number }) {
  return request<{ sessionId: string; joinCode: string }>('/api/v1/sessions', 'POST', configPayload);
}

// 5. Sessions: Get Public State
export async function apiGetSession(sessionId: string) {
  return request<any>(`/api/v1/sessions/${sessionId}`);
}

// 6. Realtime SSE: Broadcast Event
export async function apiBroadcastEvent(roomId: string, event: string, payload: any) {
  return request<{ success: boolean }>(`/api/v1/events/${roomId}`, 'POST', { event, payload });
}

// 7. Sandbox: Execute Code Tests
export async function apiExecuteSandbox(code: string, testCases: any[], language: string = 'javascript') {
  return request<{ passedCount: number; failedCount: number; totalCount: number; passRate: number; durationMs: number; results: any[] }>(
    '/api/v1/sandbox/execute', 
    'POST', 
    { code, testCases, language }
  );
}

// 8. AST Sentinel Scan
export async function apiScanAst(code: string, language: string = 'javascript') {
  return request<{ complexityScore: number; hasInfiniteLoop: boolean; hasDelay: boolean; hasSwallowedCatch: boolean; findings: any[] }>(
    '/api/v1/ast/scan', 
    'POST', 
    { code, language }
  );
}

// 9. Journey: Rank Calculation
export async function apiFetchUserRank(xp: number) {
  return request<{ currentRank: { name: string; icon: string }; nextRank: any }>('/api/v1/journey/rank/' + xp);
}

// 10. Journey: Leaderboard
export async function apiFetchLeaderboard(category: string = 'overall') {
  return request<any[]>('/api/v1/journey/leaderboard?category=' + category);
}

// 11. Match History: Save Record
export async function apiSaveMatchHistory(record: any) {
  return request<{ success: boolean; item: any }>('/api/v1/history', 'POST', record);
}

// 12. Match History: Fetch Archives
export async function apiFetchMatchHistory() {
  return request<any[]>('/api/v1/history');
}
