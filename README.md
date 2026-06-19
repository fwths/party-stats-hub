# ⚔️ D&D Campaign Hub

A full-featured D&D 5e (2024) campaign platform that pulls live character data from **D&D Beyond**, serves a comprehensive rules compendium from a local **SQLite** database, and provides DM and player tools — all in one self-hosted web app.

## ✨ Features

### Party Dashboard

| Feature | Description |
| --- | --- |
| **Party Cards** | At-a-glance overview of every party member — HP, AC, level, class, ability scores, conditions, and more |
| **Character Detail** | Deep-dive into a single character: full ability scores, skills, saves, spells, inventory, actions, and features |
| **Party Highlights** | Comparative stats, highest modifiers, and group-wide ability checks at a glance |
| **Manage Party** | Add or remove characters at runtime via a dialog — changes persist across sessions via SQLite sync |

### Combat & DM Tools

| Feature | Description |
| --- | --- |
| **Combat Dashboard** | Consolidated hit-point tracker for the whole party during encounters |
| **Combat Tracker** | Full initiative tracker with turn order, conditions, and round management |
| **Encounter Builder** | Build encounters with CR-based difficulty budgets, pulling monsters from the compendium |
| **Monster Manual** | Search and browse the full bestiary with detailed stat blocks |
| **Monster Stat Block** | Rich, formatted stat blocks with actions, legendary actions, lair actions, and more |
| **Group Dice Roller** | Roll dice for any party member with full modifier support |
| **DM Tools** | Miscellaneous utilities for running sessions |

### Compendium & Character Builder

| Feature | Description |
| --- | --- |
| **Rules Compendium** | Searchable database of spells, classes, subclasses, species, backgrounds, feats, weapons, armor, and magic items — all sourced from the local SQLite database |
| **Character Builder** | Guided wizard to create characters step-by-step: species, class, subclass, background, ability scores, spells, and feats |

### Campaign & Session Tools

| Feature | Description |
| --- | --- |
| **Session Notes / Journal** | Rich session notes & campaign log with Notion integration for cloud backup |
| **Rules Reference** | Quick-access reference for common D&D 5e rules |
| **Shared Inventory** | Browse and search items across all party members' bags |

### Platform Features

| Feature | Description |
| --- | --- |
| **Ambient Audio** | Background soundscapes to set the mood during sessions |
| **Theme Selector** | Multiple visual themes with dark-mode-first design |
| **PWA / Installable** | Service worker & web manifest — install it as a native-feeling app on any device |
| **Auto-Refresh** | Data re-fetches every 30 seconds and on window focus so stats stay live |
| **SQLite Sync Engine** | Client ↔ server bidirectional sync for session notes, conditions, and party config — localStorage acts as cache, SQLite is the source of truth |
| **Passcode Auth** | Optional passcode-based authentication with rate-limiting to protect the dashboard |
| **Notion Integration** | Sync session journal entries to a Notion database for cloud backup |

## 🛠 Tech Stack

