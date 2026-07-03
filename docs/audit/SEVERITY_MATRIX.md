# Severity Matrix

This document defines the authoritative severity classification system used by all audit agents.

All findings must use one of the severity levels defined here.

Agents may not invent additional severity levels.

The purpose of severity classification is to:

- Prioritize remediation
- Communicate business impact
- Improve consistency between agents
- Support executive reporting
- Enable trend analysis across audit runs

Severity represents impact, not effort.

A difficult fix may still be Low severity.

An easy fix may still be Critical.

---

# Severity Levels

## Critical

### Definition

Critical issues create an unacceptable risk to the application, user data, campaign integrity, character integrity, or platform security.

These findings represent situations that could cause data loss, data corruption, major security compromise, or complete failure of core functionality.

---

### Typical Characteristics

One or more of the following is true:

- Character data can be permanently corrupted
- Character data can be permanently lost
- Campaign data can be permanently corrupted
- Campaign data can be permanently lost
- Authentication can be bypassed
- Authorization can be bypassed
- Major security compromise is possible
- Critical gameplay systems are completely broken
- Core workflows fail entirely

---

### Examples

Character System

- Character deletion bug
- Character overwrite bug
- Character ownership corruption

Campaign System

- Campaign ownership bypass
- Campaign deletion without authorization
- Orphaned campaigns with unrecoverable data

Security

- Authentication bypass
- Privilege escalation
- Database credentials exposed
- Remote code execution

Infrastructure

- Missing backups for production data
- Unrecoverable migration failure

---

### Expected Priority

Immediate remediation.

---

# High

### Definition

High issues significantly impact gameplay, collaboration, reliability, security, or business functionality.

The application remains usable, but important behavior is incorrect or unsafe.

---

### Typical Characteristics

One or more of the following is true:

- Character calculations are incorrect
- Rules implementation is incorrect
- Campaign workflows fail
- Permissions behave incorrectly
- High-risk reliability problems exist
- Significant security weakness exists
- Important user workflows are broken

---

### Examples

Rules System

- Expertise applied incorrectly
- Multiclass progression broken
- Spell save DC calculated incorrectly
- Hit point calculation incorrect

Campaign System

- Campaign transfer fails
- Invitations fail
- Party synchronization issues
- Character sharing fails

Security

- Authorization inconsistency
- Sensitive information leakage

Reliability

- Unhandled failures during save operations
- Character updates lost during synchronization

---

### Expected Priority

Next development cycle.

---

# Medium

### Definition

Medium issues reduce quality, maintainability, scalability, usability, or reliability but do not immediately threaten data integrity.

The application functions, but deficiencies exist that should be addressed.

---

### Typical Characteristics

One or more of the following is true:

- Edge-case gameplay issues exist
- UX workflow friction exists
- Architecture weaknesses exist
- Scalability concerns exist
- Test coverage is insufficient
- Performance concerns exist

---

### Examples

Gameplay

- Rare feat interaction bug
- Uncommon rules edge case

Architecture

- Tight coupling between domains
- Inflexible entity relationships

Campaigns

- Confusing ownership flow
- Complicated invitation workflow

Operations

- Logging gaps
- Monitoring deficiencies

Performance

- Inefficient queries
- Non-critical rendering issues

Testing

- Missing integration tests
- Missing regression tests

---

### Expected Priority

Scheduled improvement.

---

# Low

### Definition

Low issues have limited user impact and primarily affect maintainability, clarity, or long-term sustainability.

---

### Typical Characteristics

One or more of the following is true:

- Refactoring opportunity exists
- Duplicate logic exists
- Technical debt exists
- Minor optimization opportunity exists

---

### Examples

Code Quality

- Large methods
- Duplicate code
- Dead code
- Minor abstractions problems

Architecture

- Naming inconsistencies
- Organizational improvements

Performance

- Small optimization opportunities

---

### Expected Priority

Fix when convenient.

---

# Info

### Definition

Informational observations that may provide future value but do not currently represent a defect or risk.

---

### Typical Characteristics

- Architectural observation
- Future enhancement suggestion
- Modernization opportunity
- Process recommendation

---

### Examples

- Potential modularization opportunity
- Future scalability improvement
- Optional schema simplification
- Potential homebrew system strategy

---

### Expected Priority

Backlog consideration only.

---

# Severity Escalation Rules

Severity may be increased if any of the following applies.

---

## Character Integrity Impact

Escalate when:

- Character corruption is possible
- Character loss is possible
- Character ownership is affected
- Character progression becomes invalid

Examples:

Medium → High

High → Critical

---

