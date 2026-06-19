# 🗺️ Action Plan — Party Stats Hub Audit Remediation

**Created:** 2026-06-19  
**Based on:** [AUDIT.md](./AUDIT.md) — 48 findings (5 critical, 14 high, 18 medium, 11 low)

---

## Overview

This action plan organizes all 48 audit findings into **7 phases**, ordered by risk and dependency. Each phase lists the findings it addresses, the files involved, the concrete steps to take, and an estimated effort level.

Effort scale:
- **XS** = < 15 min (one-liner fix)
- **S** = 15–60 min (localized change)
- **M** = 1–3 hours (multi-file or design work)
- **L** = 3–8 hours (significant refactor)
- **XL** = 1–2 days (architectural change)

---

## Phase 1: Security — Immediate Fixes

> These issues allow unauthenticated access, data injection, or credential leakage. Fix before any deployment.

| # | Finding | Effort | Files to Change |
|---|---------|--------|-----------------|
| C1 | Re-enable authentication | S | `src/lib/auth.server.ts` |
| C2 | Add SSR-safe HTML sanitization | S | `src/routes/compendium.lazy.tsx`, `package.json` |
| C3 | Hide stack traces in production | XS | `src/routes/__root.tsx` |
| C4 | Move Notion token from query param to header | S | `src/routes/api/notion.ts`, client callers |
| C5 | Redact and rotate Notion token if exposed | XS | `.env`, audit docs, Notion dashboard |
| H9 | Sanitize error messages in API responses | XS | `src/routes/api/sync.ts`, `src/routes/api/notion.ts` |
| H13 | Add same-origin hardening to POST endpoints | S | `src/routes/api/sync.ts`, `src/routes/api/notion.ts` |

### Steps

#### 1.1 Re-enable Authentication (C1)
```
File: src/lib/auth.server.ts
```
1. Replace the stubbed `isAuthenticated` with actual session validation:
   ```ts
   export async function isAuthenticated(headers: Headers): Promise<boolean> {
     const sessionId = getSessionIdFromHeaders(headers);
     if (!sessionId) return false;
     return await isSessionValid(sessionId);
   }
   ```
2. Replace the stubbed `verifyPasscode` with actual comparison:
   ```ts
   export function verifyPasscode(passcode: string): boolean {
     return passcode === getPasscode();
   }
   ```
3. Test: Attempt to access `/api/sync` without a session cookie → expect 401.

#### 1.2 Add SSR-Safe HTML Sanitization (C2)
1. Choose one SSR-safe path:
   - Prefer sanitizing `feature.html` during ingestion so the database only stores trusted HTML.
   - Or add an isomorphic sanitizer/wrapper that behaves the same during SSR and in the browser.
2. In `compendium.lazy.tsx`, wrap all `dangerouslySetInnerHTML` with that sanitizer:
   ```tsx
   dangerouslySetInnerHTML={{ __html: sanitizeHtml(feature.html) }}
   ```
3. Search codebase for any other `dangerouslySetInnerHTML` and apply the same fix.
4. Verify both `npm run build` and the compendium page render path.

#### 1.3 Hide Stack Traces (C3)
```
File: src/routes/__root.tsx, lines 51-56
```
```tsx
<h1 className="...">Something went wrong</h1>
{import.meta.env.DEV && (
  <>
    <p className="...">Error: {error.message}</p>
    <p className="...">{error.stack}</p>
  </>
)}
{!import.meta.env.DEV && (
  <p className="...">An unexpected error occurred. Please try again.</p>
)}
```

#### 1.4 Move Notion Token to Header (C4)
```
File: src/routes/api/notion.ts — GET handler
```
1. Change from `url.searchParams.get("token")` to `request.headers.get("Authorization")?.replace("Bearer ", "")`
2. Update all client callers to send token via header instead of query param.

#### 1.5 Redact and Handle Notion Token Exposure (C5)
1. Keep audit/action-plan docs redacted. Do not store the raw token value in tracked docs, tickets, or chat exports.
2. Check history with `git log --all --oneline -- .env`. Rotate immediately if `.env` was ever committed.
3. Rotate immediately if any generated report containing the raw token was shared or committed.
4. Prefer system environment variables or a secrets manager over copying secrets into project files.