| Layer | Technology |
| --- | --- |
| **Framework** | [TanStack Start](https://tanstack.com/start) (SSR + file-based routing) |
| **UI** | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| **Routing** | [TanStack Router](https://tanstack.com/router) (type-safe, file-based) |
| **Data Fetching** | [TanStack Query](https://tanstack.com/query) (server functions + client cache) |
| **Database** | SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) (schema & migrations) |
| **Validation** | [Zod](https://zod.dev/) |
| **Icons** | [Lucide React](https://lucide.dev/) |
| **Build** | [Vite 7](https://vite.dev/) + [Nitro](https://nitro.build/) server |
| **Linting / Formatting** | ESLint + Prettier |
| **Testing** | [Vitest](https://vitest.dev/) + Testing Library |

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (or [Bun](https://bun.sh/))
- A D&D Beyond account with **public** characters (for live party data)

### Install

```bash
# Clone the repo
git clone https://github.com/fwths/party-stats-hub.git
cd party-stats-hub

# Install dependencies
npm install
# or
bun install
```

### Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `PARTY_PASSCODE` | No | Passcode for the login gate (disabled by default) |
| `NOTION_TOKEN` | No | Notion integration token for session journal sync |
| `NOTION_API_KEY` | No | Notion API key for database operations |

### Seed the Database

Populate the SQLite compendium with D&D 5e game data:

```bash
npm run seed
```

This pushes the Drizzle schema to `sqlite.db` and runs the seed pipeline.

### Run (development)

```bash
npm run dev
```

The app starts at **http://localhost:3000** (or the port shown in your terminal).

### Build (production)

```bash
npm run build
npm run preview   # serve the production build locally
```

## ⚙️ Configuration

### Setting Your Party

Edit [`src/lib/party-config.ts`](src/lib/party-config.ts) to swap in your own character IDs:

```ts
// Each ID is the number at the end of a D&D Beyond character URL,
// e.g. https://www.dndbeyond.com/characters/12345678 → 12345678
// The character must have privacy set to "Public" on D&D Beyond.
export const PARTY_CHARACTER_IDS: number[] = [
  12345678, 23456789, 34567890,
  // ... add as many as you need
];
```

Users can also add/remove characters at runtime via the **⚙ Manage** dialog — changes are persisted to the server database via the sync engine.

## 📁 Project Structure

```
party-stats-hub/
├── public/                       # Static assets & PWA icons
│   ├── manifest.webmanifest      # PWA manifest
│   ├── sw.js                     # Service worker
│   └── favicon.png
├── scripts/
│   ├── fetch-ddb.cjs             # Utility to cache D&D Beyond JSON locally
│   ├── download-srd.ts           # Download SRD reference data
│   └── verify-native-builder.ts  # Verify character builder engine
├── src/
│   ├── components/
│   │   ├── party/                # Feature components (cards, combat, dice, etc.)
│   │   ├── builder/              # Character builder wizard steps & utilities
│   │   └── ui/                   # Reusable UI primitives (button, card, tooltip, etc.)
│   ├── db/
│   │   ├── schema.ts             # Drizzle ORM schema (all game data tables)
│   │   ├── validate-all-data.ts  # Data integrity validation
│   │   └── verify-monsters.ts    # Monster data verification
│   ├── hooks/                    # Custom React hooks (mobile, theme, modal sync)
│   ├── lib/
│   │   ├── api/                  # API route handlers
│   │   ├── modifiers/            # Modifier calculation logic
│   │   ├── notion/               # Notion integration utilities
│   │   ├── parser/               # Data parsing utilities
│   │   ├── auth.server.ts        # Server-only authentication (passcode, sessions)
│   │   ├── auth-fns.ts           # Auth server functions (login, check, logout)
│   │   ├── config.server.ts      # Server-only env config
│   │   ├── db.server.ts          # SQLite database operations (sync, sessions)
│   │   ├── db-functions.ts       # Compendium data queries (classes, spells, etc.)
│   │   ├── drizzle.server.ts     # Drizzle client initialization
│   │   ├── dndbeyond.functions.ts # Server functions — fetch & parse DDB data
│   │   ├── dndbeyond.parser.ts   # D&D Beyond API response parser
│   │   ├── dndbeyond.types.ts    # PartyMember type definitions
│   │   ├── native-engine.ts      # Character computation engine (scores, AC, spells)
│   │   ├── sync-engine.ts        # Client ↔ server bidirectional sync engine
│   │   ├── synced-storage.ts     # Sync-aware localStorage wrapper
│   │   ├── party-config.ts       # Default party character IDs
│   │   ├── party.ts              # TanStack Query options & helpers
│   │   ├── constants.ts          # D&D conditions, skill-ability mapping
│   │   └── utils.ts              # General utilities
│   ├── pipeline/                 # Data extraction & seeding pipeline
│   │   ├── seed.ts               # Main seed script
│   │   ├── seeders/              # Per-table seeder modules
│   │   ├── scrape-species.ts     # Species data scraper
│   │   ├── enrich-species.ts     # Species data enrichment
│   │   ├── enrich-2024-core.ts   # 2024 core rules enrichment
│   │   ├── source-config.ts      # Data source configuration
│   │   └── zodSchemas.ts         # Zod schemas for pipeline validation
│   ├── routes/
│   │   ├── __root.tsx            # Root layout (head, fonts, global styles)
│   │   ├── index.tsx             # Home — party dashboard
│   │   ├── character.$id.tsx     # Character detail page
│   │   ├── builder.tsx           # Character builder page
│   │   ├── compendium.tsx        # Rules compendium page
│   │   ├── login.tsx             # Passcode authentication page
│   │   └── api/                  # API endpoints (party, Notion, sync)
│   ├── test/                     # Test setup
│   ├── server.ts                 # Custom server entry (SSR error handling)
│   ├── router.tsx                # Router setup
│   └── styles.css                # Global styles & theme tokens
├── drizzle.config.ts             # Drizzle Kit configuration
├── vite.config.ts                # Vite + TanStack Start config
├── vitest.config.ts              # Vitest test configuration
├── tsconfig.json
├── package.json
└── .gitignore
```

## 📜 Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with HMR |
| `npm run build` | Create a production build |
| `npm run build:dev` | Build in development mode (unminified, sourcemaps) |
| `npm run preview` | Preview the production build locally |
| `npm run seed` | Push schema to SQLite and seed game data |
| `npm run scrape:species` | Scrape species data from external sources |
| `npm run enrich:species` | Enrich species data with additional details |
| `npm run enrich:2024` | Enrich with 2024 core rules data |
| `npm run lint` | Run ESLint |
| `npm run format` | Format all files with Prettier |
| `npm run test` | Run tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |

## 🗄️ Database Schema

The SQLite database (`sqlite.db`) stores the full D&D 5e (2024) compendium via Drizzle ORM. Key tables:

| Table | Contents |
| --- | --- |
| `spells` | All spells with level, school, components, damage, and more |
| `classes` | Base classes with hit dice, proficiencies, and spellcasting info |
| `subclasses` | Subclass options linked to parent classes |
| `class_features` | Class and subclass features by level |
| `species` | Playable species with traits, speeds, and senses |
| `backgrounds` | Backgrounds with proficiencies, equipment, and origin feats |
| `feats` | Feats categorized as Origin, General, Fighting Style, or Epic Boon |
| `weapons` | Weapons with damage, properties, and mastery options |
| `armor` | Armor with AC calculation, weight, and stealth penalties |
| `magic_items` | Magic items with rarity, attunement, and charges |
| `monsters` | Full bestiary with stats, actions, and legendary abilities |
| `vehicles` | Vehicles with speed, capacity, and weapons |
| `bastions` | Bastion facilities with build costs and orders |
| `hazards` | Environmental hazards with DCs and damage |
| `characters` | Player characters aggregating all other entities |
| `active_effects` | Buffs, debuffs, and auras with duration and modifiers |
| `compendium_entries` | Generic compendium entries from 5etools data |
| `content_sources` | Source book metadata |

## 🔌 How It Works

1. **Live Party Data** — Server functions (`createServerFn` from TanStack Start) fetch character data from the [D&D Beyond Character API](https://character-service.dndbeyond.com/character/v5/character/:id) at request time. A native computation engine normalizes raw API data into typed `PartyMember` objects — computing ability scores, AC, spell slots, attacks, and more.
2. **Compendium** — Game data is extracted from rulebook sources via a multi-stage pipeline (`src/pipeline/`), validated with Zod schemas, and seeded into SQLite through Drizzle ORM. The compendium and character builder query this database at request time via server functions.
3. **Client Caching** — TanStack Query caches results on the client with a 15-second stale time and 30-second refetch interval, keeping the dashboard live without hammering the API.
4. **Sync Engine** — A bidirectional sync engine keeps client `localStorage` and the server SQLite database in sync. Session notes, conditions, and party config are debounce-synced to the server, with the server acting as the source of truth on page load.
5. **SSR & Error Handling** — The custom server entry ([`src/server.ts`](src/server.ts)) wraps the default handler with an error boundary that catches catastrophic h3/Nitro errors and renders a friendly error page instead of a raw JSON 500.

## 📄 License

This project is for personal/campaign use. Feel free to fork and adapt it for your own party!
