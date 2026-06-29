# Code Quality & Reliability Audit

```yaml
report_name: Code Quality & Reliability Audit
report_type: Technical Implementation Review
generated_by: Code Quality & Reliability Agent
generated_on: 2026-06-30
repository_version: 8414d575ae938f728e5f6d0d38b3f848d7459494
audit_cycle: Audit #1 - Framework Ready 1.0.1
```

## Repository Snapshot

```yaml
repository_name: party-stats-hub
repository_branch: main
repository_commit: 8414d575ae938f728e5f6d0d38b3f848d7459494
repository_type: Full-stack web application / modular monolith
primary_language: TypeScript
frameworks: TanStack Start, React 19, Drizzle ORM, better-sqlite3, Zod, Vite, Vitest
database: SQLite
files_reviewed: 26 governance, report, source, test, and operations files, plus repository-wide targeted symbol searches
generated_on: 2026-06-30
audit_cycle: Audit #1 - Framework Ready 1.0.1
```

## Scope

Reviewed implementation risks for authentication, authorization, persistence safety, concurrency, save behavior, backup/recovery, deployment, monitoring, performance, maintainability, and test coverage. Inputs included `RELIABILITY_SECURITY_CHECKLIST.md`, `PROJECT_CONTEXT.md`, finding governance docs, the current registry and prior Code Quality report, and the newly updated architecture, D&D, and campaign reports.

## Out Of Scope

Gameplay rules correctness, campaign workflow correctness, and architecture design decisions are outside this audit except where they directly create implementation, reliability, security, testing, or operational risk.

## Executive Summary

The repository has a strong and improving automated test suite for rules and native-character experiments: on 2026-06-30, `npm run test` passed 239 tests across 27 files and `npm run build` completed. That said, the current technical risk posture is not release-ready for private or durable campaign data.

The most urgent issue is authentication/session enforcement: core helpers return unconditional success/default identities, and campaign functions create or use `default-user` rather than deriving identity from a validated session. This means protected server routes and sync endpoints cannot currently be trusted. The next major risk is persistence/recovery: one SQLite helper silently falls back to temp or in-memory storage, save paths perform multi-step writes without transaction safety, and no verified backup/restore strategy was found. These directly affect character, campaign, and shared session data.

## Reliability & Security Checklist Assessment

Covered Areas:
- Input validation is partially present through Zod on several server functions.
- Unit/regression testing is strong for parser, native-engine, V2/V3 character logic, and builder utilities.
- Login rate limiting scaffolding exists.
- Build and test scripts exist and currently pass.

Partially Covered Areas:
- Authentication and session infrastructure exists but is bypassed by hardcoded return values.
- Authorization checks exist in isolated campaign selection logic but do not consistently use validated identity.
- Logging exists through `console.error`/`console.warn`, but no structured monitoring or alerting was found.
- Persistence uses SQLite and Drizzle, but critical multi-step writes lack clear transaction boundaries.

Missing Areas:
- Backup strategy, backup frequency, restore procedure, recovery testing, deployment rollback, health checks, and migration rollback documentation.
- Optimistic concurrency/idempotency for production save paths.
- Campaign workflow and authz negative-path tests.

High-Risk Gaps:
- AUTH-001 through AUTHZ-004 contributed to COD-001.
- DATA-003, REL-004, PERS-001 contributed to COD-003.
- BACKUP-001 through REC-004 contributed to COD-004.
- DEPLOY-002 and PERS-001 contributed to COD-002 and COD-005.

## Reliability Score

**Reliability Score: 4/10.** Tests are improving, but production save paths, fallback persistence, concurrency, and recovery behavior create significant reliability concerns.

## Security Score

**Security Score: 2/10.** Auth/session helpers currently bypass validation and default to an admin-like user path. This is a high-risk security posture until fixed.

## Performance Score

