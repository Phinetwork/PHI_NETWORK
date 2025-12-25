// src/components/SigilExplorer/format.ts
/* ──────────────────────────────────────────────────────────────────────────────
   Sigil Explorer — Formatting helpers (no `any`)
   - Φ / USD formatting
   - Short hash/sig formatting
   - Safe printable helpers
   - Kai-time comparator + Φ extraction
────────────────────────────────────────────────────────────────────────────── */

export function short(s: unknown, n = 10): string {
  const v = typeof s === "string" ? s : "";
  if (!v) return "";
  const len = Math.max(1, Math.floor(n));
  if (v.length <= len) return v;
  if (len <= 4) return v.slice(0, len);
  const head = Math.ceil(len / 2);
  const tail = Math.max(1, Math.floor(len / 2) - 1);
  return `${v.slice(0, head)}…${v.slice(v.length - tail)}`;
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function asRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function parseFiniteNumber(v: unknown): number | undefined {
  if (isFiniteNumber(v)) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return undefined;
    const n = Number(t);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function readNum(obj: Record<string, unknown>, key: string): number | undefined {
  return parseFiniteNumber(obj[key]);
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Format Φ amounts for UI.
 * - Uses fixed decimals up to `maxDecimals`, but trims trailing zeros.
 * - Never returns `NaN`.
 */
export function formatPhi(value: number, opts?: { maxDecimals?: number; minDecimals?: number }): string {
  const maxDecimals = clamp(Math.floor(opts?.maxDecimals ?? 6), 0, 12);
  const minDecimals = clamp(Math.floor(opts?.minDecimals ?? 0), 0, maxDecimals);

  if (!isFiniteNumber(value)) return "0";
  const abs = Math.abs(value);

  const decimals =
    abs >= 1 ? Math.min(4, maxDecimals) : abs >= 0.01 ? Math.min(6, maxDecimals) : maxDecimals;

  const use = Math.max(minDecimals, decimals);
  const fixed = value.toFixed(use);

  if (use === 0) return fixed;

  const [i, d = ""] = fixed.split(".");
  let dd = d;
  while (dd.length > minDecimals && dd.endsWith("0")) dd = dd.slice(0, -1);
  return dd.length > 0 ? `${i}.${dd}` : i;
}

/**
 * Format USD values for UI.
 * - Defaults to 2 decimals, trims trailing zeros if desired.
 */
export function formatUsd(value: number, opts?: { decimals?: number; trimZeros?: boolean }): string {
  const decimals = clamp(Math.floor(opts?.decimals ?? 2), 0, 8);
  const trimZeros = opts?.trimZeros ?? false;

  if (!isFiniteNumber(value)) return "0";
  const fixed = value.toFixed(decimals);

  if (!trimZeros || decimals === 0) return fixed;

  const [i, d = ""] = fixed.split(".");
  let dd = d;
  while (dd.length > 0 && dd.endsWith("0")) dd = dd.slice(0, -1);
  return dd.length ? `${i}.${dd}` : i;
}

/**
 * Safe JSON stringify for rendering values in details.
 * Avoids throwing on circular references.
 */
export function safeJson(value: unknown, maxLen = 220): string {
  try {
    const seen = new Set<unknown>();
    const out = JSON.stringify(
      value,
      (_k, v) => {
        if (typeof v === "object" && v !== null) {
          if (seen.has(v)) return "[Circular]";
          seen.add(v);
        }
        if (typeof v === "bigint") return v.toString();
        return v;
      },
      2,
    );

    if (typeof out !== "string") return String(out);
    if (out.length <= maxLen) return out;
    return `${out.slice(0, maxLen)}…`;
  } catch {
    try {
      return String(value);
    } catch {
      return "[Unprintable]";
    }
  }
}

/** Browser-safe title text: collapse whitespace, clip. */
export function clipText(s: unknown, max = 160): string {
  const v = (typeof s === "string" ? s : "").replace(/\s+/g, " ").trim();
  if (v.length <= max) return v;
  return `${v.slice(0, Math.max(1, max - 1))}…`;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Kai-time helpers
────────────────────────────────────────────────────────────────────────────── */

export type KaiStampLike = {
  pulse?: number;
  beat?: number;
  stepIndex?: number;
};

/**
 * Comparator: ascending Kai time (pulse → beat → stepIndex).
 * Undefined values sort last.
 */
export function byKaiTime(a: KaiStampLike, b: KaiStampLike): number {
  const ap = isFiniteNumber(a.pulse) ? a.pulse : Number.POSITIVE_INFINITY;
  const bp = isFiniteNumber(b.pulse) ? b.pulse : Number.POSITIVE_INFINITY;
  if (ap !== bp) return ap - bp;

  const ab = isFiniteNumber(a.beat) ? a.beat : Number.POSITIVE_INFINITY;
  const bb = isFiniteNumber(b.beat) ? b.beat : Number.POSITIVE_INFINITY;
  if (ab !== bb) return ab - bb;

  const as = isFiniteNumber(a.stepIndex) ? a.stepIndex : Number.POSITIVE_INFINITY;
  const bs = isFiniteNumber(b.stepIndex) ? b.stepIndex : Number.POSITIVE_INFINITY;
  return as - bs;
}

/* ──────────────────────────────────────────────────────────────────────────────
   Φ extraction (used by SigilExplorer.tsx for per-pulse totals)
────────────────────────────────────────────────────────────────────────────── */

/**
 * Extract a Φ amount from a payload (best-effort, deterministic).
 * Returns `undefined` if no valid Φ numeric value is present.
 */
export function getPhiFromPayload(payload: unknown): number | undefined {
  const direct = parseFiniteNumber(payload);
  if (direct !== undefined) return direct;

  if (!asRecord(payload)) return undefined;

  // Common direct keys (keep order deterministic)
  const directKeys = [
    "phi",
    "amountPhi",
    "phiAmount",
    "amount_phi",
    "valuePhi",
    "phi_value",
    "amount",
    "value",
  ] as const;

  for (const k of directKeys) {
    const n = readNum(payload, k);
    if (n !== undefined) return n;
  }

  // Common nested containers
  const nestedKeys = ["transfer", "tx", "resonance", "move", "payment", "send", "receive", "feed"] as const;

  for (const nk of nestedKeys) {
    const inner = payload[nk];
    if (!asRecord(inner)) continue;

    for (const k of directKeys) {
      const n = readNum(inner, k);
      if (n !== undefined) return n;
    }
  }

  return undefined;
}
