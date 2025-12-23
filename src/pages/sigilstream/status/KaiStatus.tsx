// src/pages/sigilstream/status/KaiStatus.tsx
"use client";

/**
 * KaiStatus — Atlantean μpulse Bar
 * v5.4 — ALWAYS-LIVE / NO-RELOAD / NO-GLITCH COUNTDOWN (mobile-safe)
 *
 * ✅ “Never stuck” guarantee (as far as the platform allows):
 * - Uses a *dual* visual scheduler:
 *    1) requestAnimationFrame (when available)
 *    2) setInterval(33ms) fallback (covers iOS Safari “rAF pauses during scroll” cases)
 * - Truth resnap every 250ms so interpolation can’t drift.
 * - Imperative DOM updates for countdown text + progress (no React 60fps renders).
 * - React state publishes only low-rate for aria/title + dial percent.
 *
 * ✅ Still KKS-1.0 coherent:
 * - Beat + Step derived from canonical μpulses since Genesis (SigilModal parity)
 * - Next pulse boundary aligned to 5.236…s cadence via μpulse → boundary
 * - Day chakra follows weekday (Solhara..Kaelith)
 *
 * Notes:
 * - `performance.now()` is used ONLY for visual interpolation between truth samples.
 *   Truth still comes from `kairosEpochNow()` (μpulse-space).
 */

import * as React from "react";
import { createPortal } from "react-dom";
import { pad2 } from "../core/utils";
import {
  GENESIS_TS,
  PULSE_MS,
  kairosEpochNow,
  microPulsesSinceGenesis,
  N_DAY_MICRO,
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  MONTHS_PER_YEAR,
} from "../../../utils/kai_pulse";
import KaiKlockRaw from "../../../components/EternalKlock";
import "./KaiStatus.css";

/* ─────────────────────────────────────────────────────────────
   Pulse constants (Golden Breath)
───────────────────────────────────────────────────────────── */

const DEFAULT_PULSE_DUR_S = PULSE_MS / 1000;

const ONE_PULSE_MICRO = 1_000_000n;
const PULSES_PER_STEP_MICRO = 11_000_000n;
const MU_PER_BEAT_EXACT = (N_DAY_MICRO + 18n) / 36n;

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Reads --pulse-dur from CSS and returns SECONDS.
 */
function readPulseDurSeconds(el: HTMLElement | null): number {
  if (!el) return DEFAULT_PULSE_DUR_S;

  const raw = window.getComputedStyle(el).getPropertyValue("--pulse-dur").trim();
  if (!raw) return DEFAULT_PULSE_DUR_S;

  const v = Number.parseFloat(raw);
  if (!Number.isFinite(v) || v <= 0) return DEFAULT_PULSE_DUR_S;

  const lower = raw.toLowerCase();
  if (lower.endsWith("ms")) return v / 1000;
  if (lower.endsWith("s")) return v;

  if (v > 1000) return v / 1000;
  return v;
}

type LayoutMode = "wide" | "tight" | "tiny" | "nano";
type BottomMode = "row" | "stack";

function layoutForWidth(width: number): LayoutMode {
  if (width > 0 && width < 360) return "nano";
  if (width > 0 && width < 520) return "tiny";
  if (width > 0 && width < 760) return "tight";
  return "wide";
}

function uiScaleFor(layout: LayoutMode): number {
  switch (layout) {
    case "nano":
      return 0.84;
    case "tiny":
      return 0.9;
    case "tight":
      return 0.95;
    default:
      return 1.0;
  }
}

function bottomModeFor(layout: LayoutMode): BottomMode {
  return layout === "nano" ? "stack" : "row";
}

function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const read = (): void => {
      const w = Math.round(el.getBoundingClientRect().width);
      setWidth(w);
    };

    read();

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => read());
      ro.observe(el);
      return () => ro.disconnect();
    }

    const onResize = (): void => read();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [ref]);

  return width;
}

