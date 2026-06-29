# Standard Finding Schema

This document defines the authoritative finding format used by all audit agents.

All findings produced by any agent must conform to this schema.

The schema exists to:

- Standardize reporting
- Enable de-duplication
- Support long-term tracking
- Track remediation progress
- Detect regressions
- Support executive reporting

All audit tools, agents, reports, registries, and dashboards must use this structure.

---

# Required Finding Format

```yaml
id: DND-001

title: Expertise applies proficiency twice

severity: High

confidence: High

owner: D&D Domain Agent

status: Open

lifecycle: New

first_detected: 2026-06-29

last_reviewed: 2026-06-29

category:
  - Rules Engine
  - Character Calculation

location:
  file: src/rules/CharacterCalculator.ts
  line: 284

description: >
  Expertise calculations apply proficiency bonus twice.

impact: >
  Character skill values become incorrect.

recommendation: >
  Apply expertise multiplier after proficiency calculation.

notes: ""
```

---

# Field Definitions

## id

Unique identifier.

The ID must never change.

The ID must never be reused.

The ID must remain the same even after a finding is resolved.

---

### ID Prefixes

Architecture Findings

```text
ARC-001
```

D&D Domain Findings

```text
DND-001
```

Campaign & Collaboration Findings

```text
CMP-001
```

Code Quality Findings

```text
COD-001
```

Critic Findings

```text
CRT-001
```

Repository Director Decisions

```text
DIR-001
```

---

## title

Short summary of the issue.

Requirements:

- One sentence
- Clear
- Specific
- Actionable

Good:

```text
Campaign ownership transfer can orphan characters
```

Bad:

```text
Problem in campaign service
```

---

## severity

Represents business impact.

Allowed Values:

```text
Critical
High
Medium
Low
Info
```

Definitions are governed by:

```text
SEVERITY_MATRIX.md
```

Agents may not invent new severity levels.

---

## confidence

Represents certainty that the finding is valid.

Allowed Values:

```text
High
Medium
Low
```

---

### High Confidence

Use when:

- Strong evidence exists
- Behavior is reproducible
- Root cause is understood

Example:

```text
Character calculator applies modifier twice.
```

---

### Medium Confidence

Use when:

- Evidence exists
- Additional validation may help

Example:

```text
Potential race condition during ownership transfer.
```

---

### Low Confidence

Use when:

- Evidence is incomplete
- Additional investigation required

Example:

```text
Potential performance degradation under high load.
```

---

## owner

The official owning agent.

Only one owner is allowed.

Examples:

```text
Architecture & Data Model Agent
```

```text
D&D Domain Agent
```

```text
Campaign & Collaboration Agent
```

```text
Code Quality & Reliability Agent
```

Ownership rules are governed by:

```text
PROJECT_CONTEXT.md
```

---

## status

Tracks remediation state.

Allowed Values:

```text
Open
Accepted
In Progress
Resolved
Rejected
```

---

### Open

Issue exists and requires action.

---

### Accepted

Issue exists but is intentionally accepted.

---

### In Progress

Remediation work has started.

---

### Resolved

Issue has been fixed.

---

### Rejected

Finding determined to be invalid.

---

## lifecycle

Tracks historical state.

Allowed Values:

```text
New
Existing
Resolved
Regressed
```

---

### New

First appearance.

---

### Existing

Known unresolved issue.

---

### Resolved

Previously fixed.

---

### Regressed

Previously fixed but returned.

---

## first_detected

Date of initial discovery.

Format:

```text
YYYY-MM-DD
```

Example:

```text
2026-06-29
```

---

## last_reviewed

Most recent validation date.

Format:

```text
YYYY-MM-DD
```

---

## category

Used for grouping, filtering, metrics, and reporting.

At least one category is required.

Multiple categories are allowed.

---

### Architecture Categories

```text
Architecture
Scalability
Data Model
Extensibility
Technical Debt
```

---

### D&D Categories

```text
Rules Engine
Character Calculation
Spellcasting
Class Progression
Combat
Conditions
Inventory
```

---

### Campaign Categories

```text
Campaign Management
Party Management
Permissions
Ownership
Collaboration
DM Experience
UX
```

---

### Code Categories

```text
Security
Performance
Reliability
Maintainability
Testing
Infrastructure
Deployment
Backups
Monitoring
Recovery
```

---

## location

Identifies where the issue exists.

Minimum:

```yaml
location:
  file:
```

Preferred:

```yaml
location:
  file:
  line:
```

Example:

```yaml
location:
  file: src/domain/CharacterCalculator.ts
  line: 284
```

If not applicable:

```yaml
location:
  file: Multiple Files
```

or

```yaml
location:
  file: Architecture
```

---

## description

Describes the issue.

Should answer:

```text
What is happening?
Why is it happening?
```

Requirements:

- Factual
- Specific
- Evidence-based

Avoid:

```text
This looks wrong.
```

---

## impact

