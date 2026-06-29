# Audit Workflow

This document defines the authoritative audit execution process for the repository.

All audits, regardless of scope, must follow this workflow.

The workflow exists to:

- Ensure consistent audits
- Eliminate duplicate findings
- Maintain clear ownership
- Track findings over time
- Enable repeatable reviews
- Support release readiness decisions

---

# Audit Principles

## Principle 1: Architecture Before Implementation

The architecture must be understood before implementation-level reviews occur.

Agents should never begin deep implementation reviews without understanding:

- System boundaries
- Domain ownership
- Entity relationships
- Critical workflows

---

## Principle 2: Single Ownership

Every finding must have exactly one owner.

Duplicate ownership is not allowed.

The ownership matrix defined in PROJECT_CONTEXT.md is authoritative.

---

## Principle 3: Evidence-Based Findings

All findings must:

- Include evidence
- Include impact
- Include recommendation

Speculation should be avoided.

Low-confidence observations should not become official findings.

---

## Principle 4: Persistent Findings

Findings must be tracked across audit runs.

Findings are never deleted.

Resolved findings remain in the registry.

Regressions reuse the original finding ID.

---

## Principle 5: Quality Over Quantity

The goal is not generating the largest number of findings.

The goal is identifying:

- Real risks
- Significant defects
- Data integrity concerns
- Rules correctness concerns
- Scalability concerns

---

# Agent Execution Order

The execution order is mandatory.

Agents must execute in the sequence defined below.

---

# Stage 0 — Audit Preparation

Responsible:

Repository Operator

Inputs:

- Repository Source Code
- PROJECT_CONTEXT.md
- FINDING_SCHEMA.md
- SEVERITY_MATRIX.md
- FINDINGS_REGISTRY.md

Objectives:

- Ensure repository is accessible
- Ensure audit documents are current
- Review unresolved findings
- Review accepted risks
- Review past regressions

Outputs:

- Audit scope
- Audit start record

---

# Stage 1 — Architecture Audit

Agent:

Architecture & Data Model Agent

Inputs:

- Repository
- PROJECT_CONTEXT.md
- FINDING_SCHEMA.md
- SEVERITY_MATRIX.md
- FINDINGS_REGISTRY.md

Outputs:

- architecture-report.md

Objectives:

Create a repository-level understanding.

Identify:

- Repository structure
- Domain model
- System boundaries
- Service boundaries
- Data ownership
- Extensibility constraints
- Scalability constraints

Questions:

- Can future content be added?
- Can future systems be added?
- Can rules evolve?
- Can campaigns scale?
- Can collaboration scale?

Deliverables:

- Repository Map
- Domain Model
- Architecture Findings
- Data Model Findings
- Extensibility Assessment
- Scalability Assessment

Architecture findings should influence all downstream reviews.

---

# Stage 2 — Domain Audits

The following agents run in parallel.

Both receive the architecture report.

---

## Stage 2A — D&D Domain Audit

Agent:

D&D Domain Agent

Inputs:

- Repository
- PROJECT_CONTEXT.md
- architecture-report.md

Outputs:

- dnd-report.md

Objectives:

Validate gameplay correctness.

Review:

- Character calculations
- Ability scores
- Skills
- Saving throws
- Proficiency
- Expertise
- Spellcasting
- Conditions
- Inventory calculations
- Class progression
- Subclass progression
- Multiclassing

Questions:

- Are calculations correct?
- Are rules implemented correctly?
- Are edge cases covered?
- Can invalid states exist?

Deliverables:

- Rules Review
- Gameplay Findings
- Character System Assessment
- Missing Edge Cases

---

## Stage 2B — Campaign & Collaboration Audit

Agent:

Campaign & Collaboration Agent

Inputs:

- Repository
- PROJECT_CONTEXT.md
- architecture-report.md

Outputs:

- campaign-report.md

Objectives:

Validate collaboration systems.

Review:

- Campaigns
- Parties
- Ownership
- Invitations
- Sharing
- Permissions
- Session workflows
- DM workflows

Questions:

- Can ownership become invalid?
- Can invitations fail?
- Can synchronization fail?
- Can records become orphaned?
- Can collaboration cause corruption?

UX Review Scope:

- Character sheet usability observations
- DM workflow observations
- Accessibility observations
- Mobile workflow observations

Deliverables:

- Campaign Assessment
- Collaboration Assessment
- Ownership Assessment
- UX Assessment

---

# Stage 3 — Technical Audit

Agent:

Code Quality & Reliability Agent

Inputs:

- Repository
- PROJECT_CONTEXT.md
- architecture-report.md
- dnd-report.md
- campaign-report.md

Outputs:

- code-quality-report.md

Objectives:

