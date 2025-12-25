// src/pages/sigilExplorer/kaiCadence.ts
/* ──────────────────────────────────────────────────────────────────────────────
   Sigil Explorer — Kai cadence helpers
   - Provides "nowMs" and a phase-locked "msUntilNextKaiBreath"
   - Uses KKS-style breath quantum (T = 3 + √5 seconds) by default
   - NOTE: This module is UI cadence only (scheduling). It does not define Kai time math.
────────────────────────────────────────────────────────────────────────────── */

export const hasWindow: boolean = typeof window !== "undefined";

/** Monotonic-ish millis for UI timers (best-effort). */
export function nowMs(): number {
  if (!hasWindow) return 0;
  // Prefer performance.now for smooth scheduling.
  const p = window.performance;
  if (p && typeof p.now === "function") return p.now();
  return Date.now();
}

/**
 * Breath quantum in milliseconds.
 * KKS: T = 3 + √5 ≈ 5.2360679 seconds
 * For scheduling, we use a stable integer ms quantum.
 */
export const KAI_BREATH_MS: number = 5236;

/**
 * Compute milliseconds until the next breath boundary, phase-locked to a reference.
 *
 * Strategy:
 * - Use a reference "phase origin" in ms (epoch) and align to KAI_BREATH_MS.
 * - If no origin is provided, we phase-lock to "now" (local session) by using Date.now().
 *   This is acceptable for UI cadence only; canonical Kai time should come from kai_pulse.
 */
export function msUntilNextKaiBreath(opts?: {
  breathMs?: number;
  /** Optional phase origin in epoch-ms used for absolute alignment. */
  phaseOriginEpochMs?: number;
  /** Minimum delay clamp (prevents 0ms tight loops). */
  minDelayMs?: number;
  /** Extra pad to avoid firing early due to timer jitter. */
  padMs?: number;
}): number {
  const breathMs = Math.max(1, Math.floor(opts?.breathMs ?? KAI_BREATH_MS));
  const minDelayMs = Math.max(0, Math.floor(opts?.minDelayMs ?? 10));
  const padMs = Math.max(0, Math.floor(opts?.padMs ?? 6));

  // Use epoch ms only to find phase. This module is cadence-only.
  const epochNow = Date.now();
  const origin = typeof opts?.phaseOriginEpochMs === "number" && Number.isFinite(opts.phaseOriginEpochMs)
    ? Math.floor(opts.phaseOriginEpochMs)
    : 0;

  const rel = epochNow - origin;

  // How far into the current breath window are we?
  const into = ((rel % breathMs) + breathMs) % breathMs;

  // Delay until next boundary.
  let delay = breathMs - into;

  // If we're *exactly* on a boundary, schedule the next one (avoid double fire).
  if (delay === 0) delay = breathMs;

  // Add jitter pad so we don't hit early.
  delay += padMs;

  if (delay < minDelayMs) delay = minDelayMs;
  return delay;
}

/**
 * Utility: schedule a phase-locked repeating timer that re-locks every tick.
 * Returns a cancel function.
 */
export function startKaiBreathLoop(fn: () => void, opts?: Parameters<typeof msUntilNextKaiBreath>[0]): () => void {
  if (!hasWindow) return () => {};

  let timer: number | null = null;
  let cancelled = false;

  const schedule = () => {
    if (cancelled) return;
    if (timer != null) window.clearTimeout(timer);

    const delay = msUntilNextKaiBreath(opts);
    timer = window.setTimeout(() => {
      timer = null;
      if (cancelled) return;
      try {
        fn();
      } finally {
        schedule(); // re-lock every tick
      }
    }, delay);
  };

  schedule();

  return () => {
    cancelled = true;
    if (timer != null) window.clearTimeout(timer);
    timer = null;
  };
}
