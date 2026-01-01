// src/components/SigilExplorer/apiClient.ts
"use client";

export type ApiSealResponse = {
  seal: string;
  pulse?: number;
  latestPulse?: number;
  latest_pulse?: number;
  total?: number;
};

const hasWindow = typeof window !== "undefined";
const canStorage = hasWindow && typeof window.localStorage !== "undefined";

/* ─────────────────────────────────────────────────────────────────────
 *  LAH-MAH-TOR API (Primary + Backup)
 *  CORS-PROOF MODE via SAME-ORIGIN PROXY:
 *    /api/lahmahtor/*  ->  https://memory.kaiklok.com/*
 *    (edge may fail over to https://m.kai.ac/*)
 *
 *  DIRECT MODE (optional, not recommended in browsers):
 *    https://memory.kaiklok.com
 *    https://m.kai.ac
 * ─────────────────────────────────────────────────────────────────── */

/** Proxy prefix mounted on phi.network (same-origin). */
export const PROXY_PREFIX = "/api/lahmahtor";

/**
 * Default: false (CORS-proof). If you explicitly enable direct mode,
 * set localStorage key:
 *   kai:lahmahtorAllowCrossOrigin:v1 = "1"
 */
const ALLOW_CROSS_ORIGIN_DIRECT =
  (hasWindow && localStorage.getItem("kai:lahmahtorAllowCrossOrigin:v1") === "1") || false;

/**
 * SAME-ORIGIN bases (preferred): keep "" so requests go to https://phi.network/...
 * The edge proxy handles upstream selection & failover.
 */
export const LIVE_BASE_URL = "";
export const LIVE_BACKUP_URL = "";

/** DIRECT bases (only used if ALLOW_CROSS_ORIGIN_DIRECT is enabled). */
export const DIRECT_PRIMARY_URL = "https://memory.kaiklok.com";
export const DIRECT_BACKUP_URL = "https://m.kai.ac";

/** Paths routed through proxy prefix (same-origin). */
export const API_SEAL_PATH = `${PROXY_PREFIX}/sigils/seal`;
export const API_URLS_PATH = `${PROXY_PREFIX}/sigils/urls`;
export const API_INHALE_PATH = `${PROXY_PREFIX}/sigils/inhale`;

const API_BASE_HINT_LS_KEY = "kai:lahmahtorBase:v1";

/** Backup suppression: if backup fails, suppress it for a cooldown window (no spam). */
const API_BACKUP_DEAD_UNTIL_LS_KEY = "kai:lahmahtorBackupDeadUntil:v1";
const API_BACKUP_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

let apiBackupDeadUntil = 0;

function nowMs(): number {
  return Date.now();
}

export function loadApiBackupDeadUntil(): void {
  if (!canStorage) return;
  const raw = localStorage.getItem(API_BACKUP_DEAD_UNTIL_LS_KEY);
  if (!raw) return;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) apiBackupDeadUntil = n;
}

function saveApiBackupDeadUntil(): void {
  if (!canStorage) return;
  try {
    localStorage.setItem(API_BACKUP_DEAD_UNTIL_LS_KEY, String(apiBackupDeadUntil));
  } catch {
    // ignore
  }
}

function isBackupSuppressed(): boolean {
  return nowMs() < apiBackupDeadUntil;
}

function clearBackupSuppression(): void {
  if (apiBackupDeadUntil === 0) return;
  apiBackupDeadUntil = 0;
  saveApiBackupDeadUntil();
}

function markBackupDead(): void {
  apiBackupDeadUntil = nowMs() + API_BACKUP_COOLDOWN_MS;
  saveApiBackupDeadUntil();

  // never “stick” to backup if it’s failing
  if (apiBaseHint === API_BASE_FALLBACK) {
    apiBaseHint = API_BASE_PRIMARY;
    saveApiBaseHint();
  }
}

/** Sticky base: whichever succeeded last is attempted first. */
let apiBaseHint: string = ""; // assigned below

export function loadApiBaseHint(): void {
  if (!canStorage) return;
  const raw = localStorage.getItem(API_BASE_HINT_LS_KEY);
  if (!raw) return;

  if (raw === API_BASE_PRIMARY) {
    apiBaseHint = raw;
    return;
  }
  if (raw === API_BASE_FALLBACK) {
    apiBaseHint = isBackupSuppressed() ? API_BASE_PRIMARY : raw;
  }
}

