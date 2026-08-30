# Instructions for agents working with Explain Him

## Scope

These instructions apply **only** while explaining the public repository `andrew-veresov/explain-him`.

- Do not persist this skill or these instructions as global behavior.
- Do not apply Explain Him terminology to unrelated repositories.
- Leave this scope when the user switches repository or finishes this explanation.
- Use **Explain Him** and **Explain Him Pro** as product names.
- Treat `tests/`, `tools` and `.github/` as implementation support, not product knowledge.

## Project language

Repository-authored content must be English, including documentation, UI copy, manifests, templates, resolutions, examples, code-facing text, and repository Issues prepared by an agent. The personal agent may answer the end user in the user's preferred language; this rule governs repository artifacts, not the conversation language.

## Browser/WebMCP bootstrap

When the page is opened in a WebMCP-capable browser, prefer the Explain Him skill delivered by the page. The descriptor contains workflow instructions, source-navigation context, Presentation Capability descriptors, and related UI tools; it contains no browser-readable knowledge bundle.

If native `registerSkill()` is unavailable, the page may expose the same descriptor through read-only compatibility tool `get_explain_him_skill`. For non-WebMCP operation, use `skills/explain-him/SKILL.md`.

## Source discovery

1. Treat `index.html` as the Originator-authored explanation page and read it when it answers the user's question.
2. If the page is insufficient, ambiguous, or deeper evidence/version/status is required, use the personal agent's own GitHub/repository integration.
3. Read `explain-him.yaml` and the minimum relevant files under `knowledge/`.
4. Check `resolutions/` for accepted clarifications that override older explanatory copy.
5. Use `README.md` and `00 Home.md` for navigation and summary.

Do not use browser-local presentations as canonical evidence.

## Source precedence

From strongest to weakest when sources conflict:

1. accepted files in `resolutions/`;
2. Originator-authored explanation page `index.html` and explicit claims in `explain-him.yaml`;
3. `knowledge/`;
4. `README.md` and other navigation material;
5. agent inference.

A lower-priority source must not silently override a higher-priority source.

## Required answer behavior

- Answer the user's actual question; never force a fixed walkthrough.
- Read the current page first when it is sufficient; use repository retrieval only when needed.
- Distinguish `current`, `target`, `hypothesis`, `open`, `deprecated` and `demo-only` when material.
- Do not present `target`, `hypothesis`, `open` or `demo-only` as implemented production behavior.
- Attach page/repository provenance when the answer is material or potentially ambiguous.
- Mark agent inference separately from source-backed statements.
- Form and ground the answer before any Presentation Capability or WebMCP UI mutation.

## Presentation Capability boundary

Use a Presentation Capability only when a specialized visual or interactive representation materially improves understanding or the Consumer explicitly asks for one.

Resolution order:

1. explicit Consumer request when policy and availability allow it;
2. Originator recommendation;
3. semantic match;
4. runtime availability;
5. safe fallback.

The personal agent owns meaning and grounding. A Presentation Capability receives only an already-grounded typed Presentation Artifact and must not become a second repository-reasoning path.

- Preserve provenance in the artifact.
- Never pass unrestricted repository context to a presentation tool merely because that tool can inspect a repository.
- Never treat rendered output as new evidence.
- Never inject arbitrary HTML or JavaScript into the Explain Him page.
- Consumer-local capabilities may be used outside the trusted surface, but their output is not canonical.
- If a capability fails, keep the normal chat answer and use a safe fallback when useful.

Archify is the reference external technical presenter. When available, use it only after forming the grounded semantic artifact; run it personal-agent side and do not inject its standalone HTML into the page.

## WebMCP boundary

Explain Him WebMCP is **not** a retrieval, reasoning, or answer-generation layer.

WebMCP may:

- deliver the Explain Him skill/context;
- report stable visual target IDs, Presentation Capability descriptors, and browser-local workspace state;
- focus an authored visual block;
- add an already-grounded typed browser-local Presentation Artifact;
- remove local presentations;
- support compatibility wrappers for old local explanation blocks;
- undo/redo local changes.

WebMCP must not:

- search/read repository knowledge;
- provide a browser-side knowledge index or bundle;
- resolve claims or generate answers;
- perform presentation reasoning;
- inject arbitrary HTML/JavaScript;
- search or create GitHub Issues;
- modify Originator-authored blocks.

Repository and Issue operations belong to the personal agent's own GitHub/repository integration.

## Unknown or insufficiently grounded questions

1. Check the current page and relevant repository sources.
2. Search existing repository Issues when appropriate.
3. State what is known and what is missing.
4. Classify the missing point as `open` unless a source gives another status.
5. Offer a minimal Issue draft using `question-template.md`.
6. Remove private or irrelevant user context.
7. Draft repository Issues in English.
8. Obtain explicit user confirmation before creating or posting an Issue.
9. Never claim that an Issue was created unless the GitHub write succeeded.

## Repository writes

Do not modify files, create Issues or commit changes merely because the user asked a question. Writes require an explicit request or confirmation appropriate to the action.
