// src/components/SigilExplorer/inhaleQueue.ts
"use client";

/**
 * Inhale Outbox (mobile-first, cross-device reliable)
 * - Durable: persists queue in localStorage
 * - Mobile-safe: flush is attempted even during visibility flips (share sheet / download)
 * - Boot-resume: reloads any pending outbox on startup and flushes when possible
 * - Exit-chance: best-effort flush on pagehide/beforeunload
 * - Retry: exponential backoff, but will NOT spin while offline/hidden
 */

import { apiFetchWithFailover, API_INHALE_PATH } from "./apiClient";
import type { SigilSharePayloadLoose } from "./types";
import {
  canonicalizeUrl,
  extractPayloadFromUrl,
  isPTildeUrl,
  looksLikeBareToken,
  parseStreamToken,
  streamUrlFromToken,
} from "./url";
import { memoryRegistry, isOnline } from "./registryStore";

const hasWindow = typeof window !== "undefined";
const canStorage =
  hasWindow &&
  (() => {
    try {
      return typeof window.localStorage !== "undefined";
    } catch {
      return false;
    }
  })();

const INHALE_BATCH_MAX = 200;
const INHALE_BATCH_MAX_BYTES = 220_000;
const INHALE_DEBOUNCE_MS = 180;
const INHALE_RETRY_BASE_MS = 1200;
const INHALE_RETRY_MAX_MS = 12_000;

export const INHALE_QUEUE_LS_KEY = "kai:inhaleQueue:v1";

const inhaleQueue: Map<string, Record<string, unknown>> = new Map();
let inhaleFlushTimer: number | null = null;
let inhaleInFlight = false;
let inhaleRetryMs = 0;

