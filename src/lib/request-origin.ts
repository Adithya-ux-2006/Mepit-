const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type OriginRejection = 'cross-site' | 'missing-origin' | 'origin-mismatch';

export function getOriginRejection(
  method: string,
  origin: string | null,
  fetchSite: string | null,
  requestOrigin: string,
  production: boolean,
): OriginRejection | null {
  if (!MUTATION_METHODS.has(method.toUpperCase())) return null;
  if (fetchSite === 'cross-site') return 'cross-site';
  if (!origin) return production ? 'missing-origin' : null;
  return origin === requestOrigin ? null : 'origin-mismatch';
}

