import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  fetchWithSessionRetry,
  isSessionExpiredError,
} from '../src/lib/session-fetch.ts';

function response(status, body = '') {
  return new Response(body, { status });
}

test('refreshes and retries an expired authenticated request once', async () => {
  let requestCalls = 0;
  let refreshCalls = 0;
  const fetcher = async (input) => {
    if (input === '/api/auth/refresh') {
      refreshCalls += 1;
      return response(200);
    }

    requestCalls += 1;
    return requestCalls === 1 ? response(401) : response(200, '{"saved":true}');
  };

  const result = await fetchWithSessionRetry('/api/projects/p1/inputs', {
    method: 'PUT',
    body: '{}',
  }, fetcher);

  assert.equal(result.status, 200);
  assert.equal(requestCalls, 2);
  assert.equal(refreshCalls, 1);
});

test('deduplicates concurrent refresh attempts', async () => {
  let requestCalls = 0;
  let refreshCalls = 0;
  let releaseRefresh;
  let markRefreshStarted;
  const refreshStarted = new Promise((resolve) => {
    markRefreshStarted = resolve;
  });
  const refreshGate = new Promise((resolve) => {
    releaseRefresh = resolve;
  });

  const fetcher = async (input) => {
    if (input === '/api/auth/refresh') {
      refreshCalls += 1;
      markRefreshStarted();
      await refreshGate;
      return response(200);
    }

    requestCalls += 1;
    return requestCalls <= 2 ? response(401) : response(200);
  };

  const first = fetchWithSessionRetry('/api/validate', { method: 'POST' }, fetcher);
  const second = fetchWithSessionRetry('/api/projects/p1/status', { method: 'PATCH' }, fetcher);
  await refreshStarted;
  releaseRefresh();
  await Promise.all([first, second]);

  assert.equal(requestCalls, 4);
  assert.equal(refreshCalls, 1);
});

test('signals session expiry without looping when refresh fails', async () => {
  let requestCalls = 0;
  let refreshCalls = 0;
  const fetcher = async (input) => {
    if (input === '/api/auth/refresh') {
      refreshCalls += 1;
      return response(401);
    }

    requestCalls += 1;
    return response(401);
  };

  await assert.rejects(
    fetchWithSessionRetry('/api/validate', { method: 'POST' }, fetcher),
    isSessionExpiredError,
  );
  assert.equal(requestCalls, 1);
  assert.equal(refreshCalls, 1);
});

test('gives up after one retry when the refreshed request is still unauthorized', async () => {
  let requestCalls = 0;
  let refreshCalls = 0;
  const fetcher = async (input) => {
    if (input === '/api/auth/refresh') {
      refreshCalls += 1;
      return response(200);
    }

    requestCalls += 1;
    return response(401);
  };

  await assert.rejects(
    fetchWithSessionRetry('/api/projects', undefined, fetcher),
    isSessionExpiredError,
  );
  assert.equal(requestCalls, 2);
  assert.equal(refreshCalls, 1);
});

test('keeps proactive refresh and expiry recovery scoped to the project form', () => {
  const formSource = readFileSync(
    new URL('../src/app/(app)/board1/create-project/page.tsx', import.meta.url),
    'utf8',
  );
  const apiSource = readFileSync(
    new URL('../src/lib/api.ts', import.meta.url),
    'utf8',
  );

  assert.match(formSource, /SESSION_REFRESH_INTERVAL_MS = 45 \* 60_000/);
  assert.match(formSource, /Your session has expired\./);
  assert.match(formSource, /Your work is saved in this browser\./);
  assert.match(formSource, /writeLocalDraft\(false\);[\s\S]*isSessionExpiredError\(err\)/);
  assert.match(formSource, /window\.open\('\/login', '_blank'/);
  assert.match(apiSource, /fetchWithSessionRetry\(path/);

  const currentUser = apiSource.match(
    /export async function getCurrentUser[\s\S]*?\n}/,
  )?.[0] ?? '';
  assert.match(currentUser, /return apiFetch<User>\('\/api\/users\/me'\)/);
  assert.doesNotMatch(currentUser, /refreshSession/);
});