/* ─────────────────────────────────────────────────────────────
   Ark mapping (beats 0..35; 6 beats per ark)
───────────────────────────────────────────────────────────── */

const ARK_NAMES = ["Ignite", "Integrate", "Harmonize", "Reflekt", "Purifikation", "Dream"] as const;
type ArkName = (typeof ARK_NAMES)[number];

function arkFromBeat(beat: number): ArkName {
  const b = Number.isFinite(beat) ? Math.floor(beat) : 0;
  const idx = Math.max(0, Math.min(5, Math.floor(b / 6)));
  return ARK_NAMES[idx];
}

/* ─────────────────────────────────────────────────────────────
   KKS-1.0 BigInt helpers
───────────────────────────────────────────────────────────── */

const modE = (a: bigint, m: bigint): bigint => {
  const r = a % m;
  return r >= 0n ? r : r + m;
};

const floorDivE = (a: bigint, d: bigint): bigint => {
  if (d === 0n) throw new Error("Division by zero");
  const q = a / d;
  const r = a % d;
  return r === 0n ? q : a >= 0n ? q : q - 1n;
};

const toSafeNumber = (x: bigint): number => {
  const MAX = BigInt(Number.MAX_SAFE_INTEGER);
  const MIN = BigInt(Number.MIN_SAFE_INTEGER);
  if (x > MAX) return Number.MAX_SAFE_INTEGER;
  if (x < MIN) return Number.MIN_SAFE_INTEGER;
  return Number(x);
};

const absBI = (x: bigint): bigint => (x < 0n ? -x : x);

/* ─────────────────────────────────────────────────────────────
   ✅ μpulse normalization safety
───────────────────────────────────────────────────────────── */

const GENESIS_MS_BI = BigInt(GENESIS_TS);
const NEAR_GENESIS_MS_WINDOW = 500_000_000_000n;

function normalizeKaiEpochRawToMicroPulses(raw: bigint): bigint {
  if (raw >= 100_000_000_000_000n) {
    return microPulsesSinceGenesis(raw / 1000n);
  }
  if (absBI(raw - GENESIS_MS_BI) <= NEAR_GENESIS_MS_WINDOW) {
    return microPulsesSinceGenesis(raw);
  }
  return raw;
}

function kaiPulseFromMicro(pμ_total: bigint): number {
  return toSafeNumber(floorDivE(pμ_total, ONE_PULSE_MICRO));
}

function beatStepFromMicroTotal(pμ_total: bigint): { beat: number; step: number } {
  const pμ_in_day = modE(pμ_total, N_DAY_MICRO);

  const beatBI = floorDivE(pμ_in_day, MU_PER_BEAT_EXACT);
  const beat = Math.max(0, Math.min(35, toSafeNumber(beatBI)));

  const pμ_in_beat = pμ_in_day - BigInt(beat) * MU_PER_BEAT_EXACT;
  const step = Math.max(0, Math.min(43, toSafeNumber(pμ_in_beat / PULSES_PER_STEP_MICRO)));

  return { beat, step };
}

function harmonicDayFromMicroTotal(pμ_total: bigint): string {
  const dayIdx = floorDivE(pμ_total, N_DAY_MICRO);
  const idx = toSafeNumber(modE(dayIdx, 6n));
  const WEEKDAY = ["Solhara", "Aquaris", "Flamora", "Verdari", "Sonari", "Kaelith"] as const;
  return WEEKDAY[Math.max(0, Math.min(5, idx))] ?? "Solhara";
}

function kaiDMYFromMicroKKS(pμ_total: bigint): { day: number; month: number; year: number } {
  const dayIdx = floorDivE(pμ_total, N_DAY_MICRO);
  const monthIdx = floorDivE(dayIdx, BigInt(DAYS_PER_MONTH));
  const yearIdx = floorDivE(dayIdx, BigInt(DAYS_PER_YEAR));

  const dayOfMonth = toSafeNumber(modE(dayIdx, BigInt(DAYS_PER_MONTH))) + 1;
  const month = toSafeNumber(modE(monthIdx, BigInt(MONTHS_PER_YEAR))) + 1;
  const year = toSafeNumber(yearIdx);

  return { day: dayOfMonth, month, year };
}

