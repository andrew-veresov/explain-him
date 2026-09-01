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

## Protocol selection and legacy v2 fallback

Select the protocol only from the returned `schemaVersion`; never infer it from this skill, a page label, or an earlier session.

- A returned `explain-him-webmcp-contract.v3` requires the full Protocol v3 activation handshake. Verify the returned activation ID and nonce, exact ordered `skillProof`, immutable raw skill URLs, commits, and digests before loading the skills. Send the complete v3 handshake with every `apply_explanation` request.
- Never downgrade or translate a returned v3 contract to v2. A v3 contract stays v3 for that activation, including its revision and local block IDs.
- An actual older page may return `explain-him-webmcp-contract.v2`. That is the legacy compatibility fallback only: validate its returned fields, use only its supported capabilities, and do not invent a nonce, immutable artifact digest, or other v3 field.
- An absent or unknown contract version cannot authorize a page mutation or focus.

If the Site Tools host is absent, record that the bootstrap was unavailable, use the chat-only fallback below, and never claim a page mutation.

## Responsibility split

### Personal agent

The personal agent must:

- understand the user's question and desired depth;
- read the current authored page;
- decide whether every material part of the answer is explicit in the current visible Personalized UI;
- retrieve the minimum pinned repository evidence whenever any material part is missing, partial, ambiguous, or inconsistent;
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

Start with the authored page and current Personalized UI. If any material part of the answer is not explicit in the visible Personalized UI, repository retrieval is required in the same turn. Do not answer from plausible visible-page inference, nearby wording, or model memory.

Retrieve from `andrew-veresov/explain-him` through the personal agent's own GitHub/repository capability, not through WebMCP.

For a Protocol v3 contract that provides `groundingSourceIndex`, resolve the user's topic through that index before browsing arbitrary repository paths. Verify the indexed repository, immutable commit, raw URL, section, status, and SHA-256, then read the minimum pinned source that covers the missing material. The index is navigation metadata, not evidence by itself: the agent must read the referenced source.

If no indexed topic covers a material gap, follow source precedence with the minimum additional repository read and disclose that the index did not provide a direct route. Do not broaden retrieval speculatively. If repository retrieval is unavailable, an indexed source is missing, or its digest does not match, stop grounding the unsupported part and disclose the retrieval failure.

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
3. Determine whether every material part of the answer is explicit, current, and consistent in the visible Personalized UI.
4. If any material part is missing, partial, ambiguous, or inconsistent, resolve the topic through `groundingSourceIndex` and retrieve the minimum pinned source in the same turn. If the index has no matching route, retrieve the minimum additional GitHub source using the precedence above and disclose the index gap.
5. Separate sourced statements from agent inference.
6. Preserve important statuses.
7. Form the answer in the user's preferred language.
8. Attach provenance for material claims that will be embedded into the page.
9. Apply the decision policy below. When a local change is mandatory and Site Tools are available, call `apply_explanation` in the same turn before acknowledging the result in chat.
10. Continue the conversational answer and, where appropriate, a guided focus after the transaction result is known.

Do not call `apply_explanation` before the meaning is grounded.

Repository grounding must preserve documented absences as facts. For example, when the authoritative source says the current project does not document a dedicated authoring tool, editor, generator, builder, or CLI, state that limitation directly. Never infer or invent such a platform from the existence of GitHub Pages or a static page.

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

Always answer the user in chat. Before deciding whether to change the page, assess both whether the grounded answer and the representation the user requested already exist correctly in the current Personalized UI. The authored page alone is not enough when a personalized result is currently visible.

Use this matrix when Site Tools are available:

- If the answer and requested representation are fully present and correct, an ordinary question is chat-only: do not call `apply_explanation` and do not duplicate the result.
- If they are fully present and the user asks to show, reveal, or walk through them, call `apply_explanation` in the same turn with a focus-only operation.
- If the answer or requested representation is missing, call `apply_explanation` in the same turn with `add`. A requested diagram that is absent counts as missing representation even when prose is correct.
- If it is partial, `update` the existing same-topic local block when possible; otherwise add a clearly supplementary local block.
- If it is inconsistent, `replace` the affected authored target or `update` the affected local block. Batch every affected semantic target in one transaction so Personalized view does not show a mixed result.
- An explicit instruction not to change the page overrides this matrix: answer in chat only.
- For an explicit restore, use `remove` to return to the Originator's version.

Where this matrix selects a page operation, `apply_explanation` in the same turn is mandatory. Use chat only for a simple, correct answer whose answer and requested representation are already fully present and that is not a show or walkthrough request.

### Terminology consistency precedes fully-present

Before treating an answer or representation as fully present, check whether the user has noticed, compared, or asked to correct equivalent visible labels. An equivalence note does not make mixed labels consistent: if `User` and `Consumer` name the same participant but both remain visible in the requested representation, that representation is inconsistent for this narrow terminology request.

- An explicit no-page-change instruction still wins: answer in chat and do not apply a local change.
- Do not normalize labels that denote distinct roles. This rule is only for labels grounded as equivalent in the current explanation.
- Default to `User` for user-facing local material. A direct request to use `Consumer` overrides that default for the same local result.
- For the exact visible `User`/`Consumer` question, answer in chat and, in the same turn, use `replace` on `workflow-diagram` in Personalized view with `User` terminology.
- For the direct same-topic follow-up to use `Consumer`, use `update` on the same returned local block ID. For a request to return to the author view, use `remove` for that local replacement.

Keep canonical authored material unchanged. This is a targeted correction rule, not a reason to mutate the page for every answer.

Reuse a topic and its returned local block ID instead of creating duplicate context. Use `update` for a same-topic refinement when the existing local block is partial or needs a refined grounded result. A focus-only operation is not a substitute for a missing, partial, inconsistent, or explicitly requested edit. Do not embed every conversational answer: the page should remain selective and useful. Then read and follow `skills/explain-him-presentation/SKILL.md`.

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

- If GitHub retrieval is unavailable and the page is insufficient, say the deeper answer cannot be grounded and identify the retrieval failure without inventing the missing detail.
- If `groundingSourceIndex` is missing, does not cover the material topic, points outside the pinned repository commit, or fails its digest check, do not treat its metadata or a plausible visible-page inference as evidence.
- If `apply_explanation` fails, keep the conversational answer and plainly say that the requested local page change was not applied. Do not acknowledge the edit, correction, refinement, or restore as complete.
- In Chrome sidebar, treat missing WebMCP as a chat-only fallback: answer normally and never claim the page changed. Explain that the full Site Tools flow requires a supported ChatGPT Desktop built-in browser surface.
- If WebMCP is unavailable for another reason, answer normally and use accessible page controls or an agent-side presentation fallback if helpful.
- Never present local personalization or external presentation output as Originator-authored knowledge.