#### 1.6 Sanitize API Error Messages (H9)
```
Files: src/routes/api/sync.ts, src/routes/api/notion.ts
```
Replace `{ error: err.message }` with:
```ts
const errorMessage = import.meta.env.DEV ? err.message : "Internal server error";
```

#### 1.7 Add Same-Origin Hardening (H13)
The session cookie currently uses `SameSite=Lax`, so this is defense-in-depth for state-mutating endpoints rather than the primary auth control. Add a reusable helper:
```ts
function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return null;

  try {
    if (new URL(origin).host !== host) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  return null;
}
```
Apply to all POST handlers.

---

## Phase 2: Correctness — Bug Fixes

> These issues cause incorrect behavior, broken features, or potential crashes.

| # | Finding | Effort | Files to Change |
|---|---------|--------|-----------------|
| H1 | Add `await` to `prefetchQuery` | XS | `src/routes/index.tsx`, `src/routes/character.$id.tsx` |
| H4 | Guard `JSON.parse` in render | S | `src/routes/compendium.lazy.tsx` |
| H8 | Add ability score bounds checking | XS | `src/lib/native-engine.ts` |
| H10 | Fix service worker registration | XS | `src/routes/__root.tsx` |
| H11 | Fix sync engine race condition | S | `src/lib/sync-engine.ts` |
| M8 | Add NaN guard on character route param | XS | `src/routes/character.$id.tsx` |
| M9 | Add abort flag to auth effect | XS | `src/routes/__root.tsx` |
| M10 | Validate theme preset from localStorage | XS | `src/routes/__root.tsx` |
| M15 | Fix EntryRenderer React key | XS | `src/routes/compendium.lazy.tsx` |
| M18 | Fix batch sync count reporting | XS | `src/routes/api/sync.ts` |

### Steps

#### 2.1 Add `await` to Prefetch (H1)
```ts
// src/routes/index.tsx:23
await context.queryClient.prefetchQuery(partyQueryOptions(ids));

// src/routes/character.$id.tsx:54
await context.queryClient.prefetchQuery(...);
```

#### 2.2 Guard JSON.parse (H4)
Replace all bare `JSON.parse(selectedItem.xxxJson)` in `compendium.lazy.tsx` with:
```ts
const parsed = parseRawJson(selectedItem.xxxJson);
```
Use the existing `parseRawJson` helper already defined at the top of the file.

#### 2.3 Ability Score Bounds (H8)
```ts
// src/lib/native-engine.ts:1281
return [ability, Math.max(1, Math.min(30, score))];
```

#### 2.4 Fix Service Worker Registration (H10)
```tsx
// src/routes/__root.tsx:203-216
useEffect(() => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((reg) => console.log("SW registered:", reg.scope))
    .catch((err) => console.error("SW registration failed:", err));
}, []);
```

#### 2.5 Fix Sync Engine Race Condition (H11)
```ts
// src/lib/sync-engine.ts:13-32
syncTimeout = setTimeout(async () => {
  const snapshot = { ...syncQueue };
  for (const k of Object.keys(snapshot)) delete syncQueue[k];

  const requeueMissing = () => {
    for (const [key, value] of Object.entries(snapshot)) {
      if (!(key in syncQueue)) syncQueue[key] = value;
    }
  };

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: Object.entries(snapshot).map(([k, v]) => ({ key: k, value: v })) }),
    });
    if (!res.ok) {
      console.warn("Sync failed, re-queuing items");
      requeueMissing();
    }
  } catch (err) {
    console.warn("Network error, re-queuing:", err);
    requeueMissing();
  }
}, 1000);
```

---

## Phase 3: Type Safety & Validation

> Remove `any` types and add proper validation at system boundaries.

| # | Finding | Effort | Files to Change |
|---|---------|--------|-----------------|
| H3 | Remove `as any` on loader data | S | `src/routes/builder.lazy.tsx`, `src/routes/compendium.lazy.tsx` |
| H7 | Type `createNativePartyMember` parameters | M | `src/lib/native-engine.ts` |
| M5 | Hash/encode Notion cache keys | XS | `src/routes/api/notion.ts` |
| M16 | Add Zod schema for `saveNativeCharacter` | S | `src/lib/native-engine.ts` |
| M17 | Add input validator for compendium search | XS | `src/lib/db-functions.ts` |

### Steps