**Performance Score: 6/10.** Current small-party usage is likely acceptable. Build warns about large chunks and server DB modules appearing in client assets, which should be addressed before broader growth.

## Maintainability Score

**Maintainability Score: 5/10.** The test suite and modular experiments are strengths; large coordination modules, duplicated state models, and server/client boundary leakage increase maintenance risk.

## Operational Readiness Score

**Operational Readiness Score: 3/10.** Backup, restore, health checks, rollback, migration safety, and monitoring are not sufficiently documented or implemented for durable production data.

## Security Assessment

Authentication posture is unsafe because `isAuthenticated`, `verifyPasscode`, `getSessionIdFromHeaders`, `getUserIdFromSession`, and `isSessionValid` return hardcoded successful/default values. `checkAuthFn` also returns authenticated default admin data on database error. Campaign functions call a local `getCurrentUser` that creates or returns `default-user`, bypassing session identity entirely.

Input validation is partially present through Zod, but authz decisions cannot be trusted until identity is real. Secrets handling was not fully audited; old audit docs mention local `.env` risk, but no new official secret-exposure finding was created without re-reading local untracked secret values.

## Reliability Assessment

Several critical writes are multi-step and not visibly atomic. `saveNativeCharacter` writes the main character row, then deletes and reinserts projections; on database error it logs and still returns the character ID. `updateCampaignCharactersFn` detaches current campaign characters before fetching/inserting replacements and catches per-character fetch errors while returning success.

The sync API is generic key/value storage with no revision checks. This overlaps with Campaign's collaboration finding; the implementation concern is that failed or out-of-order sync writes are not recoverable or conflict-aware.

## Performance Assessment

Build completed, but the client build produced browser-externalization warnings for `src/lib/drizzle.server.ts`, `fs`, `path`, and `better-sqlite3`, and emitted a `drizzle.server` client asset. The largest client chunk is over 500 kB after minification. These are not current runtime failures, but they indicate boundary and bundle hygiene risks.

## Maintainability Assessment

Maintainability risk is concentrated in large cross-cutting modules and unclear environment boundaries. `native-engine.ts` remains a central calculation/API/persistence module, and `db.server.ts` maintains an independent SQLite/mock path beside Drizzle's `sqlite.db` path. These increase the chance of future fixes landing in only one path.

## Testing Assessment

Positive signal: the current `npm run test` passed 239 tests across 27 files. Rules regression and V2/V3 migration tests are especially strong.

Gaps:
- Existing auth tests encode the bypassed behavior rather than rejecting it.
- Campaign server functions lack negative-path tests using non-member/non-owner identities.
- Production persistence failure paths and partial-save rollback behavior are not covered.
- Backup/restore and migration rollback tests were not found.
- Native spell eligibility lacks a rejection regression for DND-003.
- Active-campaign lookup and party mutation lack cookie/session authorization regressions for CMP-005.

## Missing Critical Tests

- Auth helpers reject missing/expired/invalid session cookies.
- `verifyPasscode` rejects wrong passcodes and requires `PARTY_PASSCODE`.
- Campaign mutation functions use the session user, not `default-user`.
- Active-campaign reads and party mutations reject non-member/non-DM sessions even when the cookie names a real campaign.
- `saveNativeCharacter` rolls back or fails loudly if child-table projection writes fail.
- `updateCampaignCharactersFn` does not detach existing campaign characters when importing replacement IDs fails.
- Native spell compilation rejects class-, subclass-, and level-ineligible spell selections.
- SQLite backup can be restored into a clean environment and preserve users, campaigns, characters, and KV state.

## Suggested Regression Tests

Workflow: Unauthenticated `/api/sync` GET/POST  
Expected Behavior: Returns 401 and does not read/write KV.  
Failure Prevented: Private campaign state exposure and unauthorized mutation.

Workflow: Expired session cookie on campaign mutation  
Expected Behavior: Mutation fails; no campaign or character rows are changed.  
Failure Prevented: Stale access and ownership corruption.

