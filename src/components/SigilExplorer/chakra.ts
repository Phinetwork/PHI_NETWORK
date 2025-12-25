// src/components/SigilExplorer/chakra.ts
/* ──────────────────────────────────────────────────────────────────────────────
   Sigil Explorer — Chakra color + tint helpers
   - No `any`
   - Produces stable inline styles and data attributes used by Explorer UI
────────────────────────────────────────────────────────────────────────────── */

import type { CSSProperties } from "react";
import type { ChakraDay } from "./types";

/** Allow CSS custom properties like `--fc-arc-r` without breaking CSSProperties. */
type CssVarName = `--${string}`;
export type CssVarStyle = CSSProperties & Record<CssVarName, string>;

/**
 * Chakra RGB palette.
 * Keep as integers 0..255.
 * Includes both chakra names and your Arc names as aliases.
 */
const CHAKRA_RGB: Readonly<Record<string, readonly [number, number, number]>> = {
  // Root → Crown (common mapping)
  Root: [255, 72, 72],
  Sacral: [255, 160, 72],
  Solar: [255, 215, 128],
  Heart: [72, 255, 170],
  Throat: [42, 197, 255],
  ThirdEye: [90, 110, 255],
  Crown: [180, 120, 255],

  // Arc names (compat)
  Ignite: [255, 92, 72],
  Integrate: [255, 160, 72],
  Harmonize: [255, 215, 128],
  Reflekt: [180, 120, 255],
  Purify: [42, 197, 255],
  Dream: [90, 110, 255],
};

/** Safe clamp to byte range. */
function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 255) return 255;
  return Math.round(n);
}

/** Parse a chakraDay string into a normalized key we can match against. */
export function normalizeChakraKey(chakraDay: ChakraDay | undefined | null): string {
  const raw = typeof chakraDay === "string" ? chakraDay.trim() : "";
  if (!raw) return "";
  return raw.replace(/\s+/g, " ").toLowerCase();
}

/**
 * Resolve chakra RGB from chakraDay.
 * Supports:
 * - Exact keys (case-insensitive)
 * - First token (e.g. "Root D14" → Root)
 * - Contains match (best-effort)
 */
export function chakraRgbFor(chakraDay: ChakraDay | undefined | null): readonly [number, number, number] | undefined {
  const raw = typeof chakraDay === "string" ? chakraDay.trim() : "";
  if (!raw) return undefined;

  // direct match (case-insensitive)
  const directKey = Object.keys(CHAKRA_RGB).find((k) => k.toLowerCase() === raw.toLowerCase());
  if (directKey) return CHAKRA_RGB[directKey];

  // first token match (handles "Root D14", "Throat • D2/M1", etc.)
  const firstToken = raw.split(/[\s•|,]+/g)[0] ?? "";
  if (firstToken) {
    const tokKey = Object.keys(CHAKRA_RGB).find((k) => k.toLowerCase() === firstToken.toLowerCase());
    if (tokKey) return CHAKRA_RGB[tokKey];
  }

  // contains match (best-effort)
  const lower = raw.toLowerCase();
  const containsKey = Object.keys(CHAKRA_RGB).find((k) => lower.includes(k.toLowerCase()));
  if (containsKey) return CHAKRA_RGB[containsKey];

  return undefined;
}

/**
 * Returns CSS custom-property style for node tinting.
 * Your CSS can use:
 *   rgb(var(--fc-arc-r) var(--fc-arc-g) var(--fc-arc-b))
 */
export function chakraTintStyle(chakraDay: ChakraDay | undefined | null): CssVarStyle {
  const rgb = chakraRgbFor(chakraDay);
  if (!rgb) return {};

  const [r, g, b] = rgb;

  return {
    "--fc-arc-r": String(clampByte(r)),
    "--fc-arc-g": String(clampByte(g)),
    "--fc-arc-b": String(clampByte(b)),
  };
}

/** Convenience: returns an rgba() string for badges, etc. */
export function chakraRgba(chakraDay: ChakraDay | undefined | null, alpha: number): string | undefined {
  const rgb = chakraRgbFor(chakraDay);
  if (!rgb) return undefined;

  const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  const [r, g, b] = rgb;
  return `rgba(${clampByte(r)}, ${clampByte(g)}, ${clampByte(b)}, ${a})`;
}

/** Export palette for UI components that want direct access. */
export const CHAKRA_PALETTE = CHAKRA_RGB;
