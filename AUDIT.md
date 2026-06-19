# 🔍 Comprehensive Code Audit — Party Stats Hub

**Date:** 2026-06-19  
**Auditor:** Automated deep audit (5-domain parallel analysis)  
**Scope:** Full codebase — server, routes, engine, components, pipeline, tests

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 **Critical** | 5 |
| 🟠 **High** | 14 |
| 🟡 **Medium** | 18 |
| 🔵 **Low** | 11 |
| **Total** | **48** |

The codebase is a **TanStack Start + React** D&D character management app with a **SQLite** backend, **D&D Beyond** integration, a **Notion** integration, and a native character builder engine. Overall the app is functional and well-structured for its purpose, but has significant security gaps and architectural concerns that should be addressed before production deployment.

### What's Working Well

- Good use of TanStack Router/Query/Start patterns with server functions
- Proper cookie `Secure` flag handling in auth (`Secure` only in production)
- Clean rate limiting implementation on login attempts with lockout
- Smart multi-tier fallback chain (SQLite → cache file → mock DB)
- Zod validation on several API inputs (`loginFn`, `getMonsterFluffByName`, `getNativeCharacter`)
- Well-organized theme system with CSS custom properties and OKLCH colors
- Sensible query retry/stale/refetch configuration in `partyQueryOptions`
- Good `.gitignore` coverage for sensitive files and build artifacts
- SSR error-wrapper in `server.ts` catches h3's swallowed 500 responses

---

## 🔴 Critical Issues

### C1. Authentication is Disabled in Production

**Files:** `src/lib/auth.server.ts` — Lines 43–51

```ts
export async function isAuthenticated(_headers: Headers): Promise<boolean> {
  return true; // Login requirement disabled for now
}

export function verifyPasscode(_passcode: string): boolean {
  return true; // Passcode requirement disabled for now
}
```

Both `isAuthenticated` and `verifyPasscode` unconditionally return `true`. Every API endpoint that calls `isAuthenticated` (sync, notion, party) provides **zero actual protection**. Anyone can:
- Read/write to the KV store via `/api/sync`
- Fetch all party data via `/api/party`
- Interact with Notion via `/api/notion`
- Access all pages without login

**Impact:** Complete bypass of all authorization. Any unauthenticated visitor has full read/write access to the database.

**Recommendation:** Re-enable authentication logic. Implement proper session-based auth by checking the session cookie against the `sessions` table in `isAuthenticated`. Implement proper passcode comparison in `verifyPasscode`.

---

### C2. XSS via `dangerouslySetInnerHTML` on DB-Sourced HTML

**File:** `src/routes/compendium.lazy.tsx` — Lines ~601–603

Feature HTML from database `featuresJson` columns is rendered directly:

```tsx
dangerouslySetInnerHTML={{ __html: feature.html }}
```

This data originates from pipeline scripts that parse external sources (5etools JSON, scraped web content). If any record contains malicious HTML — whether via data import, DB compromise, or a corrupted pipeline run — this is a **stored XSS vector**.

**Impact:** An attacker who can influence pipeline data or the database can execute arbitrary JavaScript in every user's browser.

**Recommendation:** Sanitize before rendering with an SSR-safe approach. Either sanitize during data ingestion so the database only stores trusted HTML, or use a sanitizer wrapper that works consistently during SSR and in the browser. If DOMPurify is used directly, configure it for the server runtime instead of assuming `window` is available:

```tsx
dangerouslySetInnerHTML={{ __html: sanitizeHtml(feature.html) }}
```

---

### C3. Error Stack Traces Exposed to Users in Production

**File:** `src/routes/__root.tsx` — Lines 51–56

```tsx
<h1 className="...">Error: {error.message}</h1>
<p className="...">{error.stack}</p>
```

The `ErrorComponent` renders the full `error.message` and `error.stack` directly in the UI. In production, stack traces leak:
- Internal file paths and directory structure
- Dependency versions
- Server configuration details
- Database query patterns

**Impact:** Information disclosure useful for reconnaissance.

