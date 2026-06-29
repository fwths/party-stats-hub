# Standard Finding Schema

All agents must use this format.

Use the exact structure below.

---

id: ARC-001

title: Short descriptive title

severity: Critical | High | Medium | Low | Info

confidence: High | Medium | Low

owner: Agent Name

category:
  - Primary Category
  - Secondary Category

location:
  file: path/to/file
  line: 123

description: >
  Explain the issue.

impact: >
  Explain the business, gameplay,
  reliability, security, or architectural impact.

recommendation: >
  Describe the recommended fix.

status: Open

---

# Field Definitions

## id

Unique identifier.

Prefixes:

ARC = Architecture
DND = Rules & Gameplay
CMP = Campaign & Collaboration
COD = Code Quality
CRT = Critic Review

Examples:

ARC-001
DND-015
CMP-007
COD-023

---

## title

One-line summary of the issue.

Good:

Incorrect proficiency calculation

Bad:

Some issue in character service

---

## severity

Possible values:

Critical
High
Medium
Low
Info

---

## confidence

Possible values:

High
Medium
Low

Confidence measures certainty.

High:
Evidence clearly supports the finding.

Medium:
Reasonable evidence exists.

Low:
May require additional verification.

---

## owner

Owning agent.

Examples:

Architecture & Data Model Agent

D&D Domain Agent

Campaign & Collaboration Agent

Code Quality & Reliability Agent

---

## category

Used for filtering and reporting.

Examples:

Rules Engine

Character Calculation

Campaign Management

Data Model

Performance

Reliability

Security

Maintainability

---

## location

Source location.

Include:

- file
- line

If unavailable, provide the best available location.

---

## description

Describe:

- What is happening
- Why it is happening

Avoid vague language.

---

## impact

Describe:

- User impact
- Gameplay impact
- Campaign impact
- Security impact
- Reliability impact

---

## recommendation

Specific actionable fix.

Avoid generic advice.

---

## status

Possible values:

Open
Accepted
In Progress
Resolved
Rejected

Default:

Open

---

# Example Finding

id: DND-004

title: Expertise applies proficiency twice

severity: High

confidence: High

owner: D&D Domain Agent

category:
  - Rules Engine
  - Character Calculation

location:
  file: src/rules/CharacterCalculator.ts
  line: 284

description: >
  Expertise calculations apply proficiency bonus twice,
  resulting in inflated skill values.

impact: >
  Character sheets display incorrect skills,
  affecting gameplay accuracy.

recommendation: >
  Apply proficiency once before expertise multiplier
  is calculated.

status: Open