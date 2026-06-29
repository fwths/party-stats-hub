# 🔍 Comprehensive Code Audit — party‑stats‑hub

**Date**: June 22, 2026  
**Project**: D&D 5e Campaign Dashboard / Feature-rich D&D campaign management app ("Mother of Bob")  
**Scope**: Full codebase — 187 source files, 2,491 KB across party‑stats‑hub  
**Stack**: TanStack Start (React 19) · Drizzle ORM · SQLite (better-sqlite3) · Tailwind CSS v4 · Vite 7 · Fly.io  
**Language Composition**: TypeScript (94.9%), JavaScript (2.3%), Python (2.2%), Other (0.6%)  
**Test Coverage**: 16 test files (65 KB) covering ~2.6 % of source by size  
**Cross-check Update**: June 25, 2026 — `npm run build` and `npm run test` pass; `npm run lint` exits with warnings; `npm audit --audit-level=moderate` reports 13 vulnerabilities.

---

## Executive Summary

The Party Stats Hub is a well‑architected, feature‑rich full‑stack D&D 5e dashboard with modern tooling. The codebase demonstrates strong fundamentals in code organization, type safety, and database design. However, it has accumulated significant technical debt and several critical security and stability issues. This combined audit found:

- **Security**: 5 Critical, 11 High, 15 Medium, 12 Low findings  
- **Codebase**: 2 491 KB, 187 files, previous audit reported 42 TS type errors, 50 + `as any` casts, 13 root‑clutter files  
- **DB**: 578 MB SQLite DB, seeding strategy issues  
- **Coverage**: Only ~2.6 % of source tested (65 KB tests)

Areas for immediate focus include authentication/session bypass, server-side ownership checks, Notion cache isolation, committed tokens, weak password hashing, dependency vulnerabilities, and pervasive type erosion.

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Source files (`.ts`/`.tsx`) | 187 |
| Total source size | 2 491 KB |
| Test files | 16 (65 KB) |
| Largest file | WizardSteps.tsx — 107 KB / 2 423 lines |
| Files > 50 KB | 6 (WizardSteps, CharacterDetailView, SpellbookPanel, InventoryPanel, native‑engine, CharacterCard) |
| TypeScript errors (`tsc --noEmit`) | 42 in prior audit; revalidate separately. Current `npm run build` passes. |
| `as any` casts | 50+ |
| Root‑level clutter files | 13 |
| SQLite DB size | 578 MB |
| Test coverage | ~2.6 % by size |

---

## Architecture & Project Structure ✅

- Uses TanStack Start, React 19 and Drizzle ORM.  
- Clean separation of frontend/backend and UI components.  
- Tailwind CSS v4 integration provides responsive styling.  
- Modular design but several monolithic files (native‑engine.ts moved) justify refactoring.

### Strengths

- Strong overall structure and use of TypeScript for most source.  
- SQLite integration is effective for local use; schema design is sound.  
- CI includes 16 Vitest files, though coverage remains low.

### Project Statistics (from above metrics)

### Recommendations

- Refactor large components (WizardSteps, CharacterDetailView, etc.) to reduce bundle size.  
- Enforce linting (`no-any`, ESLint suppressions cleaned).  
- Document root‑clutter removal and enforce folder structure.

---

## Security Issues 🔴 CRITICAL

### C1 — Authentication & Session Validation Completely Disabled

- [auth.server.ts] returns `default-session` and always returns `true`. All auth checks bypassed.  
- Recommend proper session validation, update `isAuthenticated`, `getSessionIdFromHeaders`, and `verifyPasscode` with constant‑time comparison.

### C2 — Notion API Token Committed in `.env`

- Sensitive Notion API token found in `.env`. Rotate immediately and scrub history.  
- Check remaining `.env` files for similar leaks.

### C3 — Critically Weak Password Hashing

- Password hashing uses weak or no salt/hardcoded values. No Argon2/bcrypt with sufficient iterations.  
- Replace with modern hashing (Argon2/id), use constant‑time compare functions.

### C4 — Character and Campaign Mutations Lack Ownership Enforcement