**Recommendation:** Conditionally render stack traces:

```tsx
<h1>Something went wrong</h1>
{import.meta.env.DEV && <p>{error.stack}</p>}
```

---

### C4. Notion Token Accepted via URL Query Parameter

**File:** `src/routes/api/notion.ts` — Line 53

```ts
let token = url.searchParams.get("token") || "";
```

Tokens in query strings appear in:
- Browser history
- Server access logs
- HTTP `Referer` headers sent to third parties
- Proxy and CDN logs

**Impact:** Token leakage through multiple vectors, potentially granting unauthorized Notion workspace access.

**Recommendation:** Accept tokens only via request headers (`Authorization: Bearer <token>`) or POST body. Remove query parameter acceptance entirely.

---

### C5. Real Notion API Token in `.env` File

**File:** `.env` — Line 2

```
NOTION_TOKEN=<redacted>
```

While `.env` is in `.gitignore`, the local file contains a real credential. Do not copy the token value into audit reports, tickets, chat logs, or other tracked artifacts. If the repo is ever shared, cloned from a backup, zipped, or if an audit document containing the token is committed, the token is exposed.

**Impact:** If ever committed to git history or shared through generated documentation, this token provides full access to the connected Notion workspace.

**Recommendation:**
1. Keep this audit redacted; never include the raw token value in docs.
2. Check git history: `git log --all --oneline -- .env` — if it was ever committed, rotate the token immediately.
3. Rotate the token immediately if any generated report containing the token was shared or committed.
4. Consider using a secrets manager or system environment variables instead of a `.env` file.
5. Add a startup check that warns if running with the example token.

---

## 🟠 High Issues

### H1. Missing `await` on `prefetchQuery` — SSR Data Preloading Broken

**Files:**
- `src/routes/index.tsx` — Line 23
- `src/routes/character.$id.tsx` — Line 54

```ts
context.queryClient.prefetchQuery(partyQueryOptions(ids)); // Missing await!
```

`prefetchQuery` returns a Promise. Without `await`, the loader completes before data is fetched, defeating the purpose of SSR data preloading. Users always see the Suspense fallback spinner, then a flash when data arrives client-side.

**Impact:** SSR is effectively non-functional for these pages. Slower perceived load time.

**Fix:** Add `await` before `prefetchQuery(...)`.

---

### H2. Sequential Database Query Waterfall in Builder Loader

**File:** `src/routes/builder.tsx` — Lines 23–40

The loader executes 17+ database queries **sequentially**, each `await`ing the previous:

```ts
const classes = await getClassesFromDb();
const species = await getSpeciesFromDb();
const speciesVariants = await getSpeciesVariantsFromDb();
// ... 14 more sequential awaits
```

**Impact:** Builder page load time is the **sum** of all 17 query latencies instead of the **max**.

**Fix:** Parallelize with `Promise.all`:

```ts
const [classes, species, speciesVariants, ...] = await Promise.all([
  getClassesFromDb(),
  getSpeciesFromDb(),
  getSpeciesVariantsFromDb(),
  // ...
]);
```

---

### H3. Unsafe `as any` Casts on Loader Data

**Files:**
- `src/routes/builder.lazy.tsx` — Line 71
- `src/routes/compendium.lazy.tsx` — Line 188

```ts
const { ... } = Route.useLoaderData() as any;
```

TanStack Router provides full type inference from loader to component. `as any` defeats this entirely — any mismatch between what the loader returns and what the component destructures silently passes compilation.

**Impact:** Silent runtime errors from property name mismatches.

**Fix:** Remove `as any` and let TypeScript infer types. Fix any type errors that surface.

---

### H4. Unguarded `JSON.parse` Calls in Render Path

**File:** `src/routes/compendium.lazy.tsx` — Lines ~545, 553, 560, 656, 702, 712, 722, 750

Multiple `JSON.parse()` calls in JSX expressions without try/catch:

```tsx
{Object.entries(JSON.parse(selectedItem.abilityScoreIncreasesJson))...}
{Object.entries(JSON.parse(selectedItem.sensesJson))...}
{JSON.parse(selectedItem.languagesJson).join(", ")}
```

