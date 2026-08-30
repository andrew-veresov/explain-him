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

## Browser / WebMCP flow

When the page is open in a WebMCP-capable browser, use the page's Site Tools as the typed contract for current-page meaning and browser-local personalization.

Start with `get_explanation_context` when the user asks what the idea means, when you need stable authored target IDs, or before choosing where to focus or add a personal explanation. This tool reads only meaning already authored into the live page; it is not repository retrieval.

The public WebMCP tools are:

- `get_explanation_context` — current authored page context;
- `get_personalization_state` — browser-local additions and undo/redo state;
- `focus_explanation` — show and focus one authored target;
- `add_personal_explanation` — add a safe local analogy, example, summary, warning, or comparison;
- `remove_personal_explanation` — remove one browser-local addition;
- `undo_personalization` — undo the latest local change;
- `redo_personalization` — redo a reverted local change.

Do not look for a WebMCP `registerSkill()` API or a `get_explain_him_skill` tool. Repository-scoped instructions live in this file and `skills/explain-him/SKILL.md`.

If Site Tools are unavailable, read the page normally and use the accessible browser controls over the same local workspace when useful.

## Source discovery

1. Treat `index.html` as the Originator-authored explanation page and read it when it answers the user's question.
2. When WebMCP is available, prefer `get_explanation_context` for structured meaning from that current page.
3. If the page is insufficient, ambiguous, or deeper evidence/version/status is required, use the personal agent's own GitHub/repository integration.
4. Read `explain-him.yaml` and the minimum relevant files under `knowledge/`.
5. Check accepted files in `resolutions/` for clarifications that override older explanatory copy.
6. Use `README.md` and `00 Home.md` for navigation and summary.

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
- Form and ground the answer before any Presentation Capability or WebMCP mutation.
- When the user asks for a visual/local adaptation, make the browser change visible and then verify the resulting state when needed.

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

Explain Him WebMCP provides **current-page semantic context plus shared browser-local UI actions**. It is not a repository retrieval, claim-resolution, or answer-generation service.

WebMCP may:

- return structured meaning already present on the current authored page;
- report stable authored target IDs and browser-local personalization state;
- focus an authored visual block;
- add a safe browser-local personal explanation already formed by the agent;
- remove browser-local personal explanations;
- undo/redo browser-local changes.

WebMCP must not:

- search/read repository knowledge;
- provide a hidden browser-side knowledge index or bundle;
- resolve claims or generate canonical answers;
- perform repository reasoning;
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
