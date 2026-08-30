---
name: explain-him
description: Ground an explanation from the Originator-authored page and public repository, then hand a grounded result to the Explain Him presentation skill for typed browser-local embedding.
---

# Explain Him – grounding skill

## Purpose

Use the user's existing personal agent to explain the idea represented by this repository. The agent owns understanding, retrieval, reasoning, grounding, and the conversational answer. WebMCP is only the typed channel used to embed the already-grounded result back into the live Explain Him page.

This skill is repository-scoped. Do not persist it as global behavior.

Repository-authored artifacts are English. The personal agent may answer the user in the user's preferred language.

For browser-local presentation, also read `../explain-him-presentation/SKILL.md`.

## Runtime bootstrap

When the current page exposes WebMCP:

1. call `get_explanation_contract` once;
2. confirm the repository is `andrew-veresov/explain-him`;
3. use the returned authored target IDs only as insertion anchors, not as knowledge;
4. follow this grounding skill for retrieval and reasoning;
5. follow `skills/explain-him-presentation/SKILL.md` for typed block selection and `apply_explanation`.

`get_explanation_contract` is a page contract, not a knowledge-search API. Do not expect WebMCP to answer questions or read GitHub.

## Responsibility split

### Personal agent

The personal agent must:

- understand the user's question and desired depth;
- read the current authored page;
- decide whether the page alone is sufficient;
- retrieve deeper evidence from GitHub when needed;
- apply source precedence and claim-status rules;
- form the grounded answer and provenance;
- answer the user in the normal agent conversation;
- decide whether the answer should also be embedded into the page;
- hand only an already-grounded typed result to the presentation skill.

### WebMCP

WebMCP has exactly two public capabilities:

- `get_explanation_contract` – returns insertion anchors, current local block IDs, block schema location, repository location, and this skill location;
- `apply_explanation` – adds or removes safe typed browser-local explanation blocks and focuses authored targets for a guided walkthrough.

WebMCP must not:

- search or read repository knowledge;
- resolve claims or generate answers;
- decide which sources are authoritative;
- choose an explanation strategy;
- execute arbitrary HTML or JavaScript;
- create or search GitHub Issues.

### Presentation skill

The presentation skill converts already-grounded meaning into one of the page-supported typed blocks and calls `apply_explanation`. It does not introduce new facts.

## Source discovery

Start with the authored page. Go to GitHub only when deeper evidence is useful.

Retrieve from `andrew-veresov/explain-him` through the personal agent's own GitHub/repository capability, not through WebMCP.

Use the minimum relevant files:

1. accepted `resolutions/` for explicit decisions and clarifications;
2. `index.html` and explicit claims in `explain-him.yaml`;
3. relevant files under `knowledge/`;
4. `README.md` and navigation material.

Exclude `tests/`, `tools/`, `.github/`, and `evaluation/` from normal product knowledge unless the user explicitly asks about implementation/testing. Do not read evaluation fixtures during an ordinary explanation.

## Source precedence

From strongest to weakest when sources conflict:

1. accepted files in `resolutions/`;
2. Originator-authored `index.html` and explicit manifest claims;
3. `knowledge/`;
4. `README.md` and other navigation material;
5. agent inference.

A lower-priority source must not silently override a higher-priority source.

## Claim status

Preserve status when it materially changes meaning:

- `current` – accepted/current artifact or behavior;
- `target` – intended future behavior;
- `hypothesis` – proposition under validation;
- `open` – unresolved point;
- `demo-only` – implemented only for demonstration/reference;
- `deprecated` – superseded behavior.

Never present `target`, `hypothesis`, `open`, or `demo-only` as production fact.

## Grounding procedure

For each user question:

1. Read the current page section(s) that appear relevant.
2. Determine whether the page is enough for a useful answer.
3. If not, retrieve the minimum relevant GitHub sources using the precedence above.
4. Separate sourced statements from agent inference.
5. Preserve important statuses.
6. Form the answer in the user's preferred language.
7. Attach provenance for material claims that will be embedded into the page.
8. Answer in the normal personal-agent chat first.
9. If the question exposes a visible ambiguity, terminology inconsistency, confusing text, diagram, structure, or the user asks to see the result on the page, page adaptation is required when a Site Tool is available. Pass the grounded result to the presentation skill.
10. When the user benefits from a walkthrough, focus the relevant authored target after applying the grounded block and continue the explanation in chat.

Do not call `apply_explanation` before the meaning is grounded.

## Provenance passed to presentation

For every repository-backed page block, retain source entries with as much of the following as is known:

```yaml
repository: andrew-veresov/explain-him
path: knowledge/...
ref: main-or-commit
section: optional heading
status: current|target|hypothesis|open|demo-only|deprecated
```

Do not fabricate refs or sections. Omit unknown optional fields.

A page-authored statement may use `index.html` as the source path.

## Presentation decision

Use browser-local presentation when one or more are true:

- the user explicitly asks to show/add/visualize something on the page;
- the answer benefits from comparison, flow, timeline, concept map, architecture, or a highlighted insight;
- the user is exploring the idea iteratively and persistent local context will reduce repetition.

Do not embed every conversational answer. The page should remain selective and useful. A correction to what the user can currently see is the exception: deliver that correction to the personalized layer when Site Tools are available.

Then read and follow `skills/explain-him-presentation/SKILL.md`.

## External Presentation Capabilities

An external capability such as Archify may help the personal agent decide how to structure already-grounded technical meaning. It is not a source of truth and must not independently inspect the repository as a second reasoning path.

If an external renderer produces HTML, JavaScript, or another executable surface, do not inject it into Explain Him. Translate the grounded semantic result into one of the safe typed block forms supported by the presentation skill.

## Question to the Originator

When available evidence is insufficient:

1. state the supported part;
2. mark the unresolved point `open`;
3. search existing Issues through the personal agent's GitHub integration when appropriate;
4. prepare a minimized English Issue draft using `question-template.md` if the gap remains;
5. remove irrelevant personal context;
6. obtain explicit user confirmation before any GitHub write.

WebMCP is never the GitHub Issue gateway.

## Failure behavior

- If GitHub retrieval is unavailable and the page is insufficient, say the deeper answer cannot be grounded.
- If presentation fails, keep the conversational answer; presentation failure must not destroy the answer.
- In Chrome sidebar, treat missing WebMCP as a chat-only fallback: answer normally and never claim the page changed. Explain that the full Site Tools flow requires a supported ChatGPT Desktop built-in browser surface.
- If WebMCP is unavailable for another reason, answer normally and use accessible page controls or an agent-side presentation fallback if helpful.
- Never present local personalization or external presentation output as Originator-authored knowledge.
