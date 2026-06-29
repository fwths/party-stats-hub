# Rules Test Matrix

This document defines the minimum recommended rules validation matrix for the D&D Domain Agent and the Code Quality & Reliability Agent.

The purpose of this matrix is to ensure that:

- Critical gameplay behavior is verified
- Regression risks are identified
- New features do not silently break existing functionality
- Character integrity remains stable over time
- Core systems remain trustworthy

This matrix is intentionally implementation-agnostic.

It describes expected behaviors and high-risk scenarios.

---

# Test Matrix Objectives

The rules engine must reliably support:

- Character Creation
- Character Progression
- Character Modification
- Inventory Changes
- Spell Changes
- Feature Changes
- Campaign Participation
- Future Content Expansion

The matrix is designed to identify areas where regression testing should exist.

---

# Priority Classification

## Priority 1

Character Integrity

Failures can:

- Corrupt characters
- Produce invalid characters
- Destroy user trust

Examples:

```text
Ability Scores
Proficiency
Progression
Spellcasting
```

---

## Priority 2

Rules Correctness

Failures produce:

- Incorrect gameplay
- Incorrect character sheets

Examples:

```text
Class Features
Feats
Conditions
```

---

## Priority 3

Edge Cases

Failures affect:

- Advanced builds
- Rare interactions

Examples:

```text
Multiclass Spellcasting
Stacking Effects
```

---

# Character Creation Matrix

## Base Character Creation

Expected:

```text
Character can be created successfully.
```

Verify:

```text
Species selected

Class selected

Background selected

Ability scores assigned

Equipment assigned
```

Risk:

```text
Invalid character state
```

Priority:

```text
Critical
```

---

## Character Validation

Expected:

```text
Invalid characters cannot be created.
```

Verify:

```text
Missing class

Invalid level

Impossible stat values

Missing required selections
```

Priority:

```text
Critical
```

---

# Ability Score Matrix

## Ability Score Assignment

Expected:

```text
Assigned scores are persisted correctly.
```

Verify:

```text
Point Buy

Standard Array

Manual Entry
```

Priority:

```text
Critical
```

---

## Ability Modifier Calculation

Expected:

```text
Modifiers always match scores.
```

Verify:

```text
Score increases

Score decreases

Temporary modifiers

Permanent modifiers
```

Priority:

```text
Critical
```

---

## Ability Score Improvements

Expected:

```text
ASI updates all related systems.
```

Verify:

```text
Skills

Saving Throws

Spellcasting

Derived values
```

Priority:

```text
High
```

---

# Skill Matrix

## Proficiency Application

Expected:

```text
Proficiency applied exactly once.
```

Verify:

```text
Proficient skill

Non-proficient skill

Conditional proficiency
```

Priority:

```text
Critical
```

---

## Expertise Application

Expected:

```text
Expertise doubles proficiency once.
```

Verify:

```text
Single expertise

Multiple expertise sources

Temporary effects
```

Priority:

```text
Critical
```

---

## Passive Scores

Expected:

```text
Passive scores remain correct.
```

Verify:

```text
Passive Perception

Passive Investigation

Passive Insight
```

Priority:

```text
High
```

---

# Saving Throw Matrix

## Proficiency

Expected:

```text
Saving throw proficiency applied correctly.
```

Verify:

```text
Class proficiency

Feature proficiency

Temporary modifiers
```

Priority:

```text
High
```

---

## Modifier Changes

Expected:

```text
Saving throws recalculate correctly.
```

Verify:

```text
Level up

ASI

Equipment changes

Feature changes
```

Priority:

```text
High
```

---

# Class Progression Matrix

## Single-Class Leveling

Expected:

```text
Features unlock correctly.
```

Verify:

```text
Level 1-20 progression

Feature unlocks

Resource scaling
```

Priority:

```text
Critical
```

---

## Feature Acquisition

Expected:

```text
Only appropriate features are granted.
```

Verify:

```text
Automatic features

Optional features

Replacement features
```

Priority:

```text
High
```

---

## Resource Progression

Expected:

```text
Resources scale correctly.
```

Examples:

```text
Sorcery Points

Ki Points

Rage Uses

Channel Divinity
```

Priority:

```text
High
```

---

# Subclass Matrix

## Subclass Selection

Expected:

```text
Subclass unlocks at correct level.
```

Priority:

```text
High
```