function isVisible(): boolean {
  if (!hasWindow) return false;
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

function shouldFastFlush(): boolean {
  // NO pointer-gating; on iOS / iPad trackpad this can be "fine"
  if (!hasWindow) return false;
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

function scheduleFastFlush(): void {
  // Only schedule fast flush when visible; background flush is still allowed
  // via explicit calls (pagehide) and the 180ms debounce path.
  if (!shouldFastFlush()) return;
  const run = () => void flushInhaleQueue();
  if (typeof queueMicrotask === "function") {
    queueMicrotask(run);
  } else {
    window.setTimeout(run, 0);
  }
}

function randId(): string {
  if (hasWindow && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(16).slice(2);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function saveInhaleQueueToStorage(): void {
  if (!canStorage) return;
  try {
    const json = JSON.stringify([...inhaleQueue.entries()]);
    localStorage.setItem(INHALE_QUEUE_LS_KEY, json);
  } catch {
    // ignore quota/private-mode issues
  }
}

function loadInhaleQueueFromStorage(): void {
  if (!canStorage) return;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(INHALE_QUEUE_LS_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return;
    inhaleQueue.clear();
    for (const item of arr) {
      if (!Array.isArray(item) || item.length !== 2) continue;
      const [url, obj] = item;
      if (typeof url !== "string" || !isRecord(obj)) continue;
      inhaleQueue.set(canonicalizeUrl(url), obj);
    }
  } catch {
    // ignore corrupt
  }
}

/**
 * Internal helper: schedule a debounced flush (safe on all platforms).
 * Also triggers a microtask flush if visible.
 */
function scheduleDebouncedFlush(): void {
  if (!hasWindow) return;

  if (inhaleFlushTimer != null) window.clearTimeout(inhaleFlushTimer);
  inhaleFlushTimer = window.setTimeout(() => {
    inhaleFlushTimer = null;
    void flushInhaleQueue();
  }, INHALE_DEBOUNCE_MS);

  scheduleFastFlush();
}

function enqueueInhaleRawKrystal(krystal: Record<string, unknown>): void {
  const urlVal = krystal.url;
  if (typeof urlVal !== "string" || !urlVal.trim()) return;

  const abs = canonicalizeUrl(urlVal.trim());
  inhaleQueue.set(abs, { ...krystal, url: abs });
  saveInhaleQueueToStorage();

  scheduleDebouncedFlush();
}

function enqueueInhaleKrystal(url: string, payload: SigilSharePayloadLoose): void {
  const abs = canonicalizeUrl(url);
  const rec = payload as unknown as Record<string, unknown>;
  const krystal: Record<string, unknown> = { url: abs, ...rec };

  inhaleQueue.set(abs, krystal);
  saveInhaleQueueToStorage();

  scheduleDebouncedFlush();
}

/**
 * Seed inhaleQueue from ALL local registry entries.
 * This is the “OPEN inhale” that makes the system resilient to API restarts/resets.
 */
function seedInhaleFromRegistry(): void {
  for (const [rawUrl, payload] of memoryRegistry) {
    const url = canonicalizeUrl(rawUrl);
    const rec = payload as unknown as Record<string, unknown>;
    inhaleQueue.set(url, { url, ...rec });
  }
  saveInhaleQueueToStorage();
  scheduleDebouncedFlush();
}

function safeDecodeURIComponent(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function extractWitnessChainFromUrl(url: string): string[] {
  try {
    const u = new URL(url, window.location.origin);

    const hashStr = u.hash.startsWith("#") ? u.hash.slice(1) : "";
    const h = new URLSearchParams(hashStr);

    const rawAdds = [...u.searchParams.getAll("add"), ...h.getAll("add")];

    const out: string[] = [];
    for (const raw of rawAdds) {
      const decoded = safeDecodeURIComponent(String(raw)).trim();
      if (!decoded) continue;

      if (looksLikeBareToken(decoded)) {
        const abs = canonicalizeUrl(streamUrlFromToken(decoded));
        if (!out.includes(abs)) out.push(abs);
        continue;
      }

      let abs = canonicalizeUrl(decoded);

      if (isPTildeUrl(abs)) {
        const tok = parseStreamToken(abs);
        if (tok) abs = canonicalizeUrl(streamUrlFromToken(tok));
      }

      if (!out.includes(abs)) out.push(abs);
    }

    return out.slice(-512);
  } catch {
    return [];
  }
}

type WitnessCtx = {
  chain: string[];
  originUrl?: string;
  parentUrl?: string;
};

function deriveWitnessContext(url: string): WitnessCtx {
  const chain = extractWitnessChainFromUrl(url);
  if (chain.length === 0) return { chain: [] };
  return {
    chain,
    originUrl: chain[0],
    parentUrl: chain[chain.length - 1],
  };
}

function mergeDerivedContext(payload: SigilSharePayloadLoose, ctx: WitnessCtx): SigilSharePayloadLoose {
  const next: SigilSharePayloadLoose = { ...payload };
  if (ctx.originUrl && !next.originUrl) next.originUrl = ctx.originUrl;
  if (ctx.parentUrl && !next.parentUrl) next.parentUrl = ctx.parentUrl;
  return next;
}

/** Force inhale for URLs even if already present. */
function forceInhaleUrls(urls: readonly string[]): void {
  for (const u of urls) {
    const abs = canonicalizeUrl(u);

    const p0 = memoryRegistry.get(abs) ?? extractPayloadFromUrl(abs);
    if (!p0) continue;

    const ctx = deriveWitnessContext(abs);
    const merged = mergeDerivedContext(p0, ctx);
    enqueueInhaleKrystal(abs, merged);
  }
  void flushInhaleQueue();
}

async function flushInhaleQueue(): Promise<void> {
  if (!hasWindow) return;

  // IMPORTANT:
  // - We attempt a flush even if iOS flips visibility during share/download.
  // - We do NOT spin retries while offline/hidden (see catch block).
  if (inhaleInFlight) return;
  if (inhaleQueue.size === 0) return;

  inhaleInFlight = true;

  try {
    const batch: Record<string, unknown>[] = [];
    const keys: string[] = [];
    const encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
    let droppedOversize = false;

    for (const [k, v] of inhaleQueue) {
      const next = batch.length === 0 ? [v] : [...batch, v];
      const jsonPreview = JSON.stringify(next);
      const size = encoder != null ? encoder.encode(jsonPreview).byteLength : new Blob([jsonPreview]).size;

      // Single item too big: drop it (can't send)
      if (batch.length === 0 && size > INHALE_BATCH_MAX_BYTES) {
        inhaleQueue.delete(k);
        droppedOversize = true;
        continue;
      }

      // Would exceed batch limits: stop and send current batch
      if (batch.length > 0 && (batch.length >= INHALE_BATCH_MAX || size > INHALE_BATCH_MAX_BYTES)) {
        break;
      }

      batch.push(v);
      keys.push(k);

      if (batch.length >= INHALE_BATCH_MAX || size >= INHALE_BATCH_MAX_BYTES) break;
    }

    if (droppedOversize) saveInhaleQueueToStorage();

    // If everything was oversize, we're done for now.
    if (batch.length === 0) {
      inhaleRetryMs = 0;
      if (inhaleQueue.size > 0) {
        inhaleFlushTimer = window.setTimeout(() => {
          inhaleFlushTimer = null;
          void flushInhaleQueue();
        }, 10);
      }
      return;
    }

    // If offline, bail *without retry spin* (listeners will wake)
    if (!isOnline()) {
      inhaleRetryMs = 0;
      return;
    }

    const json = JSON.stringify(batch);
    const blob = new Blob([json], { type: "application/json" });
    const fd = new FormData();
    fd.append("file", blob, `sigils_${randId()}.json`);

    const makeUrl = (base: string) => {
      if (base) {
        const url = new URL(API_INHALE_PATH, base);
        url.searchParams.set("include_state", "false");
        url.searchParams.set("include_urls", "false");
        return url.toString();
      }

      // proxy base "" -> relative request
      const url = new URL(API_INHALE_PATH, "http://placeholder");
      url.searchParams.set("include_state", "false");
      url.searchParams.set("include_urls", "false");
      return `${API_INHALE_PATH}${url.search}`;
    };

    const res = await apiFetchWithFailover(makeUrl, { method: "POST", body: fd });
    if (!res || !res.ok) throw new Error(`inhale failed: ${res?.status ?? 0}`);

    // best-effort parse; not required
    try {
      void (await res.json());
    } catch {
      // ignore
    }

    // ✅ success: remove sent keys
    for (const k of keys) inhaleQueue.delete(k);
    saveInhaleQueueToStorage();
    inhaleRetryMs = 0;

    // If more remains, keep draining fast
    if (inhaleQueue.size > 0) {
      inhaleFlushTimer = window.setTimeout(() => {
        inhaleFlushTimer = null;
        void flushInhaleQueue();
      }, 10);
    }
  } catch {
    // If offline/hidden, do not spin retries.
    // When we return visible/online, our listeners or boot flush will wake us.
    if (!isOnline() || !isVisible()) {
      inhaleRetryMs = 0;
      return;
    }

    inhaleRetryMs = Math.min(inhaleRetryMs ? inhaleRetryMs * 2 : INHALE_RETRY_BASE_MS, INHALE_RETRY_MAX_MS);

    inhaleFlushTimer = window.setTimeout(() => {
      inhaleFlushTimer = null;
      void flushInhaleQueue();
    }, inhaleRetryMs);
  } finally {
    inhaleInFlight = false;
  }
}

/* ────────────────────────────────────────────────────────────────
   ✅ Mobile-first wake + boot resume
─────────────────────────────────────────────────────────────── */

// Wake flush when tab becomes visible or returns online.
if (hasWindow) {
  try {
    window.addEventListener("online", () => scheduleFastFlush());
  } catch {
    // ignore
  }

  if (typeof document !== "undefined") {
    try {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") scheduleFastFlush();
      });
    } catch {
      // ignore
    }
  }

  // Best-effort “last chance” flush when leaving (iOS pagehide is key).
  try {
    window.addEventListener("pagehide", () => {
      void flushInhaleQueue();
    });
  } catch {
    // ignore
  }

  // Some browsers still fire beforeunload (desktop).
  try {
    window.addEventListener("beforeunload", () => {
      void flushInhaleQueue();
    });
  } catch {
    // ignore
  }

  // ✅ Boot: reload any pending outbox and try immediately.
  try {
    loadInhaleQueueFromStorage();
    if (inhaleQueue.size > 0) scheduleFastFlush();
  } catch {
    // ignore
  }
}

export {
  enqueueInhaleRawKrystal,
  enqueueInhaleKrystal,
  flushInhaleQueue,
  forceInhaleUrls,
  loadInhaleQueueFromStorage,
  saveInhaleQueueToStorage,
  seedInhaleFromRegistry,
};

export function enqueueInhaleUrl(url: string): void {
  const abs = canonicalizeUrl(url);
  const p0 = memoryRegistry.get(abs) ?? extractPayloadFromUrl(abs);
  if (!p0) return;
  const ctx = deriveWitnessContext(abs);
  const merged = mergeDerivedContext(p0, ctx);
  enqueueInhaleKrystal(abs, merged);
}
