---
name: opencode-agent-prompt
description: Generate structured implementation, debugging, or QA-verification prompts to hand off to OpenCode or another AI coding agent. Use this whenever the user asks to "write a prompt for OpenCode/the agent", "make an implementation prompt", "draft a debug prompt", "make a QA checklist for the agent to run through", or otherwise wants to delegate a coding task to an AI agent in a way that prevents partial fixes, silent guessing on business decisions, or unverified "done" claims. Especially relevant for Grüne Designs projects (MEPIT, curA, Hey Nomad) where prior agents have applied incomplete fixes without full investigation, or claimed something was verified when it was only code-traced. Trigger even if the user just describes a bug or feature and says something like "make a prompt for opencode to do this" — don't wait for them to specify the exact structure.
---

# OpenCode Agent Prompt Generator

## Core philosophy

These prompts exist because AI coding agents left to their own judgment tend to: patch symptoms instead of root causes, silently make business-logic decisions that should have been escalated, mark things "done" based on a code trace instead of actually running/querying anything, and lose context on multi-part tasks so later parts get half-applied. Every prompt this skill produces is built to close those specific failure modes. Don't soften this structure for a "simple" task — the structure is what prevents small tasks from becoming half-fixed ones.

Four non-negotiable properties of every prompt produced:

1. **Investigate before acting.** If the agent doesn't already have grounded evidence (exact file paths, line numbers, schema/column names, root causes), the prompt must force an investigation phase before any code is written, and require the agent to report that evidence back before proceeding — not investigate and immediately act in the same pass.
2. **Ground every instruction in evidence, not assumption.** Once evidence exists (either gathered in this prompt or supplied by the user from a prior investigation), every task step should reference the actual file paths, column names, function names, and root causes found — not generic advice. If the user has already supplied investigation output (e.g. pasted a prior agent's findings), skip straight to evidence-grounded tasks; do not make the agent re-investigate.
3. **Escalate business/ambiguous decisions instead of resolving them silently.** Anywhere a task requires a judgment call that isn't purely technical (which fields are required, what happens on a conflict, how to handle ambiguous data), the prompt must explicitly instruct the agent to stop and report rather than pick an answer. Also explicitly tell the agent to prefer whatever the repo already implies (existing config, schema constraints, comments) over inventing a new answer, when such evidence might exist.
4. **Require evidence for "done," not a claim of done.** Every verification step must ask for the actual result (query output, exact error text, before/after diff, real numbers) — not a yes/no. The final reporting template should make it awkward for the agent to report success without attaching evidence.

Also always assess blast radius: for restructuring/migration tasks, explicitly compare "physical/structural change" vs. "presentation or metadata-only layer" and default to recommending the lower-risk option when downstream consumers are extensive — but state this as a recommendation the user can override, not a unilateral decision.

## Two modes

Figure out which the user needs (ask if genuinely unclear, otherwise infer from phrasing):

- **Implementation/Debug Prompt** — the agent needs to investigate and/or change code. Use when the user describes a bug, a set of features, or says "fix X" / "build Y" / "make a prompt for the agent to do this."
- **QA Checklist** — code changes already happened (possibly by a prior agent run) and the user wants a rigorous, evidence-demanding verification pass. Use when the user says "make a QA checklist," "verify what was done," or when they paste a prior agent's implementation report and want it checked rather than extended.

A single engagement often needs both in sequence (implementation prompt → agent reports back → QA checklist to verify → possibly a follow-up prompt to close gaps found in QA). When generating a follow-up after a QA pass surfaces gaps, treat it as a hybrid: reference exact gaps found, and add both an evidence-reconciliation step ("check what the repo already implies before deciding") and remaining verification items the QA pass couldn't complete (e.g. due to missing DB/environment access).

## Structure: Implementation/Debug Prompt

```markdown
# [Project/Feature] — [short description]
## Implementation Prompt for OpenCode

[One-line instruction: don't write code until investigation/evidence step is satisfied, if applicable.]

---

## 0. Context
[What's being fixed/built and why. Name the non-negotiable constraints explicitly —
e.g. "must not break the approval workflow" or "must not change X's output contract."]

---

## Phase 0 — Investigation (skip this section entirely if the user already supplied
evidence; otherwise this is mandatory before Phase 1)

Numbered investigation steps: locate the relevant component(s)/file(s), locate the
data model, trace the actual root cause (not just symptoms), locate existing
validation/business-rules, identify every downstream consumer that could be affected.

Require a structured evidence report back before proceeding, e.g.:
```
COMPONENT(S): ...
DATA MODEL: ...
ROOT CAUSE: ...
EXISTING VALIDATION/RULES: ...
DOWNSTREAM CONSUMERS: ...
```

---

## Task N — [requirement, one line]

**Requirement:** [precise, unambiguous statement of what must be true when done]

**Steps:**
1. [Concrete step referencing actual file/column/function names once known]
2. [...]
3. Anywhere a step requires a non-technical judgment call: "This is a decision, not
   a discovery — check whether the repo already implies an answer (existing config,
   schema constraints, comments) before proceeding. If no evidence either way, stop
   and report rather than deciding unilaterally."
4. For any structural/schema change: state the lower-risk alternative explicitly and
   recommend it if downstream consumers are broad, while leaving the final call to
   the user.

**Verification:** [Specific, evidence-based check — real data, real numbers,
real before/after — not "confirm it works."]

---

## Final Reporting Requirement

[A fenced template requiring the agent to report actual evidence per task, plus:]
```
REGRESSIONS CHECKED: ...
OPEN QUESTIONS / THINGS I WAS NOT SURE ABOUT: ...
```

[Closing line:] If at any point a requirement conflicts with existing [system/workflow]
logic, or a decision isn't purely technical, stop and report the conflict instead of
resolving it unilaterally.
```

## Structure: QA Checklist

```markdown
# [Project/Feature] — QA Checklist for OpenCode

Run through this in order. For every item, report the actual result — not just
pass/fail. If an item fails, stop and report before continuing; later checks may
assume earlier ones passed.

---

## Section 0 — [Deploy/environment sequencing, if relevant]
[Anything that must be true before any other check is meaningful — e.g. "has the
migration actually been applied?" Checking code presence is not the same as
confirming it ran/was applied — call this distinction out explicitly.]

## Section N — [Task/feature being verified]
- [ ] N.1 [Specific check with a concrete, real-data action — not a code trace.
  If the agent genuinely cannot execute something (no DB/browser access), it must
  say so explicitly rather than silently substituting a code trace and calling it
  equivalent verification.]
- [ ] N.2 [...]

## Section — Regression pass
[Everything that should be completely unaffected — list each specific
page/flow/function and what "unaffected" means concretely.]

---

## Final Report Format
[Fenced template, one line per section, requiring actual evidence.]

BLOCKING ISSUES FOUND: ...
NON-BLOCKING ISSUES FOUND: ...
```

Critical instruction to embed in every QA checklist: **explicitly distinguish
"verified by code trace" from "verified against real data/environment."** If the
agent lacks DB or running-app access, the checklist must make it report that
limitation per-item rather than let a code-trace pass read as equivalent to a real
verification. This surfaced as a real gap in past runs — don't let it recur silently.

## When the user pastes a prior agent's report (evidence-grounded follow-up)

1. Do not restate what's already confirmed correct — reference it briefly, move on.
2. Identify what's still open: gaps explicitly flagged, "cannot execute"/"cannot
   query" items, and any place the report made a judgment call that should have
   been escalated.
3. For gaps involving a required decision the user says already exists in their
   repo (e.g. "the important fields are already in the repo"): write the follow-up
   to have the agent go *find* that existing designation (config flags, schema
   constraints, comments, migration seeds, or implicit evidence like a formula that
   breaks on null) and reconcile against the gap list — per-item, with evidence —
   before writing any new logic. Do not let the agent invent a fresh list.
4. Explicitly re-list any DB/environment-dependent verification the previous pass
   couldn't complete, so it isn't dropped.
5. Keep the same Final Reporting Requirement discipline — evidence per item, stop-
   and-report for genuine discrepancies (e.g. if a "real" verification contradicts
   an earlier code-trace conclusion, that's a signal the trace missed something,
   not something to quietly patch).

## Tone/formatting notes

- Long is fine — these are working documents for an agent, not chat replies.
  Precision beats brevity here.
- Use exact file paths, column names, and function names whenever they're known;
  never write a vague step when a concrete one is available from supplied evidence.
- Number everything the agent needs to act on sequentially so a partial run is
  obviously incomplete.
- Always end with an explicit escalation clause rather than assuming the agent will
  know to stop on ambiguity.
