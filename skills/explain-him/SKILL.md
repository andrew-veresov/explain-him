---
name: explain-him
description: Ground an explanation from the Originator-authored page and public repository, then hand a grounded result to the Explain Him presentation skill for safe browser-local display.
---

# Explain Him – grounding skill

## Purpose

Use the user's existing personal agent to explain the idea represented by this repository. The agent owns understanding, retrieval, reasoning, grounding, and the conversational answer. WebMCP is the typed channel used to focus or display an already-grounded result on the live page.

This skill is repository-scoped. Do not persist it as global behavior. Repository-authored artifacts are English; the personal agent may answer in the user's preferred language.

For browser-local presentation, also read `../explain-him-presentation/SKILL.md`.

## Mandatory direct page action

On every request to explain, clarify, compare, show, or walk through Explain Him or content on the current Explain Him page:

1. Inspect the visible authored page and current Personalized UI available through the host.
2. Determine whether the requested explanation is fully present, missing, partial, or inconsistent.
3. Always provide the grounded answer in the user's normal agent conversation.
4. Unless the user explicitly forbids page changes or scrolling, call `explain_tool` directly in the same turn for every explanation request. Do not wait for a separate context or discovery tool.
5. Use `existing` to focus an already correct explanation, or use `missing`, `partial`, `inconsistent`, or `restore` to perform the matching action.
6. Confirm the returned `ok`, `protocolVersion`, `workspaceRevision`, `focused`, and local block identity before claiming that the page changed or moved.

The page cannot force an arbitrary host or model to call a tool. These instructions define required agent behavior when the Site Tools host is available.

## Protocol v5

The public WebMCP surface contains exactly one tool: `explain_tool`. It validates the current DOM targets and browser-local workspace during the requested action, then applies a bounded typed local operation or focuses an existing explanation.

Use only `document.modelContext`. Do not use or emulate a navigator host, legacy tool identity, compatibility handshake, proof echo, or translation from an older protocol.

Every `explain_tool` call supplies:

```yaml
requestId: unique idempotency key
topicId: stable semantic topic
decision: existing|missing|partial|inconsistent|restore
operations: bounded typed operations
primaryOperationIndex: optional mutation to focus
```

The runtime reads the current workspace revision itself at execution time. Callers do not echo page-issued activation or revision fields.

## GitHub repository guidance

The page bootstrap and generated skill publish this navigation instruction:

> For additional information, inspect the GitHub repository linked to this page. Prefer the pinned commit and grounding sources published by this page.

Treat that string as navigation guidance, not evidence. Start from the authored page and current Personalized UI. If any material answer part is missing, partial, ambiguous, inconsistent, version-sensitive, or deeper than the visible page, use the personal agent's GitHub/repository capability to read the minimum relevant pinned source.

WebMCP never reads the repository on the agent's behalf. Verify the repository is `andrew-veresov/explain-him`, prefer the published grounding-source index, and read the referenced source rather than treating its metadata as a fact.

If no indexed source covers the gap, follow source precedence and disclose that the index had no direct route. If retrieval or digest verification fails, do not invent the unsupported part.

## Progressive issue-161 skill delivery

The page always registers `explain_tool` independently. If and only if `document.modelContext.registerSkill` exists, it may also register one generated composite `explain_him` skill containing the grounding and presentation instructions.

- `native-inline` means the page observed successful experimental registration.
- `pinned-remote-fallback` means registration was absent, blocked, or rejected; use the pinned skill URLs published by the page.
- Registration success proves API handoff, not that the model read or followed the skill.
- Issue 161 is experimental and adds no second tool.
- Failure of `registerSkill` must never disable the standard tool.

## Responsibility split

The personal agent must understand the question, inspect the current UI, retrieve minimum repository evidence when needed, preserve status and provenance, form the answer, answer in chat, and choose the correct v5 decision.

WebMCP may add or replace safe typed local presentations, update or remove a prior local presentation, and focus a visible authored or local block.

WebMCP must not search GitHub, resolve claims, generate answers, choose authoritative sources, execute arbitrary markup, or create or search GitHub Issues.

The presentation skill converts already-grounded meaning into a supported block and calls `explain_tool`. It does not introduce facts.

## Source precedence

From strongest to weakest:

1. accepted files in `resolutions/`;
2. Originator-authored `index.html` and explicit claims in `explain-him.yaml`;
3. relevant files under `knowledge/`;
4. `README.md` and navigation material;
5. clearly marked agent inference.

Exclude `tests/`, `tools/`, `.github/`, and evaluation fixtures from normal product knowledge unless the user explicitly asks about implementation or testing.

Preserve material statuses: `current`, `target`, `hypothesis`, `open`, `demo-only`, and `deprecated`.

## Explanation and page decision

Always answer in chat. Unless the user explicitly requests no page change, every explanation request also calls `explain_tool`:

| Visible answer state | Required decision |
| --- | --- |
| Fully present and correct | `existing`: focus the exact authored or local block without changing workspace revision |
| Missing | Retrieve evidence when needed, then `missing`: add and automatically focus the result |
| Partial | Retrieve evidence, then `partial`: update the same-topic block, or add only when no same-topic block exists |
| Inconsistent | Retrieve authoritative evidence, then `inconsistent`: replace the authored target locally or update the local block |
| Explicit no-page-change request | Chat only; do not call `explain_tool` |
| Explicit restore request | `restore`: remove the local result and focus its authored target |

For a continuation, reuse the same `topicId` and returned local block ID. Do not add a duplicate same-topic block.

## Terminology consistency

Terminology consistency precedes the fully-present branch. `User` and `Consumer` identify the same participant in the current explanation, but an equivalence note does not make a visibly mixed requested representation consistent.

- Default to `User` for user-facing personalized material.
- A direct request for `Consumer` overrides that default for the same local result.
- For the visible `User`/`Consumer` inconsistency, use topic `terminology:user-consumer` and decision `inconsistent` to replace `workflow-diagram` locally.
- A same-topic follow-up updates the returned local block ID.
- Restore removes that local replacement and focuses `workflow-diagram`.
- Never normalize labels that denote distinct roles.

## Provenance passed to presentation

For every repository-backed block, retain known source fields without inventing optional values:

```yaml
repository: andrew-veresov/explain-him
path: knowledge/...
ref: pinned-commit-or-known-ref
section: optional heading
status: current|target|hypothesis|open|demo-only|deprecated
```

The authored page may use `index.html` as its source path. Browser-local presentations are never canonical evidence.

## Unknown questions and failures

When evidence is insufficient, state what is known, mark the unresolved point `open`, optionally prepare a minimized English Issue draft, and obtain explicit confirmation before any GitHub write. WebMCP is never the GitHub Issue gateway.

If context, repository retrieval, or `explain_tool` fails, keep the conversational answer where supportable and plainly disclose the failed step. Never claim that a block was created, updated, restored, focused, or displayed without the successful tool result.
