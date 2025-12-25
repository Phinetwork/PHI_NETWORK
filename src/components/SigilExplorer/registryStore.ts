// src/pages/sigilExplorer/registryStore.ts
"use client";

import type { Registry, SigilSharePayloadLoose } from "./types";
import { canonicalizeUrl, extractPayloadFromUrl, getOriginUrl } from "./url";

export const REGISTRY_LS_KEY = "sigil:explorer:registry:v1";
export const MODAL_FALLBACK_LS_KEY = "sigil:modal:registry:v1";

const hasWindow = typeof window !== "undefined";

export const memoryRegistry: Registry = new Map<string, SigilSharePayloadLoose>();

export type AddUrlSource = "local" | "remote" | "import";

export type AddUrlOptions = {
  includeAncestry: boolean;
  broadcast: boolean;
  persist: boolean;
  source: AddUrlSource;
  enqueueToApi: boolean;
};

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function isOnline(): boolean {
  if (!hasWindow) return false;
  return navigator.onLine;
}

export function hydrateRegistryFromStorage(): boolean {
  if (!hasWindow) return false;

  const loadFromKey = (key: string): string[] => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return [];
      const parsed = safeJsonParse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    } catch {
      return [];
    }
  };

  const urls = [...loadFromKey(REGISTRY_LS_KEY), ...loadFromKey(MODAL_FALLBACK_LS_KEY)];
  if (urls.length === 0) return false;

  let changed = false;
  for (const u of urls) {
    const did = addUrl(u, {
      includeAncestry: true,
      broadcast: false,
      persist: false,
      source: "local",
      enqueueToApi: true,
    });
    if (did) changed = true;
  }

  return changed;
}

export function persistRegistryToStorage(): void {
  if (!hasWindow) return;

  try {
    const urls = Array.from(memoryRegistry.keys());
    window.localStorage.setItem(REGISTRY_LS_KEY, JSON.stringify(urls));
  } catch {
    // ignore
  }
}

function addOneUrl(u: string): boolean {
  const raw = u.trim();
  if (!raw) return false;

  const canon = canonicalizeUrl(raw);
  const payload = extractPayloadFromUrl(canon);
  if (!payload) return false;

  const prev = memoryRegistry.get(canon);
  if (!prev) {
    memoryRegistry.set(canon, payload);
    return true;
  }

  // If same canonical URL appears, keep latest-ish payload by pulse/beat/step heuristic:
  const prevP = typeof prev.pulse === "number" ? prev.pulse : -1;
  const nextP = typeof payload.pulse === "number" ? payload.pulse : -1;
  if (nextP > prevP) {
    memoryRegistry.set(canon, payload);
    return true;
  }
  return false;
}

function readStringField(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const rec = obj as Record<string, unknown>;
  const v = rec[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function ancestryFromPayload(url: string, payload: SigilSharePayloadLoose): string[] {
  const out: string[] = [];

  const parentUrl = readStringField(payload as unknown, "parentUrl");
  if (parentUrl) out.push(parentUrl);

  const originUrl = readStringField(payload as unknown, "originUrl");
  if (originUrl) out.push(originUrl);

  const derivedOrigin = getOriginUrl(url);
  if (derivedOrigin) out.push(derivedOrigin);

  return out;
}

export function addUrl(inputUrl: string, opts: AddUrlOptions): boolean {
  const start = inputUrl.trim();
  if (!start) return false;

  const seen = new Set<string>();
  const stack: string[] = [start];

  let changed = false;
  let guard = 0;

  while (stack.length > 0) {
    guard += 1;
    if (guard > 120) break;

    const next = stack.pop();
    if (!next) continue;

    const canon = canonicalizeUrl(next);
    if (seen.has(canon)) continue;
    seen.add(canon);

    const did = addOneUrl(canon);
    if (did) changed = true;

    if (!opts.includeAncestry) continue;

    const payload = memoryRegistry.get(canon);
    if (!payload) continue;

    for (const anc of ancestryFromPayload(canon, payload)) {
      const a = anc.trim();
      if (!a) continue;
      const ca = canonicalizeUrl(a);
      if (!seen.has(ca)) stack.push(ca);
    }
  }

  if (changed && opts.persist) persistRegistryToStorage();

  // broadcast hook kept in caller; we keep API enqueue in inhaleQueue module.
  void opts.source;
  void opts.broadcast;
  void opts.enqueueToApi;

  return changed;
}

/**
 * Import format parser:
 * - array of urls: ["...","..."]
 * - { urls: string[] }
 * - { keys: string[] }
 * - { krystals: unknown[] } (raw sealed objects)
 * - { urls: string[], krystals: unknown[] }
 */
export function parseImportedJson(parsed: unknown): { urls: string[]; rawKrystals: unknown[] } {
  const urls: string[] = [];
  const rawKrystals: unknown[] = [];

  const pushUrl = (v: unknown) => {
    if (typeof v !== "string") return;
    const s = v.trim();
    if (!s) return;
    urls.push(s);
  };

  if (Array.isArray(parsed)) {
    for (const v of parsed) pushUrl(v);
    return { urls, rawKrystals };
  }

  if (!parsed || typeof parsed !== "object") return { urls, rawKrystals };

  const rec = parsed as Record<string, unknown>;

  const urlFields = [rec.urls, rec.keys, rec.registry, rec.sigils];
  for (const f of urlFields) {
    if (Array.isArray(f)) for (const v of f) pushUrl(v);
  }

  const ks = rec.krystals ?? rec.crystals ?? rec.memoryCrystals;
  if (Array.isArray(ks)) {
    for (const k of ks) rawKrystals.push(k);
  }

  return { urls, rawKrystals };
}
