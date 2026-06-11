## Goal

Make `/character/$id` feel like a real character sheet rather than the same compact grid card scaled up. Wider canvas, big hero, two-column body, prominent vitals.

## Approach

Refactor `CharacterCard.tsx` so its internal sections become reusable building blocks, then compose two layouts:
- `CharacterCard` — current compact layout for the party grid (unchanged visually)
- `CharacterDetailView` — new expanded layout used only on `/character/$id`

This avoids forking logic (conditions hook, HP delta, modified stats) into two files.

## Steps

1. **Extract section components** from `src/components/party/CharacterCard.tsx` into a new `src/components/party/character-sections/` folder. Candidates (one file each, named exports):
   - `IdentityHeader` (avatar, name, race/background/alignment, class chips, inspiration)
   - `HpBlock` (HP bar, hit dice, temp HP, delta animation, death saves)
   - `CoreStatsRow` (AC, Speed, Initiative, Prof, passive senses)
   - `AbilityScoresGrid`
   - `SavingThrowsList`, `SkillsList`, `SensesBlock`, `DefensesBlock`, `LanguagesToolsBlock`
   - `ClassResourcesBlock`, `SpellcastingBlock` (modifier/attack/DC + slots + pact)
   - `AttacksBlock`, `CantripsBlock`, `PreparedSpellsBlock`
   - `InventoryBlock` (keep existing `InventoryGroup` / `InventoryList`)
   - `FeatsBlock`
   - Keep `ConditionsPanel` where it is and just re-export it.
   
   Each section takes `member` (and any locally-derived props like `localConditions` or `modifiedStats`) and contains only the JSX currently inside `CharacterCard`. No behavior change.

2. **Slim down `CharacterCard`** to compose those sections in the existing compact order, producing identical output to today's card. Verify the party grid looks unchanged.

3. **Create `src/components/party/CharacterDetailView.tsx`** that composes the same sections in an expanded layout:
   ```text
   ┌──────────────────────────────────────────────────────┐
   │  HERO: 128px portrait │ name (3xl) │ class chips     │
   │                       │ race • bg • alignment        │
   │                       │ ConditionsPanel              │
   ├──────────────────────────────────────────────────────┤
   │  VITALS BAR (full width): HP bar │ AC │ Speed │ Init │
   │                                  │ Prof │ Passive    │
   ├────────────────────────┬─────────────────────────────┤
   │ LEFT COLUMN            │ RIGHT COLUMN                │
   │  AbilityScoresGrid     │  AttacksBlock               │
   │  SavingThrows          │  SpellcastingBlock          │
   │  Skills                │  CantripsBlock              │
   │  Senses                │  PreparedSpellsBlock        │
   │  Defenses              │  ClassResourcesBlock        │
   │  Languages & Tools     │  InventoryBlock             │
   │                        │  FeatsBlock                 │
   └────────────────────────┴─────────────────────────────┘
   ```
   - Container: `max-w-6xl` (vs. card's narrow `max-w-3xl` today).
   - Use `grid lg:grid-cols-[1fr_1.4fr] gap-6` so the right column (combat/spells/inventory) is wider.
   - Keep the same `card-arcane` token styling for visual continuity, but as separate panels rather than one card.
   - Reuse the same `useCharacterConditions` hook and `getModifiedStats` helper.

4. **Update `src/routes/character.$id.tsx`**:
   - Bump container to `max-w-6xl`.
   - Render `<CharacterDetailView member={member} />` instead of `<CharacterCard member={member} />`.
   - Add character name to the route `head().meta.title` (use loader data).

## Out of scope

- No new data sources or D&D Beyond fields.
- No edit/quick-HP buttons (separate item on the shortlist).
- No changes to the party grid card visuals.

## Risk / verification

The extraction is mechanical but touches ~800 lines. After step 2, the grid (`/`) must look pixel-equivalent — I'll diff visually in the preview before adding the new detail layout. If a section has hooks/state, the hook moves with the section.
