# Updated Refactor Plan - Party Stats Hub

Last updated from the current working tree.

This supersedes `Refactor_Plan.md` and `FULL_REFACTOR_PLAN.md` as the execution plan. Keep the older files as source notes, but work from this one.

## Current Status

Already present in the current tree:

- `.env` is ignored, while `.env.example` remains allowed.
- `/api/party` no longer sends wildcard CORS.
- Login input validation exists via `inputValidator(z.object({ passcode: z.string().min(1).max(200) }))`.
- Login rate limiting exists in `auth.server.ts`.
- Session cookies already add `Secure` in production.
- `saveNativeCharacter` already uses `data.character.id` and writes the character payload.
- React Query retry is already configured for party data.

Still open:

- The committed Notion token must be rotated outside the codebase.
- `DEFAULT_PASSCODE = "criticalfail"` is still present.
- Passcode comparison is still a plain string comparison.
- Session ID generation still falls back to `Math.random()`.
- Client auth redirect still uses `window.location.href`.
- The DB singleton is only cached on `globalThis` outside production.
- `initSyncEngine()` can still wrap `localStorage` more than once.
- Theme preview `dotColor` values contain invalid hex codes.
- The largest files are still very large:
  - `src/components/party/CharacterDetailView.tsx`: 7271 lines
  - `src/components/party/SessionNotes.tsx`: 2320 lines
  - `src/components/party/CharacterCard.tsx`: 1614 lines
  - `src/routes/api/notion.ts`: 1330 lines
  - `src/routes/builder.tsx`: 2655 lines
  - `src/lib/dndbeyond.parser.ts`: 2022 lines
  - `src/lib/party-modifiers.ts`: 673 lines

## Guiding Rules

- Fix active security and runtime risks before large structural work.
- Add behavior snapshots before splitting risky logic.
- Split files without changing behavior first, then improve internals.
- Keep compatibility shims during big moves to reduce import churn.
- Verify after every phase with build, lint, tests, and a quick UI smoke pass.
- Do not mix feature work into the refactor.

## Phase 0 - Immediate Safety Fixes

Goal: remove active security risks and known runtime hazards.

### 0.1 Rotate exposed Notion token

This cannot be completed by code alone.

- Rotate the token at Notion.
- Update deployment environment variables with the new token.
- Keep `.env` out of Git.
- Decide whether to scrub old Git history with BFG or `git filter-repo`.

### 0.2 Remove the default passcode

File: `src/lib/auth.server.ts`

Replace the default fallback with a required environment variable:

```ts
export function getPasscode(): string {
  const passcode = process.env.PARTY_PASSCODE;
  if (!passcode) {
    throw new Error("PARTY_PASSCODE environment variable is required");
  }
  return passcode;
}
```

### 0.3 Use timing-safe passcode comparison

File: `src/lib/auth.server.ts`

- Import `timingSafeEqual` from `node:crypto`.
- Compare trimmed buffers.
- Return false when buffer lengths differ.

### 0.4 Remove `Math.random()` session fallback

File: `src/lib/auth.server.ts`

Use Node crypto directly:

```ts
const sessionId = crypto.randomUUID();
```

If runtime compatibility is a concern, import `randomUUID` from `node:crypto`.

### 0.5 Replace hard auth redirect

File: `src/routes/__root.tsx`

- Replace `window.location.href = "/login"` with TanStack Router navigation.
- Keep the current unauthenticated check behavior.

### 0.6 Cache DB singleton in production too

File: `src/lib/db.server.ts`

Store `dbInstance` on `globalThis` regardless of `NODE_ENV` so production request handling does not recreate the DB connection unnecessarily.

### 0.7 Quick low-risk correctness fixes

- Add an idempotency guard to `initSyncEngine()` to prevent double wrapping in Strict Mode or HMR.
- Fix invalid theme `dotColor` values in `src/hooks/useThemePreset.ts`.

Verification:

- `npm run build:dev`
- `npm run lint`
- Manual login check with `PARTY_PASSCODE` set.
- Manual login failure check with a wrong passcode.
- Confirm app fails clearly when `PARTY_PASSCODE` is missing.

## Phase 1 - Behavior Snapshots and Test Foundation

Goal: pin current behavior before moving the riskiest code.

### 1.1 Add Vitest

Add:

- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `jsdom`

Add scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Add `vitest.config.ts` with the `@` alias mapped to `src`.

