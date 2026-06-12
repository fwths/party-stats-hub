# ⚔️ D&D Campaign Hub

A live D&D party dashboard that pulls character data from **D&D Beyond** and presents it in a rich, interactive web app. Easily configurable for any party.

## ✨ Features

| Feature               | Description                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Party Cards**       | At-a-glance overview of every party member — HP, AC, level, class, ability scores, conditions, and more         |
| **Character Detail**  | Deep-dive into a single character: full ability scores, skills, saves, spells, inventory, actions, and features |
| **Combat Health**     | Consolidated hit-point tracker for the whole party during encounters                                            |
| **Shared Inventory**  | Browse and search items across all party members' bags                                                          |
| **Group Dice Roller** | Roll dice for any party member with full modifier support                                                       |
| **Campaign Journal**  | Session notes & campaign log stored in the browser                                                              |
| **Rules Reference**   | Quick-access reference for common D&D 5e rules                                                                  |
| **Ambient Audio**     | Background soundscapes to set the mood during sessions                                                          |
| **Theme Selector**    | Multiple visual themes with dark-mode-first design                                                              |
| **PWA / Installable** | Service worker & web manifest — install it as a native-feeling app on any device                                |
| **Auto-Refresh**      | Data re-fetches every 30 seconds and on window focus so stats stay live                                         |

## 🛠 Tech Stack

- **Framework** — [TanStack Start](https://tanstack.com/start) (SSR + file-based routing)
- **UI** — [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/)
- **Routing** — [TanStack Router](https://tanstack.com/router) (type-safe, file-based)
- **Data Fetching** — [TanStack Query](https://tanstack.com/query) (server functions + client cache)
- **Icons** — [Lucide React](https://lucide.dev/)
- **Build** — [Vite 7](https://vite.dev/) + [Nitro](https://nitro.build/) server
- **Validation** — [Zod](https://zod.dev/)
- **Linting / Formatting** — ESLint + Prettier

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18 (or [Bun](https://bun.sh/))
- A D&D Beyond account with **public** characters

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

Users can also add/remove characters at runtime via the **⚙ Manage** dialog — changes are persisted to `localStorage`.

### Environment Variables

| Variable   | Where           | Purpose                                                         |
| ---------- | --------------- | --------------------------------------------------------------- |
| `NODE_ENV` | Server only     | Standard Node environment flag                                  |
| `VITE_*`   | Client + Server | Public config (analytics, public URLs). Never put secrets here. |

Server-only env is read in [`src/lib/config.server.ts`](src/lib/config.server.ts). The `.server.ts` suffix prevents Vite from bundling it into the client.

## 📁 Project Structure

```
party-stats-hub/
├── public/                  # Static assets & PWA icons
│   ├── manifest.webmanifest # PWA manifest
│   ├── sw.js                # Service worker
│   └── favicon.png
├── scripts/
│   └── fetch-ddb.cjs        # Utility to cache D&D Beyond JSON locally
├── src/
│   ├── components/
│   │   ├── party/            # Feature components (cards, combat, dice, etc.)
│   │   └── ui/               # Reusable UI primitives (tooltip, etc.)
│   ├── hooks/                # Custom React hooks
│   ├── lib/
│   │   ├── api/              # API route handlers
│   │   ├── dndbeyond.functions.ts  # Server functions — fetch & parse DDB data
│   │   ├── party-config.ts   # Default party character IDs
│   │   ├── party-modifiers.ts # Modifier calculation logic
│   │   ├── party.ts          # TanStack Query options & localStorage helpers
│   │   ├── constants.ts      # D&D conditions, skill-ability mapping
│   │   ├── config.server.ts  # Server-only env config
│   │   └── utils.ts          # General utilities
│   ├── routes/
│   │   ├── __root.tsx        # Root layout (head, fonts, global styles)
│   │   ├── index.tsx         # Home — party dashboard
│   │   ├── character.$id.tsx # Character detail page
│   │   └── api/              # API endpoints (party JSON, Notion sync)
│   ├── server.ts             # Custom server entry (SSR error handling)
│   ├── router.tsx            # Router setup
│   └── styles.css            # Global styles & theme tokens
├── vite.config.ts            # Vite + TanStack Start config
├── tsconfig.json
├── package.json
└── .gitignore
```

## 📜 Available Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the dev server with HMR                      |
| `npm run build`     | Create a production build                          |
| `npm run build:dev` | Build in development mode (unminified, sourcemaps) |
| `npm run preview`   | Preview the production build locally               |
| `npm run lint`      | Run ESLint                                         |
| `npm run format`    | Format all files with Prettier                     |

## 🔌 How It Works

1. **Server functions** (`createServerFn` from TanStack Start) fetch character data from the [D&D Beyond Character API](https://character-service.dndbeyond.com/character/v5/character/:id) at request time.
2. Data is **parsed and normalized** into a typed `PartyMember` shape — ability scores, skills, spells, inventory, defenses, etc.
3. **TanStack Query** caches the result on the client with a 15-second stale time and 30-second refetch interval, keeping the dashboard live without hammering the API.
4. The **SSR entry** ([`src/server.ts`](src/server.ts)) wraps the default handler with a custom error boundary that catches catastrophic h3/Nitro errors and renders a friendly error page instead of a raw JSON 500.

## 📄 License

This project is for personal/campaign use. Feel free to fork and adapt it for your own party!