Evaluate implementation quality.

Review Areas:

Security

- Authentication
- Authorization
- Input validation
- Injection risks

Reliability

- Error handling
- Recovery behavior
- Failure modes
- Resource management

Performance

- Query performance
- Rendering performance
- Calculation performance

Maintainability

- Complexity
- Duplication
- Dead code

Testing

- Unit tests
- Integration tests
- Regression coverage

Operations

- Backups
- Migrations
- Monitoring
- Deployment
- Recovery

Questions:

- What fails under load?
- What fails during outages?
- What fails during deployment?
- Can data be recovered?

Deliverables:

- Security Assessment
- Reliability Assessment
- Performance Assessment
- Maintainability Assessment
- Testing Assessment
- Operational Readiness Assessment

---

# Stage 4 — Finding Validation

Agent:

Critic Agent

Inputs:

- architecture-report.md
- dnd-report.md
- campaign-report.md
- code-quality-report.md

Outputs:

- critic-report.md

Objectives:

Review findings only.

The Critic does not review source code.

The Critic may not create new repository findings.

Review:

- Evidence quality
- Severity accuracy
- Duplicate findings
- Contradictions
- Ownership validity

Questions:

- Is evidence sufficient?
- Is severity appropriate?
- Is the issue duplicated?
- Is the recommendation realistic?

Deliverables:

- Confirmed Findings
- Duplicate Findings
- Severity Adjustments
- Ownership Concerns
- Findings Requiring More Evidence

---

# Stage 5 — Executive Review

Agent:

Repository Director

Inputs:

- architecture-report.md
- dnd-report.md
- campaign-report.md
- code-quality-report.md
- critic-report.md
- FINDINGS_REGISTRY.md

Outputs:

- executive-summary.md

Objectives:

Create a unified repository risk assessment.

Responsibilities:

- Aggregate findings
- Remove duplicates
- Prioritize risks
- Resolve ownership disputes
- Track regressions
- Create remediation roadmap

Deliverables:

# Executive Summary

# Top 10 Critical Findings

# Top 10 Quick Wins

# Architecture Assessment

# Rules Assessment

# Campaign Assessment

# Technical Assessment

# Open Findings Trend

# Regressed Findings

# Ownership Decisions

# 30-Day Roadmap

# 90-Day Roadmap

# Long-Term Roadmap

# Final Scores

Architecture

Rules Accuracy

Campaign Integrity

Security

Reliability

Performance

Maintainability

Operational Readiness

---

# Ownership Disputes

If ownership is unclear:

An agent must not create an official finding.

Instead create:

Observation:
Potential issue identified.

Candidate Owners:
- Agent A
- Agent B

Escalate To:
Repository Director

The Repository Director assigns ownership.

Only the assigned owner may create the finding.

---

# Finding Lifecycle Workflow

New Finding

```text
Status: Open
Lifecycle: New
```

---

Existing Finding

```text
Status: Open
Lifecycle: Existing
```

---

Resolved Finding

```text
Status: Resolved
Lifecycle: Resolved
```

---

Regressed Finding

```text
Status: Open
Lifecycle: Regressed
```

Original ID must be preserved.

New IDs may not be created for regressions.

---

# Pull Request Workflow

For every pull request:

Run:

- D&D Domain Agent
- Code Quality & Reliability Agent

Review:

- Changed files only

Goal:

Fast feedback.

---

# Weekly Workflow

Run:

- Campaign & Collaboration Agent

Objectives:

- Workflow drift detection
- Permission review
- Collaboration review

---

# Monthly Workflow

Run:

- Architecture & Data Model Agent

Objectives:

- Architectural drift detection
- Scalability review
- Extensibility review

---

# Release Workflow

Before any release:

Run the full audit workflow.

Required:

1. Architecture Agent
2. D&D Domain Agent
3. Campaign Agent
4. Code Quality Agent
5. Critic Agent
6. Repository Director

Critical findings must be reviewed prior to release.

---

# Audit Completion Criteria

An audit is considered complete only when all of the following exist:

- architecture-report.md
- dnd-report.md
- campaign-report.md
- code-quality-report.md
- critic-report.md
- executive-summary.md

and

- FINDINGS_REGISTRY.md updated
- AUDIT_BACKLOG.md updated

All findings must be traceable to a unique identifier.

All findings must have an owner.

All findings must have a documented status.

All findings must have a documented lifecycle state.

---

# Success Definition

A successful audit system:

- Produces consistent findings
- Avoids duplicate ownership
- Tracks findings over time
- Detects regressions
- Prioritizes real risks
- Supports long-term maintainability

The goal is not maximum findings.

The goal is maximum confidence in the health, correctness, safety, and future scalability of the platform.