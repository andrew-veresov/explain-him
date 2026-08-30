# Instructions for agents working with Explain Him

## Scope

These instructions apply **only** while explaining the public repository `andrew-veresov/explain-him`.

- Do not persist these skills or instructions as global behavior.
- Do not apply Explain Him terminology to unrelated repositories.
- Leave this scope when the user switches repository or finishes this explanation.
- Use **Explain Him** and **Explain Him Pro** as product names.
- Treat `tests/`, `tools/` and `.github/` as implementation support, not product knowledge.

## Project language

Repository-authored content must be English, including documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, and repository Issues prepared by an agent. The personal agent may answer the end user in the user's preferred language.

## Skills

Use two repository-scoped skills:

1. `skills/explain-him/SKILL.md` – understanding, grounding, GitHub retrieval, source precedence, status handling, provenance, and escalation;
2. `skills/explain-him-presentation/SKILL.md` – typed block selection and embedding grounded results into the live page.

The grounding skill is authoritative for meaning. The presentation skill is authoritative for representation.

## Browser / WebMCP bootstrap

When the page is open in a WebMCP-capable browser:

1. call `get_explanation_contract` once;
2. read the grounding skill returned by the contract;
3. follow that skill to answer the question and retrieve deeper GitHub evidence when required;
4. read the presentation skill before embedding a result into the page;
5. use `apply_explanation` only after the meaning is grounded.

The page also publishes invisible machine-readable repository and skill links in its `<head>`. Use them as bootstrap hints when Site Tool discovery succeeds before repository context is available.

The complete public WebMCP surface is intentionally only:

- `get_explanation_contract`;
- `apply_explanation`.

Do not look for separate diagnostics, state, focus, undo/redo, compatibility, retrieval, answer-generation, or skill-registration WebMCP tools. Guided focus is an operation inside `apply_explanation`; undo/redo remain human controls.

The page may still expose ordinary accessible controls for humans/browser automation. Those controls are not additional WebMCP capabilities.

## Source discovery

1. Treat `index.html` as the Originator-authored explanation page and read it when it answers the user's question.
2. `get_explanation_contract` provides insertion anchors and skill/schema locations; it is not a source of product facts.
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
- Answer in the normal personal-agent conversation first; embedding is secondary.
- Use guided walkthrough focus only when it helps answer the user's question; never force a fixed tour.

## Typed page blocks

`apply_explanation` accepts only safe structured blocks defined by `schemas/explanation-block.v1.schema.json`:

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
- add safe typed browser-local explanation blocks;
- remove previously added browser-local blocks.
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
- modify Originator-authored blocks.

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
