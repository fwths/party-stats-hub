# Project Context

## Project Overview

This project is a D&D Beyond alternative focused on providing a complete character, party, and campaign management experience for tabletop roleplaying games.

The system should support players, Dungeon Masters, and groups playing together over long-running campaigns.

This repository is expected to evolve significantly over time and must remain maintainable, extensible, and scalable.

---

# Core Features

## Character Management

- Character creation
- Character editing
- Character sheets
- Inventory management
- Spell management
- Class progression
- Subclass progression
- Feat management
- Ability score management
- Condition tracking

## Party Tracking

- Party creation
- Party membership
- Shared party views
- Party resources
- Character assignment
- Group management

## Campaign Management

- Campaign creation
- Campaign membership
- Session tracking
- Campaign notes
- Shared information
- Dungeon Master management

---

# Target Users

## Players

Players should be able to:

- Create characters
- Manage progression
- Track inventory
- Track spells
- Join campaigns
- Participate in parties

## Dungeon Masters

Dungeon Masters should be able to:

- Manage campaigns
- Manage parties
- Track sessions
- View characters
- Coordinate groups

---

# Long-Term Goals

The system should be designed to eventually support:

- Homebrew content
- Additional classes
- Additional subclasses
- Additional rulesets
- Mobile applications
- Combat tracking
- Encounter management
- Virtual tabletop integration
- Offline support
- Marketplace content
- Character sharing

---

# Audit Priorities

All agents should prioritize findings in the following order:

1. Character Data Integrity
2. Campaign Data Integrity
3. Rules Correctness
4. User Data Safety
5. Collaboration Safety
6. Extensibility
7. Reliability
8. Security
9. Performance
10. Maintainability

---

# Critical Success Criteria

The application must:

- Produce correct character calculations
- Prevent character corruption
- Prevent campaign corruption
- Support future content growth
- Remain maintainable
- Support collaborative gameplay
- Provide a good Dungeon Master experience
- Provide a good Player experience

---

# Ownership Matrix

Only one agent may own a finding.

## Architecture & Data Model Agent

Owns:

- Architecture
- Data models
- Entity relationships
- Domain boundaries
- Service boundaries
- Extensibility
- Scalability
- Technical debt related to structure

Does Not Own:

- Rules calculations
- Campaign permissions
- Security findings
- Performance findings

---

## D&D Domain Agent

Owns:

- Character calculations
- Ability scores
- Skills
- Saving throws
- Proficiency
- Expertise
- Spellcasting
- Feats
- Conditions
- Level progression
- Multiclassing
- Rules implementation

Does Not Own:

- Architecture
- Security
- Database design

---

## Campaign & Collaboration Agent

Owns:

- Parties
- Campaigns
- Sharing
- Invitations
- Membership
- Ownership
- Permissions
- Session workflows
- Collaboration workflows

Does Not Own:

- Rules engine
- Architecture
- Security vulnerabilities

---

## Code Quality & Reliability Agent

Owns:

- Reliability
- Security
- Performance
- Maintainability
- Error handling
- Resource management
- Technical debt related to implementation

Does Not Own:

- Gameplay correctness
- Campaign ownership
- Architecture decisions

---

## Critic Agent

Owns:

- Finding validation
- Duplicate detection
- Severity review
- Contradiction detection

Does Not Own:

- New repository findings

---

## Repository Director

Owns:

- Aggregation
- Prioritization
- Executive summaries
- Roadmaps

Does Not Own:

- Source code review

---

# Ownership Rule

Agents may only create findings within their ownership area.

If an issue belongs to another agent:

1. Mention it as an Observation.
2. Indicate which agent should review it.
3. Do NOT create a finding.

Example:

Observation:
Potential campaign permission problem.

Refer to:
Campaign & Collaboration Agent.

No finding created.