Workflow: Native character save with injected child-table failure  
Expected Behavior: Entire save fails or rolls back; caller does not receive success ID.  
Failure Prevented: Partial character persistence.

Workflow: D&D Beyond import failure during party update  
Expected Behavior: Existing campaign assignment remains unchanged or transaction rolls back.  
Failure Prevented: Accidental campaign party loss.

Workflow: Restore from SQLite backup  
Expected Behavior: Users, sessions, campaigns, characters, and KV shared state reload successfully.  
Failure Prevented: False backup confidence.

## Operational Readiness Assessment

Operational readiness is weak. There is no discovered health check, structured incident logging, backup schedule, restore validation, migration rollback, or documented deployment/rollback process. `drizzle-kit push` is used in the `seed` script, which is convenient locally but is not a documented migration strategy for production data.

## Backup Assessment

No current backup strategy, frequency, coverage statement, or restore validation was found. SQLite contains critical data, and the project context explicitly requires durable persistence and recovery, so this is an official finding.

## Recovery Assessment

Recovery procedures were not found. The in-memory/temp fallback path in `db.server.ts` makes recovery posture worse because data may be written somewhere operators do not expect.

## Deployment Risks

- Authentication bypass can ship because tests currently pass with bypass behavior.
- SQLite native dependency tracing warns that production OS/architecture must match the builder OS/architecture.
- Server DB modules appear in client-build output warnings.
- No documented rollback or migration rollback process was found.
- Config validation is partial: `getPasscode` requires `PARTY_PASSCODE`, but auth bypasses it today.

## Findings Summary

```text
Critical: 3
High: 1
Medium: 1
Low: 0
Info: 0
```

## Top Risks

1. COD-001 - Authentication and session validation are hardcoded to succeed.
2. COD-002 - Persistence can silently fall back to temp or in-memory storage.
3. COD-004 - No verified backup or restore path for production SQLite data.
4. COD-003 - Character and campaign writes can partially complete without safe rollback.
5. COD-005 - Server database modules are leaking into client build boundaries.

## Detailed Findings

### COD-001

```yaml
id: COD-001
title: Authentication and session validation are hardcoded to succeed
severity: Critical
confidence: High
owner: Code Quality & Reliability Agent
status: Open
lifecycle: Existing
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Security
  - Authentication
  - Authorization
location:
  file: src/lib/auth.server.ts
  line: 34
description: >
  Core auth helpers return default-session, true authentication, true passcode validation, default-user, and true session validity. checkAuthFn also returns authenticated admin-like fallback data after database errors, and campaign functions create/use default-user rather than a validated session identity.
impact: >
  Protected server routes and shared sync data can be accessed or modified without a valid session. Campaign and character mutations cannot enforce ownership because identity is hardcoded. This is an authentication/authorization bypass affecting private campaign and character data.
recommendation: >
  Restore real cookie parsing, session lookup, expiry checks, and passcode comparison. Remove default-user creation from request identity paths. Make server functions fail closed when identity cannot be validated, and update tests so bypass behavior fails.
notes: "Registry checked: existing COD-001 reused. CMP-001 and CMP-005 remain campaign-owned workflow findings; this finding covers the implementation-level authentication and session bypass."
evidence:
  files:
    - src/lib/auth.server.ts
    - src/lib/db.server.ts
    - src/lib/auth-fns.ts
    - src/lib/campaign-fns.ts
    - src/routes/api/sync.ts
  symbols:
    - getSessionIdFromHeaders
    - isAuthenticated
    - verifyPasscode
    - getUserIdFromSession
    - isSessionValid
    - getCurrentUser
    - checkAuthFn
  lines:
    - "src/lib/auth.server.ts:34-43"
    - "src/lib/db.server.ts:285-292"
    - "src/lib/auth-fns.ts:5-43"
    - "src/lib/campaign-fns.ts:4-27"
    - "src/routes/api/sync.ts:8-16"
  observed_behavior: >
    Authentication helpers return success/default identity regardless of request headers, session table state, passcode, or expiry.
  expected_behavior: >
    Server identity must be derived from a valid, unexpired session cookie; passcodes must compare against configured secrets; unauthenticated requests must fail closed.
  rationale: >
    The reliability/security checklist treats auth bypass as a Critical risk, and project context requires server-side identity and ownership enforcement.
  reproduction:
    - Call isAuthenticated with empty headers and observe true.
    - Call verifyPasscode with an incorrect value and observe true.
    - Trace /api/sync auth guard, which accepts the true result.
```

