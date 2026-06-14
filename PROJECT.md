# Project: D&D Base Game Data Extraction and SQLite Injection

## Architecture

- **Raw Sources**: Markdown and text rulebooks located in `raw_books/`:
  - `Dungeons and Dragons Player's handbook (2024).md`
  - `Monster Manual 5e 2024.md`
  - `dmg_2024.md`
  - `phb_2024.txt`
  - `monster_manual.txt`
- **Target Database**: `sqlite.db` (SQLite 3 database).
- **Target Schema**: Defined in `src/db/schema.ts` using Drizzle ORM.
- **ORM / Insertion Client**: TypeScript scripts executed via Bun using `better-sqlite3` and `drizzle-orm`.

## Code Layout

- `src/db/schema.ts` - Database table schemas.
- `raw_books/` - Rulebook source files.
- `sqlite.db` - SQLite database.

## Milestones

| #   | Name                           | Scope                                                                                                                       | Dependencies | Status      |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| 1   | Exploration & Database Setup   | Explore raw books, determine schema fields, identify exact source text sections, verify `sqlite.db` structure.              | None         | DONE        |
| 2   | Backgrounds & Base Equipment   | Extract and inject all backgrounds, weapons, and armor. (Conv: fa6094cf-d17a-4f6e-bf85-6b74ce5bc727)                        | M1           | DONE        |
| 3   | Magic Items Extraction         | Extract and inject > 100 magic items. (Conv: a3e0bcfd-83bb-4d3b-928c-9ad34f10b35a)                                          | M2           | DONE        |
| 4   | Monsters Bestiary Extraction   | Extract and inject > 100 monsters. (Conv: 26e0fa16-d85d-40df-af7a-c77e86296123, Exec: 479805b2-3cd9-45bf-916c-cbcc15ae5cd5) | M3           | DONE        |
| 5   | Validation & Integrity Testing | Run verification script to assert row counts and schema correctness. (Conv: 16af29d4-1d15-458d-bd9d-2261b2167fa8, Remediation: 87bdbdd2-a6e6-4cb8-83a3-c04b7c17b436) | M4           | DONE        |

## Interface Contracts

- Data objects must map perfectly to fields in `src/db/schema.ts`.
- JSON-encoded fields (e.g. `abilityScoreIncreasesJson`, `statsJson`, `actionsJson`) must be valid stringified JSON.
- IDs must be lowercase, hyphenated unique strings (e.g., `acolyte`, `magic-missile`, `beholder`).
