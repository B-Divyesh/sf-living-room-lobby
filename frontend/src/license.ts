const SLUG = 'living-room-lobby';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${TOKEN_KEY}:verdict`;
const DAY = 86_400_000;
const BILLING_BASE = import.meta.env.VITE_BILLING_BASE || 'https://api.sociobot.in';

interface Verdict { valid: boolean; checkedAt: number }

export const checkoutUrl = `${BILLING_BASE}/api/v1/products/${SLUG}/checkout`;

export function captureLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function cachedUnlock(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try { return Boolean((JSON.parse(localStorage.getItem(VERDICT_KEY) || '') as Verdict).valid); } catch { return false; }
}

export async function verifyLicense(force = false): Promise<boolean> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || '{}') as Verdict;
    if (!force && cached.checkedAt && Date.now() - cached.checkedAt < DAY) return cached.valid;
  } catch { /* verify below */ }
  try {
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    const data = (await response.json()) as { valid: boolean };
    const verdict = { valid: Boolean(data.valid), checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict.valid;
  } catch {
    return cachedUnlock();
  }
}

export async function restoreLicense(token: string): Promise<boolean> {
  const clean = token.trim();
  if (clean.length < 12) return false;
  localStorage.setItem(TOKEN_KEY, clean);
  localStorage.removeItem(VERDICT_KEY);
  const valid = await verifyLicense(true);
  if (!valid) localStorage.removeItem(TOKEN_KEY);
  return valid;
}
