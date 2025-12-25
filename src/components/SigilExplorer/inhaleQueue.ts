// src/pages/sigilExplorer/inhaleQueue.ts
"use client";

import { apiFetchWithFailover, API_INHALE_PATH } from "./apiClient";
import { canonicalizeUrl } from "./url";
import { memoryRegistry } from "./registryStore";

const hasWindow = typeof window !== "undefined";

export const INHALE_QUEUE_LS_KEY = "sigil:inhaleQueue:v1";

type InhaleQueueState = {
  urls: string[];
  krystals: unknown[];
};

const state: InhaleQueueState = { urls: [], krystals: [] };

function readStateFromStorage(): InhaleQueueState {
  if (!hasWindow) return { urls: [], krystals: [] };
  try {
    const raw = window.localStorage.getItem(INHALE_QUEUE_LS_KEY);
    if (!raw) return { urls: [], krystals: [] };

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { urls: [], krystals: [] };

    const rec = parsed as Record<string, unknown>;
    const urls = Array.isArray(rec.urls) ? rec.urls.filter((v): v is string => typeof v === "string") : [];
    const krystals = Array.isArray(rec.krystals) ? rec.krystals.slice() : [];

    return { urls, krystals };
  } catch {
    return { urls: [], krystals: [] };
  }
}

export function loadInhaleQueueFromStorage(): void {
  if (!hasWindow) return;
  const s = readStateFromStorage();
  state.urls = s.urls;
  state.krystals = s.krystals;
}

export function saveInhaleQueueToStorage(): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(INHALE_QUEUE_LS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function enqueueInhaleUrl(u: string): void {
  const canon = canonicalizeUrl(u);
  if (!canon) return;
  if (!state.urls.includes(canon)) state.urls.push(canon);
  saveInhaleQueueToStorage();
}

export function enqueueInhaleRawKrystal(k: unknown): void {
  state.krystals.push(k);
  saveInhaleQueueToStorage();
}

export function seedInhaleFromRegistry(): void {
  for (const u of memoryRegistry.keys()) enqueueInhaleUrl(u);
}

export function forceInhaleUrls(urls: string[]): void {
  for (const u of urls) enqueueInhaleUrl(u);
}

function buildBody(): { urls?: string[]; krystals?: unknown[] } {
  const out: { urls?: string[]; krystals?: unknown[] } = {};
  if (state.urls.length > 0) out.urls = state.urls.slice();
  if (state.krystals.length > 0) out.krystals = state.krystals.slice();
  return out;
}

export async function flushInhaleQueue(): Promise<void> {
  if (!hasWindow) return;
  if (state.urls.length === 0 && state.krystals.length === 0) return;

  const body = buildBody();
  const res = await apiFetchWithFailover((base) => new URL(API_INHALE_PATH, base).toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });

  if (!res) return;
  if (!res.ok) return;

  // success: clear queue
  state.urls = [];
  state.krystals = [];
  saveInhaleQueueToStorage();
}