/* ─────────────────────────────────────────────────────────────
   ✅ Countdown math
───────────────────────────────────────────────────────────── */

function epochMsFromMicroPulses(pμ: bigint): number {
  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
  if (pμ > maxSafe || pμ < minSafe) return GENESIS_TS;

  const pμN = Number(pμ);
  if (!Number.isFinite(pμN)) return GENESIS_TS;

  const deltaPulses = pμN / 1_000_000;
  const msUTC = GENESIS_TS + deltaPulses * PULSE_MS;
  return Number.isFinite(msUTC) ? msUTC : GENESIS_TS;
}

function computeNextBoundaryFromMicro(pμNow: bigint): number {
  const pulseIdx = floorDivE(pμNow, ONE_PULSE_MICRO);
  const nextPulseIdx = pulseIdx + 1n;

  const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
  if (nextPulseIdx > maxSafe) return GENESIS_TS;

  return GENESIS_TS + Number(nextPulseIdx) * PULSE_MS;
}

const ZEROS_6 = "000000";

function pad6(n: number): string {
  if (n <= 0) return ZEROS_6;
  if (n >= 999999) return "999999";
  const s = String(n);
  return s.length >= 6 ? s : ZEROS_6.slice(0, 6 - s.length) + s;
}

function formatSecsLeft6Text(diffMs: number): { text: string; secs: number } {
  const safeMs = Number.isFinite(diffMs) ? Math.max(0, diffMs) : 0;
  const diffUs = Math.floor(safeMs * 1000);
  const whole = Math.floor(diffUs / 1_000_000);
  const frac = diffUs - whole * 1_000_000;
  return { text: `${whole}.${pad6(frac)}`, secs: diffUs / 1_000_000 };
}

/* ─────────────────────────────────────────────────────────────
   ✅ Pulse snap (React updates only when pulse changes)
───────────────────────────────────────────────────────────── */

function usePulseSnap(active: boolean): bigint {
  const [pμSnap, setPμSnap] = React.useState<bigint>(() => {
    if (typeof window === "undefined") return 0n;
    return normalizeKaiEpochRawToMicroPulses(kairosEpochNow());
  });

  const lastPulseIdxRef = React.useRef<bigint>(floorDivE(pμSnap, ONE_PULSE_MICRO));

  React.useEffect(() => {
    if (!active) return;

    const sample = (): void => {
      const pμ = normalizeKaiEpochRawToMicroPulses(kairosEpochNow());
      const pulseIdx = floorDivE(pμ, ONE_PULSE_MICRO);
      if (pulseIdx !== lastPulseIdxRef.current) {
        lastPulseIdxRef.current = pulseIdx;
        setPμSnap(pμ);
      }
    };

    sample();

    const id = window.setInterval(sample, 125);
    const onVis = (): void => sample();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onVis);
    window.addEventListener("focus", onVis);

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [active]);

  return pμSnap;
}

/* ─────────────────────────────────────────────────────────────
   ✅ Smooth animator (always-live; rAF + interval fallback)
───────────────────────────────────────────────────────────── */

type SmoothAnimState = {
  secsLeft: number | null; // low-rate for aria/title
  progress: number; // low-rate for dial percent
};

type SmoothAnimOpts = {
  active: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  numRef: React.RefObject<HTMLSpanElement | null>;
  pulseDurSec: number;
  dialOpen: boolean;
  onWrap?: () => void;
};