#### 3.1 Type the Engine Parameters (H7)
Define interfaces in a new `src/lib/engine-types.ts`:
```ts
export interface CharacterBuildState {
  name: string;
  level: number;
  classId: string;
  subclassId?: string;
  abilities: Record<string, number>;
  abilityBonuses?: Record<string, number>;
  multiClasses?: MultiClassEntry[];
  hpType?: "average" | "manual";
  manualHpRolls?: Record<number, number>;
  // ...
}

export interface MultiClassEntry {
  classId: string;
  subclassId?: string;
  level: number;
}
```
Replace `any` parameters in `createNativePartyMember` with these interfaces.

#### 3.2 Remove `as any` on Loader Data (H3)
In `builder.lazy.tsx` and `compendium.lazy.tsx`, remove `as any` from `Route.useLoaderData()`. Fix any resulting type errors by ensuring the loader return type matches the component's expectations.

#### 3.3 Add Zod Schema for Save (M16)
Replace `z.custom<PartyMember>()` with at least basic validation:
```ts
z.object({
  character: z.object({
    id: z.number().int(),
    name: z.string().min(1).max(200),
    level: z.number().int().min(1).max(20),
    // ... required fields
  }).passthrough()
})
```

---

## Phase 4: Performance

> Optimize load times and rendering performance.

| # | Finding | Effort | Files to Change |
|---|---------|--------|-----------------|
| H2 | Parallelize builder loader queries | S | `src/routes/builder.tsx` |
| H12 | Guard builder step navigation | XS | `src/routes/builder.lazy.tsx` |
| M7 | Use router navigation instead of `location.href` | XS | `src/routes/index.lazy.tsx`, `src/routes/login.tsx` |
| M11 | Replace `alert()`/`confirm()` with UI components | M | `src/routes/builder.lazy.tsx` |
| M12 | Fix `isLoading` to only check active tab | XS | `src/routes/compendium.lazy.tsx` |
| M13 | Virtualize compendium sidebar | M | `src/routes/compendium.lazy.tsx`, `package.json` |

### Steps

#### 4.1 Parallelize Builder Loader (H2)
```ts
// src/routes/builder.tsx
const [
  classes, species, speciesVariants, subclasses,
  feats, backgrounds, spells, classFeatures,
  classSpells, activeEffects, featureActiveEffects,
  itemActiveEffects, spellActiveEffects, magicItems,
  weapons, armor
] = await Promise.all([
  getClassesFromDb(), getSpeciesFromDb(), getSpeciesVariantsFromDb(), getSubclassesFromDb(),
  getFeatsFromDb(), getBackgroundsFromDb(), getSpellsFromDb(), getClassFeaturesFromDb(),
  getClassSpellsFromDb(), getActiveEffectsFromDb(), getFeatureActiveEffectsFromDb(),
  getItemActiveEffectsFromDb(), getSpellActiveEffectsFromDb(), getMagicItemsFromDb(),
  getWeaponsFromDb(), getArmorFromDb(),
]);
```

#### 4.2 Virtualize Compendium Sidebar (M13)
1. `npm install @tanstack/react-virtual`
2. Replace the `.map()` rendering with a virtualized list using `useVirtualizer`.

---

## Phase 5: Architecture — Engine Refactor

> Break the monolithic engine into maintainable modules. This is the highest-effort phase and depends on Phase 3 (type safety) and sufficient test coverage. Do not start this phase until the Phase 6 priority engine tests are in place.

| # | Finding | Effort | Files to Change |
|---|---------|--------|-----------------|
| H5 | Split `native-engine.ts` into modules | XL | `src/lib/native-engine.ts` → 7+ new files |
| H6 | Extract duplicated feature-unlocking logic | S | `src/lib/native-engine.ts` |
| M1 | Extract `requiresAttunement` | XS | `src/lib/native-engine.ts` |
| M2 | Deduplicate `parseJsonValue`/`normalizeName` | XS | `src/lib/native-engine.ts`, `src/lib/rules-effects.ts`, `src/lib/utils.ts` |
| M3 | Simplify `db-functions.ts` boilerplate | M | `src/lib/db-functions.ts` |
| M6 | Improve MockDatabase dispatch | S | `src/lib/db.server.ts` |

### Proposed Module Structure

