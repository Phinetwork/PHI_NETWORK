// src/components/SigilExplorer/url.ts
/* ──────────────────────────────────────────────────────────────────────────────
   Sigil Explorer — URL utilities
   - Canonicalization (stable keys for Maps/Sets)
   - View URL conversion (/stream/p → /stream#p, /p~ → /stream#p)
   - Payload extraction from share tokens (base64url JSON)
   - Hash parsing helpers
   - Content ID + Moment Key (tree grouping)
────────────────────────────────────────────────────────────────────────────── */

import type { ContentKind, SigilSharePayloadLoose } from "./types";
import { hasWindow } from "./kaiCadence";

/* ─────────────────────────────────────────────────────────────────────
 *  Type guards / safe field reads
 *  ───────────────────────────────────────────────────────────────────── */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function readStringField(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function readNumberField(obj: unknown, key: string): number | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/* ─────────────────────────────────────────────────────────────────────
 *  Canonicalization
 *  ───────────────────────────────────────────────────────────────────── */
function safeBaseForRelative(): string {
  if (hasWindow && typeof window.location?.origin === "string") return window.location.origin;
  return "https://phi.network";
}

function normalizeSlashes(path: string): string {
  return path.replace(/\/{2,}/g, "/");
}

/** Stable, comparable string form. Does NOT rewrite routes (keeps variants). */
export function canonicalizeUrl(raw: string): string {
  const input = String(raw ?? "").trim();
  if (!input) return "";

  try {
    const u = new URL(input, safeBaseForRelative());

    u.protocol = u.protocol.toLowerCase();
    u.hostname = u.hostname.toLowerCase();

    if ((u.protocol === "https:" && u.port === "443") || (u.protocol === "http:" && u.port === "80")) {
      u.port = "";
    }

    u.pathname = normalizeSlashes(u.pathname);

    if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);

    if (u.hash === "#") u.hash = "";

    return u.toString();
  } catch {
    return input;
  }
}

/* ─────────────────────────────────────────────────────────────────────
 *  Token extraction (share payload)
 *  ───────────────────────────────────────────────────────────────────── */
const MAX_TOKEN_CHARS = 24_000;

