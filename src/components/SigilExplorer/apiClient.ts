// src/pages/sigilExplorer/apiClient.ts
"use client";

export type ApiSealResponse = { seal: string };
export type ApiUrlsResponse = { seal?: string; urls?: string[] };

const hasWindow = typeof window !== "undefined";

export const API_SEAL_PATH = "/sigils/seal";
export const API_URLS_PATH = "/sigils/urls";
export const API_INHALE_PATH = "/sigils/inhale";

const LS_API_BASE_HINT = "sigil:apiBaseHint:v1";
const LS_BACKUP_DEAD_UNTIL = "sigil:apiBackupDeadUntilMs:v1";

const BACKUP_COOLDOWN_MS = 5 * 60 * 1000;

function nowMs(): number {
  return Date.now();
}

function getEnvString(key: string): string | null {
  // Vite-safe access without hard dependency
  try {
    const meta = import.meta as unknown as { env?: Record<string, unknown> };
    const v = meta.env?.[key];
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

function getDefaultBase(): string {
  if (!hasWindow) return "https://phi.network";
  // default to same-origin if deployed with API behind same host
  try {
    return new URL("/", window.location.href).origin;
  } catch {
    return "https://phi.network";
  }
}

function readBaseHint(): string | null {
  if (!hasWindow) return null;
  try {
    const v = window.localStorage.getItem(LS_API_BASE_HINT);
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  } catch {
    return null;
  }
}

export function loadApiBaseHint(): void {
  // no-op: kept for parity with your component boot order
  void readBaseHint();
}

export function setApiBaseHint(base: string): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(LS_API_BASE_HINT, base);
  } catch {
    // ignore
  }
}

export function loadApiBackupDeadUntil(): void {
  if (!hasWindow) return;
  // touch key for parity; no-op
  try {
    void window.localStorage.getItem(LS_BACKUP_DEAD_UNTIL);
  } catch {
    // ignore
  }
}

function isBackupSuppressed(): boolean {
  if (!hasWindow) return false;
  try {
    const raw = window.localStorage.getItem(LS_BACKUP_DEAD_UNTIL);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n > nowMs();
  } catch {
    return false;
  }
}

function suppressBackup(): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(LS_BACKUP_DEAD_UNTIL, String(nowMs() + BACKUP_COOLDOWN_MS));
  } catch {
    // ignore
  }
}

export function getApiBaseCandidates(): string[] {
  const hint = readBaseHint();
  const primary = getEnvString("VITE_SIGIL_API_BASE") ?? hint ?? getDefaultBase();

  const backupFromEnv = getEnvString("VITE_SIGIL_API_BACKUP_BASE");
  const backup = backupFromEnv && backupFromEnv !== primary ? backupFromEnv : null;

  const out: string[] = [];
  if (primary) out.push(primary);
  if (backup && !isBackupSuppressed()) out.push(backup);
  return out;
}

function isLikelyTerminalStatus(status: number): boolean {
  // 4xx likely means the endpoint exists and request was handled;
  // only failover on network errors / 5xx.
  return status >= 200 && status < 500;
}

/**
 * Fetch helper that tries primary base first, then backup base if:
 * - network error, OR
 * - 5xx response
 */
export async function apiFetchWithFailover(
  buildUrl: (base: string) => string,
  init: RequestInit,
): Promise<Response | null> {
  const bases = getApiBaseCandidates();
  if (bases.length === 0) return null;

  let lastRes: Response | null = null;

  for (let i = 0; i < bases.length; i += 1) {
    const base = bases[i] ?? "";
    const url = buildUrl(base);

    try {
      const res = await fetch(url, init);
      lastRes = res;

      if (isLikelyTerminalStatus(res.status)) {
        // success-ish: remember base
        setApiBaseHint(base);
        return res;
      }

      // 5xx: try next if available
      if (i === 0 && bases.length > 1) continue;

      return res;
    } catch {
      // network error: try next if available
      if (i === 0 && bases.length > 1) continue;
      if (i === 1) suppressBackup();
      return null;
    }
  }

  return lastRes;
}
