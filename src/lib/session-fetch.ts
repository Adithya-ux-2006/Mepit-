export const SESSION_EXPIRED = 'SESSION_EXPIRED';

export class SessionExpiredError extends Error {
  readonly code = SESSION_EXPIRED;

  constructor() {
    super(SESSION_EXPIRED);
    this.name = 'SessionExpiredError';
  }
}

type Fetcher = typeof fetch;

let refreshInFlight: Promise<boolean> | null = null;
let sessionGeneration = 0;

async function requestSessionRefresh(fetcher: Fetcher): Promise<boolean> {
  try {
    const response = await fetcher('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
    if (response.ok) sessionGeneration += 1;
    return response.ok;
  } catch {
    return false;
  }
}

/** Deduplicate refreshes so concurrent expired requests rotate the token once. */
export function refreshSession(fetcher: Fetcher = fetch): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = requestSessionRefresh(fetcher).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Fetch once, refresh on 401, then retry the original request exactly once. */
export async function fetchWithSessionRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  const requestGeneration = sessionGeneration;
  const response = await fetcher(input, init);
  if (response.status !== 401) return response;

  // Another request may have refreshed while this request was in flight.
  const refreshed = requestGeneration !== sessionGeneration
    ? true
    : await refreshSession(fetcher);

  if (!refreshed) throw new SessionExpiredError();

  const retryResponse = await fetcher(input, init);
  if (retryResponse.status === 401) throw new SessionExpiredError();
  return retryResponse;
}

export function isSessionExpiredError(error: unknown): error is SessionExpiredError {
  return error instanceof SessionExpiredError
    || (error instanceof Error && error.message === SESSION_EXPIRED);
}
