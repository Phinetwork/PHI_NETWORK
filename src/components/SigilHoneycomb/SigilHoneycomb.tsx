"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import "./SigilHoneycomb.css";

type KrystalLike = {
  urls: string[];
};

type EdgeMode = "none" | "parent" | "parent+children" | "all";

type SigilNode = {
  hash: string;
  bestUrl: string;
  sources: string[];

  pulse?: number;
  beat?: number;
  stepIndex?: number;
  chakraDay?: string;

  userPhiKey?: string;
  kaiSignature?: string;

  parentHash?: string;
  originHash?: string;

  transferDirection?: "send" | "receive";
  transferAmountPhi?: string;
  phiDelta?: string;

  receiverKaiPulse?: number;

  degree: number;
};

type Coord = { q: number; r: number };
type Pt = { x: number; y: number };

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [k: string]: JsonValue };

type LayoutItem = {
  node: SigilNode;
  x: number;
  y: number;
  cx: number;
  cy: number;
};

type EdgeLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: "parent" | "child" | "origin";
};

export type SigilHoneycombProps = {
  krystal: KrystalLike;
  className?: string;
  sort?: "pulseDesc" | "pulseAsc" | "degreeDesc";
  maxNodes?: number;
  edgeMode?: EdgeMode;
  initialSelect?: string;
  onSelect?: (node: SigilNode | null) => void;
};

