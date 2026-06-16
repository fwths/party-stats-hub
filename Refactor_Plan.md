# Step-by-Step Refactor Plan

Here’s a clean, execution-ready refactor plan based on all three reports.

---

# 🧭 Phase 0 — Safety First (Same Day)

## Step 0.1 — Kill exposed secrets
- Rotate Notion token
- Remove `.env` from repo
- Add `.env` to `.gitignore`

## Step 0.2 — Fix auth immediately
In `auth.server.ts`:
- Remove:
```
const DEFAULT_PASSCODE = "criticalfail";
```
- Replace compare with:
```
crypto.timingSafeEqual(...)
```
- Remove `Math.random()` fallback entirely

## Step 0.3 — Lock down API
- In `/api/party.ts`:
```
Access-Control-Allow-Origin: "your-domain.com"
```

## Step 0.4 — Fix guaranteed crashes
- `cls` → `classData`
- `data.id` → `data.character.id`

👉 These are confirmed runtime bugs citeturn1search2

---

# 🧱 Phase 1 — Stabilize the Codebase (Day 1–2)

## Step 1.1 — Fix silent failures
Search:
```
catch {}
```

Replace with:
```
catch (e) {
  console.warn("context", e);
}
```

👉 You have multiple silent failures hiding bugs citeturn1search3

---

## Step 1.2 — Fix React correctness
- Fix missing dependencies in `compendium.tsx`
- Audit critical `useEffect` hooks

👉 Missing deps already flagged as a bug citeturn1search1

---

## Step 1.3 — Fix auth flow UX
In `__root.tsx`:
- Replace:
```
window.location.href = "/login"
```

- With router-based redirect

👉 Prevents flicker + race condition citeturn1search2

---

## Step 1.4 — Add basic rate limiting
- On login endpoint:
  - 5–10 attempts per minute per IP

👉 Currently brute-forceable citeturn1search2

---

# 🧪 Phase 2 — Add Safety Nets (Day 2–3)

## Step 2.1 — Add test foundation
Install:
- Vitest / Jest

Create:
```
/tests/parser/
/tests/modifiers/
/tests/auth/
```

---

## Step 2.2 — Test the critical logic first
Focus ONLY on:

1. `dndbeyond.parser.ts`
2. override merge logic
3. stat calculations

Example:
```
parseCharacterPayload()
computeAC()
mergeOverrides()
```

👉 These are your highest-risk areas citeturn1search3

---

## Step 2.3 — Add minimal CI check
- Run tests on commit
- Fail on error

---

# 🧠 Phase 3 — Break the Monoliths (Day 3–5)

## Step 3.1 — Split the parser (2000 lines)

Current:
```
dndbeyond.parser.ts
```

Refactor into:
```
parser/
  index.ts
  abilities.ts
  armor.ts
  spells.ts
  attacks.ts
  constants.ts
```

👉 Biggest maintainability issue citeturn1search2

---

## Step 3.2 — Refactor the “God function”

Break:
```
getFullyModifiedStats()
```

Into:
```
computeHp()
computeAc()
computeSpeed()
computeConditions()
computeResources()
```

👉 674-line function = unmaintainable citeturn1search2

---

## Step 3.3 — Remove duplication

Extract shared logic:
```
mergeOverrides()
```

Used by:
- server (KV / DB)
- client (localStorage)

👉 Same logic duplicated in 2 places citeturn1search2

---

# 🧼 Phase 4 — Type Safety & Linting (Day 5–6)

## Step 4.1 — Re-enable ESLint rules
Turn ON:
```
no-explicit-any
no-unused-vars
```

👉 Currently disabled → type safety broken citeturn1search3

---

## Step 4.2 — Remove `any` gradually
Start with:
- `sync-engine.ts`
- `error-capture.ts`
- parser outputs

👉 200+ `any` usages reported citeturn1search1

---

## Step 4.3 — Enable stricter TS config
```
"noUnusedLocals": true
"noUnusedParameters": true
```

---

# ⚡ Phase 5 — Performance & Build (Day 6–7)

## Step 5.1 — Fix bundle size
- Split heavy components:
  - `Index`
  - `CharacterDetailView`

Use:
```
const Component = lazy(() => import(...))
```

👉 Bundle >700KB flagged citeturn1search1

---

## Step 5.2 — Clean repo bloat
Add to `.gitignore`:
```
char-*.json
native-char-*.json
artificer_*.json
spells_2024.csv
```

👉 Large files slowing builds citeturn1search3

---

## Step 5.3 — Lazy-load heavy JSON
- `notion-cache-seed.json`
- large datasets

---

## Step 5.4 — Add query retry strategy
```
retry: 3
retryDelay: exponential backoff
```

👉 Missing resilience in data fetching citeturn1search3

---

# 🧩 Phase 6 — Architecture Cleanup (Optional but High Value)

## Step 6.1 — Fix server/client separation
- Move Node-only code → `.server.ts`
- Avoid Vite bundling warnings

👉 Current import pollution issue citeturn1search1

---

## Step 6.2 — Replace localStorage patching
- Remove monkey-patching
- Use wrapper service

👉 Global patching is fragile citeturn1search1

---

## Step 6.3 — Split large route
Break:
```
routes/index.tsx (250+ lines)
```

Into:
```
PartyDashboard/
  PartyTab.tsx
  CombatTab.tsx
  InventoryTab.tsx
  DiceTab.tsx
```

---

# ✅ Final State (What “Done” Looks Like)

After this refactor:

- ✅ No security vulnerabilities
- ✅ No runtime crashes
- ✅ Tests cover core logic
- ✅ Parser is modular
- ✅ No duplicated logic
- ✅ Smaller bundle size
- ✅ Clean TypeScript (minimal `any`)
- ✅ Production-ready

---

# ⏱️ Realistic Timeline

- **Day 1–2:** Security + bugs  
- **Day 3–4:** Tests + logging  
- **Day 5–6:** Refactor core files  
- **Day 7:** Performance + polish  

👉 ~1 week total (matches report estimate) citeturn1search3
---

