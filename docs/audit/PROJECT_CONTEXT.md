# Project Context

## Project Overview

This project is a D&D Beyond alternative focused on providing a complete character, party, and campaign management platform for tabletop roleplaying games.

The application is intended to support both Players and Dungeon Masters throughout the entire lifecycle of a campaign, from character creation through long-running campaign management.

The system should be treated as a long-term product expected to evolve significantly over time and eventually support additional game systems, content sources, and collaboration features.

---

# Core Functional Domains

## Character Management

The application supports:

- Character creation
- Character editing
- Character sheets
- Character progression
- Character storage
- Character sharing

### Character Systems

- Ability Scores
- Skills
- Saving Throws
- Proficiency
- Expertise
- Conditions
- Classes
- Subclasses
- Feats
- Equipment
- Inventory
- Spellcasting
- Level Progression

---

## Party Tracking

The application supports:

- Party creation
- Party membership
- Shared party information
- Character assignment
- Shared resources
- Group organization
- Party-level views

---

## Campaign Management

The application supports:

- Campaign creation
- Campaign ownership
- Campaign membership
- Session tracking
- Campaign notes
- Shared information
- Dungeon Master tools
- Party management

---

# Target Users

## Players

Players should be able to:

- Create characters
- Modify characters
- Manage progression
- Manage inventory
- Track spells
- Track conditions
- Join campaigns
- Participate in parties
- View shared party information

---

## Dungeon Masters

Dungeon Masters should be able to:

- Create campaigns
- Manage campaigns
- Invite players
- Manage parties
- Track sessions
- Review characters
- Coordinate players
- Manage shared information

---

# Long-Term Product Goals

The system should be designed to support future expansion without requiring large-scale architectural rewrites.

Potential future capabilities include:

- Homebrew Content
- Custom Classes
- Custom Subclasses
- Custom Spells
- Custom Items
- Additional Rulesets
- Mobile Applications
- Combat Tracking
- Encounter Management
- Campaign Analytics
- Offline Support
- Marketplace Systems
- Character Publishing
- Character Transfer
- Party Resource Tracking
- Virtual Tabletop Integration
- Real-Time Collaboration

---

# Architectural Principles

All audits should evaluate the project against the following principles:

## Data Integrity

Character and campaign data must remain accurate and recoverable.

Data corruption is considered a critical failure.

---

## Rules Correctness

Game calculations must remain accurate.

Character sheets should consistently reflect correct rules implementation.

---

## Extensibility

New content should be addable without major rewrites.

Examples:

- New classes
- New subclasses
- New spells
- New feats
- New items
- New rules systems

---

## Separation of Concerns

Business logic, persistence, presentation, and domain modeling should remain appropriately separated.

---

## Collaboration Safety

Shared campaign workflows should prevent accidental data loss, ownership confusion, and unauthorized modification.

---

# Audit Priorities

Agents should prioritize findings in the following order.

## Priority 1

Character Data Integrity

Examples:

- Character corruption
- Character overwrites
- Character loss
- Character ownership errors

---

## Priority 2

Campaign Data Integrity

Examples:

- Campaign corruption
- Campaign deletion issues
- Ownership transfer failures
- Orphaned campaign data

---

## Priority 3

Rules Correctness

Examples:

- Incorrect calculations
- Broken progression
- Incorrect spellcasting
- Invalid character states

---

## Priority 4

User Data Safety

Examples:

- Data loss
- Security vulnerabilities
- Unauthorized access

---

## Priority 5

Collaboration Safety

Examples:

- Permission failures
- Sharing failures
- Synchronization problems

---

## Priority 6

Extensibility

Examples:

- Inflexible schemas
- Hardcoded systems
- Feature lock-in

---

## Priority 7

Reliability

Examples:

- Crashes
- Error handling failures
- Resource leaks

---

## Priority 8

Security

Examples:

- Injection flaws
- Authentication issues
- Authorization issues

---

## Priority 9

Performance

Examples:

- Slow calculations
- Poor database access
- Excessive rendering

---

## Priority 10

Maintainability

Examples:

- Technical debt
- Complexity
- Duplication

---

# Critical Success Criteria

The application must:

- Produce accurate character calculations
- Preserve character data
- Preserve campaign data
- Support collaborative gameplay
- Support Dungeon Master workflows
- Support Player workflows
- Allow future content growth
- Remain maintainable over time

---

# Agent Ownership Matrix

Each finding must have a single owner.

Ownership determines which agent may create the official finding.

Duplicate ownership is not allowed.

---

## Architecture & Data Model Agent

### Owns

- Architecture
- System structure
- Domain modeling
- Data models
- Entity relationships
- Service boundaries
- Domain boundaries
- Extensibility
- Scalability
- Structural technical debt

### Does Not Own

- Rules calculations
- Gameplay validation
- Campaign permissions
- Security issues
- Performance issues
- Infrastructure issues

---

## D&D Domain Agent

### Owns

- Ability Scores
- Skills
- Saving Throws
- Proficiency
- Expertise
- Character calculations
- Conditions
- Spellcasting
- Equipment interactions
- Feat interactions
- Class progression
- Subclass progression
- Multiclassing
- Gameplay rules

### Does Not Own

- Architecture
- Database design
- Campaign ownership
- Security
- Infrastructure

---

## Campaign & Collaboration Agent

### Owns

- Campaigns
- Parties
- Party membership
- Campaign membership
- Invitations
- Ownership
- Ownership transfer
- Sharing
- Permissions
- Session workflows
- DM workflows
- Collaboration workflows

### UX Ownership

This agent also owns:

- Character sheet usability observations
- DM experience observations
- Workflow friction observations
- Mobile workflow observations
- Accessibility observations

### Does Not Own

- Rules calculations
- Data model design
- Security vulnerabilities

---

## Code Quality & Reliability Agent

### Owns

#### Reliability

- Error handling
- Resource management
- Failure modes
- Recovery behavior

#### Security

- Authentication
- Authorization
- Injection risks
- Secrets management

#### Performance

- Runtime performance
- Database performance
- Rendering performance
- Resource consumption

#### Maintainability

- Complexity
- Duplication
- Dead code
- Code smells

#### Testing

- Unit tests
- Integration tests
- Rules testing
- Coverage assessment

#### Operations

- Deployment
- Infrastructure
- Backups
- Recovery
- Monitoring
- Migrations

### Does Not Own

- Gameplay correctness
- Campaign ownership
- Architecture decisions

---

## Critic Agent

### Owns

- Finding validation
- Duplicate detection
- Severity review
- Contradiction review
- Confidence review

### Does Not Own

- New repository findings
- Source code review

---

## Repository Director

### Owns

- Aggregate reporting
- Prioritization
- Roadmapping
- Ownership disputes
- Executive summaries

### Does Not Own

- Source code review
- New technical findings

---

# Ownership Rules

Agents may only create findings inside their ownership area.

If an issue belongs to another agent:

1. Record an Observation.
2. Identify the likely owning agent.
3. Do not create an official finding.

Example:

Observation:

Potential campaign permission issue detected.

Refer To:

Campaign & Collaboration Agent.

No finding created.

---

# Ownership Disputes

Ownership ambiguity must be handled consistently.

If ownership is unclear:

Do not create an official finding.

Create:

Observation:
Potential issue identified.

Candidate Owners:
- Agent A
- Agent B

Escalate To:
Repository Director

Only the Repository Director may assign ownership.

Only the assigned owner may create the official finding.

---

# Architecture Decision Records

Agents should review any available ADRs before making architectural recommendations.

Design decisions may be intentional tradeoffs.

Agents should avoid recommending changes that conflict with documented architectural decisions unless the tradeoff is clearly no longer valid.

---

# Audit Philosophy

The purpose of this audit system is not to maximize the number of findings.

The purpose is to identify:

- High-confidence risks
- High-impact issues
- Scalability concerns
- Data integrity risks
- Rules correctness risks

Agents should prioritize quality over quantity.

False positives should be avoided.

Recommendations should be practical, actionable, and proportionate to the actual risk.