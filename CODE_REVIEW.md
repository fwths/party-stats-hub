# Code Review: Party Stats Hub

Comprehensive review of the codebase across security, correctness, architecture, performance, and maintainability.

---

## 🔴 Critical Issues

### 1. Hardcoded Secret Exposed in `.env` (Committed to Git)
**File:** [.env](file:///c:/Users/garas/Desktop/party-stats-hub/.env#L2)

```
NOTION_TOKEN=ntn_H95757101687isncEDbBEQfsUR9ddZxFMhpBNsjkarcajU
```

Your Notion API token is committed to the repository in plain text. Anyone with access to the repo can use this token to read/write your Notion workspace.

**Fix:** Rotate the Notion token immediately, add `.env` to `.gitignore`, and use `.env.example` with placeholder values instead.

---

### 2. Hardcoded Default Passcode in Source Code
**File:** [auth.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L2)

```ts
const DEFAULT_PASSCODE = "criticalfail";
```

The authentication passcode is hardcoded as a string literal. If `PARTY_PASSCODE` isn't set in the environment, anyone who reads the source can authenticate.

**Fix:** Remove the default. Require `PARTY_PASSCODE` to be set and throw at startup if it's missing.

---

### 3. Passcode Comparison is NOT Timing-Safe
**File:** [auth.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L35-L38)

```ts
export function verifyPasscode(passcode: string): boolean {
  if (!passcode) return false;
  const expected = getPasscode();
  return passcode.trim() === expected.trim();
}
```

String `===` comparison is vulnerable to timing attacks. An attacker can determine the passcode character-by-character by measuring response times.

**Fix:** Use `crypto.timingSafeEqual()` with buffers of equal length.

---

### 4. Session Token Fallback Uses `Math.random()` (Insecure)
**File:** [auth.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L46-L53)

```ts
if (typeof crypto !== "undefined" && crypto.randomUUID) {
  sessionId = crypto.randomUUID();
} else {
  sessionId =
    Math.random().toString(36).substring(2) +
    Math.random().toString(36).substring(2) +
    Date.now().toString(36);
}
```

`Math.random()` is not cryptographically secure. Session IDs generated this way are predictable and can be brute-forced.

**Fix:** `crypto.randomUUID()` is available in all modern Node.js versions (16.7+). Remove the fallback entirely, or use `crypto.randomBytes()` as a fallback.

---

### 5. `/api/party` Returns `Access-Control-Allow-Origin: *`
**File:** [api/party.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/party.ts#L21)

```ts
"Access-Control-Allow-Origin": "*",
```

This allows any website to make cross-origin requests to your party data API. Combined with `cookie`-based auth, this could allow third-party sites to exfiltrate party data.

**Fix:** Remove the wildcard or restrict it to your actual domain.

---

### 6. Undefined Variable Reference: `cls` in `native-engine.ts`
**File:** [native-engine.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L64)

```ts
hitDice: `${state.level}/${state.level}d${cls?.hitDice || 8}`,
```

`cls` is never defined in this function. This will throw a `ReferenceError` at runtime. The intended variable is likely `classData`.

**Fix:** Replace `cls` with `classData`.

---

### 7. `saveNativeCharacter` Uses Wrong Data Path
**File:** [native-engine.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L70-L75)

```ts
export const saveNativeCharacter = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { character: PartyMember } }) => {
    const filePath = path.join(process.cwd(), `native-char-${data.id}.json`);
    await fs.writeFile(filePath, JSON.stringify({ success: true, data }, null, 2), "utf-8");
    return data.id;
  });
```

The handler destructures `{ data: { character: PartyMember } }` but then accesses `data.id` instead of `data.character.id`. The `data` wrapper here is `{ character: PartyMember }`, so `data.id` is `undefined`. The file will be written as `native-char-undefined.json`.

**Fix:** Use `data.character.id` and `data.character` consistently.

---

## 🟡 Warnings

### 8. Sync Engine Monkey-patches `localStorage` Globally
**File:** [sync-engine.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/sync-engine.ts#L40-L64)

Overwriting `localStorage.setItem` and `localStorage.removeItem` is fragile and can conflict with third-party libraries, browser extensions, or future code. There's also no guard against `initSyncEngine()` being called twice, which would double-wrap the methods.

**Fix:** Add an idempotency guard (e.g., a `_patched` flag). Consider using a custom wrapper function instead of monkey-patching built-in APIs.

---

### 9. Server Auth Check on Root Runs Only Server-Side, Client Does `window.location`
**File:** [__root.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/__root.tsx#L78-L91) and [__root.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/__root.tsx#L185-L198)

```ts
// Server-side guard
if (typeof window === "undefined") {
  const { checkAuthFn } = await import("@/lib/auth-fns");
  ...
}

// Client-side fallback (separate useEffect)
if (!authenticated && window.location.pathname !== "/login") {
  window.location.href = "/login";
}
```

The client-side auth check does a hard navigation with `window.location.href` instead of using the router, which causes a full page reload and a flash of unauthenticated content. There's also a race condition where the page content briefly renders before the auth check completes.

**Fix:** Use TanStack Router's `redirect()` from `beforeLoad` on both server and client, or ensure the client-side check prevents rendering until auth is confirmed.

---

### 10. `loginFn` Has an Unused Zod Import
**File:** [auth-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L2)

```ts
import { z } from "zod";
```

`z` is imported but never used. This is dead code that adds to the bundle.

---

### 11. No Input Validation on `loginFn` Passcode
**File:** [auth-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L14-L37)

The `loginFn` server function accepts `{ passcode: string }` but performs no validation on the input shape or length. A malicious client could send an extremely large string.

**Fix:** Add Zod validation (you already import it!) — e.g., `z.object({ passcode: z.string().max(100) })`.

---

### 12. `MockDatabase.prepare()` Uses Fragile SQL String Matching
**File:** [db.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts#L17-L125)

The mock DB relies on `trimmed.includes("SELECT value FROM kv_store WHERE key = ?")` to determine which operation to perform. This is brittle — any change in SQL formatting, added whitespace, or comment could break the mock silently and return empty results.

---

### 13. `party-modifiers.ts` — 674-line God Function
**File:** [party-modifiers.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/party-modifiers.ts)

`getFullyModifiedStats` is a 380+ line monolith that handles HP, conditions, armor, shields, infusions, rage, senses, carrying capacity, special speeds, and more. This is very difficult to test, debug, or extend.

**Fix:** Break it into focused helper functions (e.g., `computeModifiedAc()`, `computeModifiedSpeed()`, `computeModifiedSenses()`) and compose them.

---

### 14. Massive Code Duplication Between Server and Client Override Logic
**Files:** [dndbeyond.functions.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.functions.ts#L123-L336) and [party-modifiers.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/party-modifiers.ts#L16-L233)

The `mergeDbOverrides` function in `dndbeyond.functions.ts` duplicates almost identical logic to `getLocalHp`, `getLocalSpellSlots`, `getLocalResources`, etc. in `party-modifiers.ts`. Both parse the exact same localStorage/KV keys in the same format.

**Fix:** Extract shared merge logic into a single function that works with both `localStorage` values and KV store values.

---

### 15. `dndbeyond.parser.ts` is a 2000+ Line Mega-File
**File:** [dndbeyond.parser.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.parser.ts)

At 2023 lines / 65KB, this is extremely difficult to navigate and maintain. It mixes constants, compute functions, and the main parser.

**Fix:** Split into sub-modules: `parser/constants.ts`, `parser/abilities.ts`, `parser/armor.ts`, `parser/spells.ts`, `parser/attacks.ts`, etc.

---

### 16. `notion.ts` API Route is 46KB
**File:** [api/notion.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/notion.ts) — 46,747 bytes

This is an unusually large API route. Consider splitting the Notion integration into a separate service module.

---

### 17. Cookie Not Marked `Secure` in Production
**File:** [auth.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L61)

```ts
const cookieString = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Expires=${expiryDate}; HttpOnly; SameSite=Lax`;
```

The session cookie is missing the `Secure` flag, meaning it will be sent over plain HTTP connections, making it susceptible to MITM attacks.

**Fix:** Add `; Secure` when running in production (or always, if you only serve over HTTPS).

---

### 18. Hardcoded Character Name in Utility
**File:** [utils.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/utils.ts#L17)

```ts
if (shortName === "Qemuel") return "Qem";
```

Campaign-specific character name hardcoded in a general utility function. This should be configuration, not code.

---

## 🔵 Informational / Minor

### 19. `getShortName` — Campaign-Specific
The entire `getShortName` function in `utils.ts` has logic that is specific to your campaign's character naming conventions (stripping years, checking for quoted nicknames). Consider moving this to a campaign-config module.

---

### 20. `drizzle.server.ts` Creates DB Connection at Module Scope
**File:** [drizzle.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/drizzle.server.ts#L7-L10)

```ts
const dbPath = path.join(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
```

The DB connection is created eagerly at import time. If the file doesn't exist or the path is wrong, the entire server will fail to start with a cryptic error. This also makes it impossible to configure the path at runtime.

**Fix:** Use a lazy singleton pattern (similar to what `db.server.ts` does for the KV store).

---

### 21. `db.server.ts` Only Caches on `globalThis` in Non-Production
**File:** [db.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts#L221-L223)

```ts
if (process.env.NODE_ENV !== "production") {
  globalForDb.dbInstance = dbInstance;
}
```

In production, this means a new DB instance might be created on each invocation (depending on module caching), which could cause issues with connection limits or WAL mode.

---

### 22. Theme `dotColor` Values Look Like Corrupted Hex Codes
**File:** [useThemePreset.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/hooks/useThemePreset.ts#L24)

```ts
dotColor: "#6809300",   // Abyssal Void
dotColor: "#72012145",  // Emerald Grove
dotColor: "#6201520",   // Crimson Bastion
dotColor: "#68011215",  // Midnight Slate
dotColor: "#7501370",   // Amber Hearth
```

These are not valid hex color codes (hex colors are 3, 4, 6, or 8 digits). They'll likely render as black or be ignored.

**Fix:** Use valid hex codes like `#680930`, `#72D145`, etc.

---

### 23. Character JSON Files Are Dumped at Project Root
**Files:** `char-131296315.json`, `char-131593533.json`, etc. at project root

The D&D Beyond character cache files are written to `process.cwd()` (project root). This clutters the workspace and could cause `.gitignore` issues.

**Fix:** Write them to a dedicated `data/cache/` directory.

---

### 24. `db-snapshot.json` is 10MB in `src/data/`
**File:** [db-snapshot.json](file:///c:/Users/garas/Desktop/party-stats-hub/src/data/db-snapshot.json) — 10,279,463 bytes

A 10MB JSON file in `src/data/` gets processed by the bundler and increases build times significantly. This should either be loaded at runtime from the filesystem or served as a static asset.

---

### 25. No Rate Limiting on Auth Endpoints
The login endpoint has no rate limiting, allowing unlimited passcode guessing attempts. Combined with a short, dictionary-word passcode (`criticalfail`), this is easily brute-forceable.

---

### 26. `notion-cache-seed.json` is 87KB Imported at Module Level
**File:** [db.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts#L1)

```ts
import notionSeed from "./notion-cache-seed.json";
```

This 87KB JSON is eagerly imported and held in memory even when not needed. Consider lazy-loading it.

---

### 27. Unused Imports in Some Files
- [constants.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/constants.ts): Imports `Brain`, `Flame`, `Skull`, `Sparkles`, `AlertCircle` from lucide-react but they're not used in `CONDITION_BY_NAME`.
- [index.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/index.tsx): `readStoredIds` and `STORAGE_KEY` are imported but `readStoredIds` is never called (replaced by `readStoredIdsFromCookie`).

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 7 |
| 🟡 Warning | 11 |
| 🔵 Info | 9 |

### Priority Actions
1. **Immediately** rotate the Notion token and add `.env` to `.gitignore`
2. **Immediately** fix the `cls` → `classData` reference error in `native-engine.ts`
3. **Immediately** fix the `data.id` → `data.character.id` bug in `saveNativeCharacter`
4. **Short-term** address auth security (timing-safe compare, remove `Math.random` fallback, add `Secure` flag, remove hardcoded passcode)
5. **Short-term** remove `Access-Control-Allow-Origin: *` from the party API
6. **Medium-term** refactor the 2000-line parser and 674-line modifiers into focused modules
7. **Medium-term** deduplicate the server/client override merge logic