- `saveNativeCharacter` accepts a caller-provided `PartyMember` payload and upserts by `character.id` without authenticating the caller or checking character ownership/campaign membership.
- `getNativeCharacter` reads by numeric id without verifying that the current user owns the character or belongs to its campaign.
- `updateCampaignCharactersFn` trusts the client-controlled `active_campaign_id` cookie and mutates campaign character membership without proving the current user is a member or DM of that campaign.
- Recommendation: centralize `requireCurrentUser()`, derive campaign/user identity from a validated session, and enforce owner/member/DM predicates in every mutation and character read path.

### C5 — Notion Cache Is Not Isolated by User/Token/Workspace

- `/api/notion` builds cache keys from page/search parameters only, then serves cached responses before requiring a valid token.
- A cached page/search response fetched with one Notion token can be returned to another authenticated app user or to a request with no token.
- Recommendation: include user id and a non-reversible token/workspace fingerprint in cache keys, require a token before cache lookup for private content, and avoid storing Notion data in globally synced KV unless it is explicitly public.

---

## HIGH Findings 🟠

**H1** — Pervasive `as any` Type Erosion (50 + instances)  
**H2** — `checkAuthFn` Silently Returns Admin on Any Error  
**H3** — Regex‑Based HTML Sanitizer Is Bypassable (XSS Risk)  
**H4** — `MockDatabase` Session Type Mismatch (3 TS Errors)  
**H5** — 42 TypeScript Compilation Errors  
**H6** — Massive Component Files (6 files > 50 KB)  
**H7** — Duplicated Utility Functions  
**H8** — 44 Identical Server Function Definitions in `db-functions.ts`  
**H9** — Root‑Level File Clutter (13 + files)  
**H10** — Service Worker Caches API Responses (Including Auth‑Protected Data)  
**H11** — Dependency Audit Reports High/Moderate Vulnerabilities

### H10 — Service Worker Caches API Responses (Including Auth-Protected Data)

- `public/sw.js` caches every GET `/api/*` response, including `/api/sync`, `/api/party`, and `/api/notion`.
- This ignores server `Cache-Control` such as `no-store` on sync responses and can keep private/stale data available after logout or while offline.
- Recommendation: do not cache authenticated API routes by default; only cache explicit public static assets or responses with safe cache headers.

### H11 — Dependency Audit Reports High/Moderate Vulnerabilities

- `npm audit --audit-level=moderate` reports 13 vulnerabilities: 1 high, 11 moderate, 1 low.
- Notable advisories include Vite Windows dev-server issues, TanStack Start server-function request deserialization, `@babel/core` arbitrary file read via source maps, `js-yaml` DoS, and `brace-expansion` DoS.
- Recommendation: update Vite and TanStack Start first, run `npm audit fix`, then review any breaking-change path before using `npm audit fix --force`.

*(Other details under each finding as in new audit, with code excerpts and file links.)*

---

## MEDIUM Findings 🟡

**M1** — Sync API Lacks Rate Limiting and Batch Size Cap  
**M2** — Sync Engine Has No Retry Backoff  
**M3** — In‑Memory Rate Limiting Won't Survive Restarts  
**M4** — `campaign_id` Cookie Not HttpOnly  
**M5** — `MockDatabase` SQL Matching Is Fragile  
**M6** — Missing Input Validation on `updateCampaignCharactersFn`  
**M7** — `getAllKv()` Returns Full KV Store (Notion Cache)  
**M8** — Notion Token Fallback Accepts Token from Request Body  
**M9** — Excessive Dynamic Imports in Server Functions  
**M10** — 20 MB JSON Snapshot Bloats the Build  
**M11** — Dockerfile Bakes a 578 MB SQLite DB into Image  
**M12** — `fly.toml` Specifies Memory Twice  
**M13** — No `useMemo`/`useCallback` in Route Components  
**M14** — Notion Client Makes Unbounded Paginated Requests  
**M15** — KV/Session Persistence Can Silently Fall Back to In-Memory Store

### M15 — KV/Session Persistence Can Silently Fall Back to In-Memory Store

