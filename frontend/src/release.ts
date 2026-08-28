export const DEVELOPMENT_RELEASE = 'development';

export function releaseId(candidate?: string): string {
  return candidate && /^[A-Za-z0-9._-]{1,80}$/.test(candidate) ? candidate : DEVELOPMENT_RELEASE;
}