---

## Subclass Features

Expected:

```text
Features match progression.
```

Verify:

```text
Initial unlock

Future unlocks

Feature replacement
```

Priority:

```text
High
```

---

# Multiclass Matrix

This is one of the highest-risk systems.

---

## Class Level Distribution

Expected:

```text
Each class tracks levels independently.
```

Priority:

```text
Critical
```

---

## Feature Separation

Expected:

```text
Features apply to correct class.
```

Priority:

```text
Critical
```

---

## Multiclass Spellcasting

Expected:

```text
Spell slots calculated correctly.
```

Verify:

```text
Full Caster + Full Caster

Full Caster + Half Caster

Warlock combinations

Hybrid progression
```

Priority:

```text
Critical
```

---

# Spellcasting Matrix

## Known Spells

Expected:

```text
Characters know the correct spells.
```

Priority:

```text
High
```

---

## Prepared Spells

Expected:

```text
Preparation limits enforced.
```

Priority:

```text
High
```

---

## Spell Save DC

Expected:

```text
DC updates correctly.
```

Verify:

```text
Ability changes

Level changes

Equipment changes

Feature changes
```

Priority:

```text
Critical
```

---

## Spell Attack Bonus

Expected:

```text
Spell attacks calculated correctly.
```

Priority:

```text
Critical
```

---

## Spell Slot Progression

Expected:

```text
Slots match progression.
```

Priority:

```text
Critical
```

---

# Feat Matrix

## Feat Selection

Expected:

```text
Only valid feats selectable.
```

Priority:

```text
Medium
```

---

## Feat Benefits

Expected:

```text
Benefits apply exactly once.
```

Priority:

```text
High
```

---

## Feat Stacking

Expected:

```text
Stacking follows intended rules.
```

Priority:

```text
High
```

---

# Inventory Matrix

## Equipment Changes

Expected:

```text
Character updates correctly.
```

Priority:

```text
High
```

---

## Equipment Restrictions

Expected:

```text
Invalid combinations prevented.
```

Priority:

```text
Medium
```

---

## Magic Item Effects

Expected:

```text
Bonuses applied correctly.
```

Priority:

```text
High
```

---

# Conditions Matrix

## Condition Application

Expected:

```text
Conditions apply correctly.
```

Priority:

```text
High
```

---

## Condition Removal

Expected:

```text
Effects removed correctly.
```

Priority:

```text
High
```

---

## Advantage And Disadvantage

Expected:

```text
Rules enforced correctly.
```

Priority:

```text
Critical
```

---

# Character Persistence Matrix

## Save Character

Expected:

```text
Character remains unchanged after save/load cycle.
```

Priority:

```text
Critical
```

---

## Load Character

Expected:

```text
Loaded character matches saved state.
```

Priority:

```text
Critical
```

---

## Character Import

Expected:

```text
Imported character remains valid.
```

Priority:

```text
High
```

---

# Regression Hotspots

These systems should always have regression protection.

```text
Character Calculation

Ability Scores

Proficiency

Expertise

Saving Throws

Class Progression

Subclass Progression

Multiclassing

Spellcasting

Spell Save DC

Spell Slots

Inventory Effects

Conditions

Character Persistence
```

---

# Recommended Test Coverage Targets

## Critical Systems

Target:

```text
100%
```

Examples:

```text
Progression

Spellcasting

Ability Calculations

Persistence
```

---

## High-Risk Systems

Target:

```text
90%+
```

Examples:

```text
Multiclassing

Conditions

Feature Interactions
```

---

## Remaining Systems

Target:

```text
80%+
```

---

# D&D Agent Usage

The D&D Domain Agent should use this matrix to:

- Identify missing validations
- Identify high-risk logic
- Highlight likely regression areas
- Prioritize gameplay findings

---

# Code Quality Agent Usage

The Code Quality & Reliability Agent should use this matrix to:

- Evaluate test coverage
- Recommend regression tests
- Assess rules-engine protection

---

# Success Criteria

The rules engine can be considered trustworthy when:

- Priority 1 systems are validated
- High-risk combinations are tested
- Regression hotspots are protected
- Character state remains consistent
- Progression remains correct
- Spellcasting remains correct

The ultimate question is:

> Can a player trust the character sheet after any change, level-up, import, feature selection, or rules interaction?

If the answer is yes, the rules system is functioning correctly.