## Campaign Integrity Impact

Escalate when:

- Campaign ownership is affected
- Campaign data may be lost
- Campaign membership becomes invalid

Examples:

Medium → High

High → Critical

---

## Core Gameplay Impact

Escalate when:

- Common gameplay calculations become invalid
- Core progression rules become incorrect
- Most players are affected

Examples:

Medium → High

High → Critical

---

## User Scale Impact

Escalate when:

- Many users are impacted
- Multiple campaigns are impacted
- Multiple systems are impacted

---

## Development Blocking Impact

Escalate when:

- Future feature development becomes substantially harder
- Core architectural constraints prevent planned roadmap execution

---

# Severity Downgrade Rules

Severity should be reduced when mitigating factors exist.

---

## Existing Safeguards

Downgrade when:

- Existing validation already limits impact
- Existing recovery mechanisms exist
- Existing monitoring quickly detects issues

---

## Unrealistic Preconditions

Downgrade when:

- Issue requires unusual configuration
- Issue requires unrealistic user behavior
- Issue requires non-standard deployment conditions

---

## Limited Practical Impact

Downgrade when:

- Impact is theoretical only
- User-visible consequences are minimal
- Workflow impact is insignificant

---

# Risk Evaluation Questions

Before assigning severity, agents should ask:

1. Can data be lost?
2. Can data be corrupted?
3. Can gameplay become incorrect?
4. Can campaigns become unsafe?
5. Can ownership become invalid?
6. Can users lose work?
7. Can future development become blocked?
8. Can recovery be difficult or impossible?

The answers should drive severity assignment.

---

# Audit Priority Order

When two findings appear similarly severe, prioritize according to this order.

## Priority 1

Security, Authentication, Authorization, and Private-Data Exposure

---

## Priority 2

Character Data Integrity and Ownership

---

## Priority 3

Durable Persistence, Migration Safety, Backup, and Recovery

---

## Priority 4

Rules Correctness and Deterministic Reproduction

---

## Priority 5

Campaign Data Integrity for Implemented Workflows

---

## Priority 6

Reliability and Deployment Safety

---

## Priority 7

Collaboration Safety for Implemented Workflows

---

## Priority 8

Extensibility Needed by Active Work

---

## Priority 9

Performance

---

## Priority 10

Maintainability and Modernization

---

# Agent Severity Guidance

## Architecture & Data Model Agent

Most findings should normally be:

- Medium
- Low

Critical findings should be rare and reserved for severe data integrity risks.

---

## D&D Domain Agent

Most findings should normally be:

- High
- Medium

Critical findings should only be used when widespread gameplay correctness is fundamentally broken or character integrity is at risk.

---

## Campaign & Collaboration Agent

Most findings should normally be:

- High
- Medium

Critical findings should be limited to ownership, corruption, or severe collaboration failures.

---

## Frontend & UX Agent

Most findings should normally be:

- Medium
- Low

Critical or High findings should be reserved for visual blockages that prevent core workflows entirely (e.g. broken builder steps), severe accessibility failures that lock out users with assistive technologies, or React hydration exceptions that crash client pages.

---

## Code Quality & Reliability Agent

Can use all severity levels depending on impact.

Security, backup, recovery, and reliability findings may legitimately be Critical.

---

## Critic Agent

Does not assign original severity.

May recommend:

- Upgrade
- Downgrade
- Confirm

based on evidence and impact.

---

# Final Rule

Severity reflects impact to the project.

Severity does not reflect:

- Fix difficulty
- Code quality preferences
- Personal opinions
- Style choices

Findings should be ranked based on risk to:

1. Character integrity
2. Campaign integrity
3. Gameplay correctness
4. User trust
5. Long-term maintainability

All agents must follow this matrix consistently.

# Severity Calibration Questions

Use these questions to normalize severity before publishing a finding.

| Question | Default Severity |
|---|---|
| Can character data be permanently lost or corrupted? | Critical |
| Can campaign data be permanently lost or corrupted? | Critical |
| Can authentication or authorization be bypassed? | Critical |
| Can production data become unrecoverable? | Critical |
| Can core gameplay calculations become incorrect for common cases? | High |
| Can important campaign workflows fail? | High |
| Can important save/update behavior fail unsafely? | High |
| Is the issue mainly maintainability, scalability, or test coverage without immediate integrity risk? | Medium |
| Is the issue a limited refactoring or cleanup opportunity? | Low |
| Is the issue informational or a future improvement? | Info |

Severity represents impact, not implementation effort.

When evidence is weak, do not inflate severity. Use lower confidence or keep the item as an Observation.
