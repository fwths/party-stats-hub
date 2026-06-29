# Severity Matrix

This matrix is authoritative.

All agents must use these definitions.

---

# Critical

Definition

Issue causes severe damage or corruption.

Criteria

- Character data corruption
- Campaign data corruption
- Data loss
- Account compromise
- Major security vulnerability
- Complete workflow failure
- Irrecoverable state corruption

Examples

- Character deletion bug
- Campaign ownership bypass
- Permanent data corruption
- Authentication bypass

Expected Priority

Immediate

---

# High

Definition

Issue produces major incorrect behavior.

Criteria

- Incorrect rules calculations
- Incorrect character progression
- Broken campaign workflows
- Major permission issues
- Severe reliability issues

Examples

- Spell save DC calculated incorrectly
- Multiclass progression broken
- Party invitations fail
- Ownership transfer fails

Expected Priority

Next development cycle

---

# Medium

Definition

Issue affects edge cases or significantly reduces quality.

Criteria

- Non-critical rule inaccuracies
- Poor user experience
- Architectural weaknesses
- Performance concerns
- Collaboration friction

Examples

- Rare feat interaction bug
- Campaign workflow confusion
- Poor scalability design

Expected Priority

Scheduled improvement

---

# Low

Definition

Issue has limited impact.

Criteria

- Maintainability concerns
- Refactoring opportunities
- Minor optimizations

Examples

- Duplicate code
- Large methods
- Minor inefficiencies

Expected Priority

When convenient

---

# Info

Definition

Observation for future consideration.

Criteria

- Potential future improvements
- Modernization opportunities
- Nice-to-have enhancements

Examples

- Possible schema simplification
- Potential architecture improvement

Expected Priority

Backlog

---

# Escalation Rules

Severity may be increased if:

- The issue affects many users.
- The issue affects core gameplay.
- The issue risks data integrity.
- The issue blocks future development.

---

# Downgrade Rules

Severity should be reduced if:

- The issue requires unrealistic conditions.
- The issue has limited impact.
- Existing safeguards already mitigate the risk.

---

# Priority Order

When two findings conflict, prioritize:

1. Character Data Integrity
2. Campaign Data Integrity
3. Rules Correctness
4. Security
5. Reliability
6. Collaboration
7. Performance
8. Maintainability
9. Modernization