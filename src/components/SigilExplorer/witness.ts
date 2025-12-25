// src/pages/sigilExplorer/witness.ts
"use client";

export type UsernameClaimEntry = {
  normalized: string;
  claimHash: string;
  claimUrl: string;
  originHash?: string | null;
  ownerHint?: string | null;
  updatedAtMs: number;
};

export type UsernameClaimRegistry = Record<string, UsernameClaimEntry>;

const LS_KEY = "sigil:usernameClaims:v1";
const EVENT_NAME = "sigil:username-claim";

const hasWindow = typeof window !== "undefined";

export function normalizeUsername(input: string): string {
  const s = input.trim().replace(/^@+/, "").toLowerCase();
  // keep a-z0-9._- only (stable, URL-safe)
  let out = "";
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i] ?? "";
    const ok =
      (c >= "a" && c <= "z") ||
      (c >= "0" && c <= "9") ||
      c === "_" ||
      c === "." ||
      c === "-";
    if (ok) out += c;
  }
  return out;
}

export function getUsernameClaimRegistry(): UsernameClaimRegistry {
  if (!hasWindow) return {};

  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as UsernameClaimRegistry;
  } catch {
    return {};
  }
}

function setRegistry(reg: UsernameClaimRegistry): void {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(reg));
  } catch {
    // ignore
  }
}

export function upsertUsernameClaim(entry: Omit<UsernameClaimEntry, "updatedAtMs">): void {
  if (!hasWindow) return;

  const normalized = normalizeUsername(entry.normalized);
  if (!normalized) return;
  if (!entry.claimHash || !entry.claimUrl) return;

  const reg = getUsernameClaimRegistry();
  const next: UsernameClaimEntry = {
    ...entry,
    normalized,
    updatedAtMs: Date.now(),
  };

  const cur = reg[normalized];
  // if identical, skip
  if (
    cur &&
    cur.claimHash === next.claimHash &&
    cur.claimUrl === next.claimUrl &&
    (cur.originHash ?? null) === (next.originHash ?? null) &&
    (cur.ownerHint ?? null) === (next.ownerHint ?? null)
  ) {
    return;
  }

  reg[normalized] = next;
  setRegistry(reg);

  // local event
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: next }));
  } catch {
    // ignore
  }
}

export function subscribeUsernameClaimRegistry(
  cb: (entry: UsernameClaimEntry) => void,
): () => void {
  if (!hasWindow) return () => {};

  const onEvent = (ev: Event) => {
    const ce = ev as CustomEvent<unknown>;
    const d = ce.detail as UsernameClaimEntry | undefined;
    if (!d || typeof d.normalized !== "string") return;
    cb(d);
  };

  const onStorage = (ev: StorageEvent) => {
    if (ev.key !== LS_KEY) return;
    if (!ev.newValue) return;
    // We don’t diff; caller already dedupes in state update.
    // Emit a synthetic “all changed” by pushing each entry.
    try {
      const parsed: unknown = JSON.parse(ev.newValue);
      if (!parsed || typeof parsed !== "object") return;
      const reg = parsed as UsernameClaimRegistry;
      for (const k of Object.keys(reg)) {
        const e = reg[k];
        if (e && typeof e.normalized === "string") cb(e);
      }
    } catch {
      // ignore
    }
  };

  window.addEventListener(EVENT_NAME, onEvent as EventListener);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, onEvent as EventListener);
    window.removeEventListener("storage", onStorage);
  };
}