const HEX_DIRS: Coord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function safeUrlParse(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

function isJsonObject(v: unknown): v is JsonObject {
  if (typeof v !== "object" || v === null) return false;
  if (Array.isArray(v)) return false;
  return true;
}

function getStr(obj: JsonObject, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function getNum(obj: JsonObject, key: string): number | undefined {
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function getLowerHex(obj: JsonObject, key: string): string | undefined {
  const s = getStr(obj, key);
  return s ? s.toLowerCase() : undefined;
}

function globalAtob(): ((s: string) => string) | null {
  const g = globalThis as unknown as { atob?: (s: string) => string };
  return typeof g.atob === "function" ? g.atob : null;
}

function globalBufferFrom(): ((s: string, enc: string) => { toString: (enc2: string) => string }) | null {
  const g = globalThis as unknown as {
    Buffer?: { from: (s: string, enc: string) => { toString: (enc2: string) => string } };
  };
  if (!g.Buffer || typeof g.Buffer.from !== "function") return null;
  return g.Buffer.from;
}

function b64urlToUtf8(b64url: string): string | null {
  try {
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const full = b64 + pad;

    const atobFn = globalAtob();
    if (atobFn) {
      const bin = atobFn(full);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }

    const bufFrom = globalBufferFrom();
    if (bufFrom) return bufFrom(full, "base64").toString("utf8");

    return null;
  } catch {
    return null;
  }
}

function unwrapStreamUrl(maybeStreamUrl: string): string {
  const u = safeUrlParse(maybeStreamUrl);
  if (!u) return maybeStreamUrl;

  const idx = u.pathname.indexOf("/stream/p/");
  if (idx === -1) return maybeStreamUrl;

  const b64 = u.pathname.slice(idx + "/stream/p/".length).split("/")[0] || "";
  if (!b64) return maybeStreamUrl;

  const decoded = b64urlToUtf8(b64);
  if (!decoded) return maybeStreamUrl;

  try {
    const parsed: unknown = JSON.parse(decoded);
    if (isJsonObject(parsed)) {
      const inner = getStr(parsed, "url");
      if (inner) return inner;
    }
  } catch {
    // ignore
  }

  return maybeStreamUrl;
}

function extractHashFromSPath(urlStr: string): string | null {
  const u = safeUrlParse(urlStr);
  if (!u) return null;

  const m = u.pathname.match(/\/s\/([0-9a-f]{32,128})$/i);
  if (m?.[1]) return m[1].toLowerCase();
  return null;
}

function getPParam(urlStr: string): string | null {
  const u = safeUrlParse(urlStr);
  if (!u) return null;
  return u.searchParams.get("p");
}

function decodePayload(p: string): JsonObject | null {
  if (!p) return null;

  const isCompact = p.startsWith("c:");
  const b64 = isCompact ? p.slice(2) : p;

  const decoded = b64urlToUtf8(b64);
  if (!decoded) return null;

  try {
    const parsed: unknown = JSON.parse(decoded);
    return isJsonObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function toTransferDirection(v: string | undefined): "send" | "receive" | undefined {
  if (v === "send" || v === "receive") return v;
  return undefined;
}

function payloadToPartialNode(hash: string, url: string, payload: JsonObject): Partial<SigilNode> {
  const out: Partial<SigilNode> = { hash, bestUrl: url };

  // compact
  out.pulse = getNum(payload, "u") ?? out.pulse;
  out.beat = getNum(payload, "b") ?? out.beat;
  out.stepIndex = getNum(payload, "s") ?? out.stepIndex;
  out.chakraDay = getStr(payload, "c") ?? out.chakraDay;

  // full
  out.pulse = getNum(payload, "pulse") ?? out.pulse;
  out.beat = getNum(payload, "beat") ?? out.beat;
  out.stepIndex = getNum(payload, "stepIndex") ?? out.stepIndex;
  out.chakraDay = getStr(payload, "chakraDay") ?? out.chakraDay;

  out.userPhiKey = getStr(payload, "userPhiKey") ?? out.userPhiKey;
  out.kaiSignature = getLowerHex(payload, "kaiSignature") ?? out.kaiSignature;

  out.transferDirection = toTransferDirection(getStr(payload, "transferDirection")) ?? out.transferDirection;
  out.transferAmountPhi = getStr(payload, "transferAmountPhi") ?? out.transferAmountPhi;
  out.phiDelta = getStr(payload, "phiDelta") ?? out.phiDelta;
  out.receiverKaiPulse = getNum(payload, "receiverKaiPulse") ?? out.receiverKaiPulse;

  const parentHash = getStr(payload, "parentHash");
  if (parentHash) out.parentHash = parentHash.toLowerCase();

  if (!out.parentHash) {
    const parentUrl = getStr(payload, "parentUrl");
    if (parentUrl) {
      const ph = extractHashFromSPath(unwrapStreamUrl(parentUrl));
      if (ph) out.parentHash = ph;
    }
  }

  const originUrl = getStr(payload, "originUrl");
  if (originUrl) {
    const oh = extractHashFromSPath(unwrapStreamUrl(originUrl));
    if (oh) out.originHash = oh;
  }

  return out;
}

function nodeCompletenessScore(n: Partial<SigilNode>): number {
  let s = 0;
  const bump = (v: unknown) => {
    if (v === undefined || v === null) return;
    if (typeof v === "string" && v.length === 0) return;
    s += 1;
  };

  bump(n.pulse);
  bump(n.beat);
  bump(n.stepIndex);
  bump(n.chakraDay);
  bump(n.userPhiKey);
  bump(n.kaiSignature);
  bump(n.parentHash);
  bump(n.originHash);
  bump(n.transferDirection);
  bump(n.transferAmountPhi);
  bump(n.phiDelta);
  bump(n.receiverKaiPulse);

  return s;
}

function pickBetterUrl(current: string, incoming: string | undefined): string {
  if (!incoming) return current;

  const incomingIsFull = incoming.includes("p=") && !incoming.includes("p=c:");
  const currentIsFull = current.includes("p=") && !current.includes("p=c:");

  if (incomingIsFull && !currentIsFull) return incoming;
  if (incoming.length > current.length) return incoming;
  return current;
}

function mergePrefer<T>(cur: T | undefined, incoming: T | undefined, preferIncoming: boolean): T | undefined {
  if (incoming === undefined || incoming === null) return cur;
  if (typeof incoming === "string" && incoming.length === 0) return cur;

  const curEmpty = cur === undefined || cur === null || (typeof cur === "string" && (cur as string).length === 0);
  if (preferIncoming || curEmpty) return incoming;
  return cur;
}

function buildNodesFromKrystal(krystal: KrystalLike): SigilNode[] {
  const map = new Map<string, SigilNode>();

  for (const raw of krystal.urls) {
    const unwrapped = unwrapStreamUrl(raw);
    const h = extractHashFromSPath(unwrapped);
    if (!h) continue;

    const p = getPParam(unwrapped);
    const payload = p ? decodePayload(p) : null;

    const incomingPartial: Partial<SigilNode> = payload
      ? payloadToPartialNode(h, unwrapped, payload)
      : { hash: h, bestUrl: unwrapped };

    const existing = map.get(h);

    if (!existing) {
      const sources: string[] = [];
      sources.push(raw);
      if (unwrapped !== raw) sources.push(unwrapped);

      map.set(h, {
        hash: h,
        bestUrl: incomingPartial.bestUrl ?? unwrapped,
        sources,
        pulse: incomingPartial.pulse,
        beat: incomingPartial.beat,
        stepIndex: incomingPartial.stepIndex,
        chakraDay: incomingPartial.chakraDay,
        userPhiKey: incomingPartial.userPhiKey,
        kaiSignature: incomingPartial.kaiSignature,
        parentHash: incomingPartial.parentHash,
        originHash: incomingPartial.originHash,
        transferDirection: incomingPartial.transferDirection,
        transferAmountPhi: incomingPartial.transferAmountPhi,
        phiDelta: incomingPartial.phiDelta,
        receiverKaiPulse: incomingPartial.receiverKaiPulse,
        degree: 0,
      });
      continue;
    }

    const mergedSources = new Set<string>(existing.sources);
    mergedSources.add(raw);
    mergedSources.add(unwrapped);

    const aScore = nodeCompletenessScore(existing);
    const bScore = nodeCompletenessScore(incomingPartial);
    const preferIncoming = bScore > aScore;

    const next: SigilNode = {
      ...existing,
      sources: Array.from(mergedSources),
      bestUrl: pickBetterUrl(existing.bestUrl, incomingPartial.bestUrl),
      pulse: mergePrefer(existing.pulse, incomingPartial.pulse, preferIncoming),
      beat: mergePrefer(existing.beat, incomingPartial.beat, preferIncoming),
      stepIndex: mergePrefer(existing.stepIndex, incomingPartial.stepIndex, preferIncoming),
      chakraDay: mergePrefer(existing.chakraDay, incomingPartial.chakraDay, preferIncoming),
      userPhiKey: mergePrefer(existing.userPhiKey, incomingPartial.userPhiKey, preferIncoming),
      kaiSignature: mergePrefer(existing.kaiSignature, incomingPartial.kaiSignature, preferIncoming),
      parentHash: mergePrefer(existing.parentHash, incomingPartial.parentHash, preferIncoming),
      originHash: mergePrefer(existing.originHash, incomingPartial.originHash, preferIncoming),
      transferDirection: mergePrefer(existing.transferDirection, incomingPartial.transferDirection, preferIncoming),
      transferAmountPhi: mergePrefer(existing.transferAmountPhi, incomingPartial.transferAmountPhi, preferIncoming),
      phiDelta: mergePrefer(existing.phiDelta, incomingPartial.phiDelta, preferIncoming),
      receiverKaiPulse: mergePrefer(existing.receiverKaiPulse, incomingPartial.receiverKaiPulse, preferIncoming),
    };

    map.set(h, next);
  }

  const childrenCount = new Map<string, number>();
  for (const n of map.values()) {
    if (!n.parentHash) continue;
    childrenCount.set(n.parentHash, (childrenCount.get(n.parentHash) ?? 0) + 1);
  }

  for (const n of map.values()) {
    let deg = 0;
    if (n.parentHash) deg += 1;
    if (n.originHash) deg += 1;
    deg += childrenCount.get(n.hash) ?? 0;
    n.degree = deg;
  }

  return Array.from(map.values());
}

function sortNodes(nodes: SigilNode[], sort: SigilHoneycombProps["sort"]): SigilNode[] {
  const s = sort ?? "pulseDesc";
  const withPulse = (n: SigilNode) => (typeof n.pulse === "number" ? n.pulse : -1);

  const cmp = (a: SigilNode, b: SigilNode) => {
    if (s === "degreeDesc") {
      if (b.degree !== a.degree) return b.degree - a.degree;
      return withPulse(b) - withPulse(a);
    }
    if (s === "pulseAsc") return withPulse(a) - withPulse(b);
    return withPulse(b) - withPulse(a);
  };

  return [...nodes].sort(cmp);
}

function hexSpiralCoords(n: number): Coord[] {
  if (n <= 0) return [];
  const coords: Coord[] = [{ q: 0, r: 0 }];
  let radius = 1;

  while (coords.length < n) {
    let q = HEX_DIRS[4].q * radius;
    let r = HEX_DIRS[4].r * radius;

    for (let d = 0; d < 6 && coords.length < n; d++) {
      const dq = HEX_DIRS[d].q;
      const dr = HEX_DIRS[d].r;
      for (let step = 0; step < radius && coords.length < n; step++) {
        coords.push({ q, r });
        q += dq;
        r += dr;
      }
    }

    radius += 1;
  }

  return coords;
}

function axialToPixelPointy(c: Coord, radiusPx: number): Pt {
  const x = radiusPx * Math.sqrt(3) * (c.q + c.r / 2);
  const y = radiusPx * (3 / 2) * c.r;
  return { x, y };
}

function formatPhi(v?: string): string {
  if (!v) return "—";
  return v.startsWith("-") ? v : `+${v}`;
}

function shortHash(h: string, n = 10): string {
  return h.length <= n ? h : h.slice(0, n);
}

function chakraClass(chakraDay?: string): string {
  const c = (chakraDay ?? "").toLowerCase();
  if (c.includes("root")) return "chakra-root";
  if (c.includes("sacral")) return "chakra-sacral";
  if (c.includes("solar")) return "chakra-solar";
  if (c.includes("heart")) return "chakra-heart";
  if (c.includes("throat")) return "chakra-throat";
  if (c.includes("third") || c.includes("brow")) return "chakra-third";
  if (c.includes("crown")) return "chakra-crown";
  return "chakra-unknown";
}

const SigilHex = React.memo(function SigilHex(props: {
  node: SigilNode;
  x: number;
  y: number;
  selected: boolean;
  onClick: () => void;
}) {
  const { node, x, y, selected, onClick } = props;

  const labelParts: string[] = [];
  if (typeof node.pulse === "number") labelParts.push(`pulse ${node.pulse}`);
  if (typeof node.beat === "number" && typeof node.stepIndex === "number") labelParts.push(`beat ${node.beat} step ${node.stepIndex}`);
  if (node.chakraDay) labelParts.push(node.chakraDay);
  labelParts.push(shortHash(node.hash, 12));

  const aria = labelParts.join(" — ");

  return (
    <button
      type="button"
      className={[
        "sigilHex",
        chakraClass(node.chakraDay),
        node.transferDirection ? `xfer-${node.transferDirection}` : "",
        selected ? "isSelected" : "",
      ].join(" ")}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      onClick={onClick}
      aria-label={aria}
      title={aria}
    >
      <div className="sigilHexInner">
        <div className="sigilHexTop">
          <span className="sigilHexPulse">{typeof node.pulse === "number" ? node.pulse : "—"}</span>
          <span className="sigilHexHash">{shortHash(node.hash)}</span>
        </div>

        <div className="sigilHexMid">
          <span className="sigilHexBeat">
            {typeof node.beat === "number" ? node.beat : "—"}:{typeof node.stepIndex === "number" ? node.stepIndex : "—"}
          </span>
          <span className="sigilHexDelta">{formatPhi(node.phiDelta)}</span>
        </div>

        <div className="sigilHexBot">
          <span className="sigilHexChakra">{node.chakraDay || "—"}</span>
        </div>
      </div>
    </button>
  );
});

export default function SigilHoneycomb({
  krystal,
  className,
  sort = "pulseDesc",
  maxNodes = 1000,
  edgeMode: edgeModeProp = "all",
  initialSelect,
  onSelect,
}: SigilHoneycombProps) {
  const [edgeMode, setEdgeMode] = useState<EdgeMode>(edgeModeProp);
  const [query, setQuery] = useState<string>("");

  // Selection: only store user override; derived selection chooses initial when override is null/invalid.
  const [selectedOverride, setSelectedOverride] = useState<string | null>(null);

  // pan/zoom: store only user pan; auto pan is derived until the user interacts.
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [vpSize, setVpSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<number>(1);

  const [userInteracted, setUserInteracted] = useState<boolean>(false);
  const [userPan, setUserPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const dragRef = useRef<{ active: boolean; x0: number; y0: number; panX0: number; panY0: number }>({
    active: false,
    x0: 0,
    y0: 0,
    panX0: 0,
    panY0: 0,
  });

  // External subscription: allowed setState in callback.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (!r) return;
      setVpSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodesRaw = useMemo(() => buildNodesFromKrystal(krystal), [krystal]);
  const nodesSorted = useMemo(() => sortNodes(nodesRaw, sort).slice(0, maxNodes), [nodesRaw, sort, maxNodes]);

  const byHash = useMemo(() => {
    const m = new Map<string, SigilNode>();
    for (const n of nodesSorted) m.set(n.hash, n);
    return m;
  }, [nodesSorted]);

  const childrenByParent = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const n of nodesSorted) {
      if (!n.parentHash) continue;
      const arr = m.get(n.parentHash) ?? [];
      arr.push(n.hash);
      m.set(n.parentHash, arr);
    }
    return m;
  }, [nodesSorted]);

  const computedInitialHash = useMemo((): string | null => {
    if (!nodesSorted.length) return null;

    if (initialSelect) {
      const maybeUrlHash = extractHashFromSPath(unwrapStreamUrl(initialSelect));
      if (maybeUrlHash && byHash.has(maybeUrlHash)) return maybeUrlHash;

      const raw = initialSelect.toLowerCase();
      if (byHash.has(raw)) return raw;
    }

    const best = sortNodes(nodesSorted, "degreeDesc")[0];
    return best?.hash ?? nodesSorted[0].hash;
  }, [nodesSorted, initialSelect, byHash]);

  const selectedHash = useMemo((): string | null => {
    const ov = selectedOverride ? selectedOverride.toLowerCase() : null;
    if (ov && byHash.has(ov)) return ov;
    return computedInitialHash;
  }, [selectedOverride, byHash, computedInitialHash]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nodesSorted;

    return nodesSorted.filter((n) => {
      if (n.hash.includes(q)) return true;
      if (typeof n.pulse === "number" && String(n.pulse).includes(q)) return true;
      if (n.userPhiKey && n.userPhiKey.toLowerCase().includes(q)) return true;
      if (n.kaiSignature && n.kaiSignature.toLowerCase().includes(q)) return true;
      if (n.chakraDay && n.chakraDay.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [nodesSorted, query]);

  const layout = useMemo(() => {
    const N = filtered.length;
    const coords = hexSpiralCoords(N);

    const radiusPx = 28;
    const pts: Pt[] = coords.map((c) => axialToPixelPointy(c, radiusPx));

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    const hexW = Math.sqrt(3) * radiusPx;
    const hexH = 2 * radiusPx;
    const pad = 96;

    const offX = (Number.isFinite(minX) ? -minX : 0) + pad;
    const offY = (Number.isFinite(minY) ? -minY : 0) + pad;

    const items: LayoutItem[] = filtered.map((node, i) => {
      const p = pts[i] ?? { x: 0, y: 0 };
      const x = p.x + offX - hexW / 2;
      const y = p.y + offY - hexH / 2;
      const cx = p.x + offX;
      const cy = p.y + offY;
      return { node, x, y, cx, cy };
    });

    const width = (Number.isFinite(maxX - minX) ? maxX - minX : 0) + pad * 2 + hexW;
    const height = (Number.isFinite(maxY - minY) ? maxY - minY : 0) + pad * 2 + hexH;

    const itemByHash = new Map<string, LayoutItem>();
    for (const it of items) itemByHash.set(it.node.hash, it);

    const centerOf = (hash: string | null): Pt | null => {
      if (!hash) return null;
      const it = itemByHash.get(hash);
      return it ? { x: it.cx, y: it.cy } : null;
    };

    return { width, height, items, itemByHash, centerOf };
  }, [filtered]);

  const autoPan = useMemo((): { x: number; y: number } => {
    if (!selectedHash) return { x: 0, y: 0 };
    if (!vpSize.w || !vpSize.h) return { x: 0, y: 0 };
    const c = layout.centerOf(selectedHash);
    if (!c) return { x: 0, y: 0 };
    return {
      x: vpSize.w / 2 - c.x * zoom,
      y: vpSize.h / 2 - c.y * zoom,
    };
  }, [selectedHash, vpSize.w, vpSize.h, layout, zoom]);

  const pan = userInteracted ? userPan : autoPan;

  const selected = useMemo(() => (selectedHash ? byHash.get(selectedHash) ?? null : null), [selectedHash, byHash]);

  useEffect(() => {
    onSelect?.(selected);
  }, [selected, onSelect]);

  const edgeLines = useMemo<EdgeLine[]>(() => {
    if (!selectedHash) return [];
    if (edgeMode === "none") return [];

    const selItem = layout.itemByHash.get(selectedHash);
    const sel = byHash.get(selectedHash);
    if (!selItem || !sel) return [];

    const lines: EdgeLine[] = [];

    const addLine = (toHash: string | undefined, kind: EdgeLine["kind"]) => {
      if (!toHash) return;
      const tgt = layout.itemByHash.get(toHash);
      if (!tgt) return;
      lines.push({ x1: selItem.cx, y1: selItem.cy, x2: tgt.cx, y2: tgt.cy, kind });
    };

    if (edgeMode === "parent" || edgeMode === "parent+children" || edgeMode === "all") addLine(sel.parentHash, "parent");

    if (edgeMode === "parent+children" || edgeMode === "all") {
      const kids = childrenByParent.get(sel.hash) ?? [];
      for (const k of kids) addLine(k, "child");
    }

    if (edgeMode === "all") addLine(sel.originHash, "origin");

    return lines;
  }, [selectedHash, edgeMode, layout, byHash, childrenByParent]);

  const resetToAutoCenter = () => {
    setUserInteracted(false);
    setUserPan({ x: 0, y: 0 });
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = viewportRef.current;
    if (!el) return;

    const delta = e.deltaY;
    const nextZoom = clamp(zoom * (delta > 0 ? 0.92 : 1.08), 0.35, 2.75);

    const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // IMPORTANT: use current pan (auto or user)
    const curPan = pan;

    const worldX = (mx - curPan.x) / zoom;
    const worldY = (my - curPan.y) / zoom;

    const nextPanX = mx - worldX * nextZoom;
    const nextPanY = my - worldY * nextZoom;

    setZoom(nextZoom);
    setUserInteracted(true);
    setUserPan({ x: nextPanX, y: nextPanY });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    if (e.target instanceof HTMLElement) {
      if (e.target.closest(".sigilHex")) return;
    }

    setUserInteracted(true);
    dragRef.current = { active: true, x0: e.clientX, y0: e.clientY, panX0: pan.x, panY0: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x0;
    const dy = e.clientY - dragRef.current.y0;
    setUserPan({ x: dragRef.current.panX0 + dx, y: dragRef.current.panY0 + dy });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const jumpTo = (hash: string) => {
    const h = hash.toLowerCase();
    if (!byHash.has(h)) return;
    setSelectedOverride(h);
    resetToAutoCenter();
  };

  const openSelected = () => {
    if (!selected) return;
    window.open(selected.bestUrl, "_blank", "noopener,noreferrer");
  };

  const copySelectedUrl = async () => {
    if (!selected) return;
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(selected.bestUrl);
    } catch {
      // ignore
    }
  };

  const childCount = selected ? (childrenByParent.get(selected.hash)?.length ?? 0) : 0;

  return (
    <div className={["sigilHoneycomb", className ?? ""].join(" ")}>
      <div className="sigilHoneycombHeader">
        <div className="sigilHoneycombTitle">
          <div className="h1">Honeycomb</div>
          <div className="h2">
            {nodesSorted.length} nodes • showing {filtered.length}
          </div>
        </div>

        <div className="sigilHoneycombControls">
          <div className="searchBox">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search hash / pulse / phiKey / signature / chakra…"
              spellCheck={false}
            />
            {query ? (
              <button className="miniBtn" onClick={() => setQuery("")} type="button">
                Clear
              </button>
            ) : null}
          </div>

          <div className="toggleRow">
            <div className="seg">
              <button type="button" className={edgeMode === "none" ? "on" : ""} onClick={() => setEdgeMode("none")}>
                Edges: Off
              </button>
              <button type="button" className={edgeMode === "parent" ? "on" : ""} onClick={() => setEdgeMode("parent")}>
                Parent
              </button>
              <button
                type="button"
                className={edgeMode === "parent+children" ? "on" : ""}
                onClick={() => setEdgeMode("parent+children")}
              >
                Parent+Kids
              </button>
              <button type="button" className={edgeMode === "all" ? "on" : ""} onClick={() => setEdgeMode("all")}>
                All
              </button>
            </div>

            <div className="seg">
              <button
                type="button"
                className="miniBtn"
                onClick={() => {
                  setZoom(1);
                  resetToAutoCenter();
                }}
              >
                1×
              </button>
              <button
                type="button"
                className="miniBtn"
                onClick={() => {
                  setUserInteracted(true);
                  setZoom((z) => clamp(z * 0.9, 0.35, 2.75));
                }}
              >
                −
              </button>
              <button
                type="button"
                className="miniBtn"
                onClick={() => {
                  setUserInteracted(true);
                  setZoom((z) => clamp(z * 1.1, 0.35, 2.75));
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="sigilHoneycombBody">
        <div
          className="combViewport"
          ref={viewportRef}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="combInner"
            style={{
              width: `${layout.width}px`,
              height: `${layout.height}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            <svg className="combEdges" width={layout.width} height={layout.height} aria-hidden="true">
              {edgeLines.map((ln, i) => (
                <line
                  key={`${ln.kind}-${i}`}
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  className={`edgeLine edge-${ln.kind}`}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>

            {layout.items.map((it) => (
              <SigilHex
                key={it.node.hash}
                node={it.node}
                x={it.x}
                y={it.y}
                selected={it.node.hash === selectedHash}
                onClick={() => {
                  setSelectedOverride(it.node.hash);
                  resetToAutoCenter();
                }}
              />
            ))}
          </div>

          <div className="combHint">Drag to pan • Wheel/pinch to zoom • Click a hex to inspect • Search filters the comb</div>
        </div>

        <aside className="combInspector" aria-label="Honeycomb inspector">
          <div className="inspectorCard">
            <div className="inspectorHead">
              <div className="inspectorTitle">Selection</div>
              <div className="inspectorSub">{selected ? shortHash(selected.hash, 16) : "—"}</div>
            </div>

            <div className="inspectorGrid">
              <div className="k">Pulse</div>
              <div className="v mono">{selected?.pulse ?? "—"}</div>

              <div className="k">Beat:Step</div>
              <div className="v mono">
                {selected?.beat ?? "—"}:{selected?.stepIndex ?? "—"}
              </div>

              <div className="k">Chakra</div>
              <div className="v">{selected?.chakraDay ?? "—"}</div>

              <div className="k">ΔΦ</div>
              <div className="v mono">{formatPhi(selected?.phiDelta)}</div>

              <div className="k">Transfer</div>
              <div className="v">{selected?.transferDirection ?? "—"}</div>

              <div className="k">Parent</div>
              <div className="v mono">
                {selected?.parentHash ? (
                  <button className="linkBtn" type="button" onClick={() => jumpTo(selected.parentHash!)}>
                    {shortHash(selected.parentHash, 14)}
                  </button>
                ) : (
                  "—"
                )}
              </div>

              <div className="k">Children</div>
              <div className="v mono">{selected ? childCount : "—"}</div>

              <div className="k">Origin</div>
              <div className="v mono">
                {selected?.originHash ? (
                  <button className="linkBtn" type="button" onClick={() => jumpTo(selected.originHash!)}>
                    {shortHash(selected.originHash, 14)}
                  </button>
                ) : (
                  "—"
                )}
              </div>

              <div className="k">PhiKey</div>
              <div className="v mono">{selected?.userPhiKey ? shortHash(selected.userPhiKey, 20) : "—"}</div>

              <div className="k">KaiSig</div>
              <div className="v mono">{selected?.kaiSignature ? shortHash(selected.kaiSignature, 20) : "—"}</div>

              <div className="k">Degree</div>
              <div className="v mono">{selected?.degree ?? "—"}</div>
            </div>

            <div className="inspectorActions">
              <button type="button" className="primaryBtn" onClick={openSelected} disabled={!selected}>
                Open
              </button>
              <button type="button" className="miniBtn" onClick={copySelectedUrl} disabled={!selected}>
                Copy URL
              </button>
            </div>

            {selected?.sources?.length ? (
              <details className="sources">
                <summary>Sources ({selected.sources.length})</summary>
                <div className="sourcesList">
                  {selected.sources.slice(0, 30).map((s, i) => (
                    <div key={`${i}-${s}`} className="sourceItem mono">
                      {s}
                    </div>
                  ))}
                  {selected.sources.length > 30 ? <div className="sourceMore">… {selected.sources.length - 30} more</div> : null}
                </div>
              </details>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