- `db.server.ts` uses `node:sqlite`, but the Dockerfile uses Node 20, where that API may be unsupported. The code then falls back to `MockDatabase`.
- The fallback ignores Fly's configured `DATABASE_URL=/data/sqlite.db` and may place KV/session data in memory or a non-volume path.
- Recommendation: use one SQLite implementation consistently (`better-sqlite3` or supported `node:sqlite`), respect `DATABASE_URL`, fail closed for sessions if durable storage is unavailable, and avoid using in-memory persistence in production.

*(Include file, line references and impact similar to new audit.)*

---

## LOW Findings 🟢

**L1** — Unused Imports and Variables (18 instances from `tsc`)  
**L2** — Missing Module Type Declarations  
**L3** — ESLint Suppressions in Components (4 instances)  
**L4** — `no-constant-binary-expression` Disabled  
**L5** — `getShortName()` Has Hardcoded Special Case  
**L6** — `party-config.ts` Hardcodes Character IDs  
**L7** — `error: any` Pattern in Catch Blocks  
**L8** — SRD Data Files Are Very Large  
**L9** — `db-functions.ts` Uses Static Imports While Others Use Dynamic  
**L10** — `vitest.config.ts` Is Minimal  
**L11** — `new data` Directory with Space in Name  
**L12** — Theme Preset Applied via `localStorage` as `any`

---

## Test Coverage Analysis

- Vitest covers ~2.6 % of code size.  
- Major gaps in components (wizard steps, inventory), sync engine, and API routes.  
- E2E testing entirely missing.

Recommended: add coverage for critical auth paths, database layer, service worker, and sync tests.

### Current Verification Snapshot (June 25, 2026)

- `npm run build` passes.
- `npm run test` passes: 16 files, 85 tests.
- `npm run lint` exits successfully but reports 956 warnings, mostly `any` and empty catch blocks.
- `npm audit --audit-level=moderate` fails because vulnerabilities are present.

---

## Deployment & Docker Notes

*(Combine old and new Docker/dev details)*  
- Remove DB from Docker image (M11) → bake only seed scripts.  
- Multi‑stage build already introduced (see M11 notes).  
- Trusted seeding only on startup (do not seed during build).  
- Fly .io `fly.toml` memory configuration corrected (remove duplicate memory spec).

---

## Prioritized Remediation Plan

### Immediate (🔴 Critical)
- [ ] Fix C1‑C3: authentication, Notion token, password hashing.  
- [ ] Add proper session/user ID flow.  
- [ ] Fix C4: enforce ownership/membership on native character and campaign mutations.  
- [ ] Fix C5/M7/M8: isolate Notion cache by user/token/workspace and stop serving private cache entries before token validation.  
- [ ] Fix H11: update vulnerable dependencies, especially Vite and TanStack Start.  
- [ ] Implement missing rate limiting (M1/H10).  

### Short‑Term (🟠 High)
- [ ] Refactor H1 … H10 issues: type erosion, regex sanitizer, duplicated code, etc.  
- [ ] Reduce component sizes (H6).  
- [ ] Remove ESLint suppressions (L3).  

### Medium‑Term (🟡 Medium)
- [ ] API input validation (M6).  
- [ ] Persist rate limiting (M3).  
- [ ] Replace in-memory production fallbacks for KV/session storage (M15).  
- [ ] Modularize DB functions (L9).  

### Long‑Term (🟢 Low / Quality)
- [ ] Increase test coverage to 30 %.  
- [ ] Address unused imports (L1), hardcoded IDs (L6), theme preset any (L12).  
- [ ] Add types for missing modules (L2).  
- [ ] Improve documentation (old section 8) and code quality.

---

## Conclusion

The audit confirms that the Party Stats Hub is a functional, modern full‑stack app, but it has accumulated significant security and technical debt. The restructured severity‑based findings above keep core architecture insights while sharply focusing remediation on the 3 Critical and additional 36 High/Medium/Low issues. Applying the prioritized actions will improve security posture, type safety, and maintainability.

*(End of merged audit)*