### COD-002

```yaml
id: COD-002
title: Persistence can silently fall back to temp or in-memory storage
severity: Critical
confidence: High
owner: Code Quality & Reliability Agent
status: Open
lifecycle: Existing
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Persistence
  - Reliability
  - Data Integrity
  - Operational Readiness
location:
  file: src/lib/db.server.ts
  line: 115
description: >
  The KV/session database helper attempts node:sqlite, then a default data/party-stats.db path, then a temp database path, and finally an in-memory MockDatabase. These fallbacks log warnings but continue serving requests.
impact: >
  Shared campaign notes, HP/resource overrides, conditions, party IDs, and sessions can be written to temporary or in-memory storage without operators realizing durable persistence has failed. A restart or temp cleanup can lose critical campaign/session state.
recommendation: >
  Fail startup or health checks when durable persistence is unavailable in production. Remove in-memory fallback for production, make the database path explicit, and expose a health endpoint that verifies reads/writes against the intended durable database.
notes: "Project context explicitly says production data must not silently fall back to ephemeral storage."
evidence:
  files:
    - src/lib/db.server.ts
    - src/routes/api/sync.ts
  symbols:
    - initDb
    - MockDatabase
    - getAllKv
    - setKv
  lines:
    - "src/lib/db.server.ts:1-111"
    - "src/lib/db.server.ts:115-213"
    - "src/routes/api/sync.ts:14-20"
    - "src/routes/api/sync.ts:55-59"
  observed_behavior: >
    Database initialization falls back to temp or MockDatabase and request handlers continue using it.
  expected_behavior: >
    Production should use the configured durable store or fail closed with visible operational errors.
  rationale: >
    Silent ephemeral fallback creates direct data-loss risk for shared campaign state and sessions.
  reproduction:
    - Run in an environment where node:sqlite is unavailable or default DB path is not writable.
    - Observe warning logs and continued operation with temp/in-memory persistence.
```

### COD-003

```yaml
id: COD-003
title: Character and campaign writes can partially complete without safe rollback
severity: High
confidence: High
owner: Code Quality & Reliability Agent
status: Open
lifecycle: Existing
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Reliability
  - Persistence
  - Data Integrity
  - Concurrency
location:
  file: src/lib/native-engine.ts
  line: 1674
description: >
  saveNativeCharacter performs a main character upsert, then deletes and reinserts related child-table projections. It catches database errors and still returns the character ID. updateCampaignCharactersFn first detaches omitted campaign characters and then fetches/inserts or reassigns requested characters, catching per-character import failures while still returning success.
impact: >
  A database error, fetch failure, duplicate request, or stale party update can leave character projections incomplete or campaign assignments partially applied while callers receive success. This threatens character and campaign data integrity.
recommendation: >
  Wrap related writes in transactions and return failure when any required write fails. Add expected revision/idempotency keys for character and campaign mutations. For DDB import, fetch and validate all replacements before detaching existing campaign characters.
notes: "Architecture ARC-001/ARC-002 cover ownership. This finding covers implementation-level transaction and failure behavior."
evidence:
  files:
    - src/lib/native-engine.ts
    - src/lib/campaign-fns.ts
  symbols:
    - saveNativeCharacter
    - updateCampaignCharactersFn
  lines:
    - "src/lib/native-engine.ts:1674-1885"
    - "src/lib/native-engine.ts:1769-1784"
    - "src/lib/native-engine.ts:1881-1885"
    - "src/lib/campaign-fns.ts:238-314"
  observed_behavior: >
    Multi-table/multi-step writes are executed sequentially; errors are logged or swallowed and success can still be returned.
  expected_behavior: >
    Critical persistence workflows should be atomic, fail loudly, and avoid modifying existing state until replacement state is known-good.
  rationale: >
    The checklist identifies save safety, transactional updates, retry safety, and concurrent update safety as high-risk areas for character/campaign data.
  reproduction:
    - Cause a child-table delete/insert failure during saveNativeCharacter and observe the catch path returning character.id.
    - Cause one DDB import to fail in updateCampaignCharactersFn after existing campaign characters have been detached.
```