function useSmoothCountdownAnimator(opts: SmoothAnimOpts): SmoothAnimState {
  const { active, rootRef, numRef, pulseDurSec, dialOpen, onWrap } = opts;

  const [state, setState] = React.useState<SmoothAnimState>(() => ({
    secsLeft: active ? DEFAULT_PULSE_DUR_S : null,
    progress: 0,
  }));

  const rafRef = React.useRef<number | null>(null);
  const visIntervalRef = React.useRef<number | null>(null);
  const truthIntervalRef = React.useRef<number | null>(null);

  const snapNowMsRef = React.useRef<number>(GENESIS_TS);
  const snapPerfRef = React.useRef<number>(0);
  const nextBoundaryMsRef = React.useRef<number>(GENESIS_TS);

  const lastTickPerfRef = React.useRef<number>(-1);
  const lastPublishPerfRef = React.useRef<number>(0);

  const lastTextRef = React.useRef<string>("—");
  const lastProgRef = React.useRef<number>(-1);

  const perfNow = (): number => (typeof performance !== "undefined" ? performance.now() : 0);

  const resnapTruth = React.useCallback((): void => {
    const pμ = normalizeKaiEpochRawToMicroPulses(kairosEpochNow());
    snapNowMsRef.current = epochMsFromMicroPulses(pμ);
    snapPerfRef.current = perfNow();
    nextBoundaryMsRef.current = computeNextBoundaryFromMicro(pμ);
  }, []);

  React.useEffect(() => {
    // cleanup any previous loops
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (visIntervalRef.current !== null) window.clearInterval(visIntervalRef.current);
    if (truthIntervalRef.current !== null) window.clearInterval(truthIntervalRef.current);
    rafRef.current = null;
    visIntervalRef.current = null;
    truthIntervalRef.current = null;

    if (!active) {
      setState({ secsLeft: null, progress: 0 });
      return;
    }

    resnapTruth();

    const publishEveryMs = dialOpen ? 100 : 250; // dial needs smoother percent; otherwise low-rate
    const tickMinGapMs = 8; // prevents double-exec when rAF + interval collide

    const tick = (forcePublish: boolean): void => {
      const pNow = perfNow();
      if (lastTickPerfRef.current >= 0 && pNow - lastTickPerfRef.current < tickMinGapMs) return;
      lastTickPerfRef.current = pNow;

      const estNowMs = snapNowMsRef.current + (pNow - snapPerfRef.current);

      let wrapped = false;
      if (estNowMs >= nextBoundaryMsRef.current) {
        const missed = Math.floor((estNowMs - nextBoundaryMsRef.current) / PULSE_MS) + 1;
        nextBoundaryMsRef.current += missed * PULSE_MS;
        wrapped = true;
      }

      const diffMs = Math.max(0, nextBoundaryMsRef.current - estNowMs);
      const { text, secs } = formatSecsLeft6Text(diffMs);

      const denom = Math.max(0.000001, pulseDurSec);
      const prog = clamp01(1 - secs / denom);

      // Imperative progress update (cheap if CSS uses transform)
      const rootEl = rootRef.current;
      if (rootEl) {
        // Avoid spamming identical strings
        if (prog !== lastProgRef.current) {
          lastProgRef.current = prog;
          rootEl.style.setProperty("--kai-progress", String(prog));
        }
      }

      // Imperative countdown number update (30Hz+; avoids React renders)
      const numEl = numRef.current;
      if (numEl && text !== lastTextRef.current) {
        lastTextRef.current = text;
        numEl.textContent = text;
      }

      const shouldPublish = forcePublish || pNow - lastPublishPerfRef.current >= publishEveryMs;
      if (shouldPublish) {
        lastPublishPerfRef.current = pNow;
        setState({ secsLeft: secs, progress: prog });
      }

      if (wrapped) {
        // Hard re-anchor on boundary to prevent any visible “jump”
        resnapTruth();
        if (onWrap) onWrap();
      }
    };

    // Prime immediately so UI is correct on first paint (no “jump from 0”)
    tick(true);

    const rafLoop = (): void => {
      tick(false);
      rafRef.current = requestAnimationFrame(rafLoop);
    };

    // rAF for maximum smoothness when allowed
    rafRef.current = requestAnimationFrame(rafLoop);

    // Interval fallback keeps updating even when rAF is paused (e.g., iOS scroll)
    visIntervalRef.current = window.setInterval(() => tick(false), 33);

    // Periodic truth resnap prevents drift under long main-thread stalls
    truthIntervalRef.current = window.setInterval(() => {
      resnapTruth();
      tick(true);
    }, 250);

    const onVis = (): void => {
      resnapTruth();
      tick(true);
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("pageshow", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("pageshow", onVis);

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (visIntervalRef.current !== null) window.clearInterval(visIntervalRef.current);
      if (truthIntervalRef.current !== null) window.clearInterval(truthIntervalRef.current);

      rafRef.current = null;
      visIntervalRef.current = null;
      truthIntervalRef.current = null;
    };
  }, [active, dialOpen, pulseDurSec, onWrap, resnapTruth, rootRef, numRef]);

  return state;
}

/* ─────────────────────────────────────────────────────────────
   Chakra labeling + deterministic chakra assignment
───────────────────────────────────────────────────────────── */

type ChakraName =
  | "Root"
  | "Sacral"
  | "Solar Plexus"
  | "Heart"
  | "Throat"
  | "Third Eye"
  | "Crown";

const CHAKRA_SEQ: readonly ChakraName[] = [
  "Root",
  "Sacral",
  "Solar Plexus",
  "Heart",
  "Throat",
  "Third Eye",
  "Crown",
] as const;

function chakraToLabel(ch: ChakraName): string {
  return ch === "Crown" ? "Krown" : ch;
}

function chakraFromDayOfMonth(dayOfMonth: number): ChakraName {
  const d = Number.isFinite(dayOfMonth) ? Math.floor(dayOfMonth) : 1;
  const idx = Math.max(0, Math.min(6, Math.floor((Math.max(1, d) - 1) / 6)));
  return CHAKRA_SEQ[idx] ?? "Root";
}

function modIndex(n: number, m: number): number {
  const r = n % m;
  return r < 0 ? r + m : r;
}

function chakraFromMonth(month: number): ChakraName {
  const m = Number.isFinite(month) ? Math.floor(month) : 1;
  const idx = modIndex(Math.max(1, m) - 1, 7);
  return CHAKRA_SEQ[idx] ?? "Root";
}

const WEEKDAY_CHAKRA: Readonly<Record<string, ChakraName>> = {
  solhara: "Root",
  aquaris: "Sacral",
  flamora: "Solar Plexus",
  verdari: "Heart",
  sonari: "Throat",
  kaelith: "Crown",
  caelith: "Crown",
};

function chakraFromHarmonicDay(harmonicDay: unknown, fallbackDayOfMonth: number): ChakraName {
  if (typeof harmonicDay === "string") {
    const key = harmonicDay.trim().toLowerCase().replace(/[^a-z]/g, "");
    const ch = WEEKDAY_CHAKRA[key];
    if (ch) return ch;
  }

  if (typeof harmonicDay === "number" && Number.isFinite(harmonicDay)) {
    const idx = modIndex(Math.floor(harmonicDay), 6);
    const keys = ["solhara", "aquaris", "flamora", "verdari", "sonari", "kaelith"] as const;
    const ch = WEEKDAY_CHAKRA[keys[idx]];
    if (ch) return ch;
  }

  return chakraFromDayOfMonth(fallbackDayOfMonth);
}

const KAI_MONTH_NAMES: readonly string[] = [
  "Aethon",
  "Virelai",
  "Solari",
  "Amarin",
  "Kaelus",
  "Umbriel",
  "Noktura",
  "Liora",
] as const;

function monthNameFromIndex(month: number): string {
  const m = Number.isFinite(month) ? Math.floor(month) : 1;
  const idx = Math.max(1, Math.min(8, m)) - 1;
  return KAI_MONTH_NAMES[idx] ?? `Month ${Math.max(1, m)}`;
}

const ARK_CHAKRA: Readonly<Record<ArkName, ChakraName>> = {
  Ignite: "Root",
  Integrate: "Sacral",
  Harmonize: "Solar Plexus",
  Reflekt: "Heart",
  Purifikation: "Throat",
  Dream: "Third Eye",
};

type KaiStatusVars = React.CSSProperties & {
  ["--kai-ui-scale"]?: number;
};

/* ─────────────────────────────────────────────────────────────
   ✅ KaiKlock props (strict) + typed component binding
───────────────────────────────────────────────────────────── */

type KaiKlockProps = {
  hue: string;
  pulse: number;
  harmonicDayPercent: number;
  microCyclePercent: number;
  dayLabel: string;
  monthLabel: string;
  monthDay: number;
  kaiPulseEternal: number;
  glowPulse: boolean;
  pulseIntervalSec: number;
  rimFlash: boolean;
  solarSpiralStepString: string;
  eternalBeatIndex: number;
  eternalStepIndex: number;
};

const KaiKlock = KaiKlockRaw as unknown as React.ComponentType<KaiKlockProps>;

export function KaiStatus(): React.JSX.Element {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const countdownNumRef = React.useRef<HTMLSpanElement | null>(null);

  // μpulse snap updates on pulse boundary (no reload needed; always live)
  const pμNow = usePulseSnap(true);

  const pulseNum = React.useMemo(() => kaiPulseFromMicro(pμNow), [pμNow]);
  const { beat: beatNum, step: stepNum } = React.useMemo(() => beatStepFromMicroTotal(pμNow), [pμNow]);
  const dmy = React.useMemo(() => kaiDMYFromMicroKKS(pμNow), [pμNow]);

  const dayNameFull = React.useMemo(() => harmonicDayFromMicroTotal(pμNow), [pμNow]);
  const beatStepDisp = `${beatNum}:${pad2(stepNum)}`;

  const arkFull: ArkName = arkFromBeat(beatNum);
  const arkChakra: ChakraName = ARK_CHAKRA[arkFull] ?? "Heart";

  const width = useElementWidth(rootRef);
  const layout: LayoutMode = layoutForWidth(width);
  const bottomMode: BottomMode = bottomModeFor(layout);
  const pulseOnTop = layout === "wide" || layout === "tight";

  const [pulseDur, setPulseDur] = React.useState<number>(DEFAULT_PULSE_DUR_S);
  React.useEffect(() => {
    setPulseDur(readPulseDurSeconds(rootRef.current));
  }, [pulseNum]);

  const [dialOpen, setDialOpen] = React.useState<boolean>(false);
  const openDial = React.useCallback(() => setDialOpen(true), []);
  const closeDial = React.useCallback(() => setDialOpen(false), []);

  // Boundary flash (wrap event driven)
  const [flash, setFlash] = React.useState<boolean>(false);
  const flashTimerRef = React.useRef<number | null>(null);

  const triggerFlash = React.useCallback(() => {
    setFlash(true);
    if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => {
      setFlash(false);
      flashTimerRef.current = null;
    }, 180);
  }, []);

  React.useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    };
  }, []);

  // Smooth countdown animator (always live; no reload; no glitch)
  const { secsLeft, progress } = useSmoothCountdownAnimator({
    active: true,
    rootRef,
    numRef: countdownNumRef,
    pulseDurSec: pulseDur,
    dialOpen,
    onWrap: triggerFlash,
  });

  const onRootKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setDialOpen(true);
    }
  }, []);

  // Modal: scroll lock + ESC close
  React.useEffect(() => {
    if (!dialOpen) return;
    if (typeof document === "undefined") return;

    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") closeDial();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [dialOpen, closeDial]);

  const dayChakra = React.useMemo<ChakraName>(
    () => chakraFromHarmonicDay(dayNameFull, dmy.day),
    [dayNameFull, dmy.day],
  );

  const monthChakra = React.useMemo<ChakraName>(() => chakraFromMonth(dmy.month), [dmy.month]);
  const monthName = React.useMemo<string>(() => monthNameFromIndex(dmy.month), [dmy.month]);

  const dmyText = `D${dmy.day}/M${dmy.month}/Y${dmy.year}`;
  const dayChakraLabel = chakraToLabel(dayChakra);
  const monthChakraLabel = chakraToLabel(monthChakra);

  const styleVars: KaiStatusVars = React.useMemo(() => {
    return {
      "--kai-ui-scale": uiScaleFor(layout),
    };
  }, [layout]);

  // Dial percents
  const stepsPerDay = 36 * 44; // 1584
  const stepOfDay = Math.max(0, Math.min(stepsPerDay - 1, beatNum * 44 + stepNum));
  const harmonicDayPercent = (stepOfDay / stepsPerDay) * 100;
  const microCyclePercent = progress * 100;

  const hue = String(Math.round((beatNum / 36) * 360));
  const secsTextFull = secsLeft !== null ? secsLeft.toFixed(6) : "—";

  const Countdown = (
    <div className="kai-status__countdown" aria-label="Next pulse">
      <span className="kai-status__nLabel">NEXT</span>
      <span
        className="kai-status__nVal"
        title={secsTextFull}
        aria-label={secsLeft !== null ? `Next pulse in ${secsTextFull} seconds` : "Next pulse in — seconds"}
      >
        <span ref={countdownNumRef} className="kai-status__nNum">
          {secsLeft !== null ? secsLeft.toFixed(6) : "—"}
        </span>{" "}
        <span className="kai-status__nUnit">s</span>
      </span>
    </div>
  );

  const PulsePill = (
    <span className="kai-pill kai-pill--pulse" title={`Pulse ${pulseNum}`} aria-label={`Pulse ${pulseNum}`} data-chakra="Pulse">
      ☤KAI: <strong className="kai-pill__num">{pulseNum}</strong>
    </span>
  );

  const DMYPill = (
    <span className="kai-pill kai-pill--dmy" title={dmyText} aria-label={`Date ${dmyText}`}>
      <span className="kai-dmy__seg kai-dmy__seg--day" data-chakra={dayChakra}>
        D<span className="kai-dmy__num">{dmy.day}</span>
      </span>
      <span className="kai-dmy__sep">/</span>
      <span className="kai-dmy__seg kai-dmy__seg--month" data-chakra={monthChakra}>
        M<span className="kai-dmy__num">{dmy.month}</span>
      </span>
      <span className="kai-dmy__sep">/</span>
      <span className="kai-dmy__seg kai-dmy__seg--year" data-chakra="Year">
        Y<span className="kai-dmy__num">{dmy.year}</span>
      </span>
    </span>
  );

  const DayPill = (
    <span className="kai-pill kai-pill--day" title={dayNameFull} aria-label={`Day ${dayNameFull}`} data-chakra={dayChakra}>
      {dayNameFull}
    </span>
  );

  const DayChakraPill = (
    <span
      className="kai-pill kai-pill--dayChakra"
      title={`Day chakra ${dayChakraLabel}`}
      aria-label={`Day chakra ${dayChakraLabel}`}
      data-chakra={dayChakra}
    >
      {dayChakraLabel}
    </span>
  );

  const MonthNamePill = (
    <span className="kai-pill kai-pill--monthName" title={monthName} aria-label={`Month ${monthName}`} data-chakra={monthChakra}>
      {monthName}
    </span>
  );

  const MonthChakraPill = (
    <span
      className="kai-pill kai-pill--monthChakra"
      title={`Month chakra ${monthChakraLabel}`}
      aria-label={`Month chakra ${monthChakraLabel}`}
      data-chakra={monthChakra}
    >
      {monthChakraLabel}
    </span>
  );

  const ArkPill = (
    <span className="kai-pill kai-pill--ark" title={arkFull} aria-label={`Ark ${arkFull}`} data-chakra={arkChakra}>
      {arkFull}
    </span>
  );

  const dialPortal =
    dialOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="kk-pop" role="dialog" aria-modal="true" aria-label="Kai-Klok">
            <button type="button" className="kk-pop__backdrop" aria-label="Close Kai-Klok" onClick={closeDial} />
            <div className="kk-pop__panel" role="document">
              <div className="kk-pop__head">
                <div className="kk-pop__title">Kai-Klok</div>
                <button type="button" className="kk-pop__close" onClick={closeDial} aria-label="Close">
                  ✕
                </button>
              </div>

              <div className="kk-pop__meta" aria-label="Kai summary">
                <span className="kk-pop__pill">{beatStepDisp}</span>
                <span className="kk-pop__pill">{dmyText}</span>
                <span className="kk-pop__pill">{monthName}</span>
                <span className="kk-pop__pill">{arkFull}</span>
              </div>

              <div className="kk-pop__dial" aria-label="Kai-Klok dial">
                <div className="klock-stage" data-klock-stage="1">
                  <div className="klock-stage__inner">
                    <KaiKlock
                      hue={hue}
                      pulse={pulseNum}
                      harmonicDayPercent={harmonicDayPercent}
                      microCyclePercent={microCyclePercent}
                      dayLabel={dayNameFull}
                      monthLabel={monthName}
                      monthDay={dmy.day}
                      kaiPulseEternal={pulseNum}
                      glowPulse={true}
                      pulseIntervalSec={pulseDur}
                      rimFlash={flash}
                      solarSpiralStepString={`${pad2(beatNum)}:${pad2(stepNum)}`}
                      eternalBeatIndex={beatNum}
                      eternalStepIndex={stepNum}
                    />
                  </div>
                </div>
              </div>

              <div className="kk-pop__foot">
                <span className="kk-pop__hint">Tap the Klok for more details or press x to return.</span>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`kai-feed-status kai-feed-status--slim${flash ? " kai-feed-status--flash" : ""}`}
        onClick={openDial}
        onKeyDown={onRootKeyDown}
        tabIndex={0}
        role="button"
        aria-haspopup="dialog"
        aria-expanded={dialOpen}
        aria-label="Kai status (open Kai-Klok)"
        data-layout={layout}
        data-bottom={bottomMode}
        data-kai-bsi={beatStepDisp}
        data-kai-ark={arkFull}
        data-kai-dmy={dmyText}
        data-day-chakra={dayChakra}
        data-month-chakra={monthChakra}
        data-ark-chakra={arkChakra}
        data-day-num={dmy.day}
        data-month-num={dmy.month}
        data-year-num={dmy.year}
        style={styleVars}
      >
        <div className="kai-status__top" aria-label="Kai timeline (day row)">
          <span className="kai-status__bsiWrap" aria-label={`Beat step ${beatStepDisp}`}>
            <span className="kai-status__kLabel" aria-hidden="true">
              KAIROS
            </span>
            <span className="kai-status__bsi" title={beatStepDisp}>
              {beatStepDisp}
            </span>
          </span>

          {DMYPill}
          {DayPill}
          {DayChakraPill}

          {pulseOnTop ? PulsePill : null}
        </div>

        <div className="kai-status__mid" aria-label="Kai timeline (month/ark row)">
          {MonthNamePill}
          {MonthChakraPill}
          {ArkPill}
        </div>

        <div className="kai-status__bottom" aria-label="Next pulse row">
          {pulseOnTop ? null : PulsePill}
          {Countdown}
        </div>

        <div className="kai-feed-status__bar" aria-hidden="true">
          <div className="kai-feed-status__barFill" />
          <div className="kai-feed-status__barSpark" />
        </div>
      </div>

      {dialPortal}
    </>
  );
}

export default KaiStatus;