function extractPTokenFromUrl(raw: string): string | undefined {
  const input = String(raw ?? "").trim();
  if (!input) return undefined;

  // /p~<token>
  const pTildeMatch = input.match(/\/p~([A-Za-z0-9\-_]+)/);
  if (pTildeMatch?.[1]) return pTildeMatch[1].slice(0, MAX_TOKEN_CHARS);

  try {
    const u = new URL(input, safeBaseForRelative());

    // Hash: #p=<token> or #...&p=<token>
    if (u.hash) {
      const h = u.hash.startsWith("#") ? u.hash.slice(1) : u.hash;
      const params = new URLSearchParams(h.startsWith("?") ? h.slice(1) : h);
      const p = params.get("p");
      if (p && p.length <= MAX_TOKEN_CHARS) return p;
    }

    // Query: ?p=<token>
    const qp = u.searchParams.get("p");
    if (qp && qp.length <= MAX_TOKEN_CHARS) return qp;

    // Path: .../p/<token>
    const m = u.pathname.match(/\/p\/([A-Za-z0-9\-_]+)/);
    if (m?.[1]) return m[1].slice(0, MAX_TOKEN_CHARS);

    // Path: .../stream/p/<token>
    const mp = u.pathname.match(/\/stream\/p\/([A-Za-z0-9\-_]+)/);
    if (mp?.[1]) return mp[1].slice(0, MAX_TOKEN_CHARS);
  } catch {
    const hashMatch = input.match(/[#?&]p=([A-Za-z0-9\-_]+)/);
    if (hashMatch?.[1]) return hashMatch[1].slice(0, MAX_TOKEN_CHARS);

    const pathMatch = input.match(/\/p\/([A-Za-z0-9\-_]+)/);
    if (pathMatch?.[1]) return pathMatch[1].slice(0, MAX_TOKEN_CHARS);
  }

  return undefined;
}

function base64UrlToUtf8(token: string): string | undefined {
  const t = token.trim();
  if (!t) return undefined;

  let b64 = t.replace(/-/g, "+").replace(/_/g, "/");
  const mod = b64.length % 4;
  if (mod === 2) b64 += "==";
  else if (mod === 3) b64 += "=";
  else if (mod !== 0) return undefined;

  if (hasWindow && typeof window.atob === "function") {
    try {
      const bin = window.atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i) & 0xff;

      if (typeof TextDecoder !== "undefined") {
        return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      }

      let out = "";
      for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
      try {
        return decodeURIComponent(escape(out));
      } catch {
        return out;
      }
    } catch {
      return undefined;
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore Buffer exists in Node-like runtimes
    const buf = Buffer.from(b64, "base64") as { toString(enc: "utf8"): string };
    if (buf && typeof buf.toString === "function") return buf.toString("utf8");
  } catch {
    // ignore
  }

  return undefined;
}

/** Extract and decode the embedded share payload (base64url JSON) if present. */
export function extractPayloadFromUrl(raw: string): SigilSharePayloadLoose | undefined {
  const token = extractPTokenFromUrl(raw);
  if (!token) return undefined;

  const json = base64UrlToUtf8(token);
  if (!json) return undefined;

  try {
    const parsed: unknown = JSON.parse(json);
    if (!isRecord(parsed)) return undefined;
    return parsed as SigilSharePayloadLoose;
  } catch {
    return undefined;
  }
}

/* ─────────────────────────────────────────────────────────────────────
 *  Moment Key + Content ID (tree grouping)
 *  ───────────────────────────────────────────────────────────────────── */

/**
 * Stable grouping key for "same moment" across URL variants.
 * Priority:
 *  1) kai stamp (pulse/beat/step) → k:
 *  2) kaiSignature → sig:
 *  3) share token → tok:
 *  4) hash (/s/<hash>) → h:
 *  5) fallback url → u:
 */
export function momentKeyFor(urlRaw: string, payload: SigilSharePayloadLoose): string {
  const pulse = readNumberField(payload, "pulse");
  const beat = readNumberField(payload, "beat");
  const stepIndex = readNumberField(payload, "stepIndex");

  if (pulse !== undefined && beat !== undefined && stepIndex !== undefined) {
    return `k:${pulse}:${beat}:${stepIndex}`;
  }

  const sig = readStringField(payload, "kaiSignature");
  if (sig) return `sig:${sig}`;

  const token = extractPTokenFromUrl(urlRaw);
  if (token) return `tok:${token}`;

  const h = parseHashFromUrl(urlRaw);
  if (h) return `h:${h}`;

  return `u:${canonicalizeUrl(urlRaw)}`;
}

/**
 * Stable content identity across URL variants.
 * Priority:
 *  1) canonicalHash in payload → h:
 *  2) hash parsed from URL → h:
 *  3) share token → tok:
 *  4) kaiSignature → sig:
 *  5) fallback url → u:
 */
export function contentIdFor(urlRaw: string, payload: SigilSharePayloadLoose): string {
  const payloadHash = readStringField(payload, "canonicalHash");
  if (payloadHash) return `h:${payloadHash}`;

  const urlHash = parseHashFromUrl(urlRaw);
  if (urlHash) return `h:${urlHash}`;

  const token = extractPTokenFromUrl(urlRaw);
  if (token) return `tok:${token}`;

  const sig = readStringField(payload, "kaiSignature");
  if (sig) return `sig:${sig}`;

  return `u:${canonicalizeUrl(urlRaw)}`;
}

/* ─────────────────────────────────────────────────────────────────────
 *  View URL conversion (what we open in a browser tab)
 *  ───────────────────────────────────────────────────────────────────── */
export function isPTildeUrl(raw: string): boolean {
  const u = canonicalizeUrl(raw);
  try {
    const parsed = new URL(u, safeBaseForRelative());
    return parsed.pathname.startsWith("/p~");
  } catch {
    return u.includes("/p~");
  }
}

/**
 * Convert variants into the preferred browser-view form.
 * - /stream/p/<token> → /stream#p=<token>
 * - ?p=<token> → #p=<token>
 * - /p~<token> → /stream#p=<token>
 */
export function browserViewUrl(raw: string): string {
  const canon = canonicalizeUrl(raw);
  if (!canon) return canon;

  const token = extractPTokenFromUrl(canon);

  try {
    const u = new URL(canon, safeBaseForRelative());

    if (u.hash && /(^#|[?&])p=/.test(u.hash)) return u.toString();

    if (token) {
      u.pathname = "/stream";
      u.search = "";
      u.hash = `#p=${token}`;
      return u.toString();
    }

    return u.toString();
  } catch {
    if (token) return `/stream#p=${token}`;
    return canon;
  }
}

/** What the explorer uses for external "Open" links (currently same as browserViewUrl). */
export function explorerOpenUrl(raw: string): string {
  return browserViewUrl(raw);
}

/* ─────────────────────────────────────────────────────────────────────
 *  Content kind + scoring (primary URL selection)
 *  ───────────────────────────────────────────────────────────────────── */
export function contentKindForUrl(raw: string): ContentKind {
  const u = canonicalizeUrl(raw);

  if (u.includes("/p~") || u.includes("#p=") || u.includes("?p=") || u.includes("/stream/p/") || u.includes("/p/")) {
    return "post";
  }
  if (u.includes("/stream") || u.includes("/memory") || u.includes("stream") || u.includes("memory")) return "stream";
  if (u.includes("/sigil") || u.includes("sigil")) return "sigil";

  if (parseHashFromUrl(u)) return "stream";

  return "unknown";
}

/**
 * Higher score = preferred for UI viewing.
 * Pure heuristic (does not depend on URL health).
 */
export function scoreUrlForView(raw: string, prefer: ContentKind): number {
  const u = canonicalizeUrl(raw);
  let score = 0;

  if (u.startsWith("https://")) score += 30;
  else if (u.startsWith("http://")) score += 10;

  try {
    const parsed = new URL(u, safeBaseForRelative());
    const host = parsed.hostname.toLowerCase();
    if (host === "phi.network" || host.endsWith(".phi.network")) score += 35;
    if (parsed.pathname.startsWith("/stream")) score += 20;
    if (parsed.pathname.startsWith("/p~")) score -= 25;
    if (parsed.hash.startsWith("#p=")) score += 18;
    if (parsed.pathname.includes("/stream/p/")) score += 6;
    if (parsed.searchParams.has("p")) score += 4;
  } catch {
    // ignore
  }

  const kind = contentKindForUrl(u);
  if (kind === prefer) score += 20;
  if (prefer === "post" && kind === "stream") score -= 5;

  score += Math.max(-10, 10 - Math.min(10, Math.floor(u.length / 80)));

  return score;
}

export function pickPrimaryUrl(urls: string[], prefer: ContentKind): string {
  if (urls.length === 0) return "";
  const sorted = urls
    .slice()
    .map((u) => canonicalizeUrl(u))
    .filter((u) => u.length > 0)
    .sort((a, b) => scoreUrlForView(b, prefer) - scoreUrlForView(a, prefer));

  return sorted[0] ?? canonicalizeUrl(urls[0] ?? "");
}

/* ─────────────────────────────────────────────────────────────────────
 *  Hash helpers
 *  ───────────────────────────────────────────────────────────────────── */
function pickLikelyHash(s: string): string | undefined {
  const m64 = s.match(/[0-9a-f]{64}/i);
  if (m64?.[0]) return m64[0];

  const m = s.match(/[0-9a-f]{40,128}/i);
  if (m?.[0]) return m[0];

  return undefined;
}

export function parseHashFromUrl(raw: string): string | undefined {
  const u = String(raw ?? "").trim();
  if (!u) return undefined;

  const direct = u.match(/\/s\/([0-9a-f]{40,128})/i);
  if (direct?.[1]) return direct[1];

  try {
    const parsed = new URL(u, safeBaseForRelative());
    const pathHit = parsed.pathname.match(/\/s\/([0-9a-f]{40,128})/i);
    if (pathHit?.[1]) return pathHit[1];

    const q = parsed.searchParams;
    const qh = q.get("hash") || q.get("h") || q.get("s");
    if (qh) {
      const h = pickLikelyHash(qh);
      if (h) return h;
    }

    if (parsed.hash) {
      const h = pickLikelyHash(parsed.hash);
      if (h) return h;
    }

    const h2 = pickLikelyHash(parsed.toString());
    if (h2) return h2;
  } catch {
    const h = pickLikelyHash(u);
    if (h) return h;
  }

  return undefined;
}

/**
 * Best-effort: derive an "origin" URL from the payload embedded in the URL.
 */
export function getOriginUrl(raw: string): string | undefined {
  const payload = extractPayloadFromUrl(raw);
  if (!payload) return undefined;

  const origin =
    readStringField(payload, "originUrl") ||
    readStringField(payload, "origin_url") ||
    readStringField(payload, "origin") ||
    readStringField(payload, "streamUrl") ||
    readStringField(payload, "stream_url") ||
    readStringField(payload, "memoryUrl") ||
    readStringField(payload, "memory_url") ||
    readStringField(payload, "url");

  return origin ? canonicalizeUrl(origin) : undefined;
}

/* ─────────────────────────────────────────────────────────────────────
 *  CSS escape (for querySelector)
 *  ───────────────────────────────────────────────────────────────────── */
export function cssEscape(value: string): string {
  const v = String(value ?? "");
  if (hasWindow) {
    const w = window as unknown as { CSS?: { escape?: (s: string) => string } };
    const esc = w.CSS?.escape;
    if (typeof esc === "function") return esc(v);
  }

  return v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[^a-zA-Z0-9_-]/g, (m) => `\\${m}`);
}
