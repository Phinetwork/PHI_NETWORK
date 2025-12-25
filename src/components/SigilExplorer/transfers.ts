// src/pages/sigilExplorer/transfers.ts
"use client";

import { extractPayloadFromUrl } from "./url";

const hasWindow = typeof window !== "undefined";

export const SIGIL_TRANSFER_LS_KEY = "sigil:transferRegistry:v1";
export const SIGIL_TRANSFER_EVENT = "sigil:transfer:update";
export const SIGIL_TRANSFER_CHANNEL_NAME = "sigil:transfer:bc:v1";

export type TransferDirection = "send" | "receive";

export type SigilTransferRecord = {
  canonicalHash: string;
  direction: TransferDirection;
  amount: number;
  amountUsd?: number;
  sentPulse?: number;
  updatedAtMs: number;
};

export type TransferMove = {
  direction: TransferDirection;
  amount: number;
  amountUsd?: number;
  sentPulse?: number;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function readNumberField(rec: Record<string, unknown>, key: string): number | undefined {
  const v = rec[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function readStringField(rec: Record<string, unknown>, key: string): string | undefined {
  const v = rec[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

export function readSigilTransferRegistry(): Map<string, SigilTransferRecord> {
  const out = new Map<string, SigilTransferRecord>();
  if (!hasWindow) return out;

  try {
    const raw = window.localStorage.getItem(SIGIL_TRANSFER_LS_KEY);
    if (!raw) return out;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return out;

    for (const row of parsed) {
      if (!isRecord(row)) continue;
      const canonicalHash = readStringField(row, "canonicalHash");
      const direction = readStringField(row, "direction");
      const amount = readNumberField(row, "amount");
      const updatedAtMs = readNumberField(row, "updatedAtMs");

      if (!canonicalHash || (direction !== "send" && direction !== "receive") || amount == null) continue;

      out.set(canonicalHash, {
        canonicalHash,
        direction,
        amount,
        amountUsd: readNumberField(row, "amountUsd"),
        sentPulse: readNumberField(row, "sentPulse"),
        updatedAtMs: updatedAtMs ?? 0,
      });
    }
  } catch {
    // ignore
  }

  return out;
}

function writeSigilTransferRegistry(map: ReadonlyMap<string, SigilTransferRecord>): void {
  if (!hasWindow) return;

  try {
    const rows: SigilTransferRecord[] = [];
    for (const r of map.values()) rows.push(r);
    window.localStorage.setItem(SIGIL_TRANSFER_LS_KEY, JSON.stringify(rows));
  } catch {
    // ignore
  }
}

function broadcastTransferUpdate(): void {
  if (!hasWindow) return;
  try {
    window.dispatchEvent(new Event(SIGIL_TRANSFER_EVENT));
  } catch {
    // ignore
  }

  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(SIGIL_TRANSFER_CHANNEL_NAME);
      bc.postMessage({ type: "transfer:update" });
      bc.close();
    }
  } catch {
    // ignore
  }
}

export function upsertTransferRecord(rec: Omit<SigilTransferRecord, "updatedAtMs">): void {
  if (!hasWindow) return;

  const canonicalHash = rec.canonicalHash.trim();
  if (!canonicalHash) return;

  const next: SigilTransferRecord = {
    ...rec,
    canonicalHash,
    updatedAtMs: Date.now(),
  };

  const map = readSigilTransferRegistry();
  const cur = map.get(canonicalHash);

  if (
    cur &&
    cur.direction === next.direction &&
    cur.amount === next.amount &&
    (cur.amountUsd ?? undefined) === (next.amountUsd ?? undefined) &&
    (cur.sentPulse ?? undefined) === (next.sentPulse ?? undefined)
  ) {
    return;
  }

  map.set(canonicalHash, next);
  writeSigilTransferRegistry(map);
  broadcastTransferUpdate();
}

export function getTransferMoveFromRegistry(
  canonicalHash: string | undefined,
  transferRegistry: ReadonlyMap<string, SigilTransferRecord>,
): TransferMove | undefined {
  if (!canonicalHash) return undefined;
  const r = transferRegistry.get(canonicalHash);
  if (!r) return undefined;
  return { direction: r.direction, amount: r.amount, amountUsd: r.amountUsd, sentPulse: r.sentPulse };
}

export function getTransferMoveFromPayload(payload: unknown): TransferMove | undefined {
  if (!isRecord(payload)) return undefined;

  // common shapes:
  // payload.transfer = { direction, amount, amountUsd, sentPulse }
  // payload.move = { ... }
  const candidates: unknown[] = [];
  if (isRecord(payload.transfer)) candidates.push(payload.transfer);
  if (isRecord(payload.move)) candidates.push(payload.move);

  // also check feed.transfer if present
  if (isRecord(payload.feed) && isRecord(payload.feed.transfer)) candidates.push(payload.feed.transfer);

  for (const c of candidates) {
    if (!isRecord(c)) continue;
    const dir = readStringField(c, "direction");
    if (dir !== "send" && dir !== "receive") continue;

    const amt = readNumberField(c, "amount") ?? readNumberField(c, "phi");
    if (amt == null) continue;

    const usd = readNumberField(c, "amountUsd") ?? readNumberField(c, "usd");
    const sentPulse = readNumberField(c, "sentPulse") ?? readNumberField(c, "pulse");

    return { direction: dir, amount: amt, amountUsd: usd, sentPulse };
  }

  return undefined;
}

export function getTransferMoveFromTransferUrl(record: Record<string, unknown>): TransferMove | undefined {
  const raw = readStringField(record, "transferUrl") ?? readStringField(record, "transfer_url");
  if (!raw) return undefined;

  // If transfer URL embeds payload, try it first.
  const embedded = extractPayloadFromUrl(raw);
  const fromEmbedded = getTransferMoveFromPayload(embedded);
  if (fromEmbedded) return fromEmbedded;

  // Otherwise parse query params
  try {
    const u = new URL(raw, "https://example.invalid");
    const dir = u.searchParams.get("dir") ?? u.searchParams.get("direction");
    const direction: TransferDirection | null = dir === "send" || dir === "receive" ? dir : null;

    const a = u.searchParams.get("amount") ?? u.searchParams.get("phi");
    const amount = a ? Number(a) : NaN;

    if (!direction || !Number.isFinite(amount)) return undefined;

    const usdRaw = u.searchParams.get("usd") ?? u.searchParams.get("amountUsd");
    const usd = usdRaw ? Number(usdRaw) : NaN;

    const spRaw = u.searchParams.get("sentPulse") ?? u.searchParams.get("pulse");
    const sp = spRaw ? Number(spRaw) : NaN;

    return {
      direction,
      amount,
      amountUsd: Number.isFinite(usd) ? usd : undefined,
      sentPulse: Number.isFinite(sp) ? sp : undefined,
    };
  } catch {
    return undefined;
  }
}