The codebase already has a `parseRawJson` utility that handles errors gracefully — but it's not used for these fields.

**Impact:** A single malformed JSON string in the database crashes the entire compendium component.

**Fix:** Use the existing `parseRawJson` helper for all JSON fields rendered in JSX.

---

### H5. `native-engine.ts` is a 2000-Line God File

**File:** `src/lib/native-engine.ts` — 71KB, 1993 lines

This single file contains the **entire** character stat computation engine:
- Ability score computation and modifiers
- Class feature unlocking and effects
- Spell slot calculation (full, half, third, pact, artificer, multiclass)
- Proficiency calculation (skills, saves, tools)
- HP computation (average, manual, per-level)
- AC computation (armor types, shields, bonuses)
- Inventory and equipment management
- Attack computation (weapon properties, finesse, ranged)
- Species trait effects (lineage spells, darkvision, resistances)
- Foundry VTT JSON effect parsing
- Multiclass spellcasting level computation
- Character serialization to `PartyMember`
- Server functions for save/load

**Impact:** Extreme maintenance risk. Testing individual features in isolation is nearly impossible. A single bug fix requires navigating 2000+ lines of densely interrelated logic.

**Recommendation:** Break into domain-specific modules (see Action Plan).

---

### H6. Duplicated Feature-Unlocking Logic (3 Copies)

**File:** `src/lib/native-engine.ts`
- Lines 596–617 (`unlockedClassFeatureEntries`)
- Lines 938–960 (`unlockedClassFeatureActions`)
- Lines 1193–1213 (foundryJson effect accumulation)

The exact same filtering logic — check primary class, check multiclasses, check level requirements — is copy-pasted 3 times. Any bug fix or rule change must be applied to all 3 copies.

**Impact:** Divergent behavior if one copy is fixed but others aren't.

**Fix:** Extract to a single `getUnlockedFeatures(classFeatures, state, classData, subclassData)` function.

---

### H7. `createNativePartyMember` Uses `any` for All Parameters

**File:** `src/lib/native-engine.ts` — Lines 984–1001

```ts
export function createNativePartyMember(
  state: any,           // entire character state — untyped
  raceData: any,        // species record — untyped
  classData: any,       // class record — untyped
  backgroundData?: any, // background record — untyped
  subclassData?: any,   // subclass record — untyped
  originFeat?: any,     // origin feat — untyped
  selectedSpells: any[] = [],
  classFeatures: any[] = [],
  effectData?: { ... },
  speciesVariantData?: any,
): PartyMember
```

The most important function in the codebase uses `any` for all parameters. TypeScript provides zero safety — accessing non-existent properties silently returns `undefined` instead of a compile error.

**Impact:** Bugs from property name mismatches or schema changes are invisible at compile time.

**Fix:** Define proper TypeScript interfaces for each parameter.

---

### H8. No Bounds Checking on Ability Scores

**File:** `src/lib/native-engine.ts` — Lines 1272–1283

Final ability scores are computed by summing base + bonuses + overrides, with no clamping. D&D 5e rules cap ability scores at 1 (minimum) and 30 (maximum), but effects could push scores outside this range.

**Impact:** Ability modifier calculations could produce incorrect values (e.g., a score of 0 would give modifier -5 instead of being invalid).

**Fix:** `Math.max(1, Math.min(30, score))`

---

### H9. Server Error Messages Leaked to Client

**Files:**
- `src/routes/api/sync.ts` — Line 26
- `src/routes/api/notion.ts` — Line 42

```ts
return new Response(JSON.stringify({ error: err.message }), { status: 500 });
```

Internal `err.message` strings can expose database error details, file system paths, or module resolution errors.

**Impact:** Information disclosure.

**Fix:** Return generic `"Internal server error"` in production. Log `err.message` server-side only.

---

### H10. Service Worker `load` Listener Never Cleaned Up

**File:** `src/routes/__root.tsx` — Lines 203–216

The `useEffect` adds a `window.addEventListener("load", ...)` but returns no cleanup function. Issues:
1. If the component re-mounts during error recovery, a duplicate listener is added
2. In an SPA, the `load` event has likely already fired before this effect runs, so the callback never executes
3. No cleanup on unmount

**Impact:** Service worker may never register; potential memory leak on re-mount.

**Fix:** Register the service worker directly in the effect body, add a cleanup return.

---

### H11. Sync Engine Race Condition — Data Loss on POST Failure

**File:** `src/lib/sync-engine.ts` — Lines 13–32

```ts
// Clear queued items immediately to avoid race conditions during async request
for (const k of Object.keys(syncQueue)) {
  delete syncQueue[k];
}
```

The queue is cleared **before** the POST completes. If the POST fails (network error, server error), the queued items are lost — they were removed from the queue but never persisted to the server.

**Impact:** Silent data loss when sync requests fail.

**Fix:** Copy the batch to a local variable, clear only those specific keys from the queue, and on failure re-add only keys that have not since been changed by a newer queued edit. Blindly assigning the old snapshot back can overwrite newer local changes for the same key.

```ts
const snapshot = { ...syncQueue };
for (const k of Object.keys(snapshot)) delete syncQueue[k];
try {
  const res = await fetch(...);
  if (!res.ok) requeueMissing(snapshot);
} catch {
  requeueMissing(snapshot);
}

function requeueMissing(snapshot: Record<string, string | null>) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (!(key in syncQueue)) syncQueue[key] = value;
  }
}
```

---

### H12. Builder Step Navigation Bypasses Validation

**File:** `src/routes/builder.lazy.tsx` — Line 424

```tsx
onClick={() => setStep(s.id)}
```

Clicking a step indicator allows jumping to any step regardless of completion. While the "Next" button is properly gated by validation, the step indicators are not. A user could jump to Review (step 7) without completing any prior steps.

**Impact:** Users can submit incomplete character builds.

**Fix:** Guard step navigation:

```tsx
onClick={() => { if (s.id <= step || isStepValidAt(s.id - 1)) setStep(s.id); }}
```

---

### H13. Add Same-Origin Hardening on POST API Endpoints

**Files:**
- `src/routes/api/sync.ts` — Line 32
- `src/routes/api/notion.ts` — Line 17

POST endpoints authenticate via session cookie only. The session cookie is `SameSite=Lax`, which reduces classic cross-site POST CSRF risk, but same-origin validation is still useful defense-in-depth for state-mutating endpoints and for future cookie/configuration changes.

**Impact:** If cookie policy, deployment proxy behavior, or future auth flow changes weaken the current assumptions, state-mutating actions could be triggered from an unexpected origin.

**Fix:** Validate `Origin`/`Referer` against the expected host for POST handlers and fail closed for malformed cross-origin values. Treat this as hardening rather than the primary auth control.

---

### H14. Extremely Low Test Coverage

| Area | Test File | Source Size | Coverage |
|------|-----------|-------------|----------|
| Native Engine | `native-engine.test.ts` (10.9KB) | 71KB | ~10–15% |
| Auth | `auth.server.test.ts` (1.2KB) | 3.9KB | ~25% |
| DDB Parser | `dndbeyond.parser.test.ts` (2.4KB) | 0.4KB | Good |
| Party | `party.test.ts` (2.8KB) | 2.5KB | Moderate |
| Rules Effects | `rules-effects.test.ts` (2.4KB) | 4.5KB | ~40% |
| Routes | *none* | 85KB+ | **0%** |
| Components | *none* | all | **0%** |
| API Handlers | *none* | 9.7KB | **0%** |
| Sync Engine | *none* | 3.4KB | **0%** |
| Pipeline | *none* | 40KB+ | **0%** |

The most critical code — the native engine's `createNativePartyMember` (900+ lines), API handlers (security boundary), and the sync engine (data integrity) — has near-zero coverage.

**Impact:** Regressions go undetected. Refactoring the engine (H5) becomes extremely risky without tests.