### COD-004

```yaml
id: COD-004
title: No verified backup or restore path for production SQLite data
severity: Critical
confidence: High
owner: Code Quality & Reliability Agent
status: Open
lifecycle: Existing
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Backups
  - Recovery
  - Operations
  - Data Integrity
location:
  file: package.json
  line: 6
description: >
  The repository contains SQLite-backed users, sessions, campaigns, characters, compendium data, and KV shared state, but no current backup schedule, restore procedure, restore validation, or migration rollback process was found. package scripts include local seed/build/test commands but no backup or recovery workflow.
impact: >
  A disk failure, bad migration, accidental delete, or corrupted SQLite file can permanently lose character, campaign, session-note, and user data. Operators may believe the system is durable without having a tested recovery path.
recommendation: >
  Document and automate SQLite backups, define backup frequency and retention, include every critical database file, and add a restore drill/test. Record migration rollback guidance and verify restored data with integrity checks.
notes: "No local secret values were inspected. This finding is based on missing recovery process for critical persisted data."
evidence:
  files:
    - package.json
    - src/lib/drizzle.server.ts
    - src/lib/db.server.ts
    - docs/audit/PROJECT_CONTEXT.md
  symbols:
    - scripts
    - dbPath
    - initDb
  lines:
    - "package.json:6-15"
    - "src/lib/drizzle.server.ts:7-14"
    - "src/lib/db.server.ts:138-176"
    - "docs/audit/PROJECT_CONTEXT.md:41-44"
  observed_behavior: >
    SQLite files are used for critical data; scripts do not define backup/restore; reviewed docs state recovery is required but do not provide an implemented restore workflow.
  expected_behavior: >
    Production data should have documented, automated, and tested backup and restore procedures.
  rationale: >
    The severity matrix treats unrecoverable production data as Critical.
  reproduction:
    - Review package scripts and repository docs for backup/restore commands.
    - No executable backup/restore workflow is present.
```

### COD-005

```yaml
id: COD-005
title: Server database modules are crossing into client build output
severity: Medium
confidence: High
owner: Code Quality & Reliability Agent
status: Open
lifecycle: Existing
first_detected: 2026-06-29
last_reviewed: 2026-06-30
category:
  - Deployment
  - Maintainability
  - Performance
location:
  file: src/lib/drizzle.server.ts
  line: 1
description: >
  The production build completes but warns that Node modules such as fs and path are externalized for browser compatibility because drizzle.server.ts and better-sqlite3 are imported into the client build graph. The client assets include a drizzle.server bundle.
impact: >
  Server/client boundary drift can create fragile deployments, larger client bundles, and accidental exposure of server implementation details. Future imports may turn these warnings into runtime failures.
recommendation: >
  Ensure server-only database modules are imported only from server functions/loaders and cannot enter client bundles. Add lint/build checks for `.server` module boundaries and split shared types from server implementations.
notes: "Build succeeded; severity is Medium because this is currently a warning/boundary risk, not a demonstrated outage."
evidence:
  files:
    - src/lib/drizzle.server.ts
    - package.json
  symbols:
    - db
    - npm run build
  lines:
    - "src/lib/drizzle.server.ts:1-14"
    - "package.json:10"
  observed_behavior: >
    npm run build emits browser-externalization warnings for drizzle.server.ts, fs, path, and better-sqlite3, and emits an .output/public drizzle.server asset.
  expected_behavior: >
    Server-only database adapters should be excluded from client build graphs.
  rationale: >
    Boundary leakage is an operational and maintainability risk even when the current build completes.
  reproduction:
    - Run npm run build.
    - Observe Vite warnings for drizzle.server.ts and Node database dependencies in the client build.
```

