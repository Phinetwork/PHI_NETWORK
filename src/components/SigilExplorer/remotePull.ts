// src/pages/sigilExplorer/remotePull.ts
"use client";

import { apiFetchWithFailover, API_URLS_PATH } from "./apiClient";
import { addUrl, persistRegistryToStorage } from "./registryStore";

const hasWindow = typeof window !== "undefined";

type RemotePullResult = {
  imported: number;
  remoteSeal?: string | null;
};

function parseUrlsResponse(json: unknown): { seal?: string; urls: string[] } | null {
  if (!json || typeof json !== "object") return null;
  const rec = json as Record<string, unknown>;
  const seal = typeof rec.seal === "string" ? rec.seal : undefined;
  const urlsRaw = rec.urls;
  const urls = Array.isArray(urlsRaw) ? urlsRaw.filter((v): v is string => typeof v === "string") : [];
  return { seal, urls };
}

export async function pullAndImportRemoteUrls(signal: AbortSignal): Promise<RemotePullResult> {
  if (!hasWindow) return { imported: 0 };

  const res = await apiFetchWithFailover((base) => new URL(API_URLS_PATH, base).toString(), {
    method: "GET",
    cache: "no-store",
    signal,
  });

  if (!res) return { imported: 0 };
  if (!res.ok) return { imported: 0 };

  let parsed: unknown = null;
  try {
    parsed = (await res.json()) as unknown;
  } catch {
    return { imported: 0 };
  }

  const body = parseUrlsResponse(parsed);
  if (!body) return { imported: 0 };

  let imported = 0;

  for (const u of body.urls) {
    const changed = addUrl(u, {
      includeAncestry: true,
      broadcast: false,
      persist: false,
      source: "remote",
      enqueueToApi: false, // prevents echo loop
    });
    if (changed) imported += 1;
  }

  if (imported > 0) persistRegistryToStorage();

  return { imported, remoteSeal: body.seal ?? null };
}
