const SLUG = 'living-room-lobby';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${TOKEN_KEY}:verdict`;
const DAY = 86_400_000;
const BILLING_BASE = import.meta.env.VITE_BILLING_BASE || 'https://api.sociobot.in';

interface Verdict { valid: boolean; checkedAt: number }

export type LicenseStatus = 'none' | 'active' | 'inactive' | 'unknown';

function cachedVerdict(): Verdict | null {
  try {
    const value = JSON.parse(localStorage.getItem(VERDICT_KEY) || '') as Verdict;
    return typeof value.valid === 'boolean' && typeof value.checkedAt === 'number' ? value : null;
  } catch {
    return null;
  }
}

export function captureLicense(): void {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function cachedLicenseStatus(): LicenseStatus {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return 'none';
  const cached = cachedVerdict();
  if (!cached) return 'unknown';
  return cached.valid ? 'active' : 'inactive';
}

export async function verifyLicense(force = false): Promise<LicenseStatus> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return 'none';
  const cached = cachedVerdict();
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached.valid ? 'active' : 'inactive';
  try {
    const response = await fetch(`${BILLING_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error(`License verification returned ${response.status}`);
    const data = (await response.json()) as { valid: boolean };
    const verdict = { valid: Boolean(data.valid), checkedAt: Date.now() };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict.valid ? 'active' : 'inactive';
  } catch {
    return cachedLicenseStatus();
  }
}

export async function restoreLicense(token: string): Promise<LicenseStatus> {
  const clean = token.trim();
  if (clean.length < 12) return 'none';
  localStorage.setItem(TOKEN_KEY, clean);
  localStorage.removeItem(VERDICT_KEY);
  return verifyLicense(true);
}