function saveApiBaseHint(): void {
  if (!canStorage) return;
  try {
    localStorage.setItem(API_BASE_HINT_LS_KEY, apiBaseHint);
  } catch {
    // ignore
  }
}

/* ─────────────────────────────────────────────────────────────────────
 *  Base selection
 * ─────────────────────────────────────────────────────────────────── */

const API_BASE_PRIMARY = LIVE_BASE_URL; // "" (same-origin)
const API_BASE_FALLBACK = LIVE_BACKUP_URL; // "" (same-origin)

apiBaseHint = API_BASE_PRIMARY;

function isCorsLikeNetworkError(err: unknown): boolean {
  // Browsers commonly throw TypeError for CORS/network failures.
  return err instanceof TypeError;
}

function apiBases(): string[] {
  // Always include same-origin base ("") at least once.
  const bases: string[] = [""];

  // Direct mode: append cross-origin endpoints after same-origin proxy.
  if (ALLOW_CROSS_ORIGIN_DIRECT) {
    bases.push(DIRECT_PRIMARY_URL, DIRECT_BACKUP_URL);
  }

  // Dedup while preserving order.
  return bases.filter((b, i, arr) => arr.indexOf(b) === i).filter((b) => (b === "" ? true : b.startsWith("https://")));
}

function shouldFailoverStatus(status: number): boolean {
  // 0 = network/CORS/unknown
  if (status === 0) return true;
  if (status === 404) return true;
  if (status === 408 || status === 429) return true;
  if (status >= 500) return true;
  return false;
}

/* ─────────────────────────────────────────────────────────────────────
 *  Fetch with failover
 * ─────────────────────────────────────────────────────────────────── */

export async function apiFetchWithFailover(
  makeUrl: (base: string) => string,
  init?: RequestInit,
): Promise<Response | null> {
  const bases = apiBases();
  let last: Response | null = null;

  // If direct mode is on, we can prefer the last success; otherwise it's always "".
  const wantFallbackFirst = apiBaseHint === API_BASE_FALLBACK && !isBackupSuppressed();
  const ordered = wantFallbackFirst ? [...bases] : [...bases];

  for (const base of ordered) {
    // If backup is suppressed, skip it (only meaningful in direct mode)
    if (base === DIRECT_BACKUP_URL && isBackupSuppressed()) continue;

    const url = makeUrl(base);

    try {
      const res = await fetch(url, init);
      last = res;

      // 304 is a valid success for seal checks.
      if (res.ok || res.status === 304) {
        if (base === DIRECT_BACKUP_URL) clearBackupSuppression();

        apiBaseHint = base;
        saveApiBaseHint();
        return res;
      }

      // If backup is failing (direct mode), suppress it.
      if (base === DIRECT_BACKUP_URL && shouldFailoverStatus(res.status)) markBackupDead();

      // If status is “final”, stop; otherwise try next base.
      if (!shouldFailoverStatus(res.status)) return res;
    } catch (err) {
      // network/CORS failure → try next base
      if (base === DIRECT_BACKUP_URL) markBackupDead();
      if (isCorsLikeNetworkError(err)) continue;
      continue;
    }
  }

  return last;
}

export async function apiFetchJsonWithFailover<T>(
  makeUrl: (base: string) => string,
  init?: RequestInit,
): Promise<{ ok: true; value: T; status: number } | { ok: false; status: number }> {
  const res = await apiFetchWithFailover(makeUrl, init);
  if (!res) return { ok: false, status: 0 };
  if (!res.ok) return { ok: false, status: res.status };
  try {
    const value = (await res.json()) as T;
    return { ok: true, value, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

/* ─────────────────────────────────────────────────────────────────────
 *  Helpers used by callers
 * ─────────────────────────────────────────────────────────────────── */

export function buildSealUrl(base: string): string {
  return `${base}${API_SEAL_PATH}`;
}

export function buildUrlsUrl(base: string): string {
  return `${base}${API_URLS_PATH}`;
}

export function buildInhaleUrl(
  base: string,
  params: { include_state?: boolean; include_urls?: boolean } = {},
): string {
  const qs = new URLSearchParams();
  qs.set("include_state", String(params.include_state ?? false));
  qs.set("include_urls", String(params.include_urls ?? false));
  return `${base}${API_INHALE_PATH}?${qs.toString()}`;
}
