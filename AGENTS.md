# Instructions for agents working with Explain Him

## Required product contract

Read [`PRODUCT-CONTRACT.md`](PRODUCT-CONTRACT.md) before explaining, planning, changing, reviewing, or testing Explain Him. It is the canonical product intent. If another navigation document conflicts with it, stop and resolve the conflict through an accepted ADR and a synchronized Product Contract update.

## Scope

These instructions apply **only** while explaining the public repository `andrew-veresov/explain-him`.

- Do not persist these skills or instructions as global behavior.
- Do not apply Explain Him terminology to unrelated repositories.
- Leave this scope when the user switches repository or finishes this explanation.
- Use **Explain Him** and **Explain Him Pro** as product names.
- Treat `tests/`, `tools/` and `.github/` as implementation support, not product knowledge.
- Exclude any `evaluation/` material from normal explanation. Read it only when the user explicitly asks to run or review tests.

## Project language

Repository-authored content must be English, including documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, and repository Issues prepared by an agent. The personal agent may answer the end user in the user's preferred language.

## Skills

Use two repository-scoped skills:

1. `skills/explain-him/SKILL.md` – understanding, grounding, GitHub retrieval, source precedence, status handling, provenance, and escalation;
2. `skills/explain-him-presentation/SKILL.md` – typed block selection and embedding grounded results into the live page.

The grounding skill is authoritative for meaning. The presentation skill is authoritative for representation.

## Browser / WebMCP bootstrap

Use only the current WebMCP host: `document.modelContext`. `navigator.modelContext` is a legacy API and is not supported in this project. Do not add compatibility fallbacks, polyfills, or tests for it.

When the page is open in a WebMCP-capable browser:

1. for every request to explain, clarify, compare, show, or walk through current page content, call `explain_tool` directly and require Protocol v5 unless the user explicitly forbids page changes or scrolling;
2. inspect the visible authored page and Personalized UI available through the host, then choose the matching decision and registered target;
3. when visible content is insufficient, follow the published `additionalInformation` string and read the minimum relevant pinned source from the linked GitHub repository;
4. read the presentation skill before displaying a result;
5. always provide the grounded answer in chat;
6. use that direct `explain_tool` call to focus existing content or add, update, replace, or restore a safe typed local presentation;
7. send only requestId, topicId, decision, operations, and optional primaryOperationIndex. If the tool fails, say so honestly rather than claiming a page change or focus.

The page also publishes invisible machine-readable repository and skill links in its `<head>`. Use them as bootstrap hints when Site Tool discovery succeeds before repository context is available.

The page may register one experimental composite `explain_him` skill only when the standard document host exposes `registerSkill`. This is progressive enhancement based on open WebMCP issue 161. It adds no tool, is never polyfilled, and falls back to the complete pinned remote workflow when unavailable or rejected. Registration does not prove that the model read or followed the instructions.

The complete public WebMCP surface is intentionally only `explain_tool`.

Do not look for separate diagnostics, state, focus, undo/redo, compatibility, retrieval, answer-generation, or skill-registration WebMCP tools. `explain_tool` contains add, replace, update, remove, and focus behavior; undo/redo and Original/Personalized remain human controls.

The page may still expose ordinary accessible controls for humans/browser automation. Those controls are not additional WebMCP capabilities.

## Source discovery

1. Treat `index.html` as the Originator-authored explanation page and read it when it answers the user's question.
2. The page bootstrap and repository skills provide stable target, repository, and schema guidance; they are not sources of product facts.
3. If the page is insufficient, ambiguous, or deeper evidence/version/status is required, use the personal agent's own GitHub/repository integration.
4. Read the minimum relevant sources.
5. Check accepted files in `resolutions/` before lower-priority explanatory material.

Do not use browser-local explanation blocks as canonical evidence.

## Source precedence

From strongest to weakest when sources conflict:

1. accepted files in `resolutions/`;
2. Originator-authored `index.html` and explicit claims in `explain-him.yaml`;
3. `knowledge/`;
4. `README.md` and other navigation material;
5. agent inference.

A lower-priority source must not silently override a higher-priority source.

## Required answer behavior

- Answer the user's actual question; never force a fixed walkthrough.
- Read the current page first when it is sufficient; use repository retrieval only when needed.
- Distinguish `current`, `target`, `hypothesis`, `open`, `deprecated` and `demo-only` when material.
- Do not present `target`, `hypothesis`, `open` or `demo-only` as implemented production behavior.
- Preserve page/repository provenance for material claims that will be embedded.
- Mark agent inference separately from source-backed statements.
- Form and ground the answer before any presentation or WebMCP mutation.
- Answer in the normal personal-agent conversation first.
- Unless the user explicitly forbids page changes, focus or display every requested explanation through `explain_tool`; never force a fixed tour.

## Typed page blocks

`explain_tool` accepts only safe structured blocks defined by `schemas/explanation-block.v1.schema.json`:

- `callout`;
- `comparison`;
- `workflow`;
- `timeline`;
- `diagram`.

The presentation skill defines when and how to use each type.

The renderer must not accept arbitrary HTML, JavaScript, CSS, iframe markup, or executable payloads.

## Presentation Capability boundary

External Presentation Capabilities may help represent already-grounded meaning, but they are not evidence and must not become a second repository-retrieval path.

- Preserve provenance.
- Never pass unrestricted repository context to a presenter merely because it can inspect a repository.
- Never treat rendered output as new evidence.
- Never inject external generated HTML or JavaScript into the Explain Him page.
- Translate useful external output back into a supported typed block.

Archify is the reference external technical presenter for already-grounded technical views.

## WebMCP boundary

Explain Him WebMCP is a **typed result-delivery channel into the shared live page**.

It may:

- expose the current page integration contract and insertion anchors;
- expose the locations of the repository skills and block schema;
- add, locally replace, update, or remove safe typed browser-local explanation blocks;
- focus an authored target so the agent can guide the user through grounded page changes.

It must not:

- search/read GitHub knowledge;
- resolve claims;
- generate answers;
- choose sources;
- decide presentation strategy;
- expose diagnostics as agent tools;
- inject arbitrary HTML/JavaScript;
- search or create GitHub Issues;
- modify Originator-authored source or DOM subtrees. A personalized replacement may hide a registered target visually while preserving that subtree for Original view.

Repository and Issue operations belong to the personal agent's own GitHub/repository integration.

## Unknown or insufficiently grounded questions

1. Check the current page and relevant repository sources.
2. Search existing repository Issues when appropriate.
3. State what is known and what is missing.
4. Classify the missing point as `open` unless a source gives another status.
5. Offer a minimal English Issue draft using `question-template.md`.
6. Remove private or irrelevant user context.
7. Obtain explicit user confirmation before creating or posting an Issue.
8. Never claim that an Issue was created unless the GitHub write succeeded.

## Repository writes

Do not modify files, create Issues or commit changes merely because the user asked a question. Writes require an explicit request or confirmation appropriate to the action.
