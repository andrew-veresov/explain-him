---
name: explain-him
description: Explain Explain Him from the Originator-authored page and public repository; use Presentation Capabilities only for already-grounded representation and WebMCP only for skill delivery and browser-local UI synchronization.
---

# Explain Explain Him

## Purpose

Enable the user's existing personal agent to explain Explain Him. The repository contains an HTML explanation page prepared by the Originator and supporting public materials. The personal agent forms the answer by reading the page and, when needed, the repository through its own GitHub/repository integration. Presentation Capabilities specialize representation after grounding. WebMCP delivers this skill in browser flow and exposes only visual/presentation workspace operations.

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
- reading the current Originator-authored HTML page when it contains enough information;
- using its GitHub/repository integration when deeper context, versioning, status or evidence is needed;
- applying source precedence and claim-status rules;
- forming the grounded answer and provenance;
- deciding whether a specialized presentation would materially improve understanding;
- forming a typed Presentation Artifact before invoking an external Presentation Capability;
- searching or creating GitHub Issues when needed and allowed.

### Presentation Capability: represent already-grounded meaning

A Presentation Capability receives a typed Presentation Artifact. It may produce a diagram, architecture map, workflow, sequence, dataflow, lifecycle, timeline, graph, simulation, or other specialized representation.

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

### WebMCP: deliver skill and mutate only local UI

WebMCP is responsible only for:

- delivering this skill/context when the host supports WebMCP Skills;
- exposing stable visual/presentation context;
- focusing an authored visual block;
- adding an already-grounded typed Presentation Artifact to the browser-local workspace;
- persisting local changes through the page workspace;
- removing local presentations and supporting undo/redo;
- supporting the previous block API as a compatibility wrapper.

WebMCP must **not** search the page or repository for knowledge, resolve claims, generate answers, perform presentation reasoning, execute repository discovery for a presenter, or access GitHub Issues.

## Source procedure

1. Read the current explanation page first when it directly addresses the user's question.
2. If the page is insufficient, ambiguous, or the user asks for implementation/status/evidence details, inspect `explain-him.yaml` and the minimum relevant repository sources.
3. Apply precedence:
   1. `resolutions/`;
   2. `index.html` and explicit manifest claims;
   3. `knowledge/`;
   4. `README.md`.
4. Distinguish `current`, `target`, `hypothesis`, `open` and `demo-only`.
5. Form the grounded answer in the personal agent before any presentation or WebMCP mutation.
6. Keep source references for important claims: page URL/path and repository path/ref/section/status when available.
7. Answer in the normal personal-agent chat.
8. If visual or interactive support helps, resolve a Presentation Capability and form its typed artifact.
9. Use WebMCP only to synchronize a safe local representation/fallback into the page.

## Presentation Artifact rules

- Schema: `explain-him-presentation.v1`.
- Include semantic type, capability id/trust/execution, typed `content.schema` + `content.payload`, safe fallback, provenance, and authorship metadata.
- The artifact is data, never executable HTML/JavaScript.
- Do not use payload fields that create executable HTML channels.
- Capability output never outranks repository evidence.
- If capability execution fails, retain the chat answer and fall back safely.

## WebMCP UI tools

Primary presentation tools:

- `get_explanation_context`;
- `get_presentation_context`;
- `get_visible_explanation_state`;
- `get_local_change_history`;
- `focus_explanation_block`;
- `add_local_presentation`;
- `remove_local_presentation`;
- `undo_last_local_change`;
- `redo_local_change`.

Compatibility wrappers:

- `add_local_explanation`;
- `remove_local_explanation`.

A compatibility tool `get_explain_him_skill` may exist only to return the same descriptor on hosts that do not implement `registerSkill()`.

There must be no Explain Him WebMCP tools for page knowledge search, repository read/search, claim retrieval, answer generation, presentation reasoning or GitHub Issues.

## Visual update procedure

1. Read `get_explanation_context` for stable visual target IDs.
2. Read `get_presentation_context` when a specialized representation is useful.
3. Form and ground the Presentation Artifact outside WebMCP.
4. Use `focus_explanation_block` for temporary navigation/highlight only.
5. Use `add_local_presentation` for persistent typed local support.
6. Check returned workspace state instead of assuming success.
7. Never change or remove authored blocks.
8. Remove only `local-*` presentations.
9. Use undo/redo for local rollback.
10. If the page reports memory mode, state that changes last only for the current session.

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
2. normal grounded chat answer + safe-text local presentation;
3. normal grounded chat answer + accessible Markdown visualization;
4. normal grounded chat answer only.

## Failure behavior

- If the current page is insufficient and repository retrieval is unavailable, say that the deeper answer cannot be grounded; do not ask WebMCP or a presenter to search instead.
- If a Presentation Capability is unavailable or fails, keep the chat answer and use a safe fallback when useful.
- If WebMCP is unavailable but source reading works, answer normally and use an agent-side or Markdown presentation fallback.
- If a WebMCP mutation fails, keep the chat answer and report only the visualization failure.
- Never present a plausible inference, local presentation, or capability output as an Originator-authored fact.
