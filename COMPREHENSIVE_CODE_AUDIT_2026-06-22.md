# 🔍 Comprehensive Code Audit — party-stats-hub

**Date**: June 22, 2026  
**Scope**: Full codebase — 187 source files, 2,491 KB across [party-stats-hub](file:///c:/Users/garas/Desktop/party-stats-hub)  
**Stack**: TanStack Start (React 19) · Drizzle ORM · SQLite (better-sqlite3) · Tailwind CSS v4 · Vite 7 · Fly.io  
**Test Coverage**: 16 test files (65 KB) covering ~2.6% of source by size

---

## Executive Summary

The project is a feature-rich D&D campaign management app ("Mother of Bob") built on TanStack Start with SSR, a SQLite database, Notion integration, a D&D Beyond character sync pipeline, and a native character builder ("Character Forge"). The codebase is impressively functional but has accumulated significant technical debt. This audit found:

| Severity | Count | Top Categories |
|----------|-------|----------------|
| 🔴 CRITICAL | 3 | Auth bypass, exposed secrets, weak password hashing |
| 🟠 HIGH | 10 | Type safety erosion, dead auth, XSS risk, giant files, DB bugs |
| 🟡 MEDIUM | 14 | Code duplication, missing validation, architecture, perf |
| 🟢 LOW | 12 | Unused imports, lint suppressions, naming, inconsistencies |

### Codebase Metrics

| Metric | Value |
|--------|-------|
| Source files (`.ts`/`.tsx`) | 187 |
| Total source size | 2,491 KB |
| Test files | 16 (65 KB) |
| Largest file | [WizardSteps.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/builder/WizardSteps.tsx) — 107 KB / 2,423 lines |
| Files > 50 KB | 6 (WizardSteps, CharacterDetailView, SpellbookPanel, InventoryPanel, native-engine, CharacterCard) |
| TypeScript errors (`tsc --noEmit`) | 42 |
| `as any` casts | 50+ |
| Root-level clutter files | 13 |
| SQLite DB size | 578 MB |

---

## 🔴 CRITICAL Findings

### C1 — Authentication & Session Validation Completely Disabled

> [!CAUTION]
> Every auth gate in the application is hardcoded to return `true` or a static value, making **all routes and API endpoints completely unprotected**.

**Files affected:**

#### [auth.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts)

```typescript
// Line 37-38: Always returns a static session — doesn't parse cookies
export function getSessionIdFromHeaders(headers: Headers): string | null {
  return "default-session";
}

// Line 41-43: Always returns true — NO ACTUAL AUTH CHECK
export async function isAuthenticated(headers: Headers): Promise<boolean> {
  return true;
}

// Line 45-47: Always returns true — NO PASSCODE VERIFICATION
export function verifyPasscode(passcode: string): boolean {
  return true;
}
```

#### [db.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts)

```typescript
// Line 323-325: Always returns the same user
export async function getUserIdFromSession(sessionId: string): Promise<string | null> {
  return "default-user";
}

// Line 327-329: Session always "valid"
export async function isSessionValid(id: string): Promise<boolean> {
  return true;
}
```

**Impact**: Any user can access all API endpoints (`/api/sync`, `/api/party`, `/api/notion`) and all data without any credentials. The login page, rate limiting code, and session management logic all exist but are **entirely bypassed** by these stubs. An attacker could read/write to the KV store, fetch character data, and interact with the Notion API.

**Recommendation**: Re-implement proper auth checks:
- `isAuthenticated` → parse the session cookie via `parseCookies()` and call `isSessionValid()` with the actual session ID
- `verifyPasscode` → compare against `process.env.PARTY_PASSCODE` using timing-safe comparison
- `getUserIdFromSession` → query the sessions table
- `isSessionValid` → check expiration against `Date.now()`

---

### C2 — Notion API Token Committed in `.env`

> [!CAUTION]
> A live Notion internal integration token is stored in the [.env](file:///c:/Users/garas/Desktop/party-stats-hub/.env) file.

```
NOTION_TOKEN=ntn_H95757101687isncEDbBEQfsUR9ddZxFMhpBNsjkarcajU
```

While `.env` is in `.gitignore`, the token format (`ntn_...`) is valid. If this file was ever committed — even accidentally — the token is exposed in git history.

**Recommendation**:
1. **Rotate this token immediately** in the Notion integration settings
2. Verify via `git log -p -- .env` that it was never committed
3. Consider using a secrets manager (e.g. Fly.io secrets) for production

---

### C3 — Critically Weak Password Hashing

> [!CAUTION]
> Passwords are hashed with a single round of SHA-256 and a **hardcoded static salt embedded in source code**.

#### [auth-utils.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-utils.ts)

```typescript
export function hashPassword(password: string): string {
  const salt = "mother-of-bob-salt-key-92834";  // Hardcoded!
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}
```

**Problems**:
- **SHA-256 is not a password hashing algorithm** — it's designed to be fast (~millions per second on GPU), making brute-force trivial
- **Static salt** = all users with the same password get the same hash (rainbow table attacks work)
- Salt is **embedded in source code** — anyone with repo access knows it
- No timing-safe comparison used in [auth-fns.ts:89](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L89): `user.passwordHash !== computedHash`

**Recommendation**: Replace with `scrypt` (Node.js built-in) with per-user random salts:
```typescript
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
```

---

## 🟠 HIGH Findings

### H1 — Pervasive `as any` Type Erosion (50+ instances)

The codebase has **50+ uses of `as any`** across critical business logic, undermining TypeScript's value.

**Worst offenders by file**:

| File | Count | Key Impact |
|------|-------|------------|
| [WizardSteps.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/builder/WizardSteps.tsx) | 8 | `useLoaderData()` cast to `any` — all loader type inference lost |
| [BuilderUtils.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/builder/BuilderUtils.ts) | 10 | JSON parsing with `as any` — type info discarded |
| [integration.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/forge/integration.test.ts) | 12 | Test fixtures use `as any` instead of proper mocks |
| [auth-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts) | 3 | User objects, response headers |
| [campaign-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts) | 3 | `setResponseHeaders` cast to `any` |
| [native-engine.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts) | 4 | Effect data, condition type casting |
| [modifiers/](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/modifiers) | 5 | `rageState` accessed via `as any` — missing type field |
| [dndbeyond.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.server.ts) | 2 | `isNative` property set via `as any` |
| [CharacterDetailView.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CharacterDetailView.tsx#L2089) | 1 | Tab `id` cast to `any` |
| [CharacterCard.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CharacterCard.tsx#L179) | 1 | `isNative` accessed via `as any` |

**Note**: `isNative` is already defined on the `PartyMember` type at [dndbeyond.types.ts:273](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.types.ts#L273) as optional (`isNative?: boolean`), but code still uses `(member as any).isNative`. The `rageState` property is genuinely missing from the type and needs to be added.

**Recommendation**: 
- Stop casting `isNative` — it's already on the type
- Add `rageState?: string` to `PartyMember` 
- Type `useLoaderData` calls via route generics
- Create a typed wrapper for `setResponseHeaders`

---

### H2 — `checkAuthFn` Silently Returns Admin on Any Error

#### [auth-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L37-L47)

```typescript
} catch (err) {
  console.error("checkAuthFn error:", err);
  return {
    authenticated: true,      // ← Always authenticated, even on DB failure
    user: {
      id: "default-user",
      username: "admin",
      role: "admin",           // ← Admin role granted on any error
    },
  };
}
```

**Impact**: If the database is down, corrupted, or if any import fails, **every user is implicitly granted admin access**. This is a privilege escalation vulnerability.

**Recommendation**: Return `{ authenticated: false }` on error and let the router redirect to `/login`.

---

### H3 — Regex-Based HTML Sanitizer Is Bypassable (XSS Risk)

#### [utils.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/utils.ts#L21-L37)

The `sanitizeHtml()` function uses regex to strip dangerous HTML, and is used with `dangerouslySetInnerHTML` at [compendium.lazy.tsx:664](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/compendium.lazy.tsx#L664):

```typescript
dangerouslySetInnerHTML={{ __html: sanitizeHtml(feature.html) }}
```

**Problems with the regex approach**:
- Can be bypassed via malformed HTML: `<scr<script>ipt>alert(1)</script>`
- Missing `<svg onload=...>`, `<img src=x onerror=...>`, `<details/open/ontoggle=...>` vectors
- Doesn't handle attribute-based injection in allowed tags: `<div style="background:url(javascript:...)">`
- Regex HTML parsing is fundamentally unreliable (HTML is not a regular language)

**Recommendation**: Use a proper sanitization library like [DOMPurify](https://github.com/cure53/DOMPurify) or render content as text nodes instead.

---

### H4 — `MockDatabase` Session Type Mismatch (3 TS Errors)

#### [db.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts#L11)

The `sessions` Map is typed as `Map<string, { expires_at: number }>` but `user_id` is used in multiple methods:

```
src/lib/db.server.ts(82): error TS2353: 'user_id' does not exist in type '{ expires_at: number }'
src/lib/db.server.ts(92): error TS2339: Property 'user_id' does not exist
src/lib/db.server.ts(102): error TS2339: Property 'user_id' does not exist
```

**Fix**: Update the session map type:
```typescript
sessions = new Map<string, { expires_at: number; user_id: string }>();
```

---

### H5 — 42 TypeScript Compilation Errors

The project **does not compile cleanly**. Key error categories:

| Category | Count | Impact |
|----------|-------|--------|
| Unused variables/imports | 18 | Dead code; tree-shaking handles it but indicates code rot |
| Implicit `any` parameters | 7 | Cookie callbacks in campaign-fns, Vite config `onwarn` |
| Missing module types | 2 | `@radix-ui/react-label`, `@radix-ui/react-switch` |
| Property doesn't exist | 4 | `notIn` on drizzle-orm, `playerName` on `PartyMember`, `selectedSpells` on `BuilderState` |
| Config type errors | 2 | `rollupConfig` not recognized in vite.config nitro options |

**Most impactful runtime-affecting errors**:
- [campaign-fns.ts:234](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts#L234) — `notIn` doesn't exist in drizzle-orm (should be `notInArray`)
- [campaign-fns.ts:283](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts#L283) — `playerName` not on `PartyMember` type (data loss on DDB import)
- [validate-character.ts:615](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/rules/validate-character.ts#L615) — `selectedSpells` not on `BuilderState`

---

### H6 — Massive Component Files (6 files > 50 KB)

Several component files have grown far beyond maintainable size:

| File | Size | Lines | Responsibility |
|------|------|-------|---------------|
| [WizardSteps.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/builder/WizardSteps.tsx) | 107 KB | 2,423 | 9+ wizard step components in one file |
| [CharacterDetailView.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CharacterDetailView.tsx) | 101 KB | 2,412 | Full character sheet rendering |
| [SpellbookPanel.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/character-detail/SpellbookPanel.tsx) | 96 KB | — | Spell management UI |
| [InventoryPanel.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/character-detail/InventoryPanel.tsx) | 76 KB | — | Inventory management UI |
| [native-engine.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts) | 67 KB | 1,855 | Character stat engine + server functions |
| [CharacterCard.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CharacterCard.tsx) | 49 KB | 1,008 | Party member cards |

**Impact**: These files are extremely difficult to review, test, maintain, and can cause IDE performance issues. `WizardSteps.tsx` alone is **larger than many entire projects**.

**Recommendation for `WizardSteps.tsx`**: Each step component (`StepRace`, `StepClass`, `StepAbilities`, etc.) should be its own file in a `wizard-steps/` directory.

**Recommendation for `native-engine.ts`**: Split into:
- `native-engine/stats.ts` — ability scores, skills, saves
- `native-engine/combat.ts` — attacks, defenses, HP
- `native-engine/spells.ts` — spell slots, prepared spells
- `native-engine/inventory.ts` — equipment, items
- `native-engine/server-fns.ts` — TanStack server functions

---

### H7 — Duplicated Utility Functions

Several utility functions are copy-pasted across files:

| Function | Duplicated Locations |
|----------|---------------------|
| `parseJsonValue()` | [native-engine.ts:49](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L49), [rules-effects.ts:21](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/rules-effects.ts#L21) |
| `normalizeName()` / `stripTags()` | [native-engine.ts:63](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L63), [rules-effects.ts:31](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/rules-effects.ts#L31), [compendium.lazy.tsx:35](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/compendium.lazy.tsx#L35) |
| `modifier()` | [native-engine.ts:80](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L80), [rules-effects.ts:43](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/rules-effects.ts#L43) |
| `parseRawJson()` / `parseJsonValue()` | [compendium.lazy.tsx:26](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/compendium.lazy.tsx#L26) (yet another copy) |
| Cookie parsing logic | [auth.server.ts:24-35](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L24), [campaign-fns.ts:180-188](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts#L180), [campaign-fns.ts:219-227](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts#L219) |
| Default user creation | [auth-fns.ts:17-26](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L17), [campaign-fns.ts:15-24](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts#L15) |
| `syncable` key check pattern | [synced-storage.ts:11-12](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/synced-storage.ts#L11), [sync-engine.ts:67](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/sync-engine.ts#L67), [sync.ts (API):49-52](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/sync.ts#L49) |

---

### H8 — 44 Identical Server Function Definitions in `db-functions.ts`

[db-functions.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db-functions.ts) contains **44 nearly identical server functions** (371 lines), each following the exact same pattern:

```typescript
export const getXFromDb = createServerFn({ method: "GET" }).handler(async () => {
  return await queryTable("table_name", "schemaKey");
});
```

**Recommendation**: Create a factory:
```typescript
function createTableFn(tableName: string, schemaKey: string) {
  return createServerFn({ method: "GET" }).handler(async () => queryTable(tableName, schemaKey));
}
export const getClassesFromDb = createTableFn("classes", "classes");
```

---

### H9 — Root-Level File Clutter (13+ files)

The project root contains **13 loose scripts and test files** that should live elsewhere:

| Files | Count | Belongs In |
|-------|-------|------------|
| `inspect_*.js`, `search_willow.js`, `list_tables.js`, `scratch_script.cjs` | 5 | `scripts/` |
| `test_db_functions*.ts`, `test_drizzle.ts`, `test_snapshot.ts`, `test_value_id.js` | 7 | `src/test/` or delete |
| `bundle-stats.html` | 1 | Delete (248 KB, in `.gitignore`) |
| `ACTION_PLAN.md`, `CHARACTER_FORGE_COMPLETION_PLAN.md`, `COMPREHENSIVE_CODE_AUDIT.md`, `implementation_plan.md` | 4 | `docs/` |

---

### H10 — Service Worker Caches API Responses (Including Auth-Protected Data)

[sw.js](file:///c:/Users/garas/Desktop/party-stats-hub/public/sw.js#L47-L63) caches ALL API responses:

```javascript
if (url.pathname.startsWith("/api/")) {
  event.respondWith(
    fetch(event.request).then((response) => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseClone);  // Caches auth-gated data
      });
      return response;
    })
  );
}
```

**Impact**: Sensitive data from `/api/sync` (KV store contents), `/api/party` (character data), and `/api/notion` (Notion content) is cached in the browser's Cache API. This data persists even after logout.

**Recommendation**: Exclude sensitive API routes from caching, or only cache with appropriate `Cache-Control` headers.

---

## 🟡 MEDIUM Findings

### M1 — Sync API Lacks Rate Limiting and Batch Size Cap

The [sync POST endpoint](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/sync.ts#L46) accepts arbitrarily large batch arrays without limit:

```typescript
if (body && Array.isArray(body.batch)) {
  for (const item of body.batch) { ... }
}
```

### M2 — Sync Engine Has No Retry Backoff

[sync-engine.ts:40-43](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/sync-engine.ts#L40) re-queues failed syncs with the same 1-second debounce — no exponential backoff. This can hammer the server on repeated failures.

### M3 — In-Memory Rate Limiting Won't Survive Restarts

[auth.server.ts:14](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L14) stores login rate limits in a `Map`. On Fly.io with `auto_stop_machines: 'suspend'`, this state is lost.

### M4 — `campaign_id` Cookie Not HttpOnly

[campaign-fns.ts:84](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts#L84) sets `active_campaign_id` without `HttpOnly`, making it readable by client-side JS (XSS amplification vector).

### M5 — `MockDatabase` SQL Matching Is Fragile

The [MockDatabase](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts#L9-L136) parses SQL via `string.includes()` — order-dependent, fragile, and silently falls through to a no-op on unrecognized queries.

### M6 — Missing Input Validation on `updateCampaignCharactersFn`

[campaign-fns.ts:211](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts#L211) validates `ids` as `z.array(z.number())` but has no array length cap. Thousands of IDs could trigger mass D&D Beyond fetches + DB inserts.

### M7 — `getAllKv()` Returns Full KV Store Including Notion Cache

The [sync GET](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/sync.ts#L17) calls `getAllKv()` which returns **everything** in the store — including Notion cache entries with `notion:` prefix keys.

### M8 — Notion Token Fallback Accepts Token from Request Body

[notion.ts:25](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/notion.ts#L25) reads `body.token` as a fallback for the Notion API token, which is unusual and could be a token injection vector.

### M9 — Excessive Dynamic Imports in Server Functions

[auth-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts) and [campaign-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/campaign-fns.ts) dynamically import `drizzle-orm`, `schema`, and `db` in every handler, while [db-functions.ts:3-5](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db-functions.ts#L3) uses static imports. The inconsistency suggests one approach is wrong.

### M10 — 20 MB JSON Snapshot Bloats the Build

[db-snapshot.json](file:///c:/Users/garas/Desktop/party-stats-hub/src/data/db-snapshot.json) is 20.1 MB. It's imported as a fallback when better-sqlite3 isn't available, bloating the server bundle.

### M11 — Dockerfile Bakes a 578 MB SQLite DB into Image

[Dockerfile:14](file:///c:/Users/garas/Desktop/party-stats-hub/Dockerfile#L14) runs `npm run seed` during build, creating a 578 MB `sqlite.db` that's copied into the production image.

### M12 — `fly.toml` Specifies Memory Twice

[fly.toml:28-30](file:///c:/Users/garas/Desktop/party-stats-hub/fly.toml#L28): both `memory = '1gb'` and `memory_mb = 1024` are set — only one is needed.

### M13 — No `useMemo`/`useCallback` in Route Components

Route files ([index.lazy.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/index.lazy.tsx), [builder.lazy.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/builder.lazy.tsx), [compendium.lazy.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/compendium.lazy.tsx)) have **zero** `useMemo` or `useCallback` calls despite handling large datasets (spells, monsters, items). With React 19's compiler-based optimizations this may be acceptable, but for expensive computations (filtering, sorting) explicit memoization would help.

### M14 — Notion Client Makes Unbounded Paginated Requests

[client.server.ts:380-420](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/notion/client.server.ts#L380) paginates through Notion search results with only a soft cap at 1,000 results. On large workspaces, this could be very slow and consume significant memory.

---

## 🟢 LOW Findings

### L1 — Unused Imports and Variables (18 instances from `tsc`)

Key examples:

| File | Unused Symbol |
|------|--------------|
| [native-engine.ts:25](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L25) | `RuleGrant` |
| [native-engine.ts:111](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L111) | `asStringArray` |
| [native-engine.ts:391](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L391) | `getSpellSlots` |
| [native-engine.ts:415](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L415) | `DRAGON_DAMAGE_BY_ANCESTRY` |
| [CampaignSelector.tsx:1](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CampaignSelector.tsx#L1) | `useEffect`, `Globe`, `Info` |
| [RestConsole.tsx:4](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/character-detail/RestConsole.tsx#L4) | `Panel` |
| [auth.server.ts:37,41,45](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L37) | `headers`, `passcode` params (stubbed functions) |

### L2 — Missing Module Type Declarations

```
src/components/ui/label.tsx: Cannot find module '@radix-ui/react-label'
src/components/ui/switch.tsx: Cannot find module '@radix-ui/react-switch'
```

These packages are in `package.json` but types may need `npm install` or `@types/` packages.

### L3 — ESLint Suppressions in Components (4 instances)

- [CharacterCard.tsx:1](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CharacterCard.tsx#L1) — `react-refresh/only-export-components` (file-level disable)
- [CombatTracker.tsx:127](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CombatTracker.tsx#L127) — `react-hooks/exhaustive-deps`
- [EncounterBuilder.tsx:90](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/EncounterBuilder.tsx#L90) — `react-hooks/exhaustive-deps`
- [button.tsx:1](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/ui/button.tsx#L1) — `react-refresh/only-export-components`

The `exhaustive-deps` suppressions often mask stale closure bugs.

### L4 — `no-constant-binary-expression` Disabled

[eslint.config.js:56](file:///c:/Users/garas/Desktop/party-stats-hub/eslint.config.js#L56) disables this rule, which catches real bugs like `x ?? "a" || "b"`.

### L5 — `getShortName()` Has Hardcoded Special Case

[utils.ts:17](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/utils.ts#L17): `if (shortName === "Qemuel") return "Qem";` — character-specific logic in a utility function.

### L6 — `party-config.ts` Hardcodes Character IDs

[party-config.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/party-config.ts) likely contains hardcoded D&D Beyond character IDs. This should be configurable.

### L7 — `error: any` Pattern in Catch Blocks

Multiple handlers use `catch (error: any)` or `catch (err: any)` instead of narrowing the error type. Examples: [dndbeyond.server.ts:84](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.server.ts#L84), [auth-fns.ts:141](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L141), [sync.ts:24](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/sync.ts#L24).

### L8 — SRD Data Files Are Very Large

[srd/spells.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/data/srd/spells.ts) (472 KB) and [srd/classes.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/data/srd/classes.ts) (163 KB) are static TypeScript data files that could be JSON files loaded on demand.

### L9 — `db-functions.ts` Uses Static Imports While Others Use Dynamic

[db-functions.ts:3-5](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db-functions.ts#L3) has top-level `import { db } from "./drizzle.server"` while all other server function files use dynamic `await import()`. The inconsistency may cause issues in certain SSR environments.

### L10 — `vitest.config.ts` Is Minimal

The vitest config likely doesn't include coverage thresholds or test reporters, contributing to low test coverage visibility.

### L11 — `new data` Directory with Space in Name

A directory named `new data` (with a space) exists in the root — likely an accident that could cause build/script issues.

### L12 — Theme Preset Applied via `localStorage` as `any`

[__root.tsx:193](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/__root.tsx#L193): `applyTheme(saved as any)`.

---

## Test Coverage Analysis

| Area | Test Files | Tested? |
|------|-----------|---------|
| Auth | [auth.server.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.test.ts) | ✅ Basic (but tests stubbed functions) |
| Character parser | [dndbeyond.parser.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.parser.test.ts) | ✅ |
| Native engine | [native-engine.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.test.ts) | ✅ Good (13 KB) |
| Character forge | [validation.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/forge/validation.test.ts), [integration.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/forge/integration.test.ts) | ✅ Good |
| Party modifiers | [party-modifiers.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/party-modifiers.test.ts) | ✅ |
| Rules effects | [rules-effects.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/rules-effects.test.ts) | ✅ |
| Builder utils | [BuilderUtils.test.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/builder/BuilderUtils.test.ts) | ✅ Basic |
| **Campaign functions** | — | ❌ No tests |
| **Sync engine** | — | ❌ No tests |
| **API routes** | — | ❌ No tests |
| **Components (UI)** | — | ❌ No tests |
| **Pipeline (seeding)** | — | ❌ No tests |
| **Notion integration** | — | ❌ No tests |
| **Modifiers/AC/Speed** | — | ❌ No tests |

**Overall**: ~65 KB of test code covering ~2,491 KB of source = **~2.6% coverage by size**. Core business logic (engine, parser, forge) has reasonable coverage. Infrastructure (auth, sync, API routes, campaigns) has zero test coverage.

---

## Prioritized Remediation Plan

### 🔴 Immediate (Security-Critical)
1. **Re-implement auth checks** — `isAuthenticated`, `verifyPasscode`, `getUserIdFromSession`, `isSessionValid`
2. **Rotate Notion token** — Generate a new token in Notion settings
3. **Replace password hashing** — Switch to `scrypt` or `argon2id` with per-user random salts
4. **Fix `checkAuthFn` error handler** — Return `{ authenticated: false }` on error
5. **Replace `sanitizeHtml`** — Use DOMPurify instead of regex-based sanitization

### 🟠 Short-Term (Stability)
6. Fix all 42 TypeScript errors (priority: `notIn` → `notInArray`, `playerName` type, `MockDatabase` session type)
7. Add `HttpOnly` to `active_campaign_id` cookie
8. Stop caching auth-gated API responses in service worker
9. Cap sync batch size (e.g. 100 items max)
10. Remove unused imports and dead code

### 🟡 Medium-Term (Architecture)
11. Split `WizardSteps.tsx` (107 KB) into individual step files
12. Split `native-engine.ts` (67 KB) into focused modules
13. Extract duplicated utilities into shared modules
14. Create a factory for `db-functions.ts` server functions
15. Clean up root-level file clutter — move to `scripts/`, `docs/`, or delete
16. Standardize dynamic vs. static import pattern for server modules

### 🟢 Long-Term (Quality)
17. Add tests for campaign functions, sync engine, and API routes
18. Add exponential backoff to sync engine
19. Persist rate limit state in SQLite
20. Reduce/eliminate `as any` usage (target: < 10 across codebase)
21. Move SRD data files to JSON for lazy loading
22. Add vitest coverage thresholds