---

## 🟡 Medium Issues

### M1. Duplicated `requiresAttunement` Function

**File:** `src/lib/native-engine.ts` — Lines 706–714 and 1102–1110

Identical closure function defined twice in different scopes.

**Fix:** Extract to a module-level function.

---

### M2. Duplicated `parseJsonValue` and `normalizeName`

**Files:**
- `src/lib/native-engine.ts` — Lines 40–48
- `src/lib/rules-effects.ts` — Lines 21–29

Same utility functions copy-pasted between files.

**Fix:** Move to a shared `src/lib/utils.ts` and import in both places.

---

### M3. `db-functions.ts` Boilerplate — 40 Near-Identical Functions

**File:** `src/lib/db-functions.ts` — 339 lines

Contains 40 server functions that all follow the exact same pattern:

```ts
export const getXFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("table_name", "schemaKey");
});
```

**Fix:** Use a generic factory:

```ts
function createTableQuery(tableName: string, schemaKey: string) {
  return createServerFn({ method: "GET" }).handler(async () => queryTable(tableName, schemaKey));
}
export const getClassesFromDb = createTableQuery("classes", "classes");
```

---

### M4. No Database Connection Shutdown Hook

**File:** `src/lib/drizzle.server.ts`

Module-level `new Database(dbPath)` with no `process.on('exit', ...)` cleanup.

**Fix:** Add graceful shutdown handling.

---

### M5. Notion Cache Key Injection

**File:** `src/routes/api/notion.ts` — Lines 62–78

Cache keys are built by directly concatenating user-supplied query parameters. A crafted `parentId` containing `:` could collide with other cache namespaces.

**Fix:** Hash or encode user-supplied values before using in cache keys.

---

### M6. `MockDatabase.prepare()` Uses Fragile String Matching

**File:** `src/lib/db.server.ts` — Lines 17–125

The mock DB matches SQL by checking `includes()` on normalized strings. A new SQL statement containing an existing substring as a substring would incorrectly match.

**Fix:** Use exact matches or a more robust dispatch mechanism.

---

### M7. `window.location.href` Used Instead of Router Navigation

**Files:**
- `src/routes/index.lazy.tsx` — Line 90 (`window.location.href = "/login"`)
- `src/routes/index.lazy.tsx` — Line 237 (`window.location.href = "/compendium"`)
- `src/routes/login.tsx` — Line 41 (`window.location.href = "/"`)

Causes full page reload, losing React Query cache and all client state.

**Fix:** Use TanStack Router's `navigate()` or `<Link>` component. If state clearing is intentional (e.g., post-login), add a comment explaining why.

---

### M8. Missing NaN Guard on Character Route Parameter

**File:** `src/routes/character.$id.tsx` — Line 50

```ts
const charId = Number(params.id); // Could be NaN
```

Navigating to `/character/abc` produces `NaN`, displaying "No character with id NaN".

**Fix:** Validate in the loader:

```ts
const charId = Number(params.id);
if (Number.isNaN(charId) || charId <= 0) throw notFound();
```

---

### M9. Client-Side Auth Check Missing Abort/Cancel

**File:** `src/routes/__root.tsx` — Lines 188–201

Async auth check inside `useEffect` with no abort flag. If the component unmounts before completion, `navigate` is called on an unmounted component.

**Fix:** Add a `cancelled` flag with cleanup.

---

### M10. `useThemePreset` Casts localStorage Value Without Validation

**File:** `src/routes/__root.tsx` — Lines 178–179

```ts
const saved = localStorage.getItem("party-stats-theme-preset");
if (saved) applyTheme(saved as any);
```

A corrupted or tampered localStorage value is passed directly to `applyTheme`.

**Fix:** Validate against `THEME_PRESETS` before applying.

---

### M11. Builder Uses `alert()` and `confirm()` for UX

**File:** `src/routes/builder.lazy.tsx` — Lines 175, 241, 245, 389

Blocking browser dialogs provide poor UX and block the main thread.

**Fix:** Replace with toast notifications and modal confirmation dialogs.

