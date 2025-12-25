// src/pages/sigilExplorer/urlHealth.ts
"use client";

import { canonicalizeUrl } from "./url";

export type UrlHealthScore = -1 | 0 | 1;

const URL_HEALTH_LS_KEY = "sigil:urlHealth:v1";

/**
 * In-memory cache of URL health by canonical URL.
 *  1  = known good
 * -1  = known bad
 *  0  = unknown / neutral (not stored)
 */
export const urlHealth = new Map<string, UrlHealthScore>();

const hasWindow = typeof window !== "undefined";

function clampScore(v: number): UrlHealthScore {
  if (v > 0) return 1;
  if (v < 0) return -1;
  return 0;
}

export function loadUrlHealthFromStorage(): void {
  if (!hasWindow) return;

  try {
    const raw = window.localStorage.getItem(URL_HEALTH_LS_KEY);
    if (!raw) return;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    urlHealth.clear();

    for (const row of parsed) {
      if (!Array.isArray(row) || row.length !== 2) continue;
      const [u, s] = row;
      if (typeof u !== "string" || typeof s !== "number") continue;
      const cu = canonicalizeUrl(u);
      const cs = clampScore(s);
      if (cs !== 0) urlHealth.set(cu, cs);
    }
  } catch {
    // ignore
  }
}

export function saveUrlHealthToStorage(): void {
  if (!hasWindow) return;

  try {
    const rows: Array<[string, number]> = [];
    for (const [u, s] of urlHealth) {
      if (s === 0) continue;
      rows.push([u, s]);
    }
    window.localStorage.setItem(URL_HEALTH_LS_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

export function getUrlHealth(u: string): UrlHealthScore | undefined {
  const cu = canonicalizeUrl(u);
  return urlHealth.get(cu);
}

export function setUrlHealth(u: string, score: UrlHealthScore): void {
  if (!hasWindow) {
    const cu = canonicalizeUrl(u);
    if (score === 0) urlHealth.delete(cu);
    else urlHealth.set(cu, score);
    return;
  }

  const cu = canonicalizeUrl(u);
  if (score === 0) urlHealth.delete(cu);
  else urlHealth.set(cu, score);

  saveUrlHealthToStorage();
}

export type ProbeResult = "ok" | "bad" | "timeout";

function isOkStatus(status: number): boolean {
  return status >= 200 && status < 400;
}

/**
 * Lightweight fetch probe (never throws).
 * Uses GET with AbortController timeout.
 */
export async function probeUrl(u: string, timeoutMs = 5500): Promise<ProbeResult> {
  if (!hasWindow) return "bad";

  const url = canonicalizeUrl(u);
  const ac = new AbortController();

  const timer = window.setTimeout(() => ac.abort(), Math.max(250, timeoutMs));

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      mode: "cors",
      credentials: "omit",
      redirect: "follow",
      signal: ac.signal,
    });
    return isOkStatus(res.status) ? "ok" : "bad";
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") return "timeout";
    return "bad";
  } finally {
    window.clearTimeout(timer);
  }
}