```
src/lib/engine/
├── index.ts                    # Re-exports public API
├── types.ts                    # CharacterBuildState, effect types, etc.
├── constants.ts                # ABILITIES, SKILLS, WEAPON_DAMAGE, ARMOR_AC, spell slot tables
├── utils.ts                    # parseJsonValue, normalizeName, stripTags, modifier()
├── ability-scores.ts           # Base scores, bonuses, overrides, bounds checking
├── combat-stats.ts             # AC, HP, initiative, death saves
├── spell-engine.ts             # Spell slots, pact slots, caster level, multiclass caster
├── proficiency-engine.ts       # Skills, saves, tools, languages, expertise
├── class-features.ts           # Feature unlocking, actions, choices, effects
├── equipment-engine.ts         # Inventory, armor, weapons, attacks, currency
├── species-traits.ts           # Lineage spells, darkvision, resistances, ancestry
├── foundry-effects.ts          # parseFoundryJsonEffects, effect accumulation
├── builder.ts                  # createNativePartyMember (orchestrator)
└── server.ts                   # saveNativeCharacter, getNativeCharacter (server functions)
```

### Migration Strategy

1. **Write tests first** (Phase 6) to lock current behavior
2. Start with zero-dependency modules: `constants.ts`, `utils.ts`, `types.ts`
3. Extract one domain at a time, running tests after each extraction
4. Keep `native-engine.ts` as a re-export barrel during transition
5. Remove the barrel once all imports are updated

---

## Phase 6: Testing

> Build the safety net needed for ongoing development and the engine refactor.

| # | Finding | Effort | Files to Change |
|---|---------|--------|-----------------|
| H14 | Increase overall test coverage | XL | Multiple new test files |
| L7 | Configure vitest coverage | XS | `vitest.config.ts` |
| M14 | Add error recovery to pipeline scripts | L | `src/pipeline/*.ts` |

### Priority Test Targets

#### 6.1 Configure Coverage Reporting (L7)
```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/routes/api/**"],
      exclude: ["src/pipeline/**", "src/db/**"],
    },
  },
});
```

#### 6.2 Engine Tests (Highest Priority)

Create `src/lib/native-engine.comprehensive.test.ts`:

| Test Area | Priority | Scenarios |
|-----------|----------|-----------|
| Ability scores | High | Base scores, bonuses, overrides, bounds clamping |
| Proficiency bonus | High | Levels 1, 4, 5, 8, 9, 12, 13, 16, 17, 20 |
| HP calculation | High | Average mode, manual mode, multiclass, CON modifier |
| AC calculation | High | Unarmored, light, medium, heavy, shield, DEX cap |
| Spell slots | High | Full caster, half, third, pact, multiclass |
| Skill proficiency | Medium | Proficient, expertise, background, species, feat |
| Species traits | Medium | Each lineage option (elf, gnome, tiefling, dragonborn) |
| Multiclass | Medium | 2-class, 3-class, spellcasting level |
| Equipment | Medium | Weapon attacks, finesse, ranged, properties |
| Actions/uses | Low | Feature action parsing, uses computation |

#### 6.3 API Handler Tests

Create `src/routes/api/__tests__/`:

```ts
// sync.test.ts
describe("POST /api/sync", () => {
  it("rejects unauthenticated requests with 401");
  it("stores allowed keys");
  it("rejects disallowed key prefixes");
  it("handles batch operations");
  it("handles null value (deletion)");
  it("returns correct processed count");
});
```

#### 6.4 Sync Engine Tests

Create `src/lib/sync-engine.test.ts`:

```ts
describe("queueSync", () => {
  it("debounces multiple rapid calls");
  it("sends batch after timeout");
  it("re-queues on network failure");
  it("clears queue on success");
});
```

---

## Phase 7: Code Quality (Low Priority)

> Polish items that don't affect functionality but improve maintainability.

| # | Finding | Effort | Files to Change |
|---|---------|--------|-----------------|
| L1 | Remove empty `party-modifiers.ts` | XS | `src/lib/party-modifiers.ts` |
| L2 | Evaluate `srd-engine.ts` necessity | XS | `src/lib/srd-engine.ts` |
| L3 | Add `no-console` ESLint rule | XS | `eslint.config.js` |
| L4 | Standardize component patterns | S | Multiple component files |
| L5 | Convert `update_barbarian.cjs` to ESM | XS | `src/pipeline/update_barbarian.cjs` |
| L6 | Extract mobile breakpoint constant | XS | `src/hooks/use-mobile.tsx` |
| L8 | Remove duplicate CSS class | XS | `src/routes/login.tsx` |
| L9 | Add `aria-label` attributes | S | Multiple component files |
| L10 | Set QueryClient defaults | XS | `src/router.tsx` |
| L11 | Escape cookie name in regex | XS | `src/lib/party.ts` |
| M4 | Add DB shutdown hook | XS | `src/lib/drizzle.server.ts` |