## Quick Wins

- Replace auth hardcoded returns and update tests to assert denial paths.
- Make `db.server.ts` fail closed in production when durable SQLite is unavailable.
- Add transaction wrappers around `saveNativeCharacter` and campaign party updates.
- Add a `backup` and `restore:verify` script for SQLite.
- Add a server-only import boundary check for `.server` modules.

## Recommended Refactors

- Centralize identity/session resolution in one request-scoped helper.
- Split durable KV/session persistence from mock/test persistence.
- Move character save projection writes into a repository with atomic transactions.
- Introduce mutation revision/idempotency keys for shared state and character/campaign writes.
- Separate shared schema/types from server-only Drizzle adapters.

## Observations For Other Agents

Observation:
Production character persistence has multiple representations and live-state ownership ambiguity.

Refer To:
Architecture & Data Model Agent

Reason:
The architectural source-of-truth issue is already represented by ARC-001 and ARC-004. No duplicate finding created.

Observation:
Raw campaign-ID joining creates product-level governance concerns.

Refer To:
Campaign & Collaboration Agent

Reason:
Campaign workflow ownership is represented by CMP-001; this report focuses on auth implementation. No duplicate finding created.

Observation:
Condition and class-specific rule validation gaps affect character correctness.

Refer To:
D&D Domain Agent

Reason:
Rules correctness is covered by DND-001, DND-002, and DND-003. No duplicate finding created.

Observation:
Active campaign reads and party mutation trust the active campaign cookie without revalidating campaign access.

Refer To:
Campaign & Collaboration Agent

Reason:
Campaign permission workflow correctness is represented by CMP-005. COD-001 already covers the underlying implementation-level authentication/session bypass, so no duplicate COD finding was created.

## Confidence Assessment

**High.** Reviewed core auth/session code, campaign mutation code, sync API, SQLite adapters, package scripts, the current registry, prior and newly updated reports, and checklist guidance. On 2026-06-30, `npm run test` passed 239 tests across 27 files and `npm run build` succeeded while reproducing the public `drizzle.server` asset and browser-externalization warnings. Confidence would improve with live deployment configuration, production data layout, fault-injection tests, and any off-repo backup/hosting runbooks.

## Release Impact

**Release Blocking** for any release that claims private data protection, multi-user authorization, or durable production persistence. The app may still be usable for a trusted local demo, but the current auth and recovery posture is not acceptable for real private campaign data.

## Final Recommendation

**High Risk.** The test suite is a real strength, but authentication bypass, unsafe persistence fallback, partial-write risk, and missing recovery procedures require remediation before production use.

# Overall Assessment

Technical implementation risk is high. The repository can build and its tests pass, but critical auth and persistence/recovery safeguards are currently missing or bypassed.

# Top Risks

1. Auth/session checks allow default authenticated access.
2. Persistence can silently become temp or in-memory.
3. Production data has no verified backup/restore path.
4. Critical writes can partially complete.
5. Server database code is leaking into client build boundaries.

# Recommended Next Actions

Fix auth/session enforcement first, then remove production ephemeral persistence fallback, add transactions to critical writes, and implement backup/restore verification.

# Confidence

High, with uncertainty around external deployment and backup procedures not present in the repository.

# Release Impact

Release Blocking for production/private-data use.
