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

## Mandatory activation bootstrap

On every Explain Him skill activation, bootstrap the current page before retrieval, reasoning, focus, or a possible local mutation:

1. when a Site Tools host is available, make one initial `get_explanation_contract` call for this activation;
2. confirm the repository is `andrew-veresov/explain-him`, the two expected tools are available, and the returned target and local-block lists are usable;
3. retain the returned workspace revision, authored target IDs, and local block IDs as the session-local page state;
4. use authored target IDs only as insertion anchors, never as knowledge;
5. load this grounding skill, then `skills/explain-him-presentation/SKILL.md`, and only then reason about a page adaptation.

Do not defer this bootstrap until after answering when Site Tools are available. Additional contract calls are allowed only for a confirmed stale-workspace or session-conflict refresh, or for an explicitly new page session.

`get_explanation_contract` is a page contract, not a knowledge-search API. Do not expect WebMCP to answer questions or read GitHub.

## Protocol v3 transition and v2 fallback

Protocol v3 is the intended activation protocol. It will bind the bootstrap to an activation nonce and to immutable, independently verifiable published skill artifacts before an agent can mutate the local page. Until the runtime exposes that handshake, the present `explain-him-webmcp-contract.v2` response is a compatibility fallback only.

With the v2 fallback:

- still call and validate the contract first;
- load the repository-scoped skill paths returned by that contract and follow their current content;
- use the returned revision and local IDs for safe application;
- do not invent a nonce, immutable artifact digest, protocol-v3 field, or claim that the v3 handshake ran.

If the Site Tools host is absent, record that the bootstrap was unavailable, use the chat-only fallback below, and never claim a page mutation.

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

1. Complete the mandatory activation bootstrap when Site Tools are available.
2. Read the current page section(s) that appear relevant.
3. Determine whether the page is enough for a useful answer.
4. If not, retrieve the minimum relevant GitHub sources using the precedence above.
5. Separate sourced statements from agent inference.
6. Preserve important statuses.
7. Form the answer in the user's preferred language.
8. Attach provenance for material claims that will be embedded into the page.
9. Apply the decision policy below. When a local change is mandatory and Site Tools are available, call `apply_explanation` in the same turn before acknowledging the result in chat.
10. Continue the conversational answer and, where appropriate, a guided focus after the transaction result is known.

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

## Page-adaptation decision policy

When Site Tools are available, `apply_explanation` in the same turn is mandatory for:

- an explicit request to edit, add, show, replace, remove, normalize, or restore the page UI;
- a visible ambiguity, inconsistency, or correction that affects what the user can see, including the `User` and `Consumer` terminology correction;
- a refinement of the same already-personalized topic;
- a request to return to the Originator's version.

For a visible `User`/`Consumer` inconsistency, explain that both name one role, prefer `User` in user-facing local material, and replace every affected visible semantic target in the Personalized view. Keep the canonical authored material unchanged.

For a walkthrough or to reveal existing correct authored or local content without changing content, call `apply_explanation` in the same turn with a focus-only operation. A focus-only operation is not a substitute for a required correction or requested edit. Use chat only for a simple, correct answer that neither asks for nor exposes a local change.

Reuse a topic and its returned local block ID instead of creating duplicate context. The presentation skill chooses `add` for a new local topic, `replace` for a visible authored-target correction or simplification, `update` for a same-topic refinement while preserving that ID, and `remove` to restore the Originator's version. Batch related operations in one transaction when that prevents a mixed visible result.

Do not embed every conversational answer. The page should remain selective and useful. Then read and follow `skills/explain-him-presentation/SKILL.md`.

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
- If `apply_explanation` fails, keep the conversational answer and plainly say that the requested local page change was not applied. Do not acknowledge the edit, correction, refinement, or restore as complete.
- In Chrome sidebar, treat missing WebMCP as a chat-only fallback: answer normally and never claim the page changed. Explain that the full Site Tools flow requires a supported ChatGPT Desktop built-in browser surface.
- If WebMCP is unavailable for another reason, answer normally and use accessible page controls or an agent-side presentation fallback if helpful.
- Never present local personalization or external presentation output as Originator-authored knowledge.
