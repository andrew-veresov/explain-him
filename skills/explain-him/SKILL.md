---
name: explain-him
description: Explain Explain Him from the Originator-authored page and public repository; use WebMCP only to deliver this skill and synchronize the browser-local visual explanation.
---

# Explain Explain Him

## Purpose

Enable the user's existing personal agent to explain Explain Him. The repository contains an HTML explanation page prepared by the Originator and supporting public materials. The personal agent forms the answer by reading the page and, when needed, the repository through its own GitHub/repository integration. WebMCP delivers this skill in browser flow and exposes only visual/workspace operations.

## Scope and containment

- Activate only for repository `andrew-veresov/explain-him`, root `.`.
- The authored explanation page is `index.html` or the corresponding loaded page.
- Do not persist these instructions globally.
- Deactivate when the user leaves this explanation context.
- Do not treat browser-local additions as Originator-authored knowledge.
- Exclude `tests/`, `tools/` and `.github/` from normal product retrieval.

## Project language

Repository-authored artifacts are English, including documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, tests, and Issue drafts. The personal agent may answer the user in the user's preferred language; when it prepares a repository artifact or Issue, write that artifact in English.

## Responsibility split

### Personal agent: understand and answer

The personal agent is responsible for:

- understanding the user's question and desired depth;
- reading the current Originator-authored HTML page when it contains enough information;
- using its GitHub/repository integration when deeper context, versioning, status or evidence is needed;
- applying source precedence and claim-status rules;
- forming the grounded answer and provenance;
- searching or creating GitHub Issues when needed and allowed;
- deciding whether a visual update would improve understanding.

### WebMCP: deliver skill and mutate only local UI

WebMCP is responsible only for:

- delivering this skill/context when the host supports WebMCP Skills;
- exposing stable visual/workspace context;
- focusing an authored visual block;
- adding an already-formed answer, example, analogy, summary, warning, comparison or diagram description as a browser-local block;
- persisting local changes through the page workspace;
- removing local blocks and supporting undo/redo.

WebMCP must **not** search the page or repository for knowledge, resolve claims, generate answers or access GitHub Issues.

## Source procedure

1. Read the current explanation page first when it directly addresses the user's question.
2. If the page is insufficient, ambiguous, or the user asks for implementation/status/evidence details, inspect `explain-him.yaml` and the minimum relevant repository sources.
3. Apply precedence:
   1. `resolutions/`;
   2. `index.html` and explicit manifest claims;
   3. `knowledge/`;
   4. `README.md`.
4. Distinguish `current`, `target`, `hypothesis`, `open` and `demo-only`.
5. Form the answer in the personal agent before any WebMCP mutation.
6. Keep source references for important claims: page URL/path and repository path/ref/section/status when available.
7. Answer in the normal personal-agent chat.
8. If visual support helps, use WebMCP to display the already-formed result in the browser-local workspace.

## WebMCP UI tools

Use only for visualization/workspace operations:

- `get_explanation_context`;
- `get_visible_explanation_state`;
- `get_local_change_history`;
- `focus_explanation_block`;
- `add_local_explanation`;
- `remove_local_explanation`;
- `undo_last_local_change`;
- `redo_local_change`.

A compatibility tool `get_explain_him_skill` may exist only to return the same descriptor on hosts that do not implement `registerSkill()`.

There must be no Explain Him WebMCP tools for page knowledge search, repository read/search, claim retrieval or GitHub Issues.

## Visual update procedure

1. Read `get_explanation_context` to learn stable visual target IDs and workspace capabilities.
2. Use `focus_explanation_block` for temporary navigation/highlight only.
3. For persistent support, call `add_local_explanation` with an authored `targetId`, known `kind`, concise title, already-formed body and provenance.
4. Check returned workspace state instead of assuming success.
5. Never change or remove authored blocks.
6. Remove only `local-*` blocks.
7. Use undo/redo for local rollback.
8. If the page reports memory mode, state that changes last only for the current session.

## Grounding rules

- Accepted resolutions outrank conflicting explanatory material.
- The authored HTML page is a valid explanation source, not a generated knowledge bundle.
- Browser-local additions are personalization, not Originator-authored facts.
- `target`, `hypothesis`, `open` and `demo-only` must never be worded as production facts.
- Agent inference must be explicitly separated from source-backed claims.
- A locally useful analogy does not become a canonical claim.
- WebMCP workspace state is not evidence for product facts.

## Question to Originator

When the page and repository evidence are insufficient:

1. state the supported part and mark the unresolved part `open`;
2. search existing Issues through the personal agent's GitHub integration;
3. prepare a minimized English Issue draft using `question-template.md` if the gap remains;
4. remove irrelevant personal context;
5. obtain explicit user confirmation before any GitHub write.

## Fallback order

1. WebMCP skill + WebMCP UI tools;
2. repository `SKILL.md` + WebMCP UI tools;
3. repository `SKILL.md` + accessible browser controls;
4. repository `SKILL.md` + equivalent Markdown in chat.

## Failure behavior

- If the current page is insufficient and repository retrieval is unavailable, say that the deeper answer cannot be grounded; do not ask WebMCP to search instead.
- If WebMCP is unavailable but source reading works, answer normally and use accessible/Markdown visualization fallback.
- If a WebMCP mutation fails, keep the chat answer and report only the visualization failure.
- Never present a plausible inference or local block as an Originator-authored fact.
