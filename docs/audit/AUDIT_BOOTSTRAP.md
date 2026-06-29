# Audit Bootstrap

## Step 1

Run Architecture Agent.

Inputs:

- PROJECT_CONTEXT.md
- FINDING_SCHEMA.md
- SEVERITY_MATRIX.md
- FINDINGS_REGISTRY.md
- Repository

Output:

- architecture-report.md

---

## Step 2

Run in parallel:

- D&D Agent
- Campaign Agent

Inputs:

- architecture-report.md
- Repository

Outputs:

- dnd-report.md
- campaign-report.md

---

## Step 3

Run Code Quality Agent.

Inputs:

- architecture-report.md
- dnd-report.md
- campaign-report.md

Output:

- code-quality-report.md

---

## Step 4

Run Critic Agent.

Output:

- critic-report.md

---

## Step 5

Run Repository Director.

Output:

- executive-summary.md

---

## Step 6

Update:

- FINDINGS_REGISTRY.md
- AUDIT_BACKLOG.md