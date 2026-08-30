---
name: explain-him
description: Explain Explain Him from the Originator-authored page and public repository; use WebMCP for current-page semantic context and safe browser-local personalization, and use Presentation Capabilities only after grounding.
---

# Explain Explain Him

## Purpose

Enable the user's existing personal agent to explain Explain Him. The repository contains an HTML explanation page prepared by the Originator and supporting public materials. The personal agent forms the answer by reading the page and, when needed, the repository through its own GitHub/repository integration.

When WebMCP is available, the current page exposes a typed semantic/action contract so the agent and human can share the same live explanation state.

## Scope and containment

- Activate only for repository `andrew-veresov/explain-him`, root `.`.
- The authored explanation page is `index.html` or the corresponding loaded page.
- Do not persist these instructions globally.
- Deactivate when the user leaves this explanation context.
- Do not treat browser-local presentations as Originator-authored knowledge.
- Exclude `tests/`, `tools` and `.github/` from normal product retrieval.

## Project language

Repository-authored artifacts are English, including documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, tests, and Issue drafts. The personal agent may answer the user in the user's preferred language; when it prepares a repository artifact or Issue, write that artifact in English.

## Responsibility split

### Personal agent: understand, ground, and answer

The personal agent is responsible for:

- understanding the user's question and desired depth;
- reading structured current-page meaning through `get_explanation_context` when WebMCP is available;
- reading the authored HTML page directly when needed;
- using its GitHub/repository integration for deeper context, versioning, status, or evidence;
- applying source precedence and claim-status rules;
- forming the grounded answer and provenance;
- deciding whether a specialized presentation would materially improve understanding;
- forming a typed Presentation Artifact before invoking an external Presentation Capability;
- searching or creating GitHub Issues when needed and allowed.

### WebMCP: current-page meaning and shared local UI

WebMCP is responsible for a small user-intent surface:

- `get_explanation_context` — read structured meaning already authored into the live page;
- `get_personalization_state` — inspect local additions and undo/redo state;
- `focus_explanation` — show and focus an authored target;
- `add_personal_explanation` — add a safe local analogy/example/summary/warning/comparison;
- `remove_personal_explanation` — remove one local addition;
- `undo_personalization` — undo the latest local change;
- `redo_personalization` — redo a reverted local change.

WebMCP must **not** search repository knowledge, resolve claims, generate canonical answers, inject arbitrary HTML/JavaScript, or access GitHub Issues.

Do not depend on a `registerSkill()` WebMCP API or compatibility/meta tools. The repository skill is delivered by the repository itself; WebMCP exposes page capabilities.

### Presentation Capability: represent already-grounded meaning

A Presentation Capability receives a typed Presentation Artifact. It may produce a diagram, architecture map, workflow, sequence, dataflow, lifecycle, timeline, graph, simulation, or another specialized representation.

It must not independently become a knowledge source for Explain Him. Do not hand it unrestricted repository context as a second reasoning path. Preserve the personal agent's provenance and safe textual fallback.

Capability resolution order:

1. explicit Consumer request when allowed and available;
2. Originator recommendation;
3. semantic match;
4. runtime availability;
5. safe fallback.

Trust/security policy can veto a candidate at any step.

Archify is the reference `originator-approved` / `personal-agent` capability for architecture-map, workflow, sequence, dataflow, and lifecycle views. Form the grounded semantic artifact first. Do not inject Archify-generated standalone HTML into the Explain Him DOM.

Consumer-local capabilities may be used in a consumer-controlled environment, but their output is not canonical evidence.

## Source procedure

1. Read the current explanation page first when it directly addresses the user's question.
2. With WebMCP, call `get_explanation_context`; use its stable target IDs rather than guessing DOM structure.
3. If the page is insufficient, ambiguous, or the user asks for implementation/status/evidence details, inspect `explain-him.yaml` and the minimum relevant repository sources.
4. Apply precedence:
   1. accepted `resolutions/`;
   2. `index.html` and explicit manifest claims;
   3. `knowledge/`;
   4. `README.md`.
5. Distinguish `current`, `target`, `hypothesis`, `open` and `demo-only`.
6. Form the grounded answer before any Presentation Capability or WebMCP mutation.
7. Keep source references for important claims.
8. Answer in the normal personal-agent chat.
9. If useful or requested, use a safe browser-local WebMCP personalization or a trusted Presentation Capability.

## Personalization procedure

1. Call `get_explanation_context` to identify the intended authored target.
2. Use `focus_explanation` when the user wants navigation or emphasis.
3. Use `add_personal_explanation` only after the local analogy/example/summary/warning/comparison has been formed.
4. Use `get_personalization_state` when you need to verify what is currently local.
5. Remove only IDs returned as browser-local presentations.
6. Use undo/redo for reversible local collaboration.
7. Never change or remove authored blocks.

## Presentation Artifact rules

- Schema: `explain-him-presentation.v1`.
- Include semantic type, capability id/trust/execution, typed `content.schema` + `content.payload`, safe fallback, provenance, and authorship metadata.
- The artifact is data, never executable HTML/JavaScript.
- Never present a Presentation Capability output as new evidence.
- Capability output never outranks repository evidence.
- If capability execution fails, retain the chat answer and fall back safely.

## Grounding rules

- Accepted resolutions outrank conflicting explanatory material.
- The authored HTML page is a valid explanation source, not a generated knowledge bundle.
- Browser-local presentations are personalization, not Originator-authored facts.
- `target`, `hypothesis`, `open` and `demo-only` must never be worded as production facts.
- Agent inference must be explicitly separated from source-backed claims.
- A locally useful analogy or visualization does not become a canonical claim.
- WebMCP workspace state and Presentation Capability output are not evidence for product facts.

## Question to Originator

When the page and repository evidence are insufficient:

1. state the supported part and mark the unresolved part `open`;
2. search existing Issues through the personal agent's GitHub integration;
3. prepare a minimized English Issue draft using `question-template.md` if the gap remains;
4. remove irrelevant personal context;
5. obtain explicit user confirmation before any GitHub write.

## Fallback order

1. normal grounded chat answer + requested trusted Presentation Capability;
2. normal grounded chat answer + safe-text browser-local explanation;
3. normal grounded chat answer + accessible Markdown visualization;
4. normal grounded chat answer only.

## Failure behavior

- If the current page is insufficient and repository retrieval is unavailable, say that the deeper answer cannot be grounded; do not ask WebMCP or a presenter to search instead.
- If a Presentation Capability is unavailable or fails, keep the chat answer and use a safe fallback when useful.
- If WebMCP is unavailable but source reading works, answer normally and use the accessible page controls or an agent-side fallback.
- If a WebMCP mutation fails, keep the chat answer and report only the visualization/personalization failure.
- Never present a plausible inference, local presentation, or capability output as an Originator-authored fact.