---

## Summary Timeline

| Phase | Focus | Total Effort | Dependency |
|-------|-------|-------------|------------|
| **Phase 1** | Security | ~4 hours | None — start immediately |
| **Phase 2** | Correctness | ~3 hours | None — can run parallel with Phase 1 |
| **Phase 3** | Type Safety | ~4 hours | After Phase 2 |
| **Phase 4** | Performance | ~4 hours | After Phase 2 |
| **Phase 6** | Testing | ~8–12 hours | Start early, before Phase 5 |
| **Phase 5** | Architecture | ~12–16 hours | After Phase 3 + Phase 6 tests |
| **Phase 7** | Polish | ~3 hours | Anytime |

**Total estimated effort: ~38–46 hours**

---

## Tracking

Use this checklist to track progress. Mark items as they're completed:

### Phase 1: Security
- [ ] C1 — Re-enable authentication
- [ ] C2 — Add SSR-safe HTML sanitization
- [ ] C3 — Hide stack traces in production
- [ ] C4 — Move Notion token to header
- [ ] C5 — Redact and rotate Notion token if exposed
- [ ] H9 — Sanitize API error messages
- [ ] H13 — Add same-origin hardening

### Phase 2: Correctness
- [ ] H1 — Add `await` to `prefetchQuery`
- [ ] H4 — Guard `JSON.parse` in render
- [ ] H8 — Add ability score bounds checking
- [ ] H10 — Fix service worker registration
- [ ] H11 — Fix sync engine race condition
- [ ] M8 — Add NaN guard on character route param
- [ ] M9 — Add abort flag to auth effect
- [ ] M10 — Validate theme preset from localStorage
- [ ] M15 — Fix EntryRenderer React key
- [ ] M18 — Fix batch sync count reporting

### Phase 3: Type Safety
- [ ] H3 — Remove `as any` on loader data
- [ ] H7 — Type `createNativePartyMember` parameters
- [ ] M5 — Hash/encode Notion cache keys
- [ ] M16 — Add Zod schema for `saveNativeCharacter`
- [ ] M17 — Add input validator for compendium search

### Phase 4: Performance
- [ ] H2 — Parallelize builder loader queries
- [ ] H12 — Guard builder step navigation
- [ ] M7 — Use router navigation instead of `location.href`
- [ ] M11 — Replace `alert()`/`confirm()` with UI components
- [ ] M12 — Fix `isLoading` to only check active tab
- [ ] M13 — Virtualize compendium sidebar

### Phase 5: Architecture
- [ ] H5 — Split `native-engine.ts` into modules
- [ ] H6 — Extract duplicated feature-unlocking logic
- [ ] M1 — Extract `requiresAttunement`
- [ ] M2 — Deduplicate `parseJsonValue`/`normalizeName`
- [ ] M3 — Simplify `db-functions.ts` boilerplate
- [ ] M6 — Improve MockDatabase dispatch

### Phase 6: Testing
- [ ] L7 — Configure vitest coverage
- [ ] H14a — Engine comprehensive tests
- [ ] H14b — API handler tests
- [ ] H14c — Sync engine tests
- [ ] M14 — Pipeline error recovery

### Phase 7: Code Quality
- [ ] L1 — Remove empty `party-modifiers.ts`
- [ ] L2 — Evaluate `srd-engine.ts`
- [ ] L3 — Add `no-console` ESLint rule
- [ ] L4 — Standardize component patterns
- [ ] L5 — Convert CJS to ESM
- [ ] L6 — Extract mobile breakpoint
- [ ] L8 — Remove duplicate CSS class
- [ ] L9 — Add accessibility labels
- [ ] L10 — Set QueryClient defaults
- [ ] L11 — Escape cookie name in regex
- [ ] M4 — Add DB shutdown hook
