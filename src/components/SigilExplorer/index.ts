// src/components/SigilExplorer/index.ts
/* ──────────────────────────────────────────────────────────────────────────────
   Sigil Explorer — Safe barrel exports
   - Avoids TS2308 duplicate re-export collisions
   - Explicit exports only (no `export *`)
────────────────────────────────────────────────────────────────────────────── */

/* Types (EXPLICIT — do not re-export SigilNode/BranchSummary here to avoid collisions) */
export type {
  JsonPrimitive,
  JsonValue,
  JsonObject,
  ChakraDay,
  ContentKind,
  SigilSharePayloadLoose,
  FeedPostPayload,
  Registry,
  UsernameClaimEntry,
  UsernameClaimRegistry,
  SigilTransferDirection,
  SigilTransferRecord,
  TransferMove,
  DetailEntry,
  ApiSealResponse,
  SyncReason,
  UrlHealthScore,
  InhaleSource,
  AddUrlOptions,
} from "./types";

/* Chakra */
export { chakraRgbFor, chakraRgba, chakraTintStyle, normalizeChakraKey, CHAKRA_PALETTE } from "./chakra";

/* Formatting */
export { short, formatPhi, formatUsd, safeJson, clipText, getPhiFromPayload, byKaiTime } from "./format";

/* Kai cadence */
export { hasWindow, nowMs, msUntilNextKaiBreath } from "./kaiCadence";

/* URL */
export {
  canonicalizeUrl,
  browserViewUrl,
  explorerOpenUrl,
  extractPayloadFromUrl,
  parseHashFromUrl,
  isPTildeUrl,
  contentKindForUrl,
  scoreUrlForView,
  pickPrimaryUrl,
  getOriginUrl,
  cssEscape,
  momentKeyFor,
} from "./url";

/* URL health */
export { urlHealth, loadUrlHealthFromStorage, setUrlHealth, probeUrl, getUrlHealth } from "./urlHealth";

/* API client */
export { apiFetchWithFailover, API_SEAL_PATH, loadApiBackupDeadUntil, loadApiBaseHint } from "./apiClient";

/* Registry store */
export {
  memoryRegistry,
  REGISTRY_LS_KEY,
  MODAL_FALLBACK_LS_KEY,
  hydrateRegistryFromStorage,
  persistRegistryToStorage,
  parseImportedJson,
  addUrl,
  isOnline,
} from "./registryStore";

/* Inhale queue */
export {
  enqueueInhaleRawKrystal,
  enqueueInhaleUrl,
  flushInhaleQueue,
  forceInhaleUrls,
  seedInhaleFromRegistry,
  loadInhaleQueueFromStorage,
  saveInhaleQueueToStorage,
} from "./inhaleQueue";

/* Remote pull */
export { pullAndImportRemoteUrls } from "./remotePull";

/* Witness */
export { getUsernameClaimRegistry, normalizeUsername, subscribeUsernameClaimRegistry } from "./witness";

/* Transfers */
export {
  SIGIL_TRANSFER_CHANNEL_NAME,
  SIGIL_TRANSFER_EVENT,
  readSigilTransferRegistry,
  getTransferMoveFromPayload,
  getTransferMoveFromRegistry,
  getTransferMoveFromTransferUrl,
} from "./transfers";

/* Tree */
export { buildForest, resolveCanonicalHashFromNode } from "./tree/buildForest";
export type { SigilNode } from "./tree/types";

/* Optional compat (only if those files exist and you still use them) */
// export * from "./treeBuilder";
// export * from "./treeTypes";
