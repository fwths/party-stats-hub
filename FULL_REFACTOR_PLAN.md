# Full Refactor Plan — Party Stats Hub

Consolidated from [AUDIT.md](file:///c:/Users/garas/Desktop/party-stats-hub/AUDIT.md), [CODE_ANALYSIS_REPORT.md](file:///c:/Users/garas/Desktop/party-stats-hub/CODE_ANALYSIS_REPORT.md), [CODE_REVIEW.md](file:///c:/Users/garas/Desktop/party-stats-hub/CODE_REVIEW.md), and the original [Refactor_Plan.md](file:///c:/Users/garas/Desktop/party-stats-hub/Refactor_Plan.md).

---

## Phase 0 — Emergency Fixes (Do Immediately)

> [!CAUTION]
> These are active security vulnerabilities and guaranteed runtime crashes. Do not deploy until these are resolved.

### 0.1 — Rotate Notion Token
The token in `.env` has been committed to Git history. Even though `.env` is now in `.gitignore`, the token is still in the Git log.

- [ ] Rotate the Notion token at https://www.notion.so/my-integrations
- [ ] Update the new token in your deployment environment variables only
- [ ] Verify `.env` is in [.gitignore](file:///c:/Users/garas/Desktop/party-stats-hub/.gitignore) (it already is ✅)
- [ ] Consider using `git filter-branch` or BFG to scrub the old token from history

---

### 0.2 — Remove Default Passcode
**File:** [auth.server.ts:L2](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L2)

```diff
-const DEFAULT_PASSCODE = "criticalfail";
-
 export function getPasscode(): string {
-  return process.env.PARTY_PASSCODE || DEFAULT_PASSCODE;
+  const passcode = process.env.PARTY_PASSCODE;
+  if (!passcode) {
+    throw new Error("PARTY_PASSCODE environment variable is required");
+  }
+  return passcode;
 }
```

---

### 0.3 — Timing-Safe Passcode Comparison
**File:** [auth.server.ts:L35-L38](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L35-L38)

```diff
+import { timingSafeEqual } from "node:crypto";
+
 export function verifyPasscode(passcode: string): boolean {
   if (!passcode) return false;
   const expected = getPasscode();
-  return passcode.trim() === expected.trim();
+  const a = Buffer.from(passcode.trim());
+  const b = Buffer.from(expected.trim());
+  if (a.length !== b.length) return false;
+  return timingSafeEqual(a, b);
 }
```

---

### 0.4 — Remove `Math.random()` Session Fallback
**File:** [auth.server.ts:L46-L53](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L46-L53)

```diff
-  let sessionId: string;
-  if (typeof crypto !== "undefined" && crypto.randomUUID) {
-    sessionId = crypto.randomUUID();
-  } else {
-    sessionId =
-      Math.random().toString(36).substring(2) +
-      Math.random().toString(36).substring(2) +
-      Date.now().toString(36);
-  }
+  const sessionId = crypto.randomUUID();
```

---

### 0.5 — Add `Secure` Flag to Session Cookie
**File:** [auth.server.ts:L61](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth.server.ts#L61)

```diff
-  const cookieString = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Expires=${expiryDate}; HttpOnly; SameSite=Lax`;
+  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
+  const cookieString = `${SESSION_COOKIE_NAME}=${sessionId}; Path=/; Expires=${expiryDate}; HttpOnly; SameSite=Lax${secure}`;
```

Also update the destroy cookie in the same file (L72):
```diff
-  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
+  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
+  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
```

---

### 0.6 — Fix `cls` → `classData` Reference Error
**File:** [native-engine.ts:L64](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L64)

```diff
-  hitDice: `${state.level}/${state.level}d${cls?.hitDice || 8}`,
+  hitDice: `${state.level}/${state.level}d${classData?.hitDice || 8}`,
```

---

### 0.7 — Fix `saveNativeCharacter` Data Path
**File:** [native-engine.ts:L70-L75](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/native-engine.ts#L70-L75)

```diff
 export const saveNativeCharacter = createServerFn({ method: "POST" })
   .handler(async ({ data }: { data: { character: PartyMember } }) => {
-    const filePath = path.join(process.cwd(), `native-char-${data.id}.json`);
-    await fs.writeFile(filePath, JSON.stringify({ success: true, data }, null, 2), "utf-8");
-    return data.id;
+    const char = data.character;
+    const filePath = path.join(process.cwd(), `native-char-${char.id}.json`);
+    await fs.writeFile(filePath, JSON.stringify({ success: true, data: char }, null, 2), "utf-8");
+    return char.id;
   });
```

---

### 0.8 — Remove Wildcard CORS
**File:** [api/party.ts:L21](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/party.ts#L21)

```diff
           headers: {
             "Content-Type": "application/json",
             "Cache-Control": "public, max-age=10",
-            "Access-Control-Allow-Origin": "*",
           },
```

---

### ✅ Phase 0 Verification
- [ ] App starts without crashes
- [ ] Login works with env-set passcode
- [ ] Login fails without `PARTY_PASSCODE` set
- [ ] `/api/party` returns data (no CORS header)
- [ ] Native character save writes correct filename

---

## Phase 1 — Auth & API Hardening (Day 1)

### 1.1 — Add Zod Validation to `loginFn`
**File:** [auth-fns.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L14-L37)

The `z` import already exists but is unused. Wire it up:

```diff
 export const loginFn = createServerFn({ method: "POST" })
+  .validator(z.object({ passcode: z.string().min(1).max(200) }))
   .handler(async ({ data }: { data: { passcode: string } }) => {
-    const payload = data as { passcode: string };
     try {
       const { verifyPasscode, startSession } = await import("@/lib/auth.server");
-      const isValid = verifyPasscode(payload.passcode);
+      const isValid = verifyPasscode(data.passcode);
```

---

### 1.2 — Fix Client-Side Auth Redirect
**File:** [__root.tsx:L185-L198](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/__root.tsx#L185-L198)

Replace the `window.location.href` hard navigation with a router redirect to prevent flash of unauthenticated content:

```diff
   useEffect(() => {
     if (typeof window !== "undefined") {
       import("@/lib/auth-fns").then(async (m) => {
         try {
           const { authenticated } = await m.checkAuthFn();
           if (!authenticated && window.location.pathname !== "/login") {
-            window.location.href = "/login";
+            router.navigate({ to: "/login" });
           }
```

And add `const router = useRouter();` if not already available in `RootComponent`.

---

### 1.3 — Cache `globalThis.dbInstance` in Production Too
**File:** [db.server.ts:L221-L223](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts#L221-L223)

```diff
-  if (process.env.NODE_ENV !== "production") {
-    globalForDb.dbInstance = dbInstance;
-  }
+  globalForDb.dbInstance = dbInstance;
```

---

### ✅ Phase 1 Verification
- [ ] Login rejects empty / oversized passcode
- [ ] Auth redirect uses router (no full page reload)
- [ ] DB singleton persists across requests in production

---

## Phase 2 — Break the Mega-Files (Day 2–3)

> [!IMPORTANT]
> The codebase has several extremely large files that are the #1 maintainability concern. Split these before writing tests so tests target the right modules.

### Current File Sizes

| File | Size | Lines |
|------|------|-------|
| [CharacterDetailView.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CharacterDetailView.tsx) | **281 KB** | ~6000+ |
| [SessionNotes.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/SessionNotes.tsx) | **97 KB** | ~2500+ |
| [CharacterCard.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/components/party/CharacterCard.tsx) | **69 KB** | ~1700+ |
| [dndbeyond.parser.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.parser.ts) | **65 KB** | 2023 |
| [api/notion.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/api/notion.ts) | **47 KB** | ~1200+ |
| [builder.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/builder.tsx) | **34 KB** | 760 |
| [party-modifiers.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/party-modifiers.ts) | **22 KB** | 674 |
| [compendium.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/compendium.tsx) | **22 KB** | 479 |

---

### 2.1 — Split the Parser (65KB → ~6 modules)

**Current:** `src/lib/dndbeyond.parser.ts`

**Target:**
```
src/lib/parser/
├── index.ts              # Re-exports + parseCharacterPayload()
├── constants.ts          # ABILITY_NAMES, SKILLS, MULTI_SLOTS, PACT_TABLE, etc.
├── abilities.ts          # computeFinalScore(), mod(), proficiencyBonus()
├── armor-class.ts        # computeArmorClass()
├── skills-saves.ts       # computeSkills(), computeSaves(), computeSkillProficiency()
├── spells.ts             # computeSpellSlots(), computeSpellsList(), mapSpell()
├── attacks.ts            # computeAttacks()
├── inventory.ts          # computeWeightCarried(), computeCarryingCapacity()
└── senses.ts             # computeSenses(), computeHitDice()
```

**Rules:**
- No logic changes — pure file restructuring
- `index.ts` re-exports everything for backward compatibility
- Existing imports like `from "./dndbeyond.parser"` continue to work via `from "./parser"`

---

### 2.2 — Split the God Function (674 lines → focused helpers)

**Current:** `getFullyModifiedStats()` in [party-modifiers.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/party-modifiers.ts#L236-L612)

**Target:**
```
src/lib/modifiers/
├── index.ts              # getFullyModifiedStats() — composes the below
├── hp.ts                 # getLocalHp(), getModifiedHitDice()
├── ac.ts                 # computeModifiedAc() (shield, armor, infusions, conditions)
├── speed.ts              # computeModifiedSpeed() (conditions, armor penalty, rage)
├── conditions.ts         # getLocalConditions(), mergeConditions()
├── defenses.ts           # getModifiedDefenses()
├── resources.ts          # getLocalSpellSlots(), getLocalResources()
├── inventory.ts          # getLocalItemOverrides(), getLocalCustomItems()
└── senses-capacity.ts    # senses, carrying capacity, special speeds
```

---

### 2.3 — Deduplicate Server/Client Override Logic

**Problem:** [dndbeyond.functions.ts:L123-L336](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.functions.ts#L123-L336) (`mergeDbOverrides`) duplicates nearly identical logic to the `getLocal*` functions in `party-modifiers.ts`.

**Solution:** Extract a shared `applyOverrides(member, overrideMap)` function that works with a `Record<string, string>` regardless of whether it came from `localStorage` or the KV store:

```typescript
// src/lib/modifiers/apply-overrides.ts
export function applyOverrides(
  member: PartyMember,
  kv: Record<string, string>
): PartyMember { ... }
```

Then:
- **Server** (`mergeDbOverrides`): calls `applyOverrides(member, kvFromDb)`
- **Client** (`getFullyModifiedStats`): builds a `Record<string, string>` from `localStorage`, then calls `applyOverrides(member, kvFromLocalStorage)`

---

### 2.4 — Split `CharacterDetailView.tsx` (281 KB)

This is by far the largest file. Split into section components:

```
src/components/party/character-detail/
├── CharacterDetailView.tsx    # Main shell + tab navigation
├── StatsSection.tsx           # Abilities, skills, saves
├── CombatSection.tsx          # HP, AC, attacks, defenses
├── SpellsSection.tsx          # Spell slots, prepared spells, cantrips
├── InventorySection.tsx       # Items, equipment, currency
├── FeaturesSection.tsx        # Class features, feats, traits
└── ProfileSection.tsx         # Background, characteristics, backstory
```

---

### 2.5 — Split `SessionNotes.tsx` (97 KB)

```
src/components/party/session-notes/
├── SessionNotes.tsx           # Main component + state
├── JournalEditor.tsx          # Rich text editing
├── JournalEntryList.tsx       # Entry list / timeline
└── JournalSearch.tsx          # Search / filter UI
```

---

### ✅ Phase 2 Verification
- [ ] All imports resolve (no broken paths)
- [ ] App builds successfully (`npm run build:dev`)
- [ ] No visual regressions in UI
- [ ] `dndbeyond.parser.ts` is deleted (replaced by `parser/`)
- [ ] `party-modifiers.ts` is deleted (replaced by `modifiers/`)

---

## Phase 3 — Test Foundation (Day 3–4)

> [!NOTE]
> Tests are written AFTER the splits so they target the right modules and don't need rewriting.

### 3.1 — Install Vitest

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `package.json`:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

Add `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

---

### 3.2 — Write Tests for High-Risk Logic

Priority test targets (in order):

| Module | Why | Test Count |
|--------|-----|------------|
| `parser/abilities.ts` | Core stat computation | 8–10 |
| `parser/armor-class.ts` | Complex AC rules | 10–12 |
| `parser/spells.ts` | Multiclass slot math | 6–8 |
| `modifiers/ac.ts` | Shield/armor/condition stacking | 8–10 |
| `modifiers/speed.ts` | Condition interactions | 6–8 |
| `modifiers/defenses.ts` | Rage resistance logic | 4–6 |
| `auth.server.ts` | Passcode verification | 4–5 |

```
tests/
├── parser/
│   ├── abilities.test.ts
│   ├── armor-class.test.ts
│   └── spells.test.ts
├── modifiers/
│   ├── ac.test.ts
│   ├── speed.test.ts
│   └── defenses.test.ts
└── auth/
    └── auth.test.ts
```

---

### 3.3 — Add CI Check

Create `.github/workflows/test.yml`:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm test
```

---

### ✅ Phase 3 Verification
- [ ] `npm test` passes
- [ ] ≥50 tests covering parser + modifiers + auth
- [ ] CI pipeline runs on push

---

## Phase 4 — Type Safety & Linting (Day 5)

### 4.1 — Re-enable ESLint Rules (Gradually)
**File:** [eslint.config.js](file:///c:/Users/garas/Desktop/party-stats-hub/eslint.config.js#L47-L54)

```diff
     rules: {
       ...reactHooks.configs.recommended.rules,
-      "@typescript-eslint/no-unused-vars": "off",
-      "@typescript-eslint/no-explicit-any": "off",
-      "no-case-declarations": "off",
-      "no-empty": "off",
-      "@typescript-eslint/no-this-alias": "off",
-      "prefer-const": "off",
-      "no-useless-escape": "off",
-      "no-constant-binary-expression": "off",
+      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
+      "@typescript-eslint/no-explicit-any": "warn",
+      "prefer-const": "warn",
+      "no-empty": "warn",
     },
```

Start with `warn` not `error` — fix warnings incrementally.

---

### 4.2 — Enable TypeScript Strictness
**File:** [tsconfig.json:L19-L20](file:///c:/Users/garas/Desktop/party-stats-hub/tsconfig.json#L19-L20)

```diff
-    "noUnusedLocals": false,
-    "noUnusedParameters": false,
+    "noUnusedLocals": true,
+    "noUnusedParameters": true,
```

---

### 4.3 — Remove `any` in High-Impact Files

Priority order (by blast radius):
1. `parser/index.ts` — type the `data` parameter as a `DDBCharacterPayload` interface
2. `modifiers/` — all functions already have typed inputs/outputs, just need internal cleanup
3. `db.server.ts` — type the `MockDatabase` properly
4. `dndbeyond.functions.ts` — type the `mergeDbOverrides` KV parameter

---

### 4.4 — Remove Unused Imports

| File | Unused Import |
|------|---------------|
| [auth-fns.ts:L2](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/auth-fns.ts#L2) | `z` from zod (once validator is added in 1.1, this is resolved) |
| [constants.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/constants.ts) | `Brain`, `Flame`, `Skull`, `Sparkles`, `AlertCircle` from lucide-react |
| [index.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/index.tsx) | `readStoredIds` (replaced by `readStoredIdsFromCookie`) |

---

### ✅ Phase 4 Verification
- [ ] `npm run lint` produces 0 errors (warnings OK)
- [ ] `npx tsc --noEmit` passes
- [ ] No `any` in parser/ or modifiers/ directories

---

## Phase 5 — Performance (Day 6)

### 5.1 — Lazy-Load Heavy Components

The biggest client-side bundles come from `CharacterDetailView` (281KB) and `SessionNotes` (97KB). These should be code-split:

```typescript
// In routes or parent components
const CharacterDetailView = lazy(() =>
  import("@/components/party/character-detail/CharacterDetailView")
);
const SessionNotes = lazy(() =>
  import("@/components/party/session-notes/SessionNotes")
);
```

---

### 5.2 — Lazy-Load Heavy JSON

**File:** [db.server.ts:L1](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/db.server.ts#L1)

```diff
-import notionSeed from "./notion-cache-seed.json";
+let notionSeed: Record<string, string> | null = null;
+async function getNotionSeed(): Promise<Record<string, string>> {
+  if (!notionSeed) {
+    notionSeed = (await import("./notion-cache-seed.json")).default;
+  }
+  return notionSeed;
+}
```

Update `getKv` and `getKvWithPrefix` to use `await getNotionSeed()`.

---

### 5.3 — Move Cache Files to `data/cache/`

**File:** [dndbeyond.functions.ts:L49](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/dndbeyond.functions.ts#L49)

```diff
-const filePath = path.join(process.cwd(), `char-${id}.json`);
+const cacheDir = path.join(process.cwd(), "data", "cache");
+await fs.mkdir(cacheDir, { recursive: true });
+const filePath = path.join(cacheDir, `char-${id}.json`);
```

Apply the same change to the read path (L70) and native character paths.

Update `.gitignore`:
```diff
-char-*.json
+data/cache/
```

---

### 5.4 — Lazy-Initialize Drizzle DB Connection

**File:** [drizzle.server.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/drizzle.server.ts)

```diff
-const sqlite = new Database(dbPath);
-export const db = drizzle(sqlite, { schema });
+let _db: ReturnType<typeof drizzle> | null = null;
+export function getDb() {
+  if (!_db) {
+    const sqlite = new Database(dbPath);
+    _db = drizzle(sqlite, { schema });
+  }
+  return _db;
+}
```

Update all call sites (`db.select()...` → `getDb().select()...`).

---

### ✅ Phase 5 Verification
- [ ] `npm run build` completes, check `bundle-stats.html` for reduced sizes
- [ ] No character cache files at project root
- [ ] App still works with cold start (lazy DB init)

---

## Phase 6 — Architecture Polish (Day 7–8)

### 6.1 — Replace localStorage Monkey-Patching

**File:** [sync-engine.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/sync-engine.ts#L40-L64)

Replace the global override with an explicit wrapper:

```typescript
// src/lib/synced-storage.ts
export function setSyncedItem(key: string, value: string) {
  localStorage.setItem(key, value);
  if (isSyncableKey(key)) {
    queueSync(key, value);
  }
}

export function removeSyncedItem(key: string) {
  localStorage.removeItem(key);
  if (isSyncableKey(key)) {
    queueSync(key, null);
  }
}
```

Update all call sites that write syncable keys to use `setSyncedItem` / `removeSyncedItem` instead of raw `localStorage`.

---

### 6.2 — Fix Theme `dotColor` Hex Codes
**File:** [useThemePreset.ts](file:///c:/Users/garas/Desktop/party-stats-hub/src/hooks/useThemePreset.ts)

| Theme | Current (Invalid) | Fix |
|-------|-------------------|-----|
| Abyssal Void | `#6809300` | `#680930` |
| Emerald Grove | `#72012145` | `#2a7a45` |
| Crimson Bastion | `#6201520` | `#8b1a1a` |
| Midnight Slate | `#68011215` | `#4a6a8a` |
| Amber Hearth | `#7501370` | `#d4870a` |

> [!NOTE]
> Pick actual representative colors for each theme — the above are suggestions based on the theme names.

---

### 6.3 — Split Index Route Tabs

**File:** [index.tsx](file:///c:/Users/garas/Desktop/party-stats-hub/src/routes/index.tsx)

Extract `PartyDashboard` into its own file and split each tab:

```
src/components/party/dashboard/
├── PartyDashboard.tsx         # Tab container + navigation
├── tabs/
│   ├── PartyCardsTab.tsx
│   ├── CombatTab.tsx
│   ├── InventoryTab.tsx
│   ├── DiceRollerTab.tsx
│   ├── NotesTab.tsx
│   └── DMToolsTab.tsx
```

---

### 6.4 — Remove Hardcoded Character Name
**File:** [utils.ts:L17](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/utils.ts#L17)

```diff
-  if (shortName === "Qemuel") return "Qem";
+  // Campaign-specific nickname overrides
+  const NICKNAME_MAP: Record<string, string> = {
+    Qemuel: "Qem",
+  };
+  return NICKNAME_MAP[shortName] ?? shortName;
```

Move `NICKNAME_MAP` to a config file if it grows.

---

### 6.5 — Add Sync Engine Idempotency Guard
**File:** [sync-engine.ts:L37](file:///c:/Users/garas/Desktop/party-stats-hub/src/lib/sync-engine.ts#L37)

```diff
+let initialized = false;
+
 export async function initSyncEngine() {
   if (typeof window === "undefined") return;
+  if (initialized) return;
+  initialized = true;
```

---

### ✅ Phase 6 Verification
- [ ] No `localStorage.setItem` overrides in codebase
- [ ] Theme preview dots show correct colors
- [ ] `index.tsx` is under 80 lines
- [ ] Sync engine doesn't double-init in React strict mode

---

## Summary

| Phase | Scope | Est. Time | Priority |
|-------|-------|-----------|----------|
| **0** | Security + crashes | 1–2 hours | 🔴 Immediate |
| **1** | Auth hardening | 2–3 hours | 🔴 Day 1 |
| **2** | Break mega-files | 8–12 hours | 🟡 Day 2–3 |
| **3** | Test foundation | 6–8 hours | 🟡 Day 3–4 |
| **4** | Type safety | 4–6 hours | 🟡 Day 5 |
| **5** | Performance | 4–5 hours | 🔵 Day 6 |
| **6** | Architecture polish | 4–6 hours | 🔵 Day 7–8 |

**Total: ~30–42 hours over 8–10 days**

---

## What "Done" Looks Like

- ✅ No security vulnerabilities (tokens rotated, auth hardened, CORS locked)
- ✅ No runtime crashes (`cls`, `data.id` fixed)
- ✅ No file over 300 lines (parser split, modifiers split, components split)
- ✅ No duplicated logic (shared `applyOverrides`)
- ✅ ≥50 unit tests covering core logic
- ✅ CI pipeline running on push
- ✅ Clean TypeScript (minimal `any`, no unused vars)
- ✅ Lazy-loaded heavy components and JSON
- ✅ No monkey-patching of browser globals