Explains consequences.

Should answer:

```text
Why does this matter?
Who is affected?
What could happen?
```

Examples:

```text
Character sheets may display incorrect values.
```

```text
Campaign ownership confusion may lead to data loss.
```

```text
Database growth could significantly degrade performance.
```

---

## recommendation

Describes the preferred resolution.

Requirements:

- Specific
- Actionable
- Practical

Good:

```text
Move ownership validation to a dedicated service and enforce authorization before campaign updates.
```

Bad:

```text
Refactor this.
```

---

## notes

Optional supporting information.

Examples:

```text
Observed during multiclass level-up workflow.
```

```text
Likely introduced during campaign refactor.
```

```text
Requires load testing for confirmation.
```

Default:

```text
""
```

---

# Finding Creation Rules

Before creating a finding:

1. Verify ownership.
2. Verify evidence.
3. Verify severity.
4. Verify the finding does not already exist.

If ownership is unclear:

Do not create a finding.

Create an Observation and escalate ownership determination to the Repository Director.

---

# Duplicate Finding Rules

A finding is considered duplicate if:

- Same root cause
- Same impacted subsystem
- Same remediation

Duplicates should reference the existing finding ID.

Agents should avoid creating new IDs for duplicate findings.

---

# Regression Rules

If a resolved issue returns:

Do not create a new finding.

Update the existing finding.

Example:

```yaml
status: Open

lifecycle: Regressed
```

The original ID remains unchanged.

---

# Example Architecture Finding

```yaml
id: ARC-003

title: Character and Campaign domains are tightly coupled

severity: Medium

confidence: High

owner: Architecture & Data Model Agent

status: Open

lifecycle: New

first_detected: 2026-06-29

last_reviewed: 2026-06-29

category:
  - Architecture
  - Data Model

location:
  file: Architecture

description: >
  Character entities directly depend on campaign-specific logic,
  creating coupling between independent domains.

impact: >
  Future rules expansions and campaign system changes will become
  increasingly difficult to implement safely.

recommendation: >
  Introduce domain boundaries and move campaign-specific behavior
  into dedicated services.

notes: ""
```

---

# Example D&D Finding

```yaml
id: DND-004

title: Expertise applies proficiency twice

severity: High

confidence: High

owner: D&D Domain Agent

status: Open

lifecycle: New

first_detected: 2026-06-29

last_reviewed: 2026-06-29

category:
  - Rules Engine
  - Character Calculation

location:
  file: src/rules/CharacterCalculator.ts
  line: 284

description: >
  Expertise calculations apply proficiency bonus twice.

impact: >
  Character skill bonuses become incorrect and deviate from expected
  game rules.

recommendation: >
  Apply expertise multiplier only after proficiency has been
  calculated once.

notes: ""
```

---

# Audit Quality Requirements

Findings should prioritize:

1. Security, Authentication, Authorization, and Private-Data Exposure
2. Character Data Integrity and Ownership
3. Durable Persistence, Migration Safety, Backup, and Recovery
4. Rules Correctness and Deterministic Reproduction
5. Campaign Data Integrity for Implemented Workflows
6. Reliability and Deployment Safety
7. Collaboration Safety for Implemented Workflows
8. Extensibility Needed by Active Work
9. Performance
10. Maintainability and Modernization

Quality is more important than quantity.

Agents should avoid low-value findings and false positives whenever possible.

# Evidence Requirements

Every official finding should include an `evidence` section.

Minimum recommended structure:

```yaml
evidence:
  files:
    - path/to/file.ts
  symbols:
    - ClassName.methodName
  lines:
    - 120-145
  observed_behavior: >
    What the repository appears to do.
  expected_behavior: >
    What should happen instead.
  rationale: >
    Why this evidence supports the finding.
  reproduction: []
```

Use `Not Provided` only when the repository location cannot be determined.

A finding without meaningful evidence should usually have:

```yaml
confidence: Low
```

or remain an Observation.

---

# Observation Format

Use Observations for concerns that are useful but not yet validated as findings.

```yaml
observation:
  title:
  owner:
  category:
  location:
  evidence:
  reason_not_finding:
  recommended_validation:
```

Observations do not receive permanent finding IDs.

---

# Not A Finding Format

Use `Not A Finding` when an investigated concern should not become an official finding.

```yaml
not_a_finding:
  title:
  reason:
  evidence_reviewed:
  adr_reviewed:
  notes:
```

Typical reasons:

- Intentional design documented by ADR.
- No meaningful risk.
- Duplicate of an existing finding.
- Insufficient evidence.
- Outside agent ownership.

---

# Finding Acceptance Gate

Before creating an official finding, verify:

```text
□ Evidence exists
□ Impact exists
□ Recommendation exists
□ Owner is exactly one agent
□ Severity is valid
□ Confidence is justified
□ Registry was checked for duplicates
□ ADRs were checked when applicable
□ The issue is not better represented as an Observation
```