---

### M12. `isLoading` in Compendium is Overly Broad

**File:** `src/routes/compendium.lazy.tsx` — Line 245

```ts
const isLoading = loadingSpells || loadingMonsters || loadingItems || loadingRawEntries;
```

Shows loading state even for inactive tabs.

**Fix:** Only check loading for the active tab.

---

### M13. Compendium Sidebar Not Virtualized

**File:** `src/routes/compendium.lazy.tsx` — Lines 439–461

Renders up to 300 list items simultaneously without virtualization.

**Fix:** Use `@tanstack/react-virtual` for the sidebar.

---

### M14. Pipeline Scripts Lack Error Recovery

**Files:** `src/pipeline/seed.ts`, `src/pipeline/scrape-species.ts`, `src/pipeline/enrich-species.ts`

No transaction rollback, retry logic, or progress checkpointing for batch operations.

**Fix:** Wrap in transactions. Add retry with exponential backoff for network requests. Log per-record success/failure.

---

### M15. `EntryRenderer` Uses Index as React Key

**File:** `src/routes/compendium.lazy.tsx` — Lines 71, 101

```tsx
<EntryRenderer key={i} entry={sub} depth={depth} />
```

When switching between items, React may reuse DOM nodes incorrectly.

**Fix:** Use a content-derived key (e.g., `entry.name` or a hash).

---

### M16. Missing Input Validation on `saveNativeCharacter`

**File:** `src/lib/native-engine.ts` — Line 1886

```ts
.inputValidator(z.custom<PartyMember>())
```

`z.custom<T>()` with no refinement validates nothing — any JSON object passes.

**Fix:** Add schema validation or at minimum validate required fields.

---

### M17. `searchCompendiumEntriesFromDb` Missing Input Validator

**File:** `src/lib/db-functions.ts` — Lines 66–112

The handler accepts `data` via a manual type annotation instead of using `inputValidator`. The `query` parameter is used in a LIKE filter without validation.

**Fix:** Add `.inputValidator(z.object({ query: z.string().optional(), ... }))`.

---

### M18. Batch Sync Reports Wrong Count

**File:** `src/routes/api/sync.ts` — Line 63

```ts
return new Response(JSON.stringify({ success: true, count: body.batch.length }));
```

Reports `body.batch.length` (total count) even when some items were silently skipped due to invalid keys.

**Fix:** Track and return the actual processed count.

---

## 🔵 Low Issues

### L1. `party-modifiers.ts` is Empty (35 bytes)

`src/lib/party-modifiers.ts` — either unused stub or planned feature. Remove or document.

### L2. `srd-engine.ts` is Trivial Wrapper (255 bytes)

`src/lib/srd-engine.ts` — consider whether this abstraction layer is needed.

### L3. `console.log` / `console.error` Throughout Production Code

Multiple files contain logging statements that execute in production.

### L4. Inconsistent Component Patterns

Mix of arrow functions, function declarations, default exports, named exports across components.

### L5. `update_barbarian.cjs` is CommonJS in ESM Project

`src/pipeline/update_barbarian.cjs` — uses `require()` in a `"type": "module"` project.

### L6. Magic Breakpoint in `use-mobile.tsx`

`src/hooks/use-mobile.tsx` — hardcoded `768` should be a shared constant matching CSS breakpoints.

### L7. No `vitest` Coverage Configuration

`vitest.config.ts` — no coverage provider configured.

### L8. Duplicate `relative` CSS Class in Login

`src/routes/login.tsx` — Line 59: `relative` appears twice in class string.

### L9. Missing Accessibility Labels

Various interactive elements lack `aria-label` attributes: icon-only buttons, custom selects, modal triggers.

### L10. `QueryClient` Created Without Defaults

`src/router.tsx` — Line 6: `new QueryClient()` without default `staleTime`, causing unnecessary refetches.

### L11. `getCookie` Regex Doesn't Escape Cookie Name

`src/lib/party.ts` — Line 10: if cookie name contained regex special characters, the match would break.