### 1.2 Add characterization fixtures

Use small fixtures where possible, and one real sanitized fixture for parser coverage.

Targets:

- `parseCharacterPayload()`
- `getFullyModifiedStats()`
- `verifyPasscode()`
- `startSession()` cookie attributes
- `readStoredIds()` / cookie parsing

These tests should mostly assert current outputs. They are not trying to redesign the logic yet.

### 1.3 Add CI or local gate

If GitHub Actions is wanted, add:

- `npm ci`
- `npm test`
- `npm run lint`
- `npm run build:dev`

If not, document the same commands as the local pre-merge gate.

Verification:

- `npm test`
- `npm run build:dev`
- Existing app behavior unchanged.

## Phase 2 - Split Core Logic Without Behavior Changes

Goal: make parser and modifier logic maintainable while preserving public behavior.

### 2.1 Split `dndbeyond.parser.ts`

Create:

```text
src/lib/parser/
  index.ts
  constants.ts
  abilities.ts
  armor-class.ts
  skills-saves.ts
  spells.ts
  attacks.ts
  inventory.ts
  senses.ts
  actions.ts
  defenses.ts
  creatures.ts
```

Keep `src/lib/dndbeyond.parser.ts` temporarily as a compatibility shim that re-exports from `src/lib/parser`.

Rules:

- Move code first; do not rewrite algorithms during the move.
- Preserve exported names.
- Run tests after each small extraction.

### 2.2 Split `party-modifiers.ts`

Create:

```text
src/lib/modifiers/
  index.ts
  storage-keys.ts
  conditions.ts
  hp.ts
  ac.ts
  speed.ts
  resources.ts
  inventory.ts
  defenses.ts
  senses-capacity.ts
```

Keep `src/lib/party-modifiers.ts` temporarily as a compatibility shim.

Rules:

- Keep `getFullyModifiedStats(member)` as the public entrypoint.
- Move helper groups by responsibility.
- Add focused tests around each extracted helper as it becomes callable.

### 2.3 Extract shared override application

Problem: server-side DB overrides and client-side localStorage overrides duplicate concepts.

Create:

```text
src/lib/modifiers/apply-overrides.ts
```

Expose:

```ts
export function applyOverrides(
  member: PartyMember,
  values: Record<string, string | null>,
): PartyMember;
```

Use it from:

- `src/lib/dndbeyond.functions.ts`
- `src/lib/modifiers/index.ts`

Verification:

- `npm test`
- `npm run build:dev`
- Compare one representative character before and after the split.

## Phase 3 - Split the Largest UI Files

Goal: make UI work approachable without changing the visual design.

### 3.1 Split `CharacterDetailView.tsx`

Target:

```text
src/components/party/character-detail/
  CharacterDetailView.tsx
  CharacterHeader.tsx
  StatsPanel.tsx
  CombatPanel.tsx
  SpellbookPanel.tsx
  InventoryPanel.tsx
  FeaturesPanel.tsx
  ProfilePanel.tsx
  RestModals.tsx
  hooks.ts
```

Some files already exist in this folder; reuse them.

Rules:

- Start with pure presentational sections.
- Move stateful logic only after props are clear.
- Avoid nested cards or visual restyling during the split.

### 3.2 Split `SessionNotes.tsx`

Target:

```text
src/components/party/session-notes/
  SessionNotes.tsx
  JournalEditor.tsx
  JournalList.tsx
  TodoPanel.tsx
  NpcPanel.tsx
  LocationPanel.tsx
  SearchPanel.tsx
  storage.ts
```

### 3.3 Split `CharacterCard.tsx`

Target:

```text
src/components/party/character-card/
  CharacterCard.tsx
  CharacterCardHeader.tsx
  StatBadges.tsx
  ResourceBadges.tsx
  ConditionBadges.tsx
  QuickActions.tsx
```

### 3.4 Split `api/notion.ts`

Target:

```text
src/lib/notion/
  client.server.ts
  markdown.ts
  cache.server.ts
  blocks.ts
  pages.ts
```

Keep the route file as a thin request/response layer.

Verification:

- `npm run build:dev`
- Smoke test the character detail modal, notes tab, party cards, and Notion-backed notes.
- Capture before/after screenshots if a UI diff is expected.

## Phase 4 - Type Safety and Lint Tightening

Goal: improve signal without turning lint into a giant cleanup project.

### 4.1 Tighten ESLint in stages

Start with warnings:

```js
"@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
"@typescript-eslint/no-explicit-any": "warn",
"prefer-const": "warn",
"no-empty": "warn",
```

Do not enable strict error mode until the high-churn refactor phases are complete.

### 4.2 Type the parser boundary

Add DDB payload interfaces incrementally:

- Character payload root
- Stats
- Modifiers
- Inventory items
- Classes/subclasses
- Spells
- Creatures

Start at parser inputs and move inward.

### 4.3 Type the modifier boundary

Remove `any` from:

- `src/lib/modifiers/`
- `src/lib/dndbeyond.functions.ts` override maps
- `src/lib/db.server.ts` database abstraction

### 4.4 Enable TS unused checks last

Only after lint warnings are manageable:

```json
"noUnusedLocals": true,
"noUnusedParameters": true
```

Verification:

- `npm run lint`
- `npx tsc --noEmit`
- No `any` in `src/lib/parser/` or `src/lib/modifiers/` except where explicitly justified.

## Phase 5 - Storage and Sync Architecture

Goal: remove fragile browser-global behavior.

### 5.1 Replace localStorage monkey patching

Create:

```text
src/lib/synced-storage.ts
```

Expose:

```ts
setSyncedItem(key: string, value: string): void
removeSyncedItem(key: string): void
isSyncableKey(key: string): boolean
```

Update syncable write call sites to use the wrapper.

### 5.2 Keep init idempotent until monkey patching is gone

Even if Phase 0 adds a guard, keep it until the wrapper migration is complete.

### 5.3 Move cache files out of the project root

Move runtime cache files to:

```text
data/cache/
```

Update `.gitignore` to ignore `data/cache/`.

Apply to:

- `char-*.json`
- `native-char-*.json`
- any future runtime cache files

Verification:

- No global `localStorage.setItem` or `localStorage.removeItem` override remains.
- Sync still persists conditions, party IDs, notes, resources, and overrides.
- No new cache files appear at the project root.

## Phase 6 - Performance Pass

Goal: optimize based on measurement, not stale bundle claims.

### 6.1 Measure first

Run a production-like bundle and inspect output:

- `npm run build:dev`
- `npm run build` only when seed prerequisites are ready.

If a visualizer is wired, generate and inspect `bundle-stats.html`.

### 6.2 Lazy-load heavy views

Candidates:

- Character detail view
- Session notes
- DM tools
- Encounter builder
- Compendium route
- Builder route

### 6.3 Lazy-load heavy data

Candidates:

- `src/lib/notion-cache-seed.json`
- large compendium datasets
- monster/spell data where not needed on first paint

### 6.4 Revisit DB initialization

Only after Phase 0 DB singleton caching is complete:

- Consider lazy Drizzle initialization.
- Keep server-only imports out of client bundles.
- Verify cold start behavior.

Verification:

- Compare bundle sizes before and after.
- First route render still works.
- No server-only code leaks into client bundles.

## Phase 7 - Final Cleanup

Goal: remove temporary compatibility and document the new shape.

- Remove parser and modifier shims once imports have migrated.
- Update `PROJECT.md` with the new architecture.
- Update `README.md` setup and verification commands.
- Delete stale refactor plan files or mark them as archived.
- Replace broken citation artifacts in older docs if they remain.
- Add a short "how to add a new modifier" guide.

Verification:

- `npm test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build:dev`
- Manual smoke test of login, party dashboard, character detail, notes, builder, and compendium.

## Suggested Execution Order

1. Phase 0: same day, before any deploy.
2. Phase 1: next, because it reduces refactor risk.
3. Phase 2: parser and modifiers.
4. Phase 3: UI and route decomposition.
5. Phase 4: type and lint tightening.
6. Phase 5: storage/sync cleanup.
7. Phase 6: measured performance work.
8. Phase 7: docs and temporary shim removal.

## Definition of Done

- No known exposed active secrets.
- No default passcode.
- No timing-unsafe passcode comparison.
- No `Math.random()` session ID fallback.
- Tests cover parser, modifiers, auth, and storage basics.
- Core logic files are split by responsibility.
- Largest UI files are split into maintainable components.
- Sync no longer relies on monkey-patching browser globals.
- Build, lint, typecheck, and tests pass.
- The app passes a manual smoke test for the core campaign workflows